import { useQueries, useQuery } from '@tanstack/react-query'
import { ASSETS, type AssetKey } from '../assets/catalog'

type CoinbaseSpotResponse = {
  data?: {
    amount?: string
    base?: string
    currency?: string
  }
}

// Coinbase Exchange candles:
// [[ time, low, high, open, close, volume ], ...]
type CoinbaseCandlesResponse = Array<[number, number, number, number, number, number]>

type KrakenTickerResponse = {
  error?: string[]
  result?: Record<string, { c?: string[] }>
}

type KrakenOHLCResponse = {
  error?: string[]
  result?: Record<string, { [k: string]: unknown } | Array<Array<number | string>>>
}

function toNumber(value: string | number | undefined | null): number {
  const n = typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : NaN
  return Number.isFinite(n) ? n : NaN
}

type MarketCacheEntry = { v: number; ts: number }

const SPOT_CACHE_TTL_MS = 60_000
const SOURCE_BACKOFF_MS = 5 * 60_000

function cacheKeySpot(assetKey: AssetKey) {
  return `market.spot.usd.${assetKey}`
}

function readSpotCache(assetKey: AssetKey): number | undefined {
  try {
    const raw = localStorage.getItem(cacheKeySpot(assetKey))
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as Partial<MarketCacheEntry>
    if (!parsed || typeof parsed.v !== 'number' || typeof parsed.ts !== 'number') return undefined
    if (Date.now() - parsed.ts > SPOT_CACHE_TTL_MS) return undefined
    return parsed.v
  } catch {
    return undefined
  }
}

function writeSpotCache(assetKey: AssetKey, value: number) {
  try {
    const entry: MarketCacheEntry = { v: value, ts: Date.now() }
    localStorage.setItem(cacheKeySpot(assetKey), JSON.stringify(entry))
  } catch {
    // ignore cache write failures
  }
}

type MarketSource = 'kraken' | 'coinbase'

function sourceDownKey(source: MarketSource, kind: 'spot' | 'candles') {
  return `market.${source}.${kind}.downUntil`
}

// Mirrored in memory so the backoff still holds when storage is unavailable,
// as it is in a private window.
const downUntilMemory: Record<string, number> = {}

function readDownUntil(source: MarketSource, kind: 'spot' | 'candles'): number {
  const memoryKey = `${source}.${kind}`
  const remembered = downUntilMemory[memoryKey] ?? 0
  try {
    // localStorage rather than session: an installed app is relaunched often,
    // and per-session state meant every launch re-ran the whole failing sweep
    // before falling back. Someone whose network blocks Coinbase outright paid
    // that on every cold start.
    const raw = localStorage.getItem(sourceDownKey(source, kind))
    const n = raw ? Number(raw) : 0
    return Math.max(remembered, Number.isFinite(n) ? n : 0)
  } catch {
    return remembered
  }
}

function setDownUntil(source: MarketSource, kind: 'spot' | 'candles', until: number) {
  downUntilMemory[`${source}.${kind}`] = until
  try {
    localStorage.setItem(sourceDownKey(source, kind), String(until))
  } catch {
    // ignore
  }
}

function markSourceDown(source: MarketSource, kind: 'spot' | 'candles') {
  setDownUntil(source, kind, Date.now() + SOURCE_BACKOFF_MS)
}

function shouldSkipSource(source: MarketSource, kind: 'spot' | 'candles') {
  return Date.now() < readDownUntil(source, kind)
}

function isRateLimitStatus(status: number) {
  return status === 429 || status === 503
}

async function fetchCoinbaseSpotUsd(assetKey: AssetKey, signal?: AbortSignal): Promise<number> {
  const asset = ASSETS[assetKey]
  if (!asset.spotSymbol) throw new Error('No spot symbol configured')

  const res = await fetch(`https://api.coinbase.com/v2/prices/${asset.spotSymbol}-USD/spot`, { signal })
  if (!res.ok) {
    if (isRateLimitStatus(res.status)) markSourceDown('coinbase', 'spot')
    throw new Error('Coinbase spot failed')
  }
  const json = (await res.json()) as CoinbaseSpotResponse
  const amount = toNumber(json.data?.amount)
  if (!Number.isFinite(amount)) throw new Error('Coinbase spot unavailable')
  return amount
}

