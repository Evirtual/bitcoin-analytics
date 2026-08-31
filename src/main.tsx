import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { wagmiConfig } from './wagmi'
import { ErrorBoundary } from './components/ErrorBoundary'
import { registerServiceWorker } from './registerServiceWorker'
import { restoreLastConnection } from './lib/restoreConnection'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30_000,
    },
  },
})

registerServiceWorker()

/*
 * The session still has to survive a relaunch: connecting from an installed PWA
 * sends the user out to their wallet app, and iOS routinely relaunches the PWA
 * when they come back. What changed is who does the restoring.
 *
 * wagmi's own `reconnectOnMount` walks every configured connector, which means
 * a first-time visitor loads the WalletConnect and MetaMask SDKs before the
 * dashboard renders, to reconnect a wallet they have never used. So it is off,
 * and `restoreLastConnection` reconnects the one connector wagmi recorded as
 * most recent -- started before the first render, so the header shows
 * "Connecting..." rather than briefly offering to connect over a live session.
 */
void restoreLastConnection()

createRoot(document.getElementById('root')!).render(
  <WagmiProvider config={wagmiConfig} reconnectOnMount={false}>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </QueryClientProvider>
  </WagmiProvider>,
)
