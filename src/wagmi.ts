import { http, createConfig } from 'wagmi'
import { base, bsc, mainnet } from 'wagmi/chains'
import { injected, walletConnect } from 'wagmi/connectors'

export const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as
  | string
  | undefined

const dappUrl =
  typeof globalThis !== 'undefined' && 'location' in globalThis
    ? (globalThis.location as Location).origin
    : 'https://bitcoin.edgarasneverdauskas.com'

const APP_NAME = 'Bitcoin Analytics'
const APP_DESCRIPTION = 'Market stats + multichain wallet balances'

// Extension wallets announce themselves over EIP-6963 and wagmi turns each one
// into its own connector (`multiInjectedProviderDiscovery`, on by default), so
// the list below is only the connectors that cannot be discovered: MetaMask's
// SDK (which deep links to the app on phones), a bare injected fallback for
// wallets that never announce, and WalletConnect for pairing.
export const wagmiConfig = createConfig({
  chains: [mainnet, base, bsc],
  connectors: [
    // No MetaMask SDK connector. The extension announces itself over
    // EIP-6963 and arrives with its own name and icon, so the SDK only ever
    // covered the case where MetaMask is absent -- and it covered it badly:
    // it reports to its own analytics endpoint in a retry loop, and on a
    // desktop with no MetaMask installed it tries to launch metamask://,
    // which no application answers. Where it is genuinely absent, an install
    // link is the honest offer, and a phone reaches MetaMask through
    // WalletConnect, which deep links to it properly.
    injected(),
    ...(walletConnectProjectId
      ? [
          walletConnect({
            projectId: walletConnectProjectId,
            // The provider imports AppKit only to draw its own QR modal,
            // and that import is gated on exactly this flag. Off, and the
            // whole of AppKit stays out of the bundle; the connector still
            // emits the pairing URI, which WalletConnectQrModal renders.
            showQrModal: false,
            // Shown by the paired wallet while it asks the user to approve.
            metadata: {
              name: APP_NAME,
              description: APP_DESCRIPTION,
              url: dappUrl,
              icons: [dappUrl + '/icon-192.png'],
            },
          }),
        ]
      : []),
  ],
  transports: {
    [mainnet.id]: http(),
    [base.id]: http(),
    [bsc.id]: http(),
  },
})
