import { Cell, Pie, PieChart, Tooltip } from 'recharts'
import { ASSETS, type AssetKey } from '../../assets/catalog'
import { usd } from '../../lib/format'
import { ChartFrame } from './ChartFrame'
import { tooltipContentStyle, tooltipItemStyle, tooltipLabelStyle } from './chartTheme'

// The donut is sized from min(width, height), so with the legend moved
// alongside it this box is what sets both the ring's size and the card's
// height. Shorter than the market charts on purpose: there is no time axis
// here to give away, only a ring that reads fine smaller.
const ALLOCATION_CHART_HEIGHT = '14.5em'

export type PortfolioItem = {
  assetKey: AssetKey
  amount: number
  usd: number
  usdLabel?: string
}

export function PortfolioChartCard({
  items,
  isLoading,
  totalUsd,
}: {
  items: PortfolioItem[] | undefined
  isLoading: boolean
  totalUsd: number
}) {
  const data = (items ?? [])
    .filter((item) => Number.isFinite(item.usd) && item.usd > 0)
    .map((item) => ({
      ...item,
      label: item.assetKey,
      percent: totalUsd > 0 ? (item.usd / totalUsd) * 100 : 0,
    }))

  return (
    <div className="card">
      <div className="cardHeader">
        <h2>Portfolio Allocation</h2>
        <div className="muted small">{usd.format(totalUsd)}</div>
      </div>

      {isLoading ? (
        <div className="chartWrap" style={{ height: ALLOCATION_CHART_HEIGHT }}>
          <div className="empty">Loading...</div>
        </div>
      ) : data.length ? (
        <div className="allocationLayout">
          <ChartFrame style={{ height: ALLOCATION_CHART_HEIGHT }} fallback={<div className="empty">Loading...</div>}>
            {({ width, height }) => (
              <PieChart width={width} height={height}>
                <Pie
                  data={data}
                  dataKey="usd"
                  nameKey="assetKey"
                  innerRadius={Math.max(48, Math.min(width, height) * 0.24)}
                  outerRadius={Math.max(76, Math.min(width, height) * 0.38)}
                  paddingAngle={2}
                  stroke="var(--card)"
                  strokeWidth={2}
                >
                  {data.map((entry) => (
                    <Cell key={entry.assetKey} fill={ASSETS[entry.assetKey].accent} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipContentStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipItemStyle}
                  formatter={(value, _name, item) => {
                    const payload = item.payload as { percent?: number }
                    const n = Number(value)
                    const pct = payload.percent !== undefined ? ` (${payload.percent.toFixed(1)}%)` : ''
                    return [Number.isFinite(n) ? `${usd.format(n)}${pct}` : String(value), 'Value']
                  }}
                />
              </PieChart>
            )}
          </ChartFrame>

          <div className="allocationLegend">
            {data.map((item) => (
              <div key={item.assetKey} className="allocationLegendRow">
                <span
                  className="allocationSwatch"
                  style={{ background: ASSETS[item.assetKey].accent }}
                  aria-hidden="true"
                />
                <span className="allocationName">{item.assetKey}</span>
                <span className="allocationValue">{usd.format(item.usd)}</span>
                <span className="allocationPct muted">{item.percent.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="chartWrap" style={{ height: ALLOCATION_CHART_HEIGHT }}>
          <div className="empty">Connect a wallet with supported assets to see allocation.</div>
        </div>
      )}
    </div>
  )
}
