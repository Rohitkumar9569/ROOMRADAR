const CACHE_NAME = 'roomradar-shell-v2';
const SHELL_ASSETS = ['/', '/manifest.webmanifest', '/pwa-icon.svg', '/pwa-maskable.svg'];

const isHtmlResponse = (response) => {
  const contentType = response.headers.get('content-type') || '';
  return contentType.includes('text/html');
};

const cacheResponse = (request, response) => {
  if (!response || !response.ok || response.type === 'opaque') return;

  const copy = response.clone();
  caches.open(CACHE_NAME)
    .then((cache) => cache.put(request, copy))
    .catch(() => {
      // Cache writes are best-effort; the network response should still win.
    });
};

const offlineResponse = (message = 'Resource unavailable offline') => new Response(message, {
  status: 503,
  statusText: 'Service Unavailable',
  headers: { 'Content-Type': 'text/plain; charset=utf-8' },
});

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => Promise.allSettled(SHELL_ASSETS.map((asset) => cache.add(asset))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/socket.io')) return;
  if (url.pathname.startsWith('/src') || url.pathname.startsWith('/node_modules') || url.pathname.includes('@vite')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && isHtmlResponse(response)) {
            cacheResponse('/', response);
          }
          return response;
        })
        .catch(async () => {
          const cachedShell = await caches.match('/') || await caches.match('/index.html');
          return cachedShell || offlineResponse('RoomRadar is unavailable offline');
        })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          cacheResponse(request, response);
          return response;
        });

      if (cached) {
        event.waitUntil(networkFetch.catch(() => undefined));
        return cached;
      }

      return networkFetch.catch(() => offlineResponse());
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification?.data?.url || '/profile/inbox';
  const normalizedTarget = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const sameOriginClient = clientList.find((client) => client.url.startsWith(self.location.origin));

      if (sameOriginClient) {
        sameOriginClient.focus();
        return sameOriginClient.navigate(normalizedTarget);
      }

      return self.clients.openWindow(normalizedTarget);
    })
  );
});

self.addEventListener('push', (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch (error) {
    payload = {
      title: 'RoomRadar',
      body: event.data?.text() || 'You have a new RoomRadar update.',
    };
  }

  const title = payload.title || 'RoomRadar';
  const targetUrl = payload.url || payload.data?.url || '/profile/inbox';
  const options = {
    body: payload.body || 'You have a new RoomRadar update.',
    icon: payload.icon || '/pwa-icon.svg',
    badge: payload.badge || '/pwa-maskable.svg',
    tag: payload.tag || 'roomradar-update',
    renotify: true,
    requireInteraction: false,
    silent: false,
    timestamp: Date.now(),
    vibrate: [90, 45, 90],
    actions: [
      { action: 'open', title: 'Open inbox' },
    ],
    data: {
      ...(payload.data || {}),
      url: targetUrl,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});
