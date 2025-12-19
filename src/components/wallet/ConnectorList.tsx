import { connectorInitials } from '../../lib/wallet'

function normalizeConnectorName(name: string) {
  return name
    .trim()
    .replace(/\s+wallet$/i, '')
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

function shouldHideConnector(name: string) {
  // Hide injected MetaMask entry to avoid MetaMask-specific pending-permissions issues.
  // Users should pick the dedicated "MetaMask" connector instead.
  return normalizeConnectorName(name) === 'metamask'
}

export function ConnectorList<T extends { uid: string; name: string }>({
  connectors,
  disabled,
  onSelect,
}: {
  connectors: readonly T[]
  disabled: boolean
  onSelect: (connector: T) => void
}) {
  const seen = new Set<string>()
  const unique = connectors.filter((c) => {
    if (shouldHideConnector(c.name)) return false
    const key = normalizeConnectorName(c.name)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return (
    <div className="stack">
      {unique.map((c) => (
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
