import { connectorInitials, connectorMark, type ConnectRow, type InstallRow } from '../../lib/wallet'

function WalletMark({ name, icon }: { name: string; icon?: string | undefined }) {
  const src = connectorMark(name, icon)
  return (
    <div className="connectIcon" aria-hidden="true">
      {src ? <img src={src} alt="" /> : connectorInitials(name)}
    </div>
  )
}

export function ConnectorList<T extends { uid: string }>({
  rows,
  installs,
  onSelect,
}: {
  rows: readonly ConnectRow<T>[]
  installs: readonly InstallRow[]
  onSelect: (connector: T) => void
}) {
  return (
    <div className="stack">
      {rows.map((row) => (
        <button
          key={row.connector.uid}
          className="connectRow"
          onClick={() => onSelect(row.connector)}
          type="button"
        >
          <div className="connectLeft">
            <WalletMark name={row.name} icon={row.icon} />
            <div className="connectName">{row.name}</div>
          </div>
          <div className="muted small">Select</div>
        </button>
      ))}

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
