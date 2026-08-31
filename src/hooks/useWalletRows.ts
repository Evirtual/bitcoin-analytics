import { useMemo } from 'react'
import {
  buildWalletRows,
  hasInjectedProvider,
  injectedWalletKey,
  isMobilePlatform,
  isStandaloneDisplay,
  REMOTE_CONNECTOR_IDS,
  type ConnectRow,
  type ConnectorLike,
  type InstallRow,
} from '../lib/wallet'

export type WalletRows<T> = {
  rows: ConnectRow<T>[]
  installs: InstallRow[]
  /** Phone browser or installed PWA — nowhere an extension can live. */
  mobile: boolean
  /** Every option is remote (pairing or deep link); no wallet lives in this browser. */
  nothingDetected: boolean
  /** WalletConnect needs a project id at build time, so it is not always offered. */
  hasWalletConnect: boolean
}

/**
 * Turn wagmi's connector list into what the connect UI should show.
 *
 * `connectors` is a fresh array each time an EIP-6963 wallet announces itself,
 * so this recomputes as extensions introduce themselves after first paint.
 */
export function useWalletRows<T extends ConnectorLike>(connectors: readonly T[]): WalletRows<T> {
  return useMemo(() => {
    const mobile = isMobilePlatform() || isStandaloneDisplay()
    const hasInjected = hasInjectedProvider()
    const { rows, installs } = buildWalletRows(connectors, {
      mobile,
      hasInjected,
      injectedKey: injectedWalletKey(),
    })
    return {
      rows,
      installs,
      mobile,
      // A provider on the page means a wallet IS here, even once its row got
      // folded into the named connector above.
      nothingDetected: !hasInjected && rows.every((row) => REMOTE_CONNECTOR_IDS.has(row.connector.id)),
      hasWalletConnect: rows.some((row) => row.connector.id === 'walletConnect'),
    }
  }, [connectors])
}
