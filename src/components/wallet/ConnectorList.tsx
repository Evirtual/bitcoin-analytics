import metaMaskIcon from '../../assets/metamask.svg'
import walletConnectIcon from '../../assets/walletconnect.svg'
import {
  connectorInitials,
  normalizeConnectorName,
  type ConnectRow,
  type InstallRow,
} from '../../lib/wallet'

// A wallet discovered over EIP-6963 announces its own icon, which is why Rabby
// and Brave arrive with theirs. The MetaMask SDK and WalletConnect connectors
// announce none, so supply the marks their own packages ship.
const CONNECTOR_ICONS: Record<string, string> = {
  metamask: metaMaskIcon,
  walletconnect: walletConnectIcon,
}

function markFor(name: string, icon: string | undefined): string | undefined {
  return icon ?? CONNECTOR_ICONS[normalizeConnectorName(name)]
}

function WalletMark({ name, icon }: { name: string; icon?: string | undefined }) {
  const src = markFor(name, icon)
  return (
    <div className="connectIcon" aria-hidden="true">
      {src ? <img src={src} alt="" /> : connectorInitials(name)}
    </div>
  )
}

export function ConnectorList<T extends { uid: string }>({
  rows,
  installs,
  pendingUid,
  onSelect,
}: {
  rows: readonly ConnectRow<T>[]
  installs: readonly InstallRow[]
  /** The wallet currently being waited on, if any. */
  pendingUid?: string | undefined
  onSelect: (connector: T) => void
}) {
  return (
    <div className="stack">
      {rows.map((row) => {
        const pending = pendingUid === row.connector.uid
        // While one wallet is being waited on, the others would only queue up a
        // second request behind it.
        const disabled = Boolean(pendingUid) && !pending
        return (
          <button
            key={row.connector.uid}
            className={pending ? 'connectRow connectRowPending' : 'connectRow'}
            onClick={() => onSelect(row.connector)}
            disabled={disabled}
            type="button"
          >
            <div className="connectLeft">
              <WalletMark name={row.name} icon={row.icon} />
              <div className="connectName">{row.name}</div>
            </div>
            <div className="muted small">
              {pending ? <span className="connectPending">Waiting…</span> : 'Select'}
            </div>
          </button>
        )
      })}

      {installs.length > 0 ? (
        <>
          <div className="connectDivider muted small">Not installed</div>
          {installs.map((install) => (
            <a
              key={install.key}
              className="connectRow"
              href={install.url}
              target="_blank"
              rel="noreferrer noopener"
            >
              <div className="connectLeft">
                <WalletMark name={install.name} />
                <div className="connectName">{install.name}</div>
              </div>
              <div className="muted small">Install ↗</div>
            </a>
          ))}
        </>
      ) : null}
    </div>
  )
}
