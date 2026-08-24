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

createRoot(document.getElementById('root')!).render(
  <WagmiProvider config={wagmiConfig} reconnectOnMount={false}>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </QueryClientProvider>
  </WagmiProvider>,
)
