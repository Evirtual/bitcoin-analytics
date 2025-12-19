import { connectorInitials } from '../../lib/wallet'

export function ConnectorList<T extends { uid: string; name: string }>({
  connectors,
  disabled,
  onSelect,
}: {
  connectors: readonly T[]
  disabled: boolean
  onSelect: (connector: T) => void
}) {
  return (
    <div className="stack">
      {connectors.map((c) => (
        <button
          key={c.uid}
          className="connectRow"
          onClick={() => onSelect(c)}
          disabled={disabled}
        >
          <div className="connectLeft">
            <div className="connectIcon" aria-hidden="true">
              {connectorInitials(c.name)}
            </div>
            <div className="connectName">{c.name}</div>
          </div>
          <div className="muted small">Select</div>
        </button>
      ))}
    </div>
  )
}
