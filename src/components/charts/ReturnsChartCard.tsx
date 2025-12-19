import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts'
import type { CandlePoint, CandleRange } from './types'
import { ChartFrame } from './ChartFrame'
import { RangeToggle } from './range'
import { tooltipContentStyle, tooltipItemStyle, tooltipLabelStyle } from './chartTheme'
import { computeDailyReturns } from '../../lib/series'

export function ReturnsChartCard({
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
  const dailyReturns = candles ? computeDailyReturns(candles) : []

  return (
    <div className="card">
      <div className="cardHeader">
        <h2>Daily Returns ({range})</h2>
        <RangeToggle value={range} onChange={onRangeChange} />
      </div>

      {dailyReturns.length ? (
        <ChartFrame style={{ height: '16.25em' }} fallback={<div className="empty">Loading…</div>}>
          {({ width, height }) => (
            <BarChart
              width={width}
              height={height}
              data={dailyReturns}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid stroke="var(--chartGrid)" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'var(--chartTick)' }} minTickGap={24} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--chartTick)' }} axisLine={{ stroke: 'var(--chartAxis)' }} width={56} />
              <Tooltip
                contentStyle={tooltipContentStyle}
                labelStyle={tooltipLabelStyle}
                itemStyle={tooltipItemStyle}
                formatter={(value) => {
                  const n = Number(value)
                  return [Number.isFinite(n) ? `${n.toFixed(2)}%` : String(value), 'Return']
                }}
              />
              <Bar dataKey="ret" fill="var(--accent)" opacity={0.72} />
            </BarChart>
          )}
        </ChartFrame>
      ) : (
        <div className="chartWrap">
          <div className="empty">{isLoading ? 'Loading…' : 'Data unavailable'}</div>
        </div>
      )}
    </div>
  )
}
