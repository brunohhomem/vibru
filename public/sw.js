// Service worker do Vibru: só recebe push e mostra a notificação. Sem cache nem offline.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let message;
  try {
    message = event.data.json();
  } catch {
    return;
  }

  // O iOS exige uma notificação visível a cada push, então sempre mostramos uma.
  event.waitUntil(
    self.registration.showNotification(message.title, {
      body: message.body,
      tag: message.tag,
      icon: '/icon/192',
      badge: '/icon/192',
      data: { url: message.url },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url ?? '/app', self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((client) => client.url.startsWith(self.location.origin));
      if (open) return open.navigate(targetUrl).then((client) => client?.focus());
      return self.clients.openWindow(targetUrl);
    }),
  );
});
