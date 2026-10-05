/* Hivara Web Push spike — service worker logic, loaded cross-origin via importScripts. */
const SPIKE_VERSION = "spike-1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "Hivara (payload no JSON)", body: event.data ? event.data.text() : "" };
  }
  const options = {
    body: data.body || "",
    icon: data.icon || undefined,
    image: data.image || undefined,
    tag: data.tag || undefined,
    data: { url: data.url || self.registration.scope, receivedAt: Date.now(), version: SPIKE_VERSION },
  };
  event.waitUntil(
    self.registration.showNotification(data.title || "Hivara", options).then(() =>
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
        clients.forEach((c) => c.postMessage({ type: "SPIKE_PUSH_RECEIVED", payload: data }));
      })
    )
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";
  const targetOrigin = new URL(target, self.location.origin).origin;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const sameOrigin = clients.find((c) => new URL(c.url).origin === targetOrigin);
      if (sameOrigin) {
        sameOrigin.postMessage({ type: "HIVARA_OPEN_CHAT" });
        return sameOrigin.focus();
      }
      return self.clients.openWindow(target);
    })
  );
});
