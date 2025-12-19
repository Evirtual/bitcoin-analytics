import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts'
import type { CandlePoint, CandleRange } from './types'
import { ChartFrame } from './ChartFrame'
import { RangeToggle } from './range'
import { tooltipContentStyle, tooltipItemStyle, tooltipLabelStyle } from './chartTheme'
import { computeRollingVolatility } from '../../lib/series'

export function VolatilityChartCard({
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
  const series = candles ? computeRollingVolatility(candles, range) : []

  return (
    <div className="card">
      <div className="cardHeader">
        <h2>Rolling Volatility ({range})</h2>
        <RangeToggle value={range} onChange={onRangeChange} />
      </div>

      {series.length ? (
        <ChartFrame fallback={<div className="empty">Loading chart…</div>}>
          {({ width, height }) => {
            const compactView = width < 360
            const tickFontSize = compactView ? 11 : 12
            const yAxisWidth = compactView ? 48 : 56
            const xMinTickGap = compactView ? 40 : 64

            return (
              <AreaChart
                width={width}
                height={height}
                data={series}
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
                    return [Number.isFinite(n) ? `${n.toFixed(2)}%` : String(value), 'Vol']
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="vol"
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
          <div className="empty">{isLoading ? 'Loading chart…' : 'Data unavailable'}</div>
        </div>
      )}
    </div>
  )
}
