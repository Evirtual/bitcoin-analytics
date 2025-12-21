export function connectorInitials(name: string): string {
  const cleaned = name
    .replace(/\(.*?\)/g, ' ')
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .trim()
  if (!cleaned) return 'W'
  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]!.slice(0, 1) + parts[1]!.slice(0, 1)).toUpperCase()
}

export function formatConnectErrorMessage(message: string): string {
  const trimmed = message.trim()

  // Some providers throw non-Error values; wagmi/viem may stringify them.
  if (trimmed === '[]') return 'Wallet request failed. Please try again.'

  // Drop noisy suffixes like "Version: viem@...".
  const withoutVersion = trimmed.replace(/\s*[,;]?\s*version:\s*viem@[^\s]+\s*$/i, '')
  const m = withoutVersion.toLowerCase()

  // Common UX-friendly cases
  if (m.includes('user rejected') || m.includes('user rejected the request')) {
    return 'Connection cancelled in your wallet.'
  }
  if (m.includes('connection request reset')) {
    return 'WalletConnect request reset. Open your wallet and try connecting again.'
  }
  if (m.includes('wallet_requestpermissions') && m.includes('already pending')) {
    return 'A wallet connection request is already pending. Open MetaMask and approve it, or wait and try again.'
  }
  if (m.includes('already pending')) {
    return 'A wallet connection request is already pending. Please wait and try again.'
  }

  // If the message contains a "Details:" section, only show the leading part.
  const detailsIdx = withoutVersion.toLowerCase().indexOf('details:')
  if (detailsIdx > 0) return withoutVersion.slice(0, detailsIdx).trim()

  return withoutVersion
}
