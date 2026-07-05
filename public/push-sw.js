// Service Worker de Push Notifications - Pilar
// Guarded: só registra em produção (ver src/lib/pushRegister.ts)

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let payload = { title: 'Nova notificação', body: '', url: '/' };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch (e) {
    try { payload.body = event.data.text(); } catch (_) {}
  }

  const options = {
    body: payload.body || '',
    icon: payload.icon || '/pwa-192.png',
    badge: '/pwa-192.png',
    image: payload.image,
    data: { url: payload.url || '/', ...(payload.data || {}) },
    tag: payload.tag || 'pilar-push',
    renotify: true,
    requireInteraction: !!payload.requireInteraction,
    vibrate: [200, 100, 200],
  };

  event.waitUntil(self.registration.showNotification(payload.title || 'Pilar', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if ('focus' in w) {
          try { w.navigate(targetUrl); } catch (_) {}
          return w.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
