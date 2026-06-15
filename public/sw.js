const CACHE_NAME = 'tanalista-v1'
const STATIC_ASSETS = [
  '/home',
  '/eventos',
  '/grupos',
  '/financeiro',
  '/perfil',
  '/manifest.json',
]

// Instala o SW e pré-cacheia assets estáticos
self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS).catch(() => {}))
  )
})

// Ativa e limpa caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

// Estratégia: network-first para navegação, cache-first para assets estáticos
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Ignora requests não-HTTP e requests para APIs
  if (!url.protocol.startsWith('http') || url.pathname.startsWith('/api/')) return

  if (request.mode === 'navigate') {
    // Páginas: network-first, fallback para cache
    event.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          return res
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/home')))
    )
  } else if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'font' ||
    request.destination === 'image'
  ) {
    // Assets: cache-first, fallback para network
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((res) => {
          const clone = res.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          return res
        })
      })
    )
  }
})

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {}
  const title = data.title || 'TáNaLista'
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-72.png',
    data: { url: data.url || '/' },
    vibrate: [200, 100, 200],
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) return client.focus()
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})
