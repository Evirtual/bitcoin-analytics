import { useEffect, useMemo, useState } from 'react'
import type { Address } from 'viem'
import type { AssetKey, ChainId } from '../../assets/catalog'
import { ASSETS } from '../../assets/catalog'
import { useAssetBalances } from '../../hooks/useAssetBalances'
import { usd } from '../../lib/format'
import { Modal } from '../Modal'
import { AssetIcon } from '../AssetIcon'
import { ConnectorList } from './ConnectorList'

type GasRow = { chainName: string; formatted: string; symbol: string }

type AssetTotal = { assetKey: AssetKey; totalAmount: number }

function AssetBalanceDetails({
  address,
  assetKey,
  chainIds,
  priceUsd,
}: {
  address: Address
  assetKey: AssetKey
  chainIds: ChainId[]
  priceUsd: number | undefined
}) {
  const q = useAssetBalances(address, assetKey, chainIds)

  if (q.isLoading) return <div className="assetDetails muted">Loading network balances…</div>
  if (!q.data) return <div className="assetDetails muted">Network balances unavailable.</div>

  return (
    <div className="assetDetails">
      <div className="assetDetailsHeader muted small">Per network</div>
      <div className="assetDetailsGrid">
        {q.data.byChain.map((r) => {
          const usdValue = priceUsd !== undefined ? priceUsd * r.amount : undefined
          return (
            <div key={r.chainId} className="assetDetailsRow">
              <div className="assetDetailsLeft">
                <div className="assetDetailsChain">{r.chainName}</div>
                <div className="assetDetailsMeta muted small">
                  {r.supported ? r.tokenSymbol : 'Not supported'}
                </div>
              </div>
              <div className="assetDetailsRight">
                <div className="mono">
                  {r.supported ? r.formatted : '—'}
                </div>
                <div className="muted small">{usdValue !== undefined && r.supported ? usd.format(usdValue) : '—'}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function AccountModal<T extends { uid: string; name: string }>({
  open,
  onClose,
  isConnected,
  address,
  connectors,
  disabled,
  onSelectConnector,
  gas,
  onDisconnect,
  assetTotals,
  spotMany,
  selectedAssetKey,
  onSelectAsset,
  chainIds,
  portfolioTotalUsd,
}: {
  open: boolean
  onClose: () => void
  isConnected: boolean
  address: Address | undefined
  connectors: readonly T[]
  disabled: boolean
  onSelectConnector: (connector: T) => void
  gas: { isLoading: boolean; data: GasRow[] | undefined }
  onDisconnect: () => void
  assetTotals: { isLoading: boolean; data: AssetTotal[] | undefined }
  spotMany: { isLoading: boolean; data: Map<AssetKey, number> }
  selectedAssetKey: AssetKey
  onSelectAsset: (assetKey: AssetKey) => void
  chainIds: ChainId[]
  portfolioTotalUsd: number
}) {
  const [expandedAssetKey, setExpandedAssetKey] = useState<AssetKey | null>(null)

  useEffect(() => {
    if (!open) setExpandedAssetKey(null)
  }, [open])

  const totals = useMemo(() => {
    const rows = assetTotals.data ?? []
    return rows.filter((a) => a.totalAmount > 0)
  }, [assetTotals.data])

  return (
    <Modal open={open} title="Account" onClose={onClose}>
      {!isConnected ? (
        <div className="stack">
          <div className="muted small">Not connected</div>
          <ConnectorList connectors={connectors} disabled={disabled} onSelect={onSelectConnector} />
        </div>
      ) : (
        <div className="stack">
          <div className="accountTop">
            <div>
              <div className="muted small">Address</div>
              <div className="mono">{address}</div>
              <div className="muted small" style={{ marginTop: '0.375em' }}>
                Gas:{' '}
                {gas.isLoading
                  ? 'Loading…'
                  : gas.data
                    ? gas.data.map((g) => `${g.chainName} ${g.formatted} ${g.symbol}`).join(' • ')
                    : 'Unavailable'}
              </div>
            </div>
            <button className="btn" onClick={onDisconnect}>
              Disconnect
            </button>
          </div>

          <div className="divider" />

          <div className="muted small">Balances (supported assets)</div>

          <div className="assetList">
            {assetTotals.isLoading || spotMany.isLoading ? (
              <div className="muted">Loading…</div>
            ) : totals.length ? (
              totals.map((a) => {
                const price = spotMany.data.get(a.assetKey)
                const v = price !== undefined ? price * a.totalAmount : undefined
                const expanded = expandedAssetKey === a.assetKey
                const detailsId = `asset-details-${a.assetKey}`
                return (
                  <div
                    key={a.assetKey}
                    className="assetRowWrap"
                    style={
                      {
                        ['--rowAccent' as unknown as string]: ASSETS[a.assetKey].accent,
                        ['--rowAccentSoft' as unknown as string]: ASSETS[a.assetKey].accentSoft,
                      } as React.CSSProperties
                    }
                  >
                    <button
                      className={a.assetKey === selectedAssetKey ? 'assetRow assetRowActive' : 'assetRow'}
                      onClick={() => {
                        onSelectAsset(a.assetKey)
                        setExpandedAssetKey((prev) => (prev === a.assetKey ? null : a.assetKey))
                      }}
                      type="button"
                      aria-expanded={expanded}
                      aria-controls={detailsId}
                    >
                      <div className="assetLeft">
                        <AssetIcon assetKey={a.assetKey} size={24} className="assetRowIcon" />
                        <div>
                          <div className="rowTitle">{a.assetKey}</div>
                          <div className="rowSub muted">{ASSETS[a.assetKey].label}</div>
                        </div>
                      </div>
                      <div className="assetRowRight">
                        <div className="rightStack">
                          <div className="mono">
                            {a.totalAmount.toLocaleString(undefined, { maximumFractionDigits: 8 })}
                          </div>
                          <div className="rowSub muted">{v !== undefined ? usd.format(v) : '—'}</div>
                        </div>
                        <div className={expanded ? 'assetRowChevron assetRowChevronOpen' : 'assetRowChevron'} aria-hidden="true">
                          ▾
                        </div>
                      </div>
                    </button>

                    {expanded && address ? (
                      <div id={detailsId} className="assetRowDetails">
                        <AssetBalanceDetails
                          address={address}
                          assetKey={a.assetKey}
                          chainIds={chainIds}
                          priceUsd={price}
                        />
                      </div>
                    ) : null}
                  </div>
                )
              })
            ) : (
              <div className="muted">No supported assets detected.</div>
            )}
          </div>

          <div className="footnote">Portfolio total ≈ {usd.format(portfolioTotalUsd)}</div>
        </div>
      )}
    </Modal>
  )
}
