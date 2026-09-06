import { CartesianGrid, Line, LineChart, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts'
import type { AssetKey } from '../../assets/catalog'
import type { CandlePoint, CandleRange } from './types'
import { ChartFrame } from './ChartFrame'
import { RangeToggle } from './range'
import { tooltipContentStyle, tooltipItemStyle, tooltipLabelStyle } from './chartTheme'
import { ASSETS } from '../../assets/catalog'
import { computeRollingCorrelation } from '../../lib/series'

const BASE_ASSET: AssetKey = 'BTC'

export function CorrelationChartCard({
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
  const data = computeRollingCorrelation(series, BASE_ASSET, range)
  const visibleAssets = series.filter((item) => item.assetKey !== BASE_ASSET && item.candles?.length)

  return (
    <div className="card">
      <div className="cardHeader">
        <h2>
          Correlation vs {BASE_ASSET} ({range})
        </h2>
        <RangeToggle value={range} onChange={onRangeChange} />
      </div>

      {data.length && visibleAssets.length ? (
        <ChartFrame fallback={<div className="empty">Loading chart…</div>}>
          {({ width, height }) => {
            const compact = width < 360
            return (
              <LineChart width={width} height={height} data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--chartGrid)" />
                <XAxis
                  dataKey="t"
                  tick={{ fontSize: compact ? 11 : 12, fill: 'var(--chartTick)' }}
                  minTickGap={compact ? 40 : 64}
                />
                <YAxis
                  domain={[-1, 1]}
                  ticks={[-1, -0.5, 0, 0.5, 1]}
                  tick={{ fontSize: compact ? 11 : 12, fill: 'var(--chartTick)' }}
                  axisLine={{ stroke: 'var(--chartAxis)' }}
                  width={compact ? 48 : 56}
                  tickFormatter={(value) => Number(value).toFixed(1)}
                />
                <ReferenceLine y={0} stroke="var(--chartAxis)" />
                <Tooltip
                  contentStyle={tooltipContentStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipItemStyle}
                  formatter={(value, name) => {
                    const n = Number(value)
                    return [Number.isFinite(n) ? n.toFixed(2) : String(value), String(name)]
                  }}
                />
                {visibleAssets.map((item) => (
                  <Line
                    key={item.assetKey}
                    type="monotone"
                    dataKey={item.assetKey}
                    dot={false}
                    stroke={ASSETS[item.assetKey].accent}
                    strokeWidth={2}
                    name={item.assetKey}
                    connectNulls
                  />
                ))}
              </LineChart>
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
