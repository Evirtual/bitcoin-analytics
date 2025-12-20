import type { Chain } from 'viem'
import type { AssetKey } from '../../assets/catalog'
import { ASSETS } from '../../assets/catalog'
import { Modal } from '../Modal'

function getChainLabel(chain: Chain | undefined): string {
  if (!chain?.name) return 'your selected network'
  return chain.name
}

type SwapTarget = {
  id: 'jumper' | 'uniswap' | '1inch' | 'aerodrome'
  label: string
  url: string
  supportedChainIds?: number[]
}

function isSupportedOnChain(target: SwapTarget, chainId: number | undefined): boolean {
  if (!target.supportedChainIds?.length) return true
  if (!chainId) return true
  return target.supportedChainIds.includes(chainId)
}

export function SwapModal({
  open,
  onClose,
  assetKey,
  chain,
  isConnected,
}: {
  open: boolean
  onClose: () => void
  assetKey: AssetKey
  chain: Chain | undefined
  isConnected: boolean
}) {
  const asset = ASSETS[assetKey]

  const chainId = chain?.id
  const targets: SwapTarget[] = [
    {
      id: 'jumper',
      label: 'Jumper (LI.FI)',
      url: 'https://jumper.exchange/',
      supportedChainIds: [1, 8453, 56],
    },
    {
      id: 'aerodrome',
      label: 'Aerodrome',
      url: 'https://aerodrome.finance/swap',
      supportedChainIds: [8453],
    },
    {
      id: 'uniswap',
      label: 'Uniswap',
      url: 'https://app.uniswap.org/swap',
      supportedChainIds: [1, 8453],
    },
    {
      id: '1inch',
      label: '1inch',
      url: 'https://app.1inch.io/',
      supportedChainIds: [1, 8453, 56],
    },
  ]

  const visibleTargets = targets.filter((t) => isSupportedOnChain(t, chainId))

  return (
    <Modal open={open} title="Swap" onClose={onClose}>
      {!isConnected ? (
        <div className="banner">
          <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>Connect a wallet to swap</div>
          <div className="muted small">
            Swaps are executed through an external aggregator so you can approve tokens and sign the
            transaction in your wallet.
          </div>
        </div>
      ) : null}

      <div className="banner" style={{ marginTop: '0.75rem' }}>
        <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>About swaps in this dashboard</div>
        <div className="muted small">
          This dashboard tracks {asset.label} across Ethereum, Base, and BSC using wrapped tokens
          (e.g. WBTC/BTCB). Swaps happen on the currently selected wallet network ({getChainLabel(chain)}).
        </div>
      </div>

      <div className="banner" style={{ marginTop: '0.75rem' }}>
        <div style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Choose a swap app</div>
        <div className="swapGrid">
          {visibleTargets.length ? (
            visibleTargets.map((t) => (
              <button
                key={t.id}
                className="btn btnPrimary"
                type="button"
                title={`Open ${t.label}`}
                onClick={() => {
                  window.open(t.url, '_blank', 'noopener,noreferrer')
                }}
              >
                Open {t.label}
              </button>
            ))
          ) : (
            <div className="muted small">
              No swap apps are configured for {getChainLabel(chain)}.
            </div>
          )}
        </div>
        {visibleTargets.length ? (
          <div className="muted small" style={{ marginTop: '0.5rem' }}>
            Tip: if the swap site shows a different network, switch networks in your wallet first.
          </div>
        ) : null}
      </div>

      <div
        style={{
          display: 'flex',
          gap: '0.625rem',
          justifyContent: 'flex-end',
          marginTop: '0.875rem',
          flexWrap: 'wrap',
        }}
      >
        <button className="pill pillBtn" type="button" onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  )
}
