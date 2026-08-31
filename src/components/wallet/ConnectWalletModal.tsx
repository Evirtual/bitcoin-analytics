import { Modal } from '../Modal'
import { ConnectorList } from './ConnectorList'
import { useWalletRows } from '../../hooks/useWalletRows'
import type { ConnectorLike } from '../../lib/wallet'

export function ConnectWalletModal<T extends ConnectorLike>({
  open,
  onClose,
  connectors,
  disabled,
  onSelectConnector,
}: {
  open: boolean
  onClose: () => void
  connectors: readonly T[]
  disabled: boolean
  onSelectConnector: (connector: T) => void
}) {
  const { rows, installs, mobile, nothingDetected, hasWalletConnect } = useWalletRows(connectors)

  return (
    <Modal open={open} title="Connect Wallet" onClose={onClose}>
      {mobile && nothingDetected ? (
        <p className="muted small connectHint">
          No wallet was found in this browser.{' '}
          {hasWalletConnect
            ? 'Pair one with WalletConnect, or open this site from inside your wallet\u2019s own browser.'
            : 'Open this site from inside your wallet\u2019s own browser.'}
        </p>
      ) : null}
      <ConnectorList
        rows={rows}
        installs={installs}
        disabled={disabled}
        onSelect={onSelectConnector}
      />
    </Modal>
  )
}
