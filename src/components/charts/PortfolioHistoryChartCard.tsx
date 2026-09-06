import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts'
import { compact, usd } from '../../lib/format'
import type { PortfolioStats, PortfolioValuePoint } from '../../lib/portfolio'
import { ChartFrame } from './ChartFrame'
import { RangeToggle } from './range'
import { paddedDomain, tooltipContentStyle, tooltipItemStyle, tooltipLabelStyle } from './chartTheme'
import type { CandleRange } from './types'

export function PortfolioHistoryChartCard({
  points,
  stats,
  range,
  onRangeChange,
  isLoading,
}: {
  points: PortfolioValuePoint[]
  stats: PortfolioStats | undefined
  range: CandleRange
  onRangeChange: (r: CandleRange) => void
  isLoading: boolean
}) {
  return (
    <div className="card">
      <div className="cardHeader">
        <h2>Portfolio Value ({range})</h2>
        <RangeToggle value={range} onChange={onRangeChange} />
      </div>

      {points.length > 1 ? (
        <>
          <div className="portfolioHistoryMeta">
            <div>
              <span className="muted small">Start</span>
              <strong className="mono">{stats ? usd.format(stats.startUsd) : '-'}</strong>
            </div>
            <div>
              <span className="muted small">Now</span>
              <strong className="mono">{stats ? usd.format(stats.endUsd) : '-'}</strong>
            </div>
            <div>
              <span className="muted small">Change</span>
              <strong className={stats && stats.periodReturn >= 0 ? 'mono pos' : 'mono neg'}>
                {stats
                  ? `${stats.periodReturn >= 0 ? '+' : ''}${stats.periodReturn.toFixed(2)}%`
                  : '-'}
              </strong>
            </div>
          </div>

          <ChartFrame fallback={<div className="empty">Loading chart…</div>}>
            {({ width, height }) => {
              const compactView = width < 360
              const tickFontSize = compactView ? 11 : 12
              const yAxisWidth = compactView ? 52 : 64
              const xMinTickGap = compactView ? 40 : 64

              return (
                <LineChart
                  width={width}
                  height={height}
                  data={points}
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
                    domain={paddedDomain}
                    tickFormatter={(value) => {
                      const n = Number(value)
                      return Number.isFinite(n) ? `$${compact.format(n)}` : ''
                    }}
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
                  <Line
                    type="monotone"
                    dataKey="value"
                    dot={false}
                    stroke="var(--accent)"
                    strokeWidth={2}
                  />
                </LineChart>
              )
            }}
          </ChartFrame>

          <div className="footnote">
            Today&apos;s balances priced at past closes. Wallet balances carry no transfer history, so
            this is what the current basket would have been worth — not what was actually held.
          </div>
        </>
      ) : (
        <div className="chartWrap">
          <div className="empty">
            {isLoading ? 'Loading chart…' : 'Connect a wallet with supported assets to see value over time.'}
          </div>
        </div>
      )}
    </div>
  )
}
