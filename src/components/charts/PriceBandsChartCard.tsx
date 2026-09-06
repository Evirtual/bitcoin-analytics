import { Area, AreaChart, CartesianGrid, Line, Tooltip, XAxis, YAxis } from 'recharts'
import type { CandlePoint, CandleRange } from './types'
import { ChartFrame } from './ChartFrame'
import { RangeToggle } from './range'
import { paddedDomain, tooltipContentStyle, tooltipItemStyle, tooltipLabelStyle } from './chartTheme'
import { usd } from '../../lib/format'
import { computePriceBands } from '../../lib/series'
import { InfoTip } from '../InfoTip'

export function PriceBandsChartCard({
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
  const windowSize = range === '1D' ? 8 : range === '1W' ? 24 : 24 * 3
  const series = candles ? computePriceBands(candles, windowSize) : []

  return (
    <div className="card">
      <div className="cardHeader">
        <span className="cardHeading">
          <h2>{assetKey} Bands</h2>
          <InfoTip className="cardHeadingInfo" size={15} label="What the bands chart shows" title="Bands">
            A moving average with a shaded band two standard deviations either side of it. Price near an edge is unusual for how the market has been trading lately; a narrow band means a quiet stretch, a wide one means a violent one.
          </InfoTip>
        </span>
        <RangeToggle value={range} onChange={onRangeChange} />
      </div>

      {series.length ? (
        <ChartFrame fallback={<div className="empty">Loading chart...</div>}>
          {({ width, height }) => {
            const compact = width < 360
            return (
              <AreaChart width={width} height={height} data={series} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--chartGrid)" />
                <XAxis dataKey="t" tick={{ fontSize: compact ? 11 : 12, fill: 'var(--chartTick)' }} minTickGap={48} />
                <YAxis
                  domain={paddedDomain}
                  tick={{ fontSize: compact ? 11 : 12, fill: 'var(--chartTick)' }}
                  width={compact ? 56 : 72}
                />
                <Tooltip
                  contentStyle={tooltipContentStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipItemStyle}
                  formatter={(value, name) => {
                    if (Array.isArray(value)) {
                      const [low, high] = value.map((v) => Number(v))
                      return [
                        Number.isFinite(low) && Number.isFinite(high)
                          ? `${usd.format(low)} – ${usd.format(high)}`
                          : String(value),
                        String(name),
                      ]
                    }
                    const n = Number(value)
                    return [Number.isFinite(n) ? usd.format(n) : String(value), String(name)]
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="band"
                  stroke="transparent"
                  fill="var(--accent)"
                  fillOpacity={0.14}
                  name="Band"
                />
                <Line type="monotone" dataKey="price" dot={false} stroke="var(--accent)" strokeWidth={2} name="Price" />
                <Line type="monotone" dataKey="mid" dot={false} stroke="var(--accent2)" strokeWidth={1.7} name="Mid" />
              </AreaChart>
            )
          }}
        </ChartFrame>
      ) : (
        <div className="chartWrap">
          <div className="empty">{isLoading ? 'Loading chart...' : 'Band data unavailable'}</div>
        </div>
      )}
    </div>
  )
}
