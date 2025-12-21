import { useCallback, useEffect, useMemo, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import type { AssetKey } from '../assets/catalog'
import { AssetIcon } from './AssetIcon'
import { Modal } from './Modal'
import { Toast } from './Toast'

type DonationTarget = {
  key: 'bitcoin' | 'ethereum' | 'base' | 'bnb'
  label: string
  networkNotice: string
  assetKey: AssetKey
  address: string
  explorerUrl?: string
}

const DONATION_TARGETS: DonationTarget[] = [
  {
    key: 'bitcoin',
    label: 'Bitcoin',
    networkNotice: 'Important: send only on the Bitcoin network.',
    assetKey: 'BTC',
    address: 'bc1qz7pmqp6ufcg6e0rn3ly4gy494t67nhw46azntz',
  },
  {
    key: 'ethereum',
    label: 'Ethereum',
    networkNotice: 'Important: send only on the Ethereum network (ERC-20).',
    assetKey: 'ETH',
    address: '0x7426a2709041e13e2763e7dbe4cc417a54257ec1',
  },
  {
    key: 'base',
    label: 'Base',
    networkNotice: 'Important: send only on the Base network.',
    // Base uses an EVM address; show the familiar ETH icon.
    assetKey: 'ETH',
    address: '0x7426a2709041e13e2763e7dbe4cc417a54257ec1',
    explorerUrl: 'https://basescan.org/address/0x7426a2709041e13e2763e7dbe4cc417a54257ec1',
  },
  {
    key: 'bnb',
    label: 'BNB Chain',
    networkNotice: 'Important: send only on BNB Chain (BEP-20).',
    assetKey: 'BNB',
    address: '0x7426a2709041e13e2763e7dbe4cc417a54257ec1',
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

  const targets = useMemo(() => DONATION_TARGETS, [])

  useEffect(() => {
    if (!toastOpen) return
    const t = window.setTimeout(() => setToastOpen(false), 2400)
    return () => window.clearTimeout(t)
  }, [toastOpen])

  const onCopy = useCallback(async (label: string, address: string) => {
    const ok = await copyText(address)
    setToastVariant(ok ? 'default' : 'error')
    setToastMessage(ok ? `${label} address copied.` : 'Could not copy. Please copy manually.')
    setToastOpen(true)
  }, [])

  const onOpenExplorer = useCallback((url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }, [])

  return (
    <>
      <Modal open={open} title="Support the developer" onClose={onClose}>
        <div className="supportIntro">
          Donations are optional. Please double-check the network before sending.
        </div>

        <div className="supportList" role="list">
          {targets.map((t) => {
            const expanded = expandedKey === t.key
            return (
              <section key={t.key} className="supportItem" role="listitem">
                <button
                  className={expanded ? 'supportItemHeader supportItemHeaderOpen' : 'supportItemHeader'}
                  type="button"
                  onClick={() => setExpandedKey((k) => (k === t.key ? null : t.key))}
                  aria-expanded={expanded}
                >
                  <div className="supportItemHeaderLeft">
                    <AssetIcon assetKey={t.assetKey} size={18} />
                    <div className="supportItemTitle">{t.label}</div>
                  </div>
                  <div className="supportItemChevron" aria-hidden="true">
                    <span className="supportItemChevronGlyph">{expanded ? '−' : '+'}</span>
                  </div>
                </button>

                <div className="supportItemNotice">{t.networkNotice}</div>

                {expanded ? (
                  <div className="supportItemBody">
                    <div className="supportQrWrap" aria-label={`${t.label} donation QR code`}>
                      <QRCodeSVG value={t.address} size={164} className="supportQr" />
                      <div className="supportQrBadge" aria-hidden="true">
                        <AssetIcon assetKey={t.assetKey} size={26} />
                      </div>
                    </div>

                    <div className="addressRow">
                      <input
                        className="addressInput"
                        value={t.address}
                        readOnly
                        aria-label={`${t.label} address`}
                      />
                      <button
                        className="iconBtn"
                        type="button"
                        onClick={() => onCopy(t.label, t.address)}
                        aria-label={`Copy ${t.label} address`}
                        title="Copy"
                      >
                        ⧉
                      </button>
                    </div>

                    {t.explorerUrl ? (
                      <button
                        className="btn supportExplorerBtn"
                        type="button"
                        onClick={() => onOpenExplorer(t.explorerUrl!)}
                      >
                        View on Basescan
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </section>
            )
          })}
        </div>
      </Modal>

      <Toast open={toastOpen} variant={toastVariant} message={toastMessage} onClose={() => setToastOpen(false)} />
    </>
  )
}
