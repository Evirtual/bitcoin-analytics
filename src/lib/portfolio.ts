import type { AssetKey } from '../assets/catalog'
import type { CandlePoint } from '../components/charts/types'
import { stdev } from './series'

export type PortfolioValuePoint = { t: string; ts: number; value: number }

export type PortfolioHolding = { assetKey: AssetKey; amount: number }

export type PortfolioPosition = { assetKey: AssetKey; usd: number }

// Hourly candles, matching the granularity both market sources return.
const PERIODS_PER_YEAR = 365 * 24

/**
 * Values today's holdings back through each asset's price history.
 *
 * This is not a record of what the wallet was worth in the past — chain state
 * carries no transfer history, so past balances are unknowable here. It is the
 * current basket priced at past closes, which is what makes the shape of the
 * line meaningful even though its early levels are hypothetical.
 */
export function buildPortfolioValueSeries(
  holdings: PortfolioHolding[],
  series: Array<{ assetKey: AssetKey; candles: CandlePoint[] | undefined }>,
): PortfolioValuePoint[] {
  const amounts = new Map<AssetKey, number>()
  for (const holding of holdings) {
    if (Number.isFinite(holding.amount) && holding.amount > 0) {
      amounts.set(holding.assetKey, holding.amount)
    }
  }
  if (!amounts.size) return []

  const tracks = series
    .filter((item) => amounts.has(item.assetKey))
    .map((item) => ({
      amount: amounts.get(item.assetKey) ?? 0,
      points: (item.candles ?? []).filter(
        (p) => typeof p.ts === 'number' && Number.isFinite(p.ts) && Number.isFinite(p.price),
      ),
    }))
    .filter((track) => track.points.length > 0)

  if (!tracks.length) return []

  // The longest track sets the timeline and the others are read at their last
  // close at or before each step. Kraken and Coinbase return different candle
  // counts for the same window, so aligning by index would drift the series
  // against each other.
  const base = tracks.reduce((acc, track) => (track.points.length > acc.points.length ? track : acc), tracks[0]!)
  const cursors = tracks.map(() => 0)

  return base.points.map((basePoint) => {
    const ts = basePoint.ts as number
    let value = 0

    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i]!
      let cursor = cursors[i]!
      while (cursor + 1 < track.points.length && (track.points[cursor + 1]!.ts as number) <= ts) {
        cursor++
      }
      cursors[i] = cursor
      value += track.amount * track.points[cursor]!.price
    }

    return { t: basePoint.t, ts, value }
  })
}

export type PortfolioStats = {
  periodReturn: number
  maxDrawdown: number
  volatility: number
  startUsd: number
  endUsd: number
}

export function computePortfolioStats(points: PortfolioValuePoint[]): PortfolioStats | undefined {
  if (points.length < 2) return undefined

  const startUsd = points[0]!.value
  const endUsd = points[points.length - 1]!.value

  let peak = -Infinity
  let maxDrawdown = 0
  const returns: number[] = []

  for (let i = 0; i < points.length; i++) {
    const value = points[i]!.value
    peak = Math.max(peak, value)
    if (peak > 0) maxDrawdown = Math.min(maxDrawdown, ((value - peak) / peak) * 100)

    if (i > 0) {
      const prev = points[i - 1]!.value
      if (prev > 0) returns.push((value - prev) / prev)
    }
  }

  const volatility = returns.length >= 2 ? stdev(returns) * Math.sqrt(PERIODS_PER_YEAR) * 100 : 0

  return {
    periodReturn: startUsd > 0 ? ((endUsd - startUsd) / startUsd) * 100 : 0,
    maxDrawdown: Number.isFinite(maxDrawdown) ? maxDrawdown : 0,
    volatility: Number.isFinite(volatility) ? volatility : 0,
    startUsd,
    endUsd,
  }
}

export type PortfolioConcentration = {
  topAsset: AssetKey
  topWeight: number
  hhi: number
  effectiveAssets: number
  assetCount: number
}

/**
 * Herfindahl index over position weights. Its reciprocal reads as "how many
 * equally sized positions would be this concentrated", which is a more
 * legible number to put on a card than the index itself.
 */
