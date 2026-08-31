import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { wagmiConfig } from './wagmi'
import { ErrorBoundary } from './components/ErrorBoundary'
import { registerServiceWorker } from './registerServiceWorker'

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
 * `reconnectOnMount` is left at its default of true, deliberately.
 *
 * Connecting from an installed PWA sends the user out to their wallet app, and
 * iOS routinely relaunches the PWA when they come back, so restoring the stored
 * session is the only thing between that round trip and a "Connect" button
 * again. Turning it off does not merely skip the reconnect: wagmi then clears
 * the connections it hydrated from storage, discarding the session on every
 * launch.
 */
createRoot(document.getElementById('root')!).render(
  <WagmiProvider config={wagmiConfig}>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </QueryClientProvider>
  </WagmiProvider>,
)
