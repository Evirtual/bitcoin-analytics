/**
 * Keeps the dashboard launchable offline once it has been opened.
 *
 * Vite fingerprints the JS/CSS filenames, so there is no fixed list to
 * precache. Instead: navigations go to the network first and fall back to the
 * last copy we saw, and assets are served from the cache while a fresh copy is
 * fetched behind the page.
 *
 * Every price, chart and balance in this app comes from a cross-origin API, and
 * the fetch handler below ignores cross-origin requests entirely. That is
 * deliberate and load-bearing: it means the shell can be cached aggressively
 * without any risk of serving a stale BTC price.
 */
const CACHE = 'bitcoin-analytics-v2'

/** The scope root, which is also the SPA entry point. Respects VITE_BASE. */
const ROOT = new URL('./', self.location).pathname

/** Offline, with nothing stored to fall back to. */
const UNAVAILABLE = () =>
  new Response('Bitcoin Analytics is not available offline yet.', {
    status: 503,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })

/**
 * Only successful responses are worth keeping. Storing a 404 or a 500 would
 * poison the cache: assets are served from it first, so the failure would
 * outlive whatever caused it.
 */
async function remember(request, response) {
  if (!response || !response.ok || response.type === 'opaque') return
  try {
    const cache = await caches.open(CACHE)
    await cache.put(request, response.clone())
  } catch {
    /* partial responses and quota limits are not worth failing a page load */
  }
}

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  // Market data, RPCs and wallet calls all live on other origins. Leave them be.
  if (new URL(request.url).origin !== self.location.origin) return

  // A page: always try for the current version, fall back to what we have.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request)
          await remember(request, response)
          return response
        } catch {
          return (await caches.match(request)) ?? (await caches.match(ROOT)) ?? UNAVAILABLE()
        }
      })(),
    )
    return
  }

  // An asset: serve what we have at once, and refresh it behind the page.
  event.respondWith(
    (async () => {
      const cached = await caches.match(request)
      const network = fetch(request)
        .then(async (response) => {
          await remember(request, response)
          return response
        })
        .catch(() => undefined)

      if (cached) {
        event.waitUntil(network)
        return cached
      }
      return (await network) ?? UNAVAILABLE()
    })(),
  )
})
