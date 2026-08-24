/**
 * Registers the service worker that makes the dashboard installable and lets it
 * open offline. See `public/sw.js` for the caching strategy.
 *
 * Dev is deliberately excluded: a worker caching assets in front of Vite's HMR
 * serves stale modules after an edit.
 */
export function registerServiceWorker() {
  if (!import.meta.env.PROD) return
  if (!('serviceWorker' in navigator)) return

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
      .catch(() => {
        // An uninstallable dashboard is still a working dashboard.
      })
  })
}
