/* Mini Library — service worker (written by hand, no Workbox).
 *
 * Build step (vite.config.js) replaces:
 *   BUILD_VERSION placeholder     -> hash of this file + the list of built files
 *   PRECACHE_MANIFEST placeholder -> list of app-shell URLs (JS/CSS bundles, icons, offline page)
 *
 * Caches
 *   mini-library-shell-<version>   precached app shell            (replaced on every deploy)
 *   mini-library-pages-<version>   pages the user has visited     (replaced on every deploy)
 *   mini-library-static-v1         images, icons, fonts           cache-first, max 80 entries, 30 days
 *   mini-library-api-v1            public Open Library API data   network-first, max 60 entries, 7 days
 *
 * Only public GET data is cached. Requests with credentials/Authorization headers,
 * auth/token URLs and responses marked private/no-store are never stored.
 */

/* global self, caches, clients */

const VERSION = "__BUILD_VERSION__";
const PRECACHE_URLS = self.__PRECACHE_MANIFEST;

const PREFIX = "mini-library";
const CACHE = {
  shell: `${PREFIX}-shell-${VERSION}`,
  pages: `${PREFIX}-pages-${VERSION}`,
  static: `${PREFIX}-static-v1`,
  api: `${PREFIX}-api-v1`,
};
const CURRENT_CACHES = Object.values(CACHE);

const LIMITS = {
  static: { maxEntries: 80, maxAgeMs: 30 * 24 * 60 * 60 * 1000 },
  api: { maxEntries: 60, maxAgeMs: 7 * 24 * 60 * 60 * 1000 },
  pages: { maxEntries: 30 },
};

const API_ORIGINS = ["https://openlibrary.org"];
const STATIC_ORIGINS = [
  "https://covers.openlibrary.org",
  "https://fonts.googleapis.com",
  "https://fonts.gstatic.com",
];
const NETWORK_TIMEOUT_MS = 4000;
const OFFLINE_URL = "/offline.html";
const SHELL_URL = "/index.html";

/* ------------------------------------------------------------------ */
/* Lifecycle                                                           */
/* ------------------------------------------------------------------ */

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE.shell);
      // cache: "reload" skips the HTTP cache, so we never precache stale files
      await cache.addAll(PRECACHE_URLS.map((url) => new Request(url, { cache: "reload" })));
    })(),
  );
  // No skipWaiting() here: a new version waits until the user presses "Update".
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith(PREFIX) && !CURRENT_CACHES.includes(name))
          .map((name) => caches.delete(name)),
      );

      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable();
      }

      await clients.claim();

      // The start page and the pages that were open before this worker took control
      // were loaded without it -> remember them now, so they also open offline.
      const windows = await clients.matchAll({ type: "window" });
      await Promise.all(["/", ...windows.map((client) => client.url)].map(rememberSpaPage));
    })(),
  );
});

self.addEventListener("message", (event) => {
  const message = event.data || {};

  if (message.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (message.type === "GET_VERSION" && event.ports[0]) {
    event.ports[0].postMessage({ version: VERSION });
  }

  // The SPA changes routes without real navigations.
  // Remember those routes, so they can be opened offline later.
  if (message.type === "PAGE_VISITED" && typeof message.url === "string") {
    event.waitUntil(rememberSpaPage(message.url));
  }
});

/* ------------------------------------------------------------------ */
/* Fetch routing                                                       */
/* ------------------------------------------------------------------ */

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") return; // POST/PUT/DELETE go straight to the network
  if (isPrivateRequest(request, url)) return; // never cache auth / private data
  if (url.searchParams.has("connectivity-check")) return; // real network check from the offline page

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(event, url));
    return;
  }

  if (url.origin === self.location.origin) {
    if (url.pathname === "/sw.js" || url.pathname === "/version.json") return;
    event.respondWith(precacheThenStatic(request));
    return;
  }

  if (API_ORIGINS.includes(url.origin)) {
    event.respondWith(networkFirst(event, request));
    return;
  }

  if (STATIC_ORIGINS.includes(url.origin)) {
    event.respondWith(cacheFirst(request));
  }
  // everything else: browser default (network)
});

/* ------------------------------------------------------------------ */
/* Strategies                                                          */
/* ------------------------------------------------------------------ */

// Pages: network first, then the visited-page cache, then the offline page.
async function handleNavigation(event, url) {
  if (url.pathname === "/offline" || url.pathname === OFFLINE_URL) {
    return (await caches.match(OFFLINE_URL)) || fetch(event.request);
  }

  const pages = await caches.open(CACHE.pages);
  const key = pageKey(url);

  try {
    const preloaded = await event.preloadResponse;
    const response = preloaded || (await fetch(event.request));

    if (response.ok && isCacheableResponse(response)) {
      await pages.put(key, response.clone());
      trimCache(CACHE.pages, LIMITS.pages.maxEntries);
    }
    return response;
  } catch {
    // same page with other query params (e.g. /discover?q=...) is still the same SPA screen
    const visited = (await pages.match(key)) || (await pages.match(key, { ignoreSearch: true }));
    if (visited) return visited;

    const offline = await caches.match(OFFLINE_URL);
    return offline || new Response("You are offline", { status: 503, headers: { "Content-Type": "text/plain" } });
  }
}

