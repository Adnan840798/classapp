// Service Worker for ClassApp Web Caching & Push Notifications

const CACHE_NAME = 'classapp-assets-v1';

// We cache immutable Next.js chunks, stylesheet files, fonts, and local icons
const IMMUTABLE_ASSETS = [
  // Build assets
  '/_next/static/',
  // Google Fonts cached on demand
  'https://fonts.gstatic.com/',
  'https://fonts.googleapis.com/'
];

const STALE_ASSETS = [
  // Public static assets
  '/icons/',
  '/manifest.json',
  '/favicon.ico'
];

// Helper to determine if a URL matches our lists
function matchesAny(url, patterns) {
  return patterns.some(pattern => url.includes(pattern));
}

// 1. Install Event - Pre-cache minimal shell assets and offline fallback
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing and pre-caching core assets...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/manifest.json',
        '/icons/icon-192.png',
        '/icons/icon-512.png',
        '/error.html'
      ]).catch(err => {
        console.warn('[Service Worker] Pre-cache warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate Event - Clean up old caches and take control immediately
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating and cleaning obsolete caches...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('[Service Worker] Deleting obsolete cache:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event - Intercept requests for instant load
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = request.url;

  // Security: Only intercept GET requests, ignore APIs, auth, and database endpoints
  if (
    request.method !== 'GET' ||
    url.includes('/api/') ||
    url.includes('/auth/') ||
    url.includes('supabase.co') ||
    url.includes('chrome-extension')
  ) {
    return;
  }

  // A. Main page navigation requests -> Network-First, fallback to cached /error.html if offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match('/error.html');
      })
    );
    return;
  }

  // B. Immutable assets (Next.js scripts/chunks, styles) -> Cache-First
  if (matchesAny(url, IMMUTABLE_ASSETS)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const cacheCopy = networkResponse.clone();
            try {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, cacheCopy);
              });
            } catch (err) {
              console.warn('[Service Worker] Cache storage access denied in incognito mode:', err);
            }
          }
          return networkResponse;
        });
      }).catch((err) => {
        console.warn('[Service Worker] Cache lookup fallback to network:', err);
        return fetch(request);
      })
    );
    return;
  }

  // B. Stale assets (Icons, Manifest) -> Stale-While-Revalidate
  if (matchesAny(url, STALE_ASSETS)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const cacheCopy = networkResponse.clone();
            try {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, cacheCopy);
              });
            } catch (err) {
              console.warn('[Service Worker] Cache storage access denied in incognito mode:', err);
            }
          }
          return networkResponse;
        });
        return cachedResponse || fetchPromise;
      }).catch((err) => {
        console.warn('[Service Worker] Cache lookup fallback to network:', err);
        return fetch(request);
      })
    );
    return;
  }
});

// ── Web Push Notification Events (Preserved from existing Logic) ──
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
      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i];
        if (client.url && 'focus' in client) {
          client.focus();
          if ('navigate' in client) {
            return client.navigate(targetUrl);
          }
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
