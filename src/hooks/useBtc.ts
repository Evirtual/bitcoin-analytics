import { useQuery } from '@tanstack/react-query'

type CoinCapAssetResponse = {
  data?: {
    priceUsd?: string
    changePercent24Hr?: string
    marketCapUsd?: string
    volumeUsd24Hr?: string
  }
}

type CoinCapHistoryResponse = {
  data?: Array<{ time: number; priceUsd: string }>
}

export function useBtcPriceUsd() {
  return useQuery({
    queryKey: ['btc', 'price', 'usd'],
    queryFn: async () => {
      const res = await fetch('https://api.coincap.io/v2/assets/bitcoin')
      if (!res.ok) throw new Error('Failed to fetch BTC price')
      const json = (await res.json()) as CoinCapAssetResponse
      const priceUsd = json.data?.priceUsd
      const price = priceUsd ? Number(priceUsd) : NaN
      if (!Number.isFinite(price)) throw new Error('BTC price unavailable')
      return price
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
  })
}

export function useBtcOverview() {
  return useQuery({
    queryKey: ['btc', 'overview'],
    queryFn: async () => {
      const res = await fetch('https://api.coincap.io/v2/assets/bitcoin')
      if (!res.ok) throw new Error('Failed to fetch BTC stats')
      const json = (await res.json()) as CoinCapAssetResponse
      const price = Number(json.data?.priceUsd)
      const change24h = Number(json.data?.changePercent24Hr)
      const marketCap = Number(json.data?.marketCapUsd)
      const volume24h = Number(json.data?.volumeUsd24Hr)
      if (![price, change24h, marketCap, volume24h].every(Number.isFinite)) {
        throw new Error('BTC stats unavailable')
      }
      return { price, change24h, marketCap, volume24h }
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
  })
}

export function useBtcMarketChart() {
  return useQuery({
    queryKey: ['btc', 'market_chart', '7d'],
    queryFn: async () => {
      const end = Date.now()
      const start = end - 7 * 24 * 60 * 60 * 1000
      const res = await fetch(
        `https://api.coincap.io/v2/assets/bitcoin/history?interval=h1&start=${start}&end=${end}`,
      )
      if (!res.ok) throw new Error('Failed to fetch BTC chart')
      const json = (await res.json()) as CoinCapHistoryResponse
      const points = json.data ?? []
      return points
        .map((p) => ({
          ts: p.time,
          price: Number(p.priceUsd),
        }))
        .filter((p) => Number.isFinite(p.price))
        .map((p) => ({
          t: new Date(p.ts).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit' }),
          price: p.price,
        }))
    },
    staleTime: 5 * 60_000,
  })
}
