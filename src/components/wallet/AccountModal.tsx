import type { Address } from 'viem'
import type { AssetKey } from '../../assets/catalog'
import { ASSETS } from '../../assets/catalog'
import { usd } from '../../lib/format'
import { Modal } from '../Modal'
import { AssetIcon } from '../AssetIcon'
import { ConnectorList } from './ConnectorList'

type GasRow = { chainName: string; formatted: string; symbol: string }

type AssetTotal = { assetKey: AssetKey; totalAmount: number }

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
  portfolioTotalUsd: number
}) {
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
            ) : assetTotals.data?.some((a) => a.totalAmount > 0) ? (
              assetTotals.data
                .filter((a) => a.totalAmount > 0)
                .map((a) => {
                  const price = spotMany.data.get(a.assetKey)
                  const v = price !== undefined ? price * a.totalAmount : undefined
                  return (
                    <button
                      key={a.assetKey}
                      className={a.assetKey === selectedAssetKey ? 'assetRow assetRowActive' : 'assetRow'}
                      onClick={() => onSelectAsset(a.assetKey)}
                      style={
                        {
                          ['--rowAccent' as unknown as string]: ASSETS[a.assetKey].accent,
                          ['--rowAccentSoft' as unknown as string]: ASSETS[a.assetKey].accentSoft,
                        } as React.CSSProperties
                      }
                    >
                      <div className="assetLeft">
                        <AssetIcon assetKey={a.assetKey} size={24} className="assetRowIcon" />
                        <div>
                          <div className="rowTitle">{a.assetKey}</div>
                          <div className="rowSub muted">{ASSETS[a.assetKey].label}</div>
                        </div>
                      </div>
                      <div className="rightStack">
                        <div className="mono">
                          {a.totalAmount.toLocaleString(undefined, { maximumFractionDigits: 8 })}
                        </div>
                        <div className="rowSub muted">{v !== undefined ? usd.format(v) : '—'}</div>
                      </div>
                    </button>
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
