// Simple Service Worker for Web Push notifications
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  try {
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'Notificación';
    const body = data.body || '';
    const url = data.url || '/inventory/alerts';
    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        data: { url },
        icon: '/icons/icon-192.png',
        badge: '/icons/badge-72.png',
        tag: data.tag || 'wms-alert',
      })
    );
  } catch (e) {
    // Fallback si no es JSON
    event.waitUntil(
      self.registration.showNotification('Notificación', {
        body: event.data ? event.data.text() : '',
      })
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification?.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        // Si hay una pestaña abierta, enfocarla y navegar
        if ('url' in client && client.url) {
          client.focus();
          // @ts-ignore
          client.navigate(targetUrl);
          return;
        }
      }
      // Si no hay pestañas, abrir una nueva
      // @ts-ignore
      return self.clients.openWindow(targetUrl);
    })
  );
});