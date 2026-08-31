import { reconnect, watchConnectors } from 'wagmi/actions'
import type { Connector } from 'wagmi'
import { wagmiConfig } from '../wagmi'

/**
 * How long to wait for a remembered wallet to announce itself.
 *
 * Extension wallets arrive over EIP-6963 a moment after the page loads, so the
 * connector we want may not exist yet when this runs.
 */
const ANNOUNCE_GRACE_MS = 2_000

function findConnector(id: string): Connector | undefined {
  return wagmiConfig.connectors.find((connector) => connector.id === id)
}

/** Resolves once the remembered wallet shows up, or when we stop waiting. */
function waitForConnector(id: string): Promise<Connector | undefined> {
  return new Promise((resolve) => {
    let settled = false
    const finish = (connector: Connector | undefined) => {
      if (settled) return
      settled = true
      unwatch()
      window.clearTimeout(timer)
      resolve(connector)
    }

    const unwatch = watchConnectors(wagmiConfig, {
      onChange: () => {
        const connector = findConnector(id)
        if (connector) finish(connector)
      },
    })
    const timer = window.setTimeout(() => finish(undefined), ANNOUNCE_GRACE_MS)

    // It may already be there; subscribing does not fire for current state.
    const existing = findConnector(id)
    if (existing) finish(existing)
  })
}

/**
 * Restore the wallet that was connected last, and only that one.
 *
 * wagmi's own `reconnectOnMount` walks every configured connector until one
 * answers. That is thorough, but it means a first-time visitor downloads and
 * starts the WalletConnect and MetaMask SDKs before the dashboard has rendered,
 * to reconnect a wallet they have never used. Restoring only the connector
 * wagmi already recorded as the most recent keeps the session across a PWA
 * relaunch -- the reason reconnecting matters here at all -- without paying for
 * the others.
 *
 * Nothing was ever connected, nothing loads.
 */
export async function restoreLastConnection(): Promise<void> {
  try {
    const recentId = await wagmiConfig.storage?.getItem('recentConnectorId')
    if (typeof recentId !== 'string' || !recentId) return

    const connector = findConnector(recentId) ?? (await waitForConnector(recentId))
    if (!connector) return

    await reconnect(wagmiConfig, { connectors: [connector] })
  } catch {
    // A failed restore is not worth breaking the dashboard over; the user can
    // still connect by hand.
  }
}
