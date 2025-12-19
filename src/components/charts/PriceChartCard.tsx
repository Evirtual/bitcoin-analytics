import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts'
import type { CandlePoint, CandleRange } from './types'
import { ChartFrame } from './ChartFrame'
import { RangeToggle } from './range'
import { tooltipContentStyle, tooltipItemStyle, tooltipLabelStyle } from './chartTheme'
import { usd } from '../../lib/format'

export function PriceChartCard({
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
          {assetKey} Price ({range})
        </h2>
        <RangeToggle value={range} onChange={onRangeChange} />
      </div>

      {candles ? (
        <ChartFrame fallback={<div className="empty">Loading chart…</div>}>
          {({ width, height }) => {
            const compact = width < 360
            const tickFontSize = compact ? 11 : 12
            const yAxisWidth = compact ? 56 : 72
            const xMinTickGap = compact ? 32 : 48

            return (
              <AreaChart
                width={width}
                height={height}
                data={candles}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid stroke="var(--chartGrid)" />
                <XAxis
                  dataKey="t"
                  tick={{ fontSize: tickFontSize, fill: 'var(--chartTick)' }}
                  minTickGap={xMinTickGap}
                />
                <YAxis
                  tick={{ fontSize: tickFontSize, fill: 'var(--chartTick)' }}
                  axisLine={{ stroke: 'var(--chartAxis)' }}
                  width={yAxisWidth}
                />
                <Tooltip
                  contentStyle={tooltipContentStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipItemStyle}
                  formatter={(value) => {
                    const n = Number(value)
                    return [Number.isFinite(n) ? usd.format(n) : String(value), 'Price']
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="var(--accent)"
                  fill="var(--accent)"
                  fillOpacity={0.18}
                />
              </AreaChart>
            )
          }}
        </ChartFrame>
      ) : (
        <div className="chartWrap">
          <div className="empty">{isLoading ? 'Loading chart…' : 'Chart unavailable'}</div>
        </div>
      )}
    </div>
  )
}
