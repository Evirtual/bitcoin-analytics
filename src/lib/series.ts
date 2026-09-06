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

function toReturns(points: CandlePoint[]): Array<{ t: string; r: number }> {
  const out: Array<{ t: string; r: number }> = []
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]!.price
    const cur = points[i]!.price
    const r = prev > 0 && Number.isFinite(prev) && Number.isFinite(cur) ? (cur - prev) / prev : NaN
    out.push({ t: points[i]!.t, r })
  }
  return out
}

function pearson(xs: number[], ys: number[]) {
  const paired: Array<[number, number]> = []
  for (let i = 0; i < xs.length; i++) {
    const x = xs[i]!
    const y = ys[i]!
    if (Number.isFinite(x) && Number.isFinite(y)) paired.push([x, y])
  }
  if (paired.length < 3) return NaN

  let mx = 0
  let my = 0
  for (const [x, y] of paired) {
    mx += x
    my += y
  }
  mx /= paired.length
  my /= paired.length

  let sxy = 0
  let sxx = 0
  let syy = 0
  for (const [x, y] of paired) {
    const dx = x - mx
    const dy = y - my
    sxy += dx * dy
    sxx += dx * dx
    syy += dy * dy
  }

  const den = Math.sqrt(sxx * syy)
  return den > 0 ? sxy / den : NaN
}

export function computeRollingCorrelation(
  series: Array<{ assetKey: string; candles: CandlePoint[] | undefined }>,
  baseKey: string,
  range: CandleRange,
) {
  // Rolling Pearson correlation of hourly returns against the base asset.
  const base = series.find((item) => item.assetKey === baseKey)?.candles ?? []
  const others = series.filter((item) => item.assetKey !== baseKey && (item.candles?.length ?? 0) > 2)
  if (base.length < 3 || !others.length) return [] as Array<Record<string, number | string>>

  const windowHours = range === '1D' ? 6 : range === '1W' ? 24 : 24 * 7
  const baseReturns = toReturns(base)
  if (baseReturns.length < windowHours) return [] as Array<Record<string, number | string>>

  // Align by timestamp label so assets with gaps don't drift against the base.
  const otherReturns = others.map((item) => ({
    assetKey: item.assetKey,
    byTime: new Map(toReturns(item.candles ?? []).map((p) => [p.t, p.r])),
  }))

  const out: Array<Record<string, number | string>> = []
  for (let i = windowHours - 1; i < baseReturns.length; i++) {
    const window = baseReturns.slice(i - windowHours + 1, i + 1)
    const row: Record<string, number | string> = { t: baseReturns[i]!.t }
    for (const other of otherReturns) {
      const xs = window.map((p) => p.r)
      const ys = window.map((p) => other.byTime.get(p.t) ?? NaN)
      const c = pearson(xs, ys)
      if (Number.isFinite(c)) row[other.assetKey] = c
    }
    out.push(row)
  }

  return out
}
