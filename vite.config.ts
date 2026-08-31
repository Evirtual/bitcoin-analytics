import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const base = env.VITE_BASE || '/'

  // No manualChunks on purpose. Naming a chunk for a module pulls it into that
  // chunk even when it was only ever reached through a dynamic import, so the
  // hand-written grouping that used to live here dragged the chart library and
  // every wallet SDK into the first page load. Left alone, the bundler splits
  // along the real import graph and those stay behind their dynamic imports.
  return {
    base,
    plugins: [react()],
  }
})
