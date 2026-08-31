import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { createAppKit } from '@reown/appkit/react'
import { base, bsc, mainnet } from '@reown/appkit/networks'
import { http } from 'wagmi'

// AppKit cannot be built without one, and it is the only route to a wallet on a
// phone, so this is a hard requirement rather than an optional extra. It is a
// public identifier, not a secret: the deploy passes it as a plain variable.
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string | undefined
if (!projectId) {
  throw new Error(
    'VITE_WALLETCONNECT_PROJECT_ID is not set. Create a project at https://dashboard.reown.com ' +
      'and put its id in .env.local (see .env.example).',
  )
}

const dappUrl =
  typeof globalThis !== 'undefined' && 'location' in globalThis
    ? (globalThis.location as Location).origin
    : 'https://bitcoin.edgarasneverdauskas.com'

const networks = [mainnet, base, bsc] as const

const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks: [...networks],
  transports: {
    [mainnet.id]: http(),
    [base.id]: http(),
    [bsc.id]: http(),
  },
})

// The adapter builds the wagmi config, so every wagmi hook in the app keeps
// working unchanged -- AppKit only takes over choosing and connecting a wallet.
export const wagmiConfig = wagmiAdapter.wagmiConfig

// Exported as a value rather than reached through useAppKit()/useAppKitTheme():
// those hooks build new function identities on every render and subscribe to
// theme state, so driving them from an effect re-enters itself forever.
export const appKit = createAppKit({
  adapters: [wagmiAdapter],
  networks: [...networks],
  projectId,
  metadata: {
    name: 'Bitcoin Analytics',
    description: 'Market stats + multichain wallet balances',
    url: dappUrl,
    icons: [dappUrl + '/icon-192.png'],
  },
  // This is a read-only dashboard: it needs a wallet connected, and none of the
  // custodial or commerce surfaces AppKit can also render.
  features: {
    analytics: false,
    email: false,
    socials: false,
    onramp: false,
    swaps: false,
  },
})
