const CACHE_NAME = 'sparsh-app-shell-v1';
const APP_SHELL = ['/', '/index.html', '/manifest.json', '/icon.png'];
const OPENCV_URL = 'https://docs.opencv.org/4.8.0/opencv.js';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  if (
    url.href.includes(OPENCV_URL) ||
    url.hostname.includes('generativelanguage.googleapis.com') ||
    url.hostname.includes('api.groq.com')
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          const cloned = response.clone();
          if (
            response.ok &&
            (url.pathname.startsWith('/assets/') ||
              APP_SHELL.includes(url.pathname) ||
              url.pathname === '/')
          ) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
          }
          return response;
        });
      })
    );
  }
});
