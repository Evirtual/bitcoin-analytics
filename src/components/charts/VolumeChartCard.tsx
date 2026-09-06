import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts'
import type { CandlePoint, CandleRange } from './types'
import { ChartFrame } from './ChartFrame'
import { RangeToggle } from './range'
import { tooltipContentStyle, tooltipItemStyle, tooltipLabelStyle } from './chartTheme'
import { compact } from '../../lib/format'
import { InfoTip } from '../InfoTip'

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
        <span className="cardHeading">
          <h2>
            {assetKey} Volume ({range})
          </h2>
          <InfoTip className="cardHeadingInfo" size={15} label="What the volume chart shows" title="Volume">
            How much of the asset changed hands each hour, in units of the asset. Tall bars mark the hours when a move had real trading behind it; a price move on thin volume convinces fewer people.
          </InfoTip>
        </span>
        <RangeToggle value={range} onChange={onRangeChange} />
      </div>

      {candles ? (
        <ChartFrame fallback={<div className="empty">Loading chart…</div>}>
          {({ width, height }) => {
            const compactView = width < 360
            const tickFontSize = compactView ? 11 : 12
            const yAxisWidth = compactView ? 56 : 72
            const xMinTickGap = compactView ? 40 : 64

            return (
              <BarChart
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
                    return [Number.isFinite(n) ? compact.format(n) : String(value), 'Volume']
                  }}
                />
                {/* recharts 3 never paints these bars through their entry animation --
                    the rectangle groups render empty -- so they are drawn straight away. */}
                <Bar dataKey="volume" fill="var(--accent)" opacity={0.65} isAnimationActive={false} />
              </BarChart>
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
