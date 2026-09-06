import type { PortfolioConcentration, PortfolioStats } from '../../lib/portfolio'
import type { CandleRange } from '../charts/types'
import { InfoTip } from '../InfoTip'

function signed(value: number, digits = 2) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(digits)}%`
}

export function PortfolioRiskCard({
  stats,
  concentration,
  range,
  isLoading,
}: {
  stats: PortfolioStats | undefined
  concentration: PortfolioConcentration | undefined
  range: CandleRange
  isLoading: boolean
}) {
  const ready = Boolean(stats || concentration)

  return (
    <div className="card">
      <div className="cardHeader">
        <span className="cardHeading">
          <h2>Portfolio Risk ({range})</h2>
          <InfoTip className="cardHeadingInfo" size={15} label="About portfolio risk" title="Portfolio risk">
            Volatility, worst peak-to-trough fall and return, all measured on your portfolio's own value over the
            window. Top Holding is the largest position's share; Effective Assets and HHI say how concentrated the mix
            is — an HHI of 1.0 means everything sits in one asset.
          </InfoTip>
        </span>
      </div>

      {ready ? (
        <>
          <div className="riskGrid">
            <div className="riskCell">
              <span className="muted small">Volatility</span>
              <strong className="mono">{stats ? `${stats.volatility.toFixed(1)}%` : '—'}</strong>
              <span className="muted small">Annualized</span>
            </div>

            <div className="riskCell">
              <span className="muted small">Max Drawdown</span>
              <strong className={stats && stats.maxDrawdown < 0 ? 'mono neg' : 'mono'}>
                {stats ? `${stats.maxDrawdown.toFixed(2)}%` : '—'}
              </strong>
              <span className="muted small">Peak to trough</span>
            </div>

            <div className="riskCell">
              <span className="muted small">Return</span>
              <strong className={stats && stats.periodReturn >= 0 ? 'mono pos' : 'mono neg'}>
                {stats ? signed(stats.periodReturn) : '—'}
              </strong>
              <span className="muted small">Over {range}</span>
            </div>

            <div className="riskCell">
              <span className="muted small">Top Holding</span>
              <strong className="mono">
                {concentration ? `${concentration.topWeight.toFixed(1)}%` : '—'}
              </strong>
              <span className="muted small">{concentration ? concentration.topAsset : '—'}</span>
            </div>

            <div className="riskCell">
              <span className="muted small">Effective Assets</span>
              <strong className="mono">
                {concentration ? concentration.effectiveAssets.toFixed(2) : '—'}
              </strong>
              <span className="muted small">
                {concentration ? `of ${concentration.assetCount} held` : '—'}
              </span>
            </div>

            <div className="riskCell">
              <span className="muted small">Concentration</span>
              <strong className="mono">{concentration ? concentration.hhi.toFixed(3) : '—'}</strong>
              <span className="muted small">HHI, 1.0 = single asset</span>
            </div>
          </div>

          <div className="footnote">
            Volatility, drawdown and return are measured on the value line, so they carry its
            assumption: today&apos;s balances priced at past closes.
          </div>
        </>
      ) : (
        <div className="holdingsEmpty muted">
          {isLoading ? 'Loading risk metrics…' : 'Risk metrics need at least one priced holding.'}
        </div>
      )}
    </div>
  )
}
