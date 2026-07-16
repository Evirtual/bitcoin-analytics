import type { CandlePoint, CandleRange } from '../components/charts/types'

export function stdev(values: number[]) {
  const n = values.length
  if (n <= 1) return 0
  let sum = 0
  for (const v of values) sum += v
  const mean = sum / n
  let ss = 0
  for (const v of values) {
    const d = v - mean
    ss += d * d
  }
  return Math.sqrt(ss / (n - 1))
}

export function computeDailyReturns(points: CandlePoint[]): Array<{ day: string; ret: number }> {
  const dayMap = new Map<string, { first?: number; last?: number }>()
  for (const p of points) {
    const day =
      typeof p.ts === 'number' && Number.isFinite(p.ts)
        ? new Date(p.ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
        : (p.t.split(',')[0] ?? p.t)
    const cur = dayMap.get(day) ?? {}
    if (cur.first === undefined) cur.first = p.price
    cur.last = p.price
    dayMap.set(day, cur)
  }

  return Array.from(dayMap.entries()).map(([day, v]) => {
    const first = v.first
    const last = v.last
    const r =
      first !== undefined && last !== undefined && Number.isFinite(first) && Number.isFinite(last) && first !== 0
        ? ((last - first) / first) * 100
        : 0
    return { day, ret: Number.isFinite(r) ? r : 0 }
  })
}

export function computeDrawdown(points: CandlePoint[]): Array<{ t: string; dd: number }> {
  return points.reduce(
    (acc, p) => {
      const price = p.price
      const nextPeak = Number.isFinite(price) ? Math.max(acc.peak, price) : acc.peak
      const dd = nextPeak > 0 && Number.isFinite(price) ? ((price - nextPeak) / nextPeak) * 100 : 0
      return {
        peak: nextPeak,
        out: acc.out.concat({ t: p.t, dd: Number.isFinite(dd) ? dd : 0 }),
      }
    },
    { peak: -Infinity, out: [] as Array<{ t: string; dd: number }> },
  ).out
}

export function computeRollingVolatility(points: CandlePoint[], range: CandleRange) {
  // Annualized realized vol computed from hourly returns.
  if (points.length < 3) return [] as Array<{ t: string; vol: number }>

  const windowHours = range === '1D' ? 6 : range === '1W' ? 24 : 24 * 7
  const periodsPerYear = 365 * 24

  const out: Array<{ t: string; vol: number }> = []
  const returns: number[] = []

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]!.price
    const cur = points[i]!.price
    const r = prev > 0 && Number.isFinite(prev) && Number.isFinite(cur) ? (cur - prev) / prev : NaN
    returns.push(r)

    if (returns.length < windowHours) continue
    const slice = returns.slice(returns.length - windowHours).filter((n) => Number.isFinite(n))
    const vol = slice.length >= 2 ? stdev(slice) * Math.sqrt(periodsPerYear) * 100 : 0
    out.push({ t: points[i]!.t, vol: Number.isFinite(vol) ? vol : 0 })
  }

  return out
}

export function computeMovingAverage(points: CandlePoint[], windowSize: number) {
  return points.map((point, index) => {
    const start = Math.max(0, index - windowSize + 1)
    const slice = points.slice(start, index + 1).filter((p) => Number.isFinite(p.price))
    const avg = slice.length ? slice.reduce((acc, p) => acc + p.price, 0) / slice.length : point.price
    return {
      ...point,
      [`ma${windowSize}`]: Number.isFinite(avg) ? avg : point.price,
    }
  })
}

export function computePriceBands(points: CandlePoint[], windowSize: number) {
  return points.map((point, index) => {
    const start = Math.max(0, index - windowSize + 1)
    const slice = points.slice(start, index + 1).map((p) => p.price).filter(Number.isFinite)
    const avg = slice.length ? slice.reduce((acc, price) => acc + price, 0) / slice.length : point.price
    const sd = stdev(slice)
    return {
      ...point,
      mid: Number.isFinite(avg) ? avg : point.price,
      upper: Number.isFinite(avg + sd * 2) ? avg + sd * 2 : point.price,
      lower: Number.isFinite(avg - sd * 2) ? avg - sd * 2 : point.price,
    }
  })
}

export function computeNormalizedPerformance(
  series: Array<{ assetKey: string; candles: CandlePoint[] | undefined }>,
) {
  const longest = series.reduce<CandlePoint[]>((acc, item) => {
    const candles = item.candles ?? []
    return candles.length > acc.length ? candles : acc
  }, [])

  return longest.map((point, index) => {
    const row: Record<string, number | string> = { t: point.t }
    for (const item of series) {
      const candles = item.candles ?? []
      const first = candles.find((p) => Number.isFinite(p.price) && p.price > 0)?.price
      const current = candles[index]?.price
      if (first && current !== undefined && Number.isFinite(current)) {
        row[item.assetKey] = ((current - first) / first) * 100
      }
    }
    return row
  })
}
