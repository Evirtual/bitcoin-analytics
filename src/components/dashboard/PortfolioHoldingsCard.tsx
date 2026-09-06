import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { ASSETS, type AssetKey } from '../../assets/catalog'
import type { AssetChainRow } from '../../hooks/useAssetBalances'
import { usd } from '../../lib/format'
import { AssetIcon } from '../AssetIcon'
import { InfoTip } from '../InfoTip'

export type HoldingRow = {
  assetKey: AssetKey
  amount: number
  price: number | undefined
  usd: number
  change24h: number | undefined
  weight: number
  byChain: AssetChainRow[]
}

function formatAmount(amount: number) {
  return amount.toLocaleString(undefined, { maximumFractionDigits: 8 })
}

function formatPrice(price: number | undefined) {
  if (price === undefined || !Number.isFinite(price)) return '—'
  // Sub-dollar assets need the extra places; anything above would only add noise.
  return price < 1
    ? `$${price.toLocaleString(undefined, { maximumFractionDigits: 6 })}`
    : usd.format(price)
}

export function PortfolioHoldingsCard({
  rows,
  totalUsd,
  isLoading,
  selectedAssetKey,
  onSelectAsset,
}: {
  rows: HoldingRow[]
  totalUsd: number
  isLoading: boolean
  selectedAssetKey: AssetKey
  onSelectAsset: (assetKey: AssetKey) => void
}) {
  const [expanded, setExpanded] = useState<AssetKey | null>(null)

  return (
    <div className="card">
      <div className="cardHeader">
        <span className="cardHeading">
          <h2>Holdings</h2>
          <InfoTip className="cardHeadingInfo" size={15} label="About holdings" title="Holdings">
            Every supported asset detected in the connected wallet, with its price, its value and its share of the
            total. Expand a row to see how the balance splits across chains.
          </InfoTip>
        </span>
        <div className="muted small">{usd.format(totalUsd)}</div>
      </div>

      {isLoading && !rows.length ? (
        <div className="holdingsEmpty muted">Loading holdings…</div>
      ) : rows.length ? (
        <div className="holdingsTable">
          <div className="holdingsHeadRow muted small" aria-hidden="true">
            <span>Asset</span>
            <span className="holdingsNum">Price</span>
            <span className="holdingsNum">Value</span>
            <span className="holdingsNum">24h</span>
            <span className="holdingsNum">Weight</span>
            <span />
          </div>

          {rows.map((row) => {
            const isOpen = expanded === row.assetKey
            const detailsId = `holding-chains-${row.assetKey}`
            const chainRows = row.byChain.filter((chain) => chain.supported)
            const change = row.change24h

            return (
              <div
                key={row.assetKey}
                className={row.assetKey === selectedAssetKey ? 'holdingsGroup holdingsGroupActive' : 'holdingsGroup'}
                style={
                  {
                    ['--rowAccent' as unknown as string]: ASSETS[row.assetKey].accent,
                  } as React.CSSProperties
                }
              >
                <button
                  className="holdingsRow"
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={detailsId}
                  onClick={() => setExpanded((prev) => (prev === row.assetKey ? null : row.assetKey))}
                >
                  <span className="holdingsAsset">
                    <AssetIcon assetKey={row.assetKey} size={22} className="assetRowIcon" />
                    <span className="holdingsAssetText">
                      <span className="holdingsAssetKey">{row.assetKey}</span>
                      <span className="holdingsAmount muted mono">{formatAmount(row.amount)}</span>
                    </span>
                  </span>

                  <span className="holdingsNum mono">{formatPrice(row.price)}</span>
                  <span className="holdingsNum mono holdingsValue">{usd.format(row.usd)}</span>
                  <span className={change === undefined ? 'holdingsNum mono muted' : change >= 0 ? 'holdingsNum mono pos' : 'holdingsNum mono neg'}>
                    {change === undefined ? '—' : `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`}
                  </span>
                  <span className="holdingsNum mono muted">{row.weight.toFixed(1)}%</span>

                  <span className={isOpen ? 'assetRowChevron assetRowChevronOpen' : 'assetRowChevron'} aria-hidden="true">
                    <ChevronDown size={16} strokeWidth={1.75} />
                  </span>
                </button>

                {isOpen ? (
                  <div id={detailsId} className="holdingsChains">
                    {chainRows.length ? (
                      chainRows.map((chain) => (
                        <div key={chain.chainId} className="holdingsChainRow">
                          <span className="holdingsChainName">{chain.chainName}</span>
                          <span className="muted small">{chain.tokenSymbol}</span>
                          <span className="holdingsNum mono">
                            {chain.error ? 'Unavailable' : chain.formatted}
                          </span>
                          <span className="holdingsNum mono muted">
                            {chain.error || row.price === undefined
                              ? '—'
                              : usd.format(chain.amount * row.price)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="muted small">No supported networks for this asset.</div>
                    )}

                    <div className="holdingsChainActions">
                      <button
                        className="btn holdingsChainBtn"
                        type="button"
                        onClick={() => onSelectAsset(row.assetKey)}
                        disabled={row.assetKey === selectedAssetKey}
                      >
                        {row.assetKey === selectedAssetKey ? 'Selected' : `Show ${row.assetKey} market charts`}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="holdingsEmpty muted">
          No supported assets detected on the connected wallet.
        </div>
      )}
    </div>
  )
}