async function fetchCoinbaseCandles(
  assetKey: AssetKey,
  days: number,
  signal?: AbortSignal,
): Promise<Array<{ t: string; ts: number; price: number; volume: number }>> {
  const asset = ASSETS[assetKey]
  if (!asset.coinbaseProductId) throw new Error('No product id configured')

  const end = new Date()
  const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  const granularity = 60 * 60 // 1h

  const url = new URL(`https://api.exchange.coinbase.com/products/${asset.coinbaseProductId}/candles`)
  url.searchParams.set('granularity', String(granularity))
  url.searchParams.set('start', start.toISOString())
  url.searchParams.set('end', end.toISOString())

  const res = await fetch(url.toString(), { signal })
  if (!res.ok) {
    if (isRateLimitStatus(res.status)) markSourceDown('coinbase', 'candles')
    throw new Error('Coinbase candles failed')
  }
  const json = (await res.json()) as CoinbaseCandlesResponse
  // API returns newest-first.
  return json
    .map((row) => ({ ts: row[0] * 1000, close: row[4], volume: row[5] }))
    .filter((p) => Number.isFinite(p.close))
    .sort((a, b) => a.ts - b.ts)
    .map((p) => ({
      t: new Date(p.ts).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit' }),
      ts: p.ts,
      price: p.close,
      volume: Number.isFinite(p.volume) ? p.volume : 0,
    }))
}

async function fetchKrakenSpotUsd(assetKey: AssetKey, signal?: AbortSignal): Promise<number> {
  const asset = ASSETS[assetKey]
  // Kraken uses different pair codes for some assets.
  const pair = asset.krakenPair ?? (assetKey === 'BTC' ? 'XBTUSD' : `${assetKey}USD`)
  const res = await fetch(`https://api.kraken.com/0/public/Ticker?pair=${pair}`, { signal })
  if (!res.ok) throw new Error('Kraken spot failed')
  const json = (await res.json()) as KrakenTickerResponse
  if (json.error?.length) throw new Error('Kraken spot error')
  const entry = json.result ? Object.values(json.result)[0] : undefined
  const last = entry?.c?.[0]
  const n = toNumber(last)
  if (!Number.isFinite(n)) throw new Error('Kraken spot unavailable')
  return n
}

async function fetchSpotUsdWithFallback(assetKey: AssetKey, signal?: AbortSignal): Promise<number> {
  const cached = readSpotCache(assetKey)
  if (cached !== undefined) return cached

  if (!shouldSkipSource('kraken', 'spot')) {
    try {
      const v = await fetchKrakenSpotUsd(assetKey, signal)
      if (Number.isFinite(v)) writeSpotCache(assetKey, v)
      return v
    } catch {
      markSourceDown('kraken', 'spot')
    }
  }

  const v = await fetchCoinbaseSpotUsd(assetKey, signal)
  if (Number.isFinite(v)) writeSpotCache(assetKey, v)
  return v
}

async function fetchCandlesWithFallback(
  assetKey: AssetKey,
  days: number,
  signal?: AbortSignal,
): Promise<Array<{ t: string; ts: number; price: number; volume: number }>> {
  if (!shouldSkipSource('kraken', 'candles')) {
    try {
      return await fetchKrakenCandles(assetKey, days, signal)
    } catch {
      markSourceDown('kraken', 'candles')
    }
  }
  return await fetchCoinbaseCandles(assetKey, days, signal)
}

