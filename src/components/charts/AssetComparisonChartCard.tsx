import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts'
import type { AssetKey } from '../../assets/catalog'
import type { CandlePoint, CandleRange } from './types'
import { ChartFrame } from './ChartFrame'
import { RangeToggle } from './range'
import { tooltipContentStyle, tooltipItemStyle, tooltipLabelStyle } from './chartTheme'
import { ASSETS } from '../../assets/catalog'
import { ChartLegend } from './ChartLegend'
import { InfoTip } from '../InfoTip'
import { computeNormalizedPerformance } from '../../lib/series'

export function AssetComparisonChartCard({
  range,
  onRangeChange,
  series,
  isLoading,
}: {
  range: CandleRange
  onRangeChange: (r: CandleRange) => void
  series: Array<{ assetKey: AssetKey; candles: CandlePoint[] | undefined }>
  isLoading: boolean
}) {
  const data = computeNormalizedPerformance(series)
  const visibleAssets = series.filter((item) => item.candles?.length)

  return (
    <div className="card">
      <div className="cardHeader">
        <span className="cardHeading">
          <h2>Asset Comparison</h2>
          <InfoTip className="cardHeadingInfo" size={15} label="What the comparison chart shows" title="Asset comparison">
            Each asset's percentage change from the start of the window, so coins at wildly different prices can be read
            on one axis. Selecting BTC opens it to every asset; selecting anything else pairs it against BTC.
          </InfoTip>
        </span>
        <RangeToggle value={range} onChange={onRangeChange} />
      </div>

      <ChartLegend assetKeys={visibleAssets.map((item) => item.assetKey)} />

      {data.length && visibleAssets.length ? (
        <ChartFrame fallback={<div className="empty">Loading chart...</div>}>
          {({ width, height }) => {
            const compact = width < 360
            return (
              <LineChart width={width} height={height} data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--chartGrid)" />
                <XAxis dataKey="t" tick={{ fontSize: compact ? 11 : 12, fill: 'var(--chartTick)' }} minTickGap={48} />
                <YAxis tick={{ fontSize: compact ? 11 : 12, fill: 'var(--chartTick)' }} width={compact ? 48 : 56} />
                <Tooltip
                  contentStyle={tooltipContentStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipItemStyle}
                  formatter={(value, name) => {
                    const n = Number(value)
                    return [Number.isFinite(n) ? `${n >= 0 ? '+' : ''}${n.toFixed(2)}%` : String(value), String(name)]
                  }}
                />
                {visibleAssets.map((item) => {
                  const stable = ASSETS[item.assetKey].stable
                  return (
                    <Line
                      key={item.assetKey}
                      type="monotone"
                      dataKey={item.assetKey}
                      dot={false}
                      stroke={ASSETS[item.assetKey].accent}
                      strokeWidth={stable ? 1.25 : 2}
                      strokeOpacity={stable ? 0.45 : 1}
                      name={item.assetKey}
                    />
                  )
                })}
              </LineChart>
            )
          }}
        </ChartFrame>
      ) : (
        <div className="chartWrap">
          <div className="empty">{isLoading ? 'Loading chart...' : 'Comparison data unavailable'}</div>
        </div>
      )}
    </div>
  )
}
