import { http, createConfig } from 'wagmi'
import { base, bsc, mainnet } from 'wagmi/chains'
import { injected, walletConnect } from 'wagmi/connectors'

const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as
  | string
  | undefined

export const wagmiConfig = createConfig({
  chains: [mainnet, base, bsc],
  connectors: [
    injected(),
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
