import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Modal } from '../Modal'
import { isMobilePlatform } from '../../lib/wallet'
import { useWalletDirectory, walletConnectDeepLink } from '../../hooks/useWalletDirectory'

/**
 * The pairing step WalletConnect would otherwise draw for us.
 *
 * Its own modal is AppKit, which the provider only loads when `showQrModal` is
 * set. Rendering the pairing URI here keeps that dependency out of the app: the
 * connector still emits the URI, and a wallet only needs to be handed it.
 *
 * A desktop gets a QR code, because the wallet is on a different device. A
 * phone cannot scan its own screen, so it gets the list of wallets instead --
 * tapping one opens that app with the request already attached.
 */
export function WalletConnectQrModal({ uri, onClose }: { uri: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  // Read once: this does not change while the window is open.
  const [mobile] = useState(() => isMobilePlatform())
  const directory = useWalletDirectory(mobile)

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 2000)
    return () => window.clearTimeout(timer)
  }, [copied])

  async function copyUri() {
    try {
      await navigator.clipboard.writeText(uri)
      setCopied(true)
    } catch {
      // Clipboard access is refused often enough that failing quietly is kinder
      // than an error; the code or the list is still on screen.
    }
  }

  const wallets = directory.data ?? []

  return (
    <Modal open title={mobile ? 'Choose your wallet' : 'Scan with your wallet'} onClose={onClose}>
      <div className="stack">
        {mobile ? (
          <>
            {directory.isLoading ? <p className="muted small wcHint">Loading wallets…</p> : null}

            {wallets.length > 0 ? (
              <div className="wcWalletGrid">
                {wallets.map((wallet) => {
                  const href = walletConnectDeepLink(wallet, uri)
                  if (!href) return null
                  return (
                    <a key={wallet.id} className="wcWallet" href={href}>
                      <img className="wcWalletIcon" src={wallet.imageUrl} alt="" loading="lazy" />
                      <span className="wcWalletName">{wallet.name}</span>
                    </a>
                  )
                })}
              </div>
            ) : null}

            {/* The list is a convenience, not the mechanism: the raw link still
                reaches any wallet the phone has registered for it. */}
            <a className="btn btnPrimary wcOpenBtn" href={uri}>
              Open another wallet
            </a>
          </>
        ) : (
          <div className="wcQr">
            <QRCodeSVG value={uri} size={232} level="M" marginSize={2} />
          </div>
        )}

        <p className="muted small wcHint">
          {mobile
            ? 'Approve the connection in your wallet, then come back here.'
            : 'Open your wallet, scan this code, and approve the connection.'}
        </p>

        <button className="btn" type="button" onClick={() => void copyUri()}>
          {copied ? 'Link copied' : 'Copy connection link'}
        </button>
      </div>
    </Modal>
  )
}
