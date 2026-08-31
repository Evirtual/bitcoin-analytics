import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Modal } from '../Modal'
import { isMobilePlatform } from '../../lib/wallet'

/**
 * The pairing step WalletConnect would otherwise draw for us.
 *
 * Its own modal is AppKit, which the provider only loads when `showQrModal` is
 * set. Rendering the pairing URI here keeps that dependency out of the app
 * entirely: the connector still emits the URI, and a QR code is all a wallet
 * needs to answer it.
 */
export function WalletConnectQrModal({ uri, onClose }: { uri: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  // A phone cannot scan its own screen, so it gets a link into the wallet app
  // instead of a code. Read once: this does not change while the modal is open.
  const [mobile] = useState(() => isMobilePlatform())

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
      // Clipboard access is denied often enough that failing quietly is kinder
      // than an error: the QR code is still on screen.
    }
  }

  return (
    <Modal open title="Scan with your wallet" onClose={onClose}>
      <div className="stack">
        {mobile ? (
          <a className="btn btnPrimary wcOpenBtn" href={uri}>
            Open in wallet app
          </a>
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
