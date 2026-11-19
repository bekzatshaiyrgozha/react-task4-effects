# Mini Library — Task 7: Progressive Web App

The Task 4 React app (Mini Library), turned into an installable PWA that works offline.

**Live demo:** https://react-task4-effects.vercel.app

## Features

### From previous homework (Task 4, kept as-is)
- Book list loaded with `useEffect` (search, sort A→Z / Z→A, pagination), Reload button
- Book details loaded with `getItem(id)`, 8 fields per book
- Create / Edit / Delete, Borrow / Return
- Loading, error ("Try again"), empty and success states
- Race conditions handled with `ignore` flags, `busyIds` for conflicting actions
- Fake API (`src/api/fakeApi.js`) with random delays and errors, data in `localStorage`

### New in Task 7
- **Routing** (`react-router`): `/` library, `/discover` search, `/discover/:workId` details, `/dashboard`, `/offline`
- **Discover**: public [Open Library API](https://openlibrary.org/developers/api) list + details, "Add to my library"
- **Dashboard**: stats cards, books by genre, borrowed-books table, offline storage panel (caches, entries, quota, version)
- **Responsive navigation** with a hamburger menu on phones

## PWA

| Requirement | Where |
|---|---|
| Manifest (name, short_name, start_url, scope, `display: standalone`, theme/background colors) | `public/manifest.json`, linked in `index.html` |
| Icons 192×192, 512×512 (+ maskable) | `public/icons/` |
| Install button (`beforeinstallprompt`) | `src/pwa/pwa.js`, header |
| Service worker (hand-written, no Workbox): `install`, `activate`, `fetch` | `src/sw/service-worker.js` |
| Precache: built JS/CSS, icons, offline page | list injected at build time by the plugin in `vite.config.js` |
| Versioned caches, old caches deleted in `activate` | `mini-library-shell-<build hash>`, `mini-library-pages-<build hash>` |
| Update: "New version available → Update now" | `registration.waiting` → `SKIP_WAITING` → `controllerchange` → reload |
| No manual storage clearing | `sw.js` is served with `no-cache`, `updateViaCache: "none"`, hashed assets, network-first HTML |

### Caching strategies

| Requests | Strategy | Cache | Limits |
|---|---|---|---|
| App shell (JS, CSS, icons, offline page) | precache | `mini-library-shell-<version>` | replaced on every deploy |
| Pages (navigations) | network-first → visited page → `/offline` | `mini-library-pages-<version>` | 30 entries |
| Images, covers, fonts | **cache-first** | `mini-library-static-v1` | 80 entries, 30 days |
| Open Library list & details API | **network-first** (4 s timeout) | `mini-library-api-v1` | 60 entries, 7 days |

- When an answer comes from the cache the service worker adds `x-sw-cache: hit`, and the page shows
  "You are viewing **saved data** from …".
- Not cached: non-GET requests, requests with an `Authorization` header or `credentials: "include"`,
  URLs like `/auth`, `/login`, `/token`, responses with `Cache-Control: private/no-store` or `Set-Cookie`.
  User data from the library stays in `localStorage` and is never put into the shared caches.
- Failed requests never crash the app: the SW returns a JSON 503 and the UI shows an offline/error state.

### Offline
- `/offline` (`public/offline.html`) is precached and works without network: message, status,
  **Retry connection** (a real request, not only `navigator.onLine`) and auto-retry on the `online` event.
- A navigation that cannot be completed offline (not visited before) opens the offline page.
- Visited pages, the library and previously loaded Open Library data still work offline.
- Online / Offline indicator in the header + an offline banner with "Retry connection".

## Mobile
Works from 320px wide, portrait and landscape: hamburger menu, one-column layout, tables turn into cards,
44–48px touch targets, 16px inputs (no iOS zoom), safe-area insets, no horizontal scrolling.

## Run locally

```bash
npm install
npm run dev
```

The service worker is only registered in the production build:

```bash
npm run build
npm run preview
```

Then open DevTools → Application → Service Workers / Cache Storage, and Network → Offline.

## Deploy
Vercel (`vercel.json` adds SPA rewrites, `/offline` → `/offline.html`, and cache headers for `sw.js`).
