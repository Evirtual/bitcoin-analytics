import { Modal } from '../Modal'
import { ConnectorList } from './ConnectorList'
import { useWalletRows } from '../../hooks/useWalletRows'
import type { ConnectorLike } from '../../lib/wallet'

export function ConnectWalletModal<T extends ConnectorLike>({
  open,
  onClose,
  connectors,
  pendingUid,
  errorText,
  onSelectConnector,
  onRetry,
}: {
  open: boolean
  onClose: () => void
  connectors: readonly T[]
  pendingUid?: string | undefined
  errorText?: string | undefined
  onSelectConnector: (connector: T) => void
  onRetry: () => void
}) {
  const { rows, installs, mobile, nothingDetected, hasWalletConnect } = useWalletRows(connectors)

  return (
    <Modal open={open} title="Connect Wallet" onClose={onClose}>
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
        pendingUid={pendingUid}
        onSelect={onSelectConnector}
      />

      {/* The wallet reports failures in its own window, which is gone by the
          time the user looks back here, so the reason has to be repeated. */}
      {errorText ? (
        <div className="connectError" role="alert">
          <div className="connectErrorText">{errorText}</div>
          <button className="btn" type="button" onClick={onRetry}>
            Try again
          </button>
        </div>
      ) : null}

      {pendingUid ? (
        <p className="muted small connectFoot">
          Approve the request in your wallet. Closing this window cancels it.
        </p>
      ) : null}
    </Modal>
  )
}
