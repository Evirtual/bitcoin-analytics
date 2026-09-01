import metaMaskIcon from '../assets/metamask.svg'
import rabbyIcon from '../assets/rabby.svg'
import walletConnectIcon from '../assets/walletconnect.svg'

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
  if (m.includes('provider not found')) {
    return 'No wallet detected in this browser. Use WalletConnect, or open this site in your wallet app’s browser.'
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

// ---------------------------------------------------------------------------
// Wallet discovery
//
// wagmi turns every EIP-6963 announcement into its own connector whose `id` is
// the wallet's rdns (see `multiInjectedProviderDiscovery`, on by default), so an
// installed extension is "detected" simply by having a connector. Wallets we
// want to offer but cannot detect get an install link instead.
// ---------------------------------------------------------------------------

/** The parts of a wagmi connector this module needs. */
export type ConnectorLike = {
  uid: string
  id: string
  name: string
  icon?: string | undefined
}

export type CuratedWallet = {
  /** Normalised name, used to match against a connector. */
  key: string
  name: string
  /** Where to send someone whose browser does not have the extension. */
  installUrl: string
}

export const CURATED_WALLETS: readonly CuratedWallet[] = [
  { key: 'metamask', name: 'MetaMask', installUrl: 'https://metamask.io/download/' },
  { key: 'rabby', name: 'Rabby', installUrl: 'https://rabby.io/' },
]

// A wallet announced over EIP-6963 carries its own icon, but a wallet that is
// not installed announces nothing -- and the curated install rows are exactly
// the wallets someone does not have yet. Vendored marks keep those rows from
// falling back to initials. Each is the wallet's own published artwork
// (Rabby's from github.com/RabbyHub/logo).
const CONNECTOR_ICONS: Record<string, string> = {
  metamask: metaMaskIcon,
  rabby: rabbyIcon,
  walletconnect: walletConnectIcon,
}

export function connectorMark(name: string, icon?: string | undefined): string | undefined {
  return icon ?? CONNECTOR_ICONS[normalizeConnectorName(name)]
}

export function normalizeConnectorName(name: string): string {
  return name
    .trim()
    .replace(/\s+wallet$/i, '')
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

/** True when the page is running as an installed PWA rather than a browser tab. */
export function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false
  if (window.matchMedia?.('(display-mode: standalone)').matches) return true
  return (window.navigator as Navigator & { standalone?: boolean }).standalone === true
}

/** Coarse pointer is a better proxy for "no extensions here" than sniffing the UA. */
export function isMobilePlatform(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(pointer: coarse)').matches ?? false
}

export function hasInjectedProvider(): boolean {
  return typeof window !== 'undefined' && 'ethereum' in window
}

/**
 * Which curated wallet `window.ethereum` belongs to, when we can tell.
 *
 * Rabby sets `isMetaMask` too, for compatibility with dapps that sniff for it,
 * so it has to be checked first or every Rabby looks like a MetaMask.
 */
export function injectedWalletKey(): string | undefined {
  if (typeof window === 'undefined') return undefined
  const ethereum = (window as { ethereum?: Record<string, unknown> }).ethereum
  if (!ethereum) return undefined
  if (ethereum.isRabby) return 'rabby'
  if (ethereum.isMetaMask) return 'metamask'
  return undefined
}

/**
 * Connectors that reach a wallet somewhere else — QR pairing, or a deep link
 * into a phone app — rather than one already living in this browser.
 */
export const REMOTE_CONNECTOR_IDS: ReadonlySet<string> = new Set([
  'walletConnect',
  'metaMaskSDK',
])

export type ConnectRow<T> = {
  connector: T
  name: string
  icon?: string | undefined
}

export type InstallRow = {
  key: string
  name: string
  url: string
}

/**
 * Split the configured connectors into rows we can actually offer, plus install
 * links for curated wallets that are nowhere to be found.
 */
export function buildWalletRows<T extends ConnectorLike>(
  connectors: readonly T[],
  options: { mobile: boolean; hasInjected: boolean; injectedKey?: string | undefined },
): { rows: ConnectRow<T>[]; installs: InstallRow[] } {
  const seen = new Set<string>()
  const rows: ConnectRow<T>[] = []

  // EIP-6963 connectors are keyed by rdns, which is always dotted. Their
  // presence means the bare `injected()` fallback would only duplicate one of
  // them under a worse name.
  const discovered = connectors.some((c) => c.id.includes('.'))

  for (const connector of connectors) {
    if (connector.id === 'injected') {
      // Nothing to talk to unless the page exposes a provider that never
      // announced itself. Offering it regardless is what produced the
      // "Provider not found." dead end on phone browsers.
      if (!options.hasInjected || discovered) continue
      // The page's provider is a wallet we already list under its real name.
      if (options.injectedKey && seen.has(options.injectedKey)) continue
    }

    const name = displayName(connector, options.injectedKey)
    const key = normalizeConnectorName(name)
    if (seen.has(key)) continue
    seen.add(key)

    rows.push({ connector, name, icon: connector.icon })
  }

  // A wallet that is actually installed here should be the first thing offered;
  // pairing and deep links are the fallback. Both sides keep their original
  // order, so this only lifts detected wallets above remote ones.
  const ordered = [
    ...rows.filter((row) => !REMOTE_CONNECTOR_IDS.has(row.connector.id)),
    ...rows.filter((row) => REMOTE_CONNECTOR_IDS.has(row.connector.id)),
  ]

  // Only extensions can be detected, and only a desktop browser has them. A
  // phone cannot see which wallet apps are installed, so calling one "not
  // installed" there is a guess -- and a wrong one for anyone who has the app.
  // WalletConnect already lists the apps that are actually on the device.
  const installs = options.mobile
    ? []
    : CURATED_WALLETS.filter((wallet) => !seen.has(wallet.key)).map((wallet) => ({
        key: wallet.key,
        name: wallet.name,
        url: wallet.installUrl,
      }))

  return { rows: ordered, installs }
}

/**
 * "Injected" is jargon, and when we can tell which wallet the page's provider
 * belongs to it should carry that wallet's name — both so the row reads
 * properly and so we stop offering to install a wallet the user is browsing in.
 */
function displayName(connector: ConnectorLike, injectedKey: string | undefined): string {
  if (connector.id !== 'injected') return connector.name
  const curated = injectedKey
    ? CURATED_WALLETS.find((wallet) => wallet.key === injectedKey)
    : undefined
  return curated ? curated.name : 'Browser Wallet'
}
