// Stands in for a partner's OWN service worker controlling "/" (typical PWA / offline worker).
// It is deliberately intrusive, to prove the Hivara one at /hivara-push/ coexists with it:
// - claims every page right away, so the landing is controlled by THIS worker, not Hivara's;
// - answers EVERY fetch itself (same-origin and cross-origin, e.g. the bubble's embed.js);
// - keeps an offline cache of the pages it serves;
// - has its own push/notificationclick handlers, as a partner with its own push vendor would.
const VERSION = "partner-sw-v2";
const CACHE = `partner-pages-${VERSION}`;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  // Same-origin navigations: network first, cached copy when offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request)),
    );
    return;
  }

  // Everything else (including cross-origin scripts/images) goes through this worker too.
  event.respondWith(fetch(request));
});

// Only fires for subscriptions made through THIS registration — never for Hivara's.
self.addEventListener("push", (event) => {
  event.waitUntil(
    self.registration.showNotification("[Partner SW] push", {
      body: event.data ? event.data.text() : "",
      tag: "partner-own-push",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow("/?from=partner-sw"));
});

self.addEventListener("message", (event) => {
  if (event.data === "PARTNER_SW_PING") event.source.postMessage({ type: "PARTNER_SW_PONG", version: VERSION });
});