export function computeConcentration(items: PortfolioPosition[]): PortfolioConcentration | undefined {
  const valid = items.filter((item) => Number.isFinite(item.usd) && item.usd > 0)
  const total = valid.reduce((acc, item) => acc + item.usd, 0)
  if (!valid.length || total <= 0) return undefined

  let hhi = 0
  let top = valid[0]!
  for (const item of valid) {
    const weight = item.usd / total
    hhi += weight * weight
    if (item.usd > top.usd) top = item
  }

  return {
    topAsset: top.assetKey,
    topWeight: (top.usd / total) * 100,
    hhi,
    effectiveAssets: hhi > 0 ? 1 / hhi : 0,
    assetCount: valid.length,
  }
}

export type PortfolioChange24h = {
  deltaUsd: number
  pct: number
  coveredUsd: number
  uncoveredCount: number
}

/**
 * Weighted 24h move across the basket. A position whose change has not
 * arrived is left out of both sides of the ratio rather than counted flat, so
 * a slow feed understates coverage instead of inventing a move.
 */
export function computePortfolio24h(
  items: PortfolioPosition[],
  changes: Map<AssetKey, number>,
): PortfolioChange24h | undefined {
  let prevUsd = 0
  let coveredUsd = 0
  let uncoveredCount = 0

  for (const item of items) {
    if (!Number.isFinite(item.usd) || item.usd <= 0) continue

    const change = changes.get(item.assetKey)
    const factor = change === undefined || !Number.isFinite(change) ? NaN : 1 + change / 100
    if (!Number.isFinite(factor) || factor <= 0) {
      uncoveredCount++
      continue
    }

    prevUsd += item.usd / factor
    coveredUsd += item.usd
  }

  if (coveredUsd <= 0 || prevUsd <= 0) return undefined

  const deltaUsd = coveredUsd - prevUsd
  return {
    deltaUsd,
    pct: (deltaUsd / prevUsd) * 100,
    coveredUsd,
    uncoveredCount,
  }
}

export type CostBasisRow = {
  assetKey: AssetKey
  amount: number
  usd: number
  avgCost: number | undefined
  costUsd: number | undefined
  pnlUsd: number | undefined
  pnlPct: number | undefined
}

export type CostBasisSummary = {
  rows: CostBasisRow[]
  totalCostUsd: number
  totalValueUsd: number
  totalPnlUsd: number
  totalPnlPct: number
  pricedCount: number
  missingCount: number
}

/**
 * Unrealized P&L against a manually entered average cost per unit. Balances
 * alone cannot produce this — what was paid for them is not in any chain
 * state this app reads, so it has to be supplied by hand.
 *
 * Totals cover only the positions that have a cost entered, so a half-filled
 * sheet reports the P&L of the half it knows rather than a total diluted by
 * positions counted as free.
 */
export function computeCostBasisSummary(
  items: Array<{ assetKey: AssetKey; amount: number; usd: number }>,
  basis: Record<string, number>,
): CostBasisSummary {
  const rows: CostBasisRow[] = []
  let totalCostUsd = 0
  let totalValueUsd = 0
  let pricedCount = 0
  let missingCount = 0

  for (const item of items) {
    if (!Number.isFinite(item.amount) || item.amount <= 0) continue

    const raw = basis[item.assetKey]
    const avgCost = typeof raw === 'number' && Number.isFinite(raw) && raw > 0 ? raw : undefined
    const costUsd = avgCost !== undefined ? avgCost * item.amount : undefined
    const pnlUsd = costUsd !== undefined ? item.usd - costUsd : undefined
    const pnlPct = costUsd !== undefined && costUsd > 0 ? ((item.usd - costUsd) / costUsd) * 100 : undefined

    if (costUsd !== undefined) {
      totalCostUsd += costUsd
      totalValueUsd += item.usd
      pricedCount++
    } else {
      missingCount++
    }

    rows.push({
      assetKey: item.assetKey,
      amount: item.amount,
      usd: item.usd,
      avgCost,
      costUsd,
      pnlUsd,
      pnlPct,
    })
  }

  const totalPnlUsd = totalValueUsd - totalCostUsd

  return {
    rows,
    totalCostUsd,
    totalValueUsd,
    totalPnlUsd,
    totalPnlPct: totalCostUsd > 0 ? (totalPnlUsd / totalCostUsd) * 100 : 0,
    pricedCount,
    missingCount,
  }
}