async function fetchKrakenCandles(
  assetKey: AssetKey,
  days: number,
  signal?: AbortSignal,
): Promise<Array<{ t: string; ts: number; price: number; volume: number }>> {
  const asset = ASSETS[assetKey]
  const pair = asset.krakenPair ?? (assetKey === 'BTC' ? 'XBTUSD' : `${assetKey}USD`)
  const intervalMinutes = 60
  const since = Math.floor((Date.now() - days * 24 * 60 * 60 * 1000) / 1000)
  const res = await fetch(
    `https://api.kraken.com/0/public/OHLC?pair=${pair}&interval=${intervalMinutes}&since=${since}`,
    { signal },
  )
  if (!res.ok) throw new Error('Kraken candles failed')
  const json = (await res.json()) as KrakenOHLCResponse
  if (json.error?.length) throw new Error('Kraken candles error')
  const series = json.result ? (Object.values(json.result).find(Array.isArray) as Array<Array<number | string>> | undefined) : undefined
  if (!series) throw new Error('Kraken candles unavailable')
  return series
    .map((row) => {
      const ts = toNumber(row[0]) * 1000
      const close = toNumber(row[4])
      const volume = toNumber(row[6])
      return { ts, close, volume }
    })
    .filter((p) => Number.isFinite(p.ts) && Number.isFinite(p.close))
    .sort((a, b) => a.ts - b.ts)
    .map((p) => ({
      t: new Date(p.ts).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit' }),
      ts: p.ts,
      price: p.close,
      volume: Number.isFinite(p.volume) ? p.volume : 0,
    }))
}

export function useSpotUsd(assetKey: AssetKey) {
  return useQuery({
    queryKey: ['market', 'spot', assetKey, 'usd'],
    queryFn: ({ signal }) => fetchSpotUsdWithFallback(assetKey, signal),
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
    retry: 0,
  })
}

export function useSpotUsdMany(assetKeys: AssetKey[]) {
  const queries = useQueries({
    queries: assetKeys.map((assetKey) => ({
      queryKey: ['market', 'spot', assetKey, 'usd'],
      queryFn: ({ signal }) => fetchSpotUsdWithFallback(assetKey, signal),
      staleTime: 60_000,
      refetchInterval: 60_000,
      refetchOnWindowFocus: false,
      retry: 0,
    })),
  })

  const map = new Map<AssetKey, number>()
  for (let i = 0; i < assetKeys.length; i++) {
    const key = assetKeys[i]
    const q = queries[i]
    if (key && q?.data !== undefined) map.set(key, q.data)
  }

  return {
    isLoading: queries.some((q) => q.isLoading),
    data: map,
  }
}

export function useCandles(assetKey: AssetKey, days: 1 | 7 | 30) {
  return useQuery({
    queryKey: ['market', 'candles', assetKey, `${days}d`],
    queryFn: ({ signal }) => fetchCandlesWithFallback(assetKey, days, signal),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}

export function useCandlesMany(assetKeys: AssetKey[], days: 1 | 7 | 30) {
  const queries = useQueries({
    queries: assetKeys.map((assetKey) => ({
      queryKey: ['market', 'candles', assetKey, `${days}d`],
      queryFn: ({ signal }: { signal?: AbortSignal }) => fetchCandlesWithFallback(assetKey, days, signal),
      staleTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    })),
  })

  return {
    isLoading: queries.some((q) => q.isLoading),
    data: assetKeys.map((assetKey, index) => ({ assetKey, candles: queries[index]?.data })),
  }
}

async function fetchChange24h(assetKey: AssetKey): Promise<number> {
  const points = await fetchCandlesWithFallback(assetKey, 2)
  // Approximate: last close vs close ~24h ago.
  if (points.length < 2) throw new Error('Not enough candle data')
  const last = points[points.length - 1]?.price
  const prev = points[Math.max(0, points.length - 25)]?.price
  if (!Number.isFinite(last) || !Number.isFinite(prev) || prev === 0) {
    throw new Error('Change unavailable')
  }
  return ((last! - prev!) / prev!) * 100
}

export function useChange24h(assetKey: AssetKey) {
  return useQuery({
    queryKey: ['market', 'change', assetKey, '24h'],
    queryFn: () => fetchChange24h(assetKey),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}

export function useChange24hMany(assetKeys: AssetKey[]) {
  const queries = useQueries({
    queries: assetKeys.map((assetKey) => ({
      queryKey: ['market', 'change', assetKey, '24h'],
      queryFn: () => fetchChange24h(assetKey),
      staleTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    })),
  })

  const map = new Map<AssetKey, number>()
  for (let i = 0; i < assetKeys.length; i++) {
    const key = assetKeys[i]
    const q = queries[i]
    if (key && q?.data !== undefined) map.set(key, q.data)
  }

  return {
    isLoading: queries.some((q) => q.isLoading),
    data: map,
  }
}
