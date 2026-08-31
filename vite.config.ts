import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const base = env.VITE_BASE || '/'

  return {
    base,
    plugins: [react()],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return

            // Grouped deliberately: each of these is reached during the first
            // render anyway, so splitting them further only buys extra requests.
            if (id.includes('/node_modules/recharts/')) return 'charts'
            if (id.includes('/node_modules/@tanstack/react-query/')) return 'react-query'
            if (id.includes('/node_modules/viem/')) return 'viem'
            if (/\/node_modules\/@?wagmi\//.test(id)) return 'wagmi'

            // Everything else is left to the bundler on purpose. The wallet
            // SDKs are large and reached through dynamic imports, so naming a
            // catch-all "vendor" chunk here would pull all of them into the
            // first load rather than fetching them when a wallet is chosen.
            return undefined
          },
        },
      },
    },
  }
})
