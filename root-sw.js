// Spike: stands in for a partner's OWN service worker controlling "/". Must keep working
// alongside the Hivara one registered at /hivara-push/.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
