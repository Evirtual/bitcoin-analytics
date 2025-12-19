import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts'
import type { CandlePoint, CandleRange } from './types'
import { ChartFrame } from './ChartFrame'
import { RangeToggle } from './range'
import { tooltipContentStyle, tooltipItemStyle, tooltipLabelStyle } from './chartTheme'
import { compact } from '../../lib/format'

export function VolumeChartCard({
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
  return (
    <div className="card">
      <div className="cardHeader">
        <h2>
          {assetKey} Volume ({range})
        </h2>
        <RangeToggle value={range} onChange={onRangeChange} />
      </div>

      {candles ? (
        <ChartFrame fallback={<div className="empty">Loading chart…</div>}>
          {({ width, height }) => (
            <BarChart
              width={width}
              height={height}
              data={candles}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid stroke="var(--chartGrid)" />
              <XAxis dataKey="t" tick={{ fontSize: 12, fill: 'var(--chartTick)' }} minTickGap={64} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--chartTick)' }} axisLine={{ stroke: 'var(--chartAxis)' }} width={72} />
              <Tooltip
                contentStyle={tooltipContentStyle}
                labelStyle={tooltipLabelStyle}
                itemStyle={tooltipItemStyle}
                formatter={(value) => {
                  const n = Number(value)
                  return [Number.isFinite(n) ? compact.format(n) : String(value), 'Volume']
                }}
              />
              <Bar dataKey="volume" fill="var(--accent)" opacity={0.65} />
            </BarChart>
          )}
        </ChartFrame>
      ) : (
        <div className="chartWrap">
          <div className="empty">{isLoading ? 'Loading chart…' : 'Chart unavailable'}</div>
        </div>
      )}
    </div>
  )
}
