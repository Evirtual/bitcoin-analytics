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

            if (id.includes('/recharts/')) return 'charts'
            if (id.includes('/wagmi/') || id.includes('/@wagmi/')) return 'wagmi'
            if (id.includes('/viem/')) return 'viem'
            if (id.includes('/@tanstack/react-query/')) return 'react-query'

            return 'vendor'
          },
        },
      },
    },
  }
})
