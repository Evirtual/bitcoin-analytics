import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useWalletDirectory, walletConnectDeepLink } from '../../hooks/useWalletDirectory'

/** Placeholder tiles, so the step has its final shape before the list arrives. */
const SKELETON_TILES = 8

/**
 * The pairing step WalletConnect would otherwise draw for us.
 *
 * Its own window is AppKit, which the provider loads only when `showQrModal` is
 * set, so rendering the request here keeps that dependency out of the app.
 *
 * The request itself takes a moment to be issued, and the wallet list is
 * fetched, so both have a resting state rather than an empty window: a wallet
 * on a phone, a code on a desktop, where the wallet is on another device.
 */
export function WalletConnectPairing({
  uri,
  mobile,
}: {
  uri: string | undefined
  mobile: boolean
}) {
  const [copied, setCopied] = useState(false)
  const directory = useWalletDirectory(mobile)

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 2000)
    return () => window.clearTimeout(timer)
  }, [copied])

  async function copyUri() {
    if (!uri) return
    try {
      await navigator.clipboard.writeText(uri)
      setCopied(true)
    } catch {
      // Refused often enough that failing quietly is kinder than an error; the
      // code or the list is still on screen.
    }
  }

  const wallets = directory.data ?? []
  const waiting = !uri

  return (
    <div className="stack">
      {mobile ? (
        <div className="wcWalletGrid">
          {wallets.length > 0
            ? wallets.map((wallet) => {
                const href = uri ? walletConnectDeepLink(wallet, uri) : undefined
                return (
                  <a
                    key={wallet.id}
                    className={href ? 'wcWallet' : 'wcWallet wcWalletWaiting'}
                    href={href ?? undefined}
                    aria-disabled={href ? undefined : true}
                  >
                    <img className="wcWalletIcon" src={wallet.imageUrl} alt="" loading="lazy" />
                    <span className="wcWalletName">{wallet.name}</span>
                  </a>
                )
              })
            : Array.from({ length: SKELETON_TILES }, (_, i) => (
                <div className="wcWallet wcWalletSkeleton" key={i} aria-hidden="true">
                  <span className="wcWalletIcon wcSkeletonBlock" />
                  <span className="wcSkeletonLine" />
                </div>
              ))}
        </div>
      ) : (
        <div className={waiting ? 'wcQr wcQrWaiting' : 'wcQr'}>
          {uri ? (
            <QRCodeSVG value={uri} size={232} level="M" marginSize={2} />
          ) : (
            <span className="wcQrSpinner" aria-hidden="true" />
          )}
        </div>
      )}

      <p className="muted small wcHint">
        {waiting
          ? 'Preparing the connection request…'
          : mobile
            ? 'Pick your wallet, approve the connection, then come back here.'
            : 'Open your wallet, scan this code, and approve the connection.'}
      </p>

      {mobile && uri ? (
        <a className="btn btnPrimary wcOpenBtn" href={uri}>
          Open another wallet
        </a>
      ) : null}

      <button className="btn" type="button" onClick={() => void copyUri()} disabled={waiting}>
        {copied ? 'Link copied' : 'Copy connection link'}
      </button>
    </div>
  )
}
