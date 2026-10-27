// Only immutable, content-hashed fonts are cached. HTML and notes always use the network.
const CACHE = 'catobs-fonts-v1';
const fontURL = url => url.origin === self.location.origin &&
  url.pathname.startsWith(new URL('webfonts/', self.registration.scope).pathname) &&
  /\/kai-[a-f0-9]{16}\.woff2$/.test(url.pathname);
async function cachedFont(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) {
    await cache.put(request, response.clone());
    const keys = await cache.keys();
    for (const key of keys.slice(0, Math.max(0, keys.length - 32))) await cache.delete(key);
  }
  return response;
}
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
  if (fontURL(new URL(event.request.url))) event.respondWith(cachedFont(event.request));
});
self.addEventListener('message', event => {
  if (event.data?.type !== 'cache-fonts' || !Array.isArray(event.data.urls)) return;
  event.waitUntil(Promise.all(event.data.urls.filter(url => {
    try { return fontURL(new URL(url)); } catch { return false; }
  }).map(url => cachedFont(new Request(url)))).catch(() => {}));
});
