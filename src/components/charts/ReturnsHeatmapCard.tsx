import type { CandlePoint, CandleRange } from './types'
import { RangeToggle } from './range'
import { computeDailyReturns } from '../../lib/series'

function heatClass(value: number) {
  if (value >= 5) return 'heatCell heatCellStrongPos'
  if (value >= 1) return 'heatCell heatCellPos'
  if (value <= -5) return 'heatCell heatCellStrongNeg'
  if (value <= -1) return 'heatCell heatCellNeg'
  return 'heatCell heatCellFlat'
}

export function ReturnsHeatmapCard({
  range,
  onRangeChange,
  candles,
  isLoading,
}: {
  range: CandleRange
  onRangeChange: (r: CandleRange) => void
  candles: CandlePoint[] | undefined
  isLoading: boolean
}) {
  const returns = candles ? computeDailyReturns(candles) : []

  return (
    <div className="card">
      <div className="cardHeader">
        <h2>Return Heatmap</h2>
        <RangeToggle value={range} onChange={onRangeChange} />
      </div>

      {returns.length ? (
        <div className="heatGrid">
          {returns.map((row) => (
            <div key={row.day} className={heatClass(row.ret)} title={`${row.day}: ${row.ret.toFixed(2)}%`}>
              <span>{row.day}</span>
              <strong>{row.ret >= 0 ? '+' : ''}{row.ret.toFixed(1)}%</strong>
            </div>
          ))}
        </div>
      ) : (
        <div className="chartWrap">
          <div className="empty">{isLoading ? 'Loading...' : 'Return data unavailable'}</div>
        </div>
      )}
    </div>
  )
}
