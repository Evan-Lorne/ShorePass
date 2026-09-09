const CACHE = 'shorepass-public-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/') || url.pathname.includes('webpack-hmr')) return;
  // Only public app pages and assets are cached; personal records stay in device storage.
  if (!(event.request.mode === 'navigate' || url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/'))) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try { const response = await fetch(event.request); if (response.ok) await cache.put(event.request, response.clone()); return response; }
    catch { return await cache.match(event.request) || new Response('Offline. Open a previously visited exam after reconnecting.', { status: 503 }); }
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type !== 'CACHE_PAGE') return;
  const url = new URL(event.data.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const response = await fetch(url.href, { headers: { Accept: 'text/html' } });
    if (response.ok) await cache.put(url.href, response);
    for (const asset of event.data.assets || []) {
      const parsed = new URL(asset);
      if (parsed.origin !== self.location.origin || !parsed.pathname.startsWith('/_next/static/')) continue;
      try { const response = await fetch(parsed.href); if (response.ok) await cache.put(parsed.href, response); } catch {}
    }
  })());
});