// Same-origin files: precached shell first (JS/CSS/icons), then cache-first runtime cache.
async function precacheThenStatic(request) {
  // ignoreVary: the server sends "Vary: Origin", <img> and fetch() requests differ in that header
  const precached = await caches.match(request, { cacheName: CACHE.shell, ignoreSearch: true, ignoreVary: true });
  if (precached) return precached;
  return cacheFirst(request);
}

// Cache-first: images, icons, fonts. Rarely change, so the cached copy is good enough.
async function cacheFirst(request) {
  const cache = await caches.open(CACHE.static);
  const cached = await matchFresh(cache, request, LIMITS.static.maxAgeMs);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok && isCacheableResponse(response)) {
      await putWithTimestamp(cache, request, response.clone());
      trimCache(CACHE.static, LIMITS.static.maxEntries);
    }
    return response;
  } catch {
    const stale = await cache.match(request);
    if (stale) return stale;
    if (request.destination === "image") return placeholderImage();
    return new Response("", { status: 504, statusText: "Offline" });
  }
}

// Network-first with a timeout: public API list and details.
// Fresh data when online, saved data when offline or the network is too slow.
async function networkFirst(event, request) {
  const cache = await caches.open(CACHE.api);

  const networkPromise = fetch(request).then(async (response) => {
    if (response.ok && isCacheableResponse(response)) {
      await putWithTimestamp(cache, request, response.clone());
      trimCache(CACHE.api, LIMITS.api.maxEntries);
    }
    return response;
  });
  // keep the SW alive until the cache is updated, even if we answered from cache
  event.waitUntil(networkPromise.catch(() => {}));

  const timeout = new Promise((resolve) => setTimeout(() => resolve("timeout"), NETWORK_TIMEOUT_MS));

  try {
    const first = await Promise.race([networkPromise, timeout]);

    if (first === "timeout") {
      const cached = await matchFresh(cache, request, LIMITS.api.maxAgeMs);
      if (cached) return markAsCached(cached);
      return await networkPromise; // nothing saved — wait for the network
    }

    if (!first.ok) {
      const cached = await matchFresh(cache, request, LIMITS.api.maxAgeMs);
      if (cached) return markAsCached(cached);
    }
    return first;
  } catch {
    const cached = await matchFresh(cache, request, LIMITS.api.maxAgeMs);
    if (cached) return markAsCached(cached);

    return new Response(JSON.stringify({ error: "offline", message: "No connection and no saved copy" }), {
      status: 503,
      statusText: "Offline",
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Expose-Headers": "x-sw-offline",
        "x-sw-offline": "1",
      },
    });
  }
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function isPrivateRequest(request, url) {
  if (request.headers.has("Authorization")) return true;
  // fetch(url, { credentials: "include" }) sends cookies -> private.
  // (navigations and <img> also use "include" by default, so only CORS requests are checked)
  if (request.mode === "cors" && request.credentials === "include") return true;
  return /\/(auth|login|logout|token|session|account|me)(\/|$|\?)/i.test(url.pathname);
}

function isCacheableResponse(response) {
  if (response.type === "opaque") return false; // unknown status, huge quota cost
  const cacheControl = response.headers.get("Cache-Control") || "";
  if (/no-store|private/i.test(cacheControl)) return false;
  if (response.headers.has("Set-Cookie")) return false;
  return true;
}

function pageKey(url) {
  return new Request(url.origin + url.pathname + url.search);
}

async function rememberSpaPage(rawUrl) {
  const url = new URL(rawUrl, self.location.origin);
  if (url.origin !== self.location.origin) return;

  const pages = await caches.open(CACHE.pages);
  const key = pageKey(url);
  if (await pages.match(key)) return;

  const shell = await caches.match(SHELL_URL, { cacheName: CACHE.shell });
  if (shell) {
    await pages.put(key, shell);
    trimCache(CACHE.pages, LIMITS.pages.maxEntries);
  }
}

async function putWithTimestamp(cache, request, response) {
  const headers = new Headers(response.headers);
  headers.set("sw-cached-at", String(Date.now()));
  const body = await response.blob();
  await cache.put(request, new Response(body, { status: response.status, statusText: response.statusText, headers }));
}

async function matchFresh(cache, request, maxAgeMs) {
  const cached = await cache.match(request);
  if (!cached) return null;

  const cachedAt = Number(cached.headers.get("sw-cached-at"));
  if (cachedAt && Date.now() - cachedAt > maxAgeMs) {
    await cache.delete(request);
    return null;
  }
  return cached;
}

// Adds headers so the page can tell the user "you are viewing saved data".
async function markAsCached(response) {
  const headers = new Headers(response.headers);
  headers.set("x-sw-cache", "hit");
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Expose-Headers", "x-sw-cache, sw-cached-at");
  const body = await response.blob();
  return new Response(body, { status: response.status, statusText: response.statusText, headers });
}

// Keeps the cache small: removes the oldest entries (cache.keys() is in insertion order).
async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  const extra = keys.length - maxEntries;
  for (let i = 0; i < extra; i++) {
    await cache.delete(keys[i]);
  }
}

function placeholderImage() {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="180" viewBox="0 0 120 180">' +
    '<rect width="120" height="180" fill="#e3f0ec"/>' +
    '<text x="60" y="98" font-size="36" text-anchor="middle">📕</text></svg>';
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml" } });
}
