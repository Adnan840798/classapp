// Service Worker for ClassApp Web Push Notifications

self.addEventListener('push', function (event) {
  if (!event.data) {
    console.log('[Service Worker] Push event received with no data.');
    return;
  }

  let data = {};
  try {
    data = event.data.json();
  } catch (e) {
    console.error('[Service Worker] Error parsing push event JSON:', e);
    data = {
      title: 'ClassApp Notification',
      body: event.data.text()
    };
  }

  const title = data.title || 'ClassApp Academic Update';
  const options = {
    body: data.body || 'You have a new academic update.',
    icon: data.icon || '/icons/icon-192.png',
    badge: data.badge || '/icons/icon-192.png',
    data: {
      url: data.url || '/'
    },
    vibrate: [100, 50, 100]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      // If there is already a window open, focus it and redirect
      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i];
        // Match the base origin
        if (client.url && 'focus' in client) {
          client.focus();
          if ('navigate' in client) {
            return client.navigate(targetUrl);
          }
        }
      }
      // If no open window, open a new one
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
