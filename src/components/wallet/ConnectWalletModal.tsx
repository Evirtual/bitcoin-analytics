import { Modal } from '../Modal'
import { ConnectorList } from './ConnectorList'

export function ConnectWalletModal<T extends { uid: string; name: string }>({
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
  return (
    <Modal open={open} title="Connect Wallet" onClose={onClose}>
      <ConnectorList connectors={connectors} disabled={disabled} onSelect={onSelectConnector} />
    </Modal>
  )
}
