import { Modal } from '../Modal'
import { ConnectorList } from './ConnectorList'
import { WalletConnectPairing } from './WalletConnectPairing'
import { useMemo } from 'react'
import { useWalletRows } from '../../hooks/useWalletRows'
import { useWalletDirectory } from '../../hooks/useWalletDirectory'
import { connectorMark, normalizeConnectorName, type ConnectorLike } from '../../lib/wallet'

/**
 * The whole connect flow, as one window that changes step.
 *
 * Picking a wallet used to close this and leave the user watching a header
 * button, with a second window stacked on top for WalletConnect. Each step now
 * replaces the last in place, and every one of them can be backed out of, so
 * there is always a way to reach a different wallet.
 */
export function ConnectWalletModal<T extends ConnectorLike>({
  open,
  onClose,
  connectors,
  pending,
  walletConnectUri,
  errorText,
  onSelectConnector,
  onRetry,
  onBack,
}: {
  open: boolean
  onClose: () => void
  connectors: readonly T[]
  /** The wallet being waited on. Its absence means we are back at the list. */
  pending?: { uid: string; id: string; name: string; icon?: string | undefined } | undefined
  walletConnectUri?: string | undefined
  errorText?: string | undefined
  onSelectConnector: (connector: T) => void
  onRetry: () => void
  onBack: () => void
}) {
  const { rows, installs, mobile, nothingDetected, hasWalletConnect } = useWalletRows(connectors)

  // A wallet that is not installed announces nothing, so it has no icon of
  // its own to show. WalletConnect’s registry knows what they look like, and
  // the pairing step fetches it anyway -- asking for it here means the list
  // is drawn properly and that step opens already loaded.
  const directory = useWalletDirectory(open)
  const directoryIcons = useMemo(() => {
    const byName: Record<string, string> = {}
    for (const wallet of directory.data ?? []) {
      byName[normalizeConnectorName(wallet.name)] = wallet.imageUrl
    }
    return byName
  }, [directory.data])

  // WalletConnect hands over a pairing request rather than opening a window of
  // its own, so it gets its own step -- shown from the moment it is picked,
  // because the request takes a second or two to arrive.
  const pairing = pending?.id === 'walletConnect'

  if (pending && pairing) {
    return (
      <Modal
        size="compact"
        open={open}
        title="WalletConnect"
        onClose={onClose}
        onBack={onBack}
      >
        <WalletConnectPairing uri={walletConnectUri} mobile={mobile} />
      </Modal>
    )
  }

  if (pending) {
    return (
      <Modal size="compact" open={open} title={pending.name} onClose={onClose} onBack={onBack}>
        <div className="connectStatus">
          <div className="connectStatusMark">
            {connectorMark(pending.name, pending.icon) ? (
              <img src={connectorMark(pending.name, pending.icon)} alt="" />
            ) : null}
            {errorText ? null : <span className="connectStatusRing" aria-hidden="true" />}
          </div>
          <div className="connectStatusTitle">
            {errorText ? 'Could not connect' : `Continue in ${pending.name}`}
          </div>
          <p className="muted small connectStatusText">
            {errorText ?? 'Approve the connection request in your wallet.'}
          </p>
          {errorText ? (
            <button className="btn btnPrimary" type="button" onClick={onRetry}>
              Try again
            </button>
          ) : null}
        </div>
      </Modal>
    )
  }

  return (
    <Modal size="compact" open={open} title="Connect Wallet" onClose={onClose}>
      {mobile && nothingDetected ? (
        <p className="muted small connectHint">
          No wallet was found in this browser.{' '}
          {hasWalletConnect
            ? 'Pair one with WalletConnect, or open this site from inside your wallet’s own browser.'
            : 'Open this site from inside your wallet’s own browser.'}
        </p>
      ) : null}

      <ConnectorList
        rows={rows}
        installs={installs}
        directoryIcons={directoryIcons}
        onSelect={onSelectConnector}
      />

      {errorText ? (
        <div className="connectError" role="alert">
          <div className="connectErrorText">{errorText}</div>
          <button className="btn" type="button" onClick={onRetry}>
            Try again
          </button>
        </div>
      ) : null}
    </Modal>
  )
}
