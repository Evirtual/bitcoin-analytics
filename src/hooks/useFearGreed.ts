import { useQuery } from '@tanstack/react-query'

type FngResponse = {
  data?: Array<{
    value?: string
    value_classification?: string
    timestamp?: string
    time_until_update?: string
  }>
}

function toNumber(value: unknown): number {
  const n = typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : NaN
  return Number.isFinite(n) ? n : NaN
}

async function fetchFearGreedIndex(signal?: AbortSignal): Promise<{ value: number; timestampMs?: number }> {
  const url = new URL('https://api.alternative.me/fng/')
  url.searchParams.set('limit', '1')
  url.searchParams.set('format', 'json')

  const res = await fetch(url.toString(), { signal })
  if (!res.ok) throw new Error('Fear & Greed index fetch failed')

  const json = (await res.json()) as FngResponse
  const item = json.data?.[0]
  const value = toNumber(item?.value)
  if (!Number.isFinite(value)) throw new Error('Fear & Greed index unavailable')

  const tsSeconds = toNumber(item?.timestamp)
  const timestampMs = Number.isFinite(tsSeconds) ? tsSeconds * 1000 : undefined

  return { value, timestampMs }
}

export function useFearGreedIndex() {
  return useQuery({
    queryKey: ['market', 'sentiment', 'index'],
    queryFn: ({ signal }) => fetchFearGreedIndex(signal),
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}
