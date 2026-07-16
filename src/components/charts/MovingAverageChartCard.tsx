import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts'
import type { CandlePoint, CandleRange } from './types'
import { ChartFrame } from './ChartFrame'
import { RangeToggle } from './range'
import { tooltipContentStyle, tooltipItemStyle, tooltipLabelStyle } from './chartTheme'
import { usd } from '../../lib/format'
import { computeMovingAverage } from '../../lib/series'

export function MovingAverageChartCard({
  assetKey,
  range,
  onRangeChange,
  candles,
  isLoading,
}: {
  assetKey: string
  range: CandleRange
  onRangeChange: (r: CandleRange) => void
  candles: CandlePoint[] | undefined
  isLoading: boolean
}) {
  const fastWindow = range === '1D' ? 6 : 24
  const slowWindow = range === '1M' ? 24 * 7 : 48
  const series = candles ? computeMovingAverage(computeMovingAverage(candles, fastWindow), slowWindow) : []

  return (
    <div className="card">
      <div className="cardHeader">
        <h2>{assetKey} Trend</h2>
        <RangeToggle value={range} onChange={onRangeChange} />
      </div>

      {series.length ? (
        <ChartFrame fallback={<div className="empty">Loading chart...</div>}>
          {({ width, height }) => {
            const compact = width < 360
            return (
              <LineChart width={width} height={height} data={series} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--chartGrid)" />
                <XAxis dataKey="t" tick={{ fontSize: compact ? 11 : 12, fill: 'var(--chartTick)' }} minTickGap={48} />
                <YAxis tick={{ fontSize: compact ? 11 : 12, fill: 'var(--chartTick)' }} width={compact ? 56 : 72} />
                <Tooltip
                  contentStyle={tooltipContentStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipItemStyle}
                  formatter={(value, name) => {
                    const n = Number(value)
                    return [Number.isFinite(n) ? usd.format(n) : String(value), String(name)]
                  }}
                />
                <Line type="monotone" dataKey="price" dot={false} stroke="var(--accent)" strokeWidth={2} name="Price" />
                <Line type="monotone" dataKey={`ma${fastWindow}`} dot={false} stroke="var(--accent2)" strokeWidth={1.8} name={`${fastWindow}h MA`} />
                <Line type="monotone" dataKey={`ma${slowWindow}`} dot={false} stroke="var(--muted)" strokeWidth={1.5} name={`${slowWindow}h MA`} />
              </LineChart>
            )
          }}
        </ChartFrame>
      ) : (
        <div className="chartWrap">
          <div className="empty">{isLoading ? 'Loading chart...' : 'Trend data unavailable'}</div>
        </div>
      )}
    </div>
  )
}
