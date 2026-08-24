import { useCallback, useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import type { AssetKey } from '../assets/catalog'
import { AssetIcon } from './AssetIcon'
import { Modal } from './Modal'
import { Toast } from './Toast'

type DonationTarget = {
  key: 'bitcoin' | 'ethereum' | 'base' | 'bnb'
  label: string
  /** Distinguishes the three EVM rows, which all show the same address. */
  subtitle: string
  networkNotice: string
  assetKey: AssetKey
  address: string
  /**
   * What the QR encodes, which is deliberately not the bare address.
   *
   * The three EVM targets share one address, so bare-address QRs would be
   * byte-identical and a wallet scanning the Base one would have no idea it was
   * not meant for mainnet — the "send only on Base" notice would be advice the
   * wallet could not act on. BIP-21 and EIP-681 carry the network instead.
   * Wallets that do not parse the URI still recover the address from it.
   */
  uri: string
  explorer: { label: string; url: string }
}

const EVM_ADDRESS = '0x7426a2709041e13e2763e7dbe4cc417a54257ec1'

const DONATION_TARGETS: DonationTarget[] = [
  {
    key: 'bitcoin',
    label: 'Bitcoin',
    subtitle: 'Bitcoin network',
    networkNotice: 'Important: send only on the Bitcoin network.',
    assetKey: 'BTC',
    address: 'bc1qz7pmqp6ufcg6e0rn3ly4gy494t67nhw46azntz',
    uri: 'bitcoin:bc1qz7pmqp6ufcg6e0rn3ly4gy494t67nhw46azntz',
    explorer: {
      label: 'View on mempool.space',
      url: 'https://mempool.space/address/bc1qz7pmqp6ufcg6e0rn3ly4gy494t67nhw46azntz',
    },
  },
  {
    key: 'ethereum',
    label: 'Ethereum',
    subtitle: 'Chain ID 1 · ERC-20',
    networkNotice: 'Important: send only on the Ethereum network (ERC-20).',
    assetKey: 'ETH',
    address: EVM_ADDRESS,
    uri: `ethereum:${EVM_ADDRESS}@1`,
    explorer: { label: 'View on Etherscan', url: `https://etherscan.io/address/${EVM_ADDRESS}` },
  },
  {
    key: 'base',
    label: 'Base',
    subtitle: 'Chain ID 8453',
    networkNotice: 'Important: send only on the Base network.',
    // Base uses an EVM address; show the familiar ETH icon.
    assetKey: 'ETH',
    address: EVM_ADDRESS,
    uri: `ethereum:${EVM_ADDRESS}@8453`,
    explorer: { label: 'View on Basescan', url: `https://basescan.org/address/${EVM_ADDRESS}` },
  },
  {
    key: 'bnb',
    label: 'BNB Chain',
    subtitle: 'Chain ID 56 · BEP-20',
    networkNotice: 'Important: send only on BNB Chain (BEP-20).',
    assetKey: 'BNB',
    address: EVM_ADDRESS,
    uri: `ethereum:${EVM_ADDRESS}@56`,
    explorer: { label: 'View on BscScan', url: `https://bscscan.com/address/${EVM_ADDRESS}` },
  },
]

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback for older/locked-down environments
    try {
      const el = document.createElement('textarea')
      el.value = text
      el.setAttribute('readonly', '')
      el.style.position = 'fixed'
      el.style.opacity = '0'
      document.body.appendChild(el)
      el.focus()
      el.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(el)
      return ok
    } catch {
      return false
    }
  }
}

export function SupportDeveloperModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [toastOpen, setToastOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<string>('')
  const [toastVariant, setToastVariant] = useState<'default' | 'error'>('default')
  const [expandedKey, setExpandedKey] = useState<DonationTarget['key'] | null>(null)

  useEffect(() => {
    if (!toastOpen) return
    const t = window.setTimeout(() => setToastOpen(false), 2400)
    return () => window.clearTimeout(t)
  }, [toastOpen])

  // Reopening should not drop the reader straight onto an address they happened
  // to expand some other time. Every exit route — the close button, Escape and
  // the backdrop — comes back through here.
  const handleClose = useCallback(() => {
    setExpandedKey(null)
    onClose()
  }, [onClose])

  const onCopy = useCallback(async (label: string, address: string) => {
    const ok = await copyText(address)
    setToastVariant(ok ? 'default' : 'error')
    setToastMessage(ok ? `${label} address copied.` : 'Could not copy. Please copy manually.')
    setToastOpen(true)
  }, [])

  return (
    <>
      <Modal open={open} title="Support the developer" onClose={handleClose}>
        <div className="supportIntro">
          Donations are optional. Please double-check the network before sending.
        </div>

        <div className="supportList" role="list">
          {DONATION_TARGETS.map((t) => {
            const expanded = expandedKey === t.key
            return (
              <section key={t.key} className="supportItem" role="listitem">
                <button
                  className={
                    expanded ? 'supportItemHeader supportItemHeaderOpen' : 'supportItemHeader'
                  }
                  type="button"
                  onClick={() => setExpandedKey((k) => (k === t.key ? null : t.key))}
                  aria-expanded={expanded}
                >
                  <div className="supportItemHeaderLeft">
                    <AssetIcon assetKey={t.assetKey} size={24} className="assetRowIcon" />
                    <div className="supportItemHeading">
                      <div className="supportItemTitle">{t.label}</div>
                      <div className="supportItemSubtitle">{t.subtitle}</div>
                    </div>
                  </div>
                  <div
                    className={expanded ? 'assetRowChevron assetRowChevronOpen' : 'assetRowChevron'}
                    aria-hidden="true"
                  >
                    ▾
                  </div>
                </button>

                {expanded ? (
                  <div className="supportItemBody">
                    {/* Kept beside the address it guards. On every row at once it
                        was four warnings in a column, which is four nobody reads. */}
                    <div className="supportItemNotice">{t.networkNotice}</div>

                    <div className="supportQrWrap" aria-label={`${t.label} donation QR code`}>
                      {/* Level M leaves ~15% of the symbol recoverable, and the
                          centred badge covers about a third of that. The default
                          level L left almost no margin for a phone camera. */}
                      <QRCodeSVG value={t.uri} size={176} level="M" className="supportQr" />
                      <div className="supportQrBadge" aria-hidden="true">
                        <AssetIcon assetKey={t.assetKey} size={26} className="assetRowIcon" />
                      </div>
                    </div>

                    {/* Wrapped in full rather than truncated in an input: people
                        verify an address by its last characters, so hiding the
                        tail defeats the check they came here to make. */}
                    <div className="supportAddress" aria-label={`${t.label} address`}>
                      {t.address}
                    </div>

                    <div className="supportActions">
                      <button
                        className="btn supportActionBtn"
                        type="button"
                        onClick={() => onCopy(t.label, t.address)}
                      >
                        Copy address
                      </button>
                      <a
                        className="btn supportActionBtn"
                        href={t.explorer.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {t.explorer.label}
                      </a>
                    </div>
                  </div>
                ) : null}
              </section>
            )
          })}
        </div>

        <div className="supportFooter muted small">
          <a
            href="https://github.com/Evirtual/bitcoin-analytics"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          <span className="supportFooterDot" aria-hidden="true">
            •
          </span>
          <a
            href="https://github.com/Evirtual/bitcoin-analytics#readme"
            target="_blank"
            rel="noopener noreferrer"
          >
            About
          </a>
        </div>
      </Modal>

      <Toast
        open={toastOpen}
        variant={toastVariant}
        message={toastMessage}
        onClose={() => setToastOpen(false)}
      />
    </>
  )
}
