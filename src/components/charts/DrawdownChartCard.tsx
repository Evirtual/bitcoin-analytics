import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts'
import type { CandlePoint, CandleRange } from './types'
import { ChartFrame } from './ChartFrame'
import { RangeToggle } from './range'
import { tooltipContentStyle, tooltipItemStyle, tooltipLabelStyle } from './chartTheme'
import { computeDrawdown } from '../../lib/series'

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
        <h2>
          {assetKey} Drawdown ({range})
        </h2>
        <RangeToggle value={range} onChange={onRangeChange} />
      </div>

      {series.length ? (
        <ChartFrame fallback={<div className="empty">Loading chart…</div>}>
          {({ width, height }) => (
            <AreaChart
              width={width}
              height={height}
              data={series}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="t" tick={{ fontSize: 12 }} minTickGap={64} />
              <YAxis tick={{ fontSize: 12 }} width={56} />
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
