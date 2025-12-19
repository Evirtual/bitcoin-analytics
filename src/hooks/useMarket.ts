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

async function fetchCoinbaseSpotUsd(assetKey: AssetKey): Promise<number> {
  const asset = ASSETS[assetKey]
  if (!asset.spotSymbol) throw new Error('No spot symbol configured')

  const res = await fetch(`https://api.coinbase.com/v2/prices/${asset.spotSymbol}-USD/spot`)
  if (!res.ok) throw new Error('Coinbase spot failed')
  const json = (await res.json()) as CoinbaseSpotResponse
  const amount = toNumber(json.data?.amount)
  if (!Number.isFinite(amount)) throw new Error('Coinbase spot unavailable')
  return amount
}

async function fetchCoinbaseCandles(
  assetKey: AssetKey,
  days: number,
): Promise<Array<{ t: string; price: number; volume: number }>> {
  const asset = ASSETS[assetKey]
  if (!asset.coinbaseProductId) throw new Error('No product id configured')

  const end = new Date()
  const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  const granularity = 60 * 60 // 1h

  const url = new URL(`https://api.exchange.coinbase.com/products/${asset.coinbaseProductId}/candles`)
  url.searchParams.set('granularity', String(granularity))
  url.searchParams.set('start', start.toISOString())
  url.searchParams.set('end', end.toISOString())

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error('Coinbase candles failed')
  const json = (await res.json()) as CoinbaseCandlesResponse
  // API returns newest-first.
  return json
    .map((row) => ({ ts: row[0] * 1000, close: row[4], volume: row[5] }))
    .filter((p) => Number.isFinite(p.close))
    .sort((a, b) => a.ts - b.ts)
    .map((p) => ({
      t: new Date(p.ts).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit' }),
      price: p.close,
      volume: Number.isFinite(p.volume) ? p.volume : 0,
    }))
}

async function fetchKrakenSpotUsd(assetKey: AssetKey): Promise<number> {
  // Kraken uses different pair codes.
  const pair = assetKey === 'BTC' ? 'XBTUSD' : `${assetKey}USD`
  const res = await fetch(`https://api.kraken.com/0/public/Ticker?pair=${pair}`)
  if (!res.ok) throw new Error('Kraken spot failed')
  const json = (await res.json()) as KrakenTickerResponse
  if (json.error?.length) throw new Error('Kraken spot error')
  const entry = json.result ? Object.values(json.result)[0] : undefined
  const last = entry?.c?.[0]
  const n = toNumber(last)
  if (!Number.isFinite(n)) throw new Error('Kraken spot unavailable')
  return n
}

async function fetchKrakenCandles(
  assetKey: AssetKey,
  days: number,
): Promise<Array<{ t: string; price: number; volume: number }>> {
  const pair = assetKey === 'BTC' ? 'XBTUSD' : `${assetKey}USD`
  const intervalMinutes = 60
  const since = Math.floor((Date.now() - days * 24 * 60 * 60 * 1000) / 1000)
  const res = await fetch(
    `https://api.kraken.com/0/public/OHLC?pair=${pair}&interval=${intervalMinutes}&since=${since}`,
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
      price: p.close,
      volume: Number.isFinite(p.volume) ? p.volume : 0,
    }))
}

export function useSpotUsd(assetKey: AssetKey) {
  return useQuery({
    queryKey: ['market', 'spot', assetKey, 'usd'],
    queryFn: async () => {
      try {
        return await fetchCoinbaseSpotUsd(assetKey)
      } catch {
        return await fetchKrakenSpotUsd(assetKey)
      }
    },
    staleTime: 20_000,
    refetchInterval: 20_000,
  })
}

export function useSpotUsdMany(assetKeys: AssetKey[]) {
  const queries = useQueries({
    queries: assetKeys.map((assetKey) => ({
      queryKey: ['market', 'spot', assetKey, 'usd'],
      queryFn: async () => {
        try {
          return await fetchCoinbaseSpotUsd(assetKey)
        } catch {
          return await fetchKrakenSpotUsd(assetKey)
        }
      },
      staleTime: 20_000,
      refetchInterval: 20_000,
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

export function useCandles7d(assetKey: AssetKey) {
  return useQuery({
    queryKey: ['market', 'candles', assetKey, '7d'],
    queryFn: async () => {
      try {
        return await fetchCoinbaseCandles(assetKey, 7)
      } catch {
        return await fetchKrakenCandles(assetKey, 7)
      }
    },
    staleTime: 5 * 60_000,
  })
}

export function useChange24h(assetKey: AssetKey) {
  return useQuery({
    queryKey: ['market', 'change', assetKey, '24h'],
    queryFn: async () => {
      const points = await (async () => {
        try {
          return await fetchCoinbaseCandles(assetKey, 2)
        } catch {
          return await fetchKrakenCandles(assetKey, 2)
        }
      })()
      // Approximate: last close vs close ~24h ago.
      if (points.length < 2) throw new Error('Not enough candle data')
      const last = points[points.length - 1]?.price
      const prev = points[Math.max(0, points.length - 25)]?.price
      if (!Number.isFinite(last) || !Number.isFinite(prev) || prev === 0) {
        throw new Error('Change unavailable')
      }
      return ((last - prev) / prev) * 100
    },
    staleTime: 60_000,
  })
}
