import { http, createConfig } from 'wagmi'
import { base, bsc, mainnet } from 'wagmi/chains'
import { injected, metaMask, walletConnect } from 'wagmi/connectors'

const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as
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
    metaMask({
      dappMetadata: {
        name: APP_NAME,
        url: dappUrl,
      },
    }),
    injected(),
    ...(walletConnectProjectId
      ? [
          walletConnect({
            projectId: walletConnectProjectId,
            showQrModal: true,
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
