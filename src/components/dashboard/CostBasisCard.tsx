import { useState } from 'react'
import type { AssetKey } from '../../assets/catalog'
import { usd } from '../../lib/format'
import type { CostBasisSummary } from '../../lib/portfolio'
import { AssetIcon } from '../AssetIcon'

export function CostBasisCard({
  summary,
  onSetCost,
  onClearAll,
}: {
  summary: CostBasisSummary
  onSetCost: (assetKey: AssetKey, avgCost: number | undefined) => void
  onClearAll: () => void
}) {
  // Typing is held locally so a half-entered number is never parsed and
  // written back mid-keystroke; the store is updated when the field settles.
  const [drafts, setDrafts] = useState<Record<string, string>>({})

  const commit = (assetKey: AssetKey, raw: string) => {
    const trimmed = raw.trim()
    setDrafts((prev) => {
      const next = { ...prev }
      delete next[assetKey]
      return next
    })

    if (!trimmed) {
      onSetCost(assetKey, undefined)
      return
    }

    const parsed = Number(trimmed)
    onSetCost(assetKey, Number.isFinite(parsed) && parsed > 0 ? parsed : undefined)
  }

  const hasEntries = summary.pricedCount > 0

  return (
    <div className="card">
      <div className="cardHeader">
        <h2>Cost Basis &amp; P&amp;L</h2>
        {hasEntries ? (
          <button className="btn holdingsChainBtn" type="button" onClick={onClearAll}>
            Clear
          </button>
        ) : null}
      </div>

      {summary.rows.length ? (
        <>
          <div className="basisTable">
            <div className="basisHeadRow muted small" aria-hidden="true">
              <span>Asset</span>
              <span className="holdingsNum">Avg cost / unit</span>
              <span className="holdingsNum">Cost</span>
              <span className="holdingsNum">P&amp;L</span>
            </div>

            {summary.rows.map((row) => {
              const inputId = `cost-basis-${row.assetKey}`
              const draft = drafts[row.assetKey]
              const value = draft ?? (row.avgCost !== undefined ? String(row.avgCost) : '')

              return (
                <div key={row.assetKey} className="basisRow">
                  <label className="basisAsset" htmlFor={inputId}>
                    <AssetIcon assetKey={row.assetKey} size={20} className="assetRowIcon" />
                    <span className="holdingsAssetKey">{row.assetKey}</span>
                  </label>

                  <span className="basisInputCell">
                    <input
                      id={inputId}
                      className="basisInput mono"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="any"
                      placeholder="—"
                      value={value}
                      onChange={(event) =>
                        setDrafts((prev) => ({ ...prev, [row.assetKey]: event.target.value }))
                      }
                      onBlur={(event) => commit(row.assetKey, event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') event.currentTarget.blur()
                      }}
                    />
                  </span>

                  <span className="holdingsNum mono muted">
                    {row.costUsd !== undefined ? usd.format(row.costUsd) : '—'}
                  </span>

                  <span
                    className={
                      row.pnlUsd === undefined
                        ? 'holdingsNum mono muted'
                        : row.pnlUsd >= 0
                          ? 'holdingsNum mono pos'
                          : 'holdingsNum mono neg'
                    }
                  >
                    {row.pnlUsd === undefined
                      ? '—'
                      : `${row.pnlUsd >= 0 ? '+' : ''}${usd.format(row.pnlUsd)}`}
                    {row.pnlPct !== undefined ? (
                      <span className="basisPnlPct"> {row.pnlPct >= 0 ? '+' : ''}{row.pnlPct.toFixed(1)}%</span>
                    ) : null}
                  </span>
                </div>
              )
            })}
          </div>

          <div className="basisTotals">
            <div>
              <span className="muted small">Cost</span>
              <strong className="mono">{hasEntries ? usd.format(summary.totalCostUsd) : '—'}</strong>
            </div>
            <div>
              <span className="muted small">Value</span>
              <strong className="mono">{hasEntries ? usd.format(summary.totalValueUsd) : '—'}</strong>
            </div>
            <div>
              <span className="muted small">Unrealized</span>
              <strong className={hasEntries && summary.totalPnlUsd >= 0 ? 'mono pos' : hasEntries ? 'mono neg' : 'mono'}>
                {hasEntries
                  ? `${summary.totalPnlUsd >= 0 ? '+' : ''}${usd.format(summary.totalPnlUsd)} (${summary.totalPnlPct >= 0 ? '+' : ''}${summary.totalPnlPct.toFixed(1)}%)`
                  : '—'}
              </strong>
            </div>
          </div>

          <div className="footnote">
            {hasEntries && summary.missingCount
              ? `Totals cover the ${summary.pricedCount} position${summary.pricedCount === 1 ? '' : 's'} with a cost entered; ${summary.missingCount} left blank. `
              : ''}
            Costs are entered by hand and stored on this device only — a wallet balance does not
            record what was paid for it.
          </div>
        </>
      ) : (
        <div className="holdingsEmpty muted">
          Connect a wallet with supported assets to record what they cost.
        </div>
      )}
    </div>
  )
}
