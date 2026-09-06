import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts'
import type { CandlePoint, CandleRange } from './types'
import { ChartFrame } from './ChartFrame'
import { RangeToggle } from './range'
import { tooltipContentStyle, tooltipItemStyle, tooltipLabelStyle } from './chartTheme'
import { computeDrawdown } from '../../lib/series'
import { InfoTip } from '../InfoTip'

export function DrawdownChartCard({
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
  const series = candles ? computeDrawdown(candles) : []

  return (
    <div className="card">
      <div className="cardHeader">
        <span className="cardHeading">
          <h2>
            {assetKey} Drawdown ({range})
          </h2>
          <InfoTip className="cardHeadingInfo" size={15} label="What the drawdown chart shows" title="Drawdown">
            How far below its own highest point the price is sitting, at each moment in the window. Zero means it is at the peak; minus five percent means it would take a five percent rise to get back there.
          </InfoTip>
        </span>
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
                    return [Number.isFinite(n) ? `${n.toFixed(2)}%` : String(value), 'Drawdown']
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="dd"
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
