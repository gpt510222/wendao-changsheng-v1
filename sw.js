const REVISIONS = __ASSET_REVISIONS__;
const APP_SHELL = __APP_SHELL__;
const CORE_ASSETS = __CORE_ASSETS__;
const VISUAL_ASSETS = __VISUAL_ASSETS__;
const CACHE_NAME = 'wendao-revision-cache-v1';
const REVISION_PARAM = '__wendao_revision';
const NETWORK_FIRST_ASSETS = new Set(['index.html','game.js','partner-system.js','styles.css','q-style.css']);

const absoluteUrl = path => new URL(path, self.registration.scope).href;
const revisionRequest = path => {
  const url = new URL(absoluteUrl(path));
  url.searchParams.set(REVISION_PARAM, REVISIONS[path]);
  return new Request(url.href, { method: 'GET' });
};
const scopedPath = requestUrl => {
  const url = new URL(requestUrl);
  const scope = new URL(self.registration.scope);
  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return '';
  return decodeURIComponent(url.pathname.slice(scope.pathname.length)) || 'index.html';
};

async function cacheAsset(path, cacheMode = 'no-cache') {
  if (!REVISIONS[path]) return;
  const cache = await caches.open(CACHE_NAME);
  const key = revisionRequest(path);
  if (await cache.match(key)) return;
  const response = await fetch(absoluteUrl(path), { cache: cacheMode });
  if (response.ok) await cache.put(key, response.clone());
}

async function cacheInBatches(paths, concurrency = 3) {
  let next = 0;
  const runner = async () => {
    while (next < paths.length) {
      const path = paths[next++];
      try { await cacheAsset(path); } catch {}
      await new Promise(resolve => setTimeout(resolve, 35));
    }
  };
  await Promise.all(Array.from({ length: concurrency }, runner));
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    await cacheInBatches([...new Set([...APP_SHELL, ...CORE_ASSETS])], 4);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    for (const request of await cache.keys()) {
      const url = new URL(request.url);
      const path = scopedPath(url.href);
      const cachedRevision = url.searchParams.get(REVISION_PARAM);
      if (!REVISIONS[path] || REVISIONS[path] !== cachedRevision) await cache.delete(request);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type === 'PRECACHE_VISUALS') {
    event.waitUntil(cacheInBatches(VISUAL_ASSETS, 2));
  }
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || request.headers.has('range')) return;
  const path = request.mode === 'navigate' ? 'index.html' : scopedPath(request.url);
  if (!REVISIONS[path]) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const key = revisionRequest(path);
    if (request.mode !== 'navigate' && !NETWORK_FIRST_ASSETS.has(path)) {
      const cached = await cache.match(key);
      if (cached) return cached;
    }
    try {
      const response = await fetch(request.mode === 'navigate' ? request : absoluteUrl(path), { cache: 'no-cache' });
      if (response.ok) await cache.put(key, response.clone());
      return response;
    } catch (error) {
      const cached = await cache.match(key);
      if (cached) return cached;
      throw error;
    }
  })());
});
