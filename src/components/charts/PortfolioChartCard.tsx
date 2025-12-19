import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts'
import type { CandleRange } from './types'
import { ChartFrame } from './ChartFrame'
import { RangeToggle } from './range'
import { tooltipContentStyle, tooltipItemStyle, tooltipLabelStyle } from './chartTheme'
import { usd } from '../../lib/format'

export type PortfolioItem = {
  assetKey: string
  usd: number
}

export function PortfolioChartCard({
  range,
  onRangeChange,
  items,
  isLoading,
  totalUsd,
}: {
  range: CandleRange
  onRangeChange: (r: CandleRange) => void
  items: PortfolioItem[] | undefined
  isLoading: boolean
  totalUsd: number
}) {
  return (
    <div className="card">
      <div className="cardHeader">
        <h2>Portfolio Allocation</h2>
        <RangeToggle value={range} onChange={onRangeChange} />
      </div>

      {isLoading ? (
        <div className="chartWrap" style={{ height: '16.25em' }}>
          <div className="empty">Loading…</div>
        </div>
      ) : items?.length ? (
        <ChartFrame style={{ height: '16.25em' }} fallback={<div className="empty">Loading…</div>}>
          {({ width, height }) => {
            const compactView = width < 360
            const tickFontSize = compactView ? 11 : 12
            const yAxisWidth = compactView ? 56 : 72

            return (
              <BarChart
                width={width}
                height={height}
                data={items}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid stroke="var(--chartGrid)" />
                <XAxis dataKey="assetKey" tick={{ fontSize: tickFontSize, fill: 'var(--chartTick)' }} />
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
                    return [Number.isFinite(n) ? usd.format(n) : String(value), 'Value']
                  }}
                />
                <Bar dataKey="usd" fill="var(--accent)" opacity={0.72} />
              </BarChart>
            )
          }}
        </ChartFrame>
      ) : (
        <div className="chartWrap" style={{ height: '16.25em' }}>
          <div className="empty">Data unavailable</div>
        </div>
      )}

      <div className="footnote">Total ≈ {usd.format(totalUsd)}</div>
    </div>
  )
}
