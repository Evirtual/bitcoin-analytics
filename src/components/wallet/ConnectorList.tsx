import { ArrowUpRight, ChevronRight } from 'lucide-react'
import {
  connectorInitials,
  connectorMark,
  normalizeConnectorName,
  type ConnectRow,
  type InstallRow,
} from '../../lib/wallet'

function WalletMark({
  name,
  icon,
  directoryIcons,
}: {
  name: string
  icon?: string | undefined
  directoryIcons?: Record<string, string> | undefined
}) {
  const src = connectorMark(name, icon) ?? directoryIcons?.[normalizeConnectorName(name)]
  return (
    // Each mark carries its own shape and backdrop, so a frame around them all
    // only fights whatever the wallet drew.
    <div className={src ? 'connectIcon connectIconArt' : 'connectIcon'} aria-hidden="true">
      {src ? <img src={src} alt="" /> : connectorInitials(name)}
    </div>
  )
}

export function ConnectorList<T extends { uid: string }>({
  rows,
  installs,
  directoryIcons,
  onSelect,
}: {
  rows: readonly ConnectRow<T>[]
  installs: readonly InstallRow[]
  directoryIcons?: Record<string, string> | undefined
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
            <WalletMark name={row.name} icon={row.icon} directoryIcons={directoryIcons} />
            <div className="connectName">{row.name}</div>
          </div>
          <span className="connectGo" aria-hidden="true">
            <ChevronRight size={18} strokeWidth={1.75} />
          </span>
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
                <WalletMark name={install.name} directoryIcons={directoryIcons} />
                <div className="connectName">{install.name}</div>
              </div>
              <span className="connectInstall">
                Install
                <ArrowUpRight size={13} strokeWidth={2} aria-hidden="true" />
              </span>
            </a>
          ))}
        </>
      ) : null}
    </div>
  )
}
