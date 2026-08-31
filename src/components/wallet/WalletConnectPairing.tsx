import { useEffect, useMemo, useState } from 'react'
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
 * Both halves of the official flow are offered, defaulting to whichever suits
 * the device: a phone opens on the wallet list, because it can hand the request
 * straight to an app and cannot scan its own screen; a desktop opens on the
 * code, because the wallet is on the other device. Either can be switched to.
 */
export function WalletConnectPairing({
  uri,
  mobile,
}: {
  uri: string | undefined
  mobile: boolean
}) {
  const [copied, setCopied] = useState(false)
  const [showQr, setShowQr] = useState(!mobile)
  const [search, setSearch] = useState('')
  const directory = useWalletDirectory(true)

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

  // A fresh [] each render would re-run the filter below every time.
  const wallets = useMemo(() => directory.data ?? [], [directory.data])
  const waiting = !uri

  const matches = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return wallets
    return wallets.filter((wallet) => wallet.name.toLowerCase().includes(term))
  }, [search, wallets])

  return (
    <div className="stack">
      {showQr ? (
        <div className={waiting ? 'wcQr wcQrWaiting' : 'wcQr'}>
          {uri ? (
            <QRCodeSVG value={uri} size={232} level="M" marginSize={2} />
          ) : (
            <span className="wcQrSpinner" aria-hidden="true" />
          )}
        </div>
      ) : (
        <>
          {wallets.length > 0 ? (
            <input
              className="wcSearch"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search wallets"
              aria-label="Search wallets"
            />
          ) : null}

          <div className="wcWalletGrid">
            {wallets.length === 0
              ? Array.from({ length: SKELETON_TILES }, (_, i) => (
                  <div className="wcWallet wcWalletSkeleton" key={i} aria-hidden="true">
                    <span className="wcWalletIcon wcSkeletonBlock" />
                    <span className="wcSkeletonLine" />
                  </div>
                ))
              : matches.map((wallet) => {
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
                })}
          </div>

          {wallets.length > 0 && matches.length === 0 ? (
            <p className="muted small wcHint">No wallet matches “{search.trim()}”.</p>
          ) : null}
        </>
      )}

      <p className="muted small wcHint">
        {waiting
          ? 'Preparing the connection request…'
          : showQr
            ? 'Open your wallet, scan this code, and approve the connection.'
            : 'Pick your wallet, approve the connection, then come back here.'}
      </p>

      <button className="btn" type="button" onClick={() => setShowQr((v) => !v)}>
        {showQr ? 'Choose a wallet' : 'Show QR code'}
      </button>

      <button className="btn" type="button" onClick={() => void copyUri()} disabled={waiting}>
        {copied ? 'Link copied' : 'Copy connection link'}
      </button>
    </div>
  )
}
