const CACHE_NAME = 'supermarket-v4';
const urlsToCache = ['/', '/supermarket-pro/', '/index.html', '/style.css', '/database.js', '/app.js', '/receipt.js', '/manifest.json', 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css', 'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap', 'https://cdn.jsdelivr.net/npm/chart.js', 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js', 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database-compat.js'];

self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))); });
self.addEventListener('fetch', event => { event.respondWith(caches.match(event.request).then(response => response || fetch(event.request))); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))); });
