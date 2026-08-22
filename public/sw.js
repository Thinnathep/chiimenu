// ChiiMenu Service Worker — Push Notification Handler
const CACHE_NAME = 'chiimenu-v1'

// Install: cache essential files
self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// Handle Push Notifications (from server or forwarded by main thread)
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch (e) {
    data = { title: 'ChiiMenu', body: event.data ? event.data.text() : 'มีออเดอร์ใหม่!' }
  }

  const title = data.title || '🍜 ChiiMenu — ออเดอร์ใหม่!'
  const options = {
    body: data.body || 'มีออเดอร์ใหม่เข้ามา กรุณาตรวจสอบ',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    image: data.image || undefined,
    tag: data.tag || 'new-order',
    renotify: true,
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 200],
    data: {
      url: data.url || '/merchant/orders',
      orderId: data.orderId || null
    },
    actions: [
      { action: 'view', title: '👀 ดูออเดอร์' },
      { action: 'dismiss', title: '✕ ปิด' }
    ]
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'dismiss') return

  const targetUrl = (event.notification.data && event.notification.data.url) || '/merchant/orders'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus existing window if open
      for (const client of clients) {
        if (client.url.includes('/merchant') && 'focus' in client) {
          client.navigate(targetUrl)
          return client.focus()
        }
      }
      // Open new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }
    })
  )
})

// Allow main thread to trigger notification via postMessage
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data
    self.registration.showNotification(title, options)
  }
})
