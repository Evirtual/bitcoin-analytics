import { http, createConfig } from 'wagmi'
import { base, bsc, mainnet } from 'wagmi/chains'
import { injected, metaMask, walletConnect } from 'wagmi/connectors'

const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as
  | string
  | undefined

const dappUrl = typeof window !== 'undefined' ? window.location.origin : 'https://evirtual.github.io'

export const wagmiConfig = createConfig({
  chains: [mainnet, base, bsc],
  connectors: [
    metaMask({
      dappMetadata: {
        name: 'Bitcoin Analytics',
        url: dappUrl,
      },
    }),
    injected({ target: 'rabby' }),
    ...(walletConnectProjectId
      ? [
          walletConnect({
            projectId: walletConnectProjectId,
            showQrModal: true,
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
