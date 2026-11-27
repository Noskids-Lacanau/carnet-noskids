/* Carnet Noskids : service worker. Garde l'app sur le téléphone pour qu'elle s'ouvre sans réseau.
   À chaque nouvelle version, changer VERSION (outils/Nouvelle-Version.ps1 le fait). */
const VERSION = "2.0.2";
const CACHE = "carnet-noskids-" + VERSION;
const SHELL = ["./", "index.html", "app.css", "app.js", "manifest.webmanifest",
  "img/bateau.jpg", "img/ski.jpg", "img/logo-malibu.png", "img/logo-malibu-or.png", "img/pompe.png", "icons/icon-192.png", "icons/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith("carnet-noskids-") && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("message", (e) => { if (e.data === "skipWaiting") self.skipWaiting(); });

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Fichiers de l'app : depuis le téléphone d'abord
  if (url.origin === self.location.origin) {
    e.respondWith(caches.match(req, { ignoreSearch: true }).then((r) => r || fetch(req)));
    return;
  }
  // Polices et module Excel : mis en cache au premier usage
  if (url.hostname === "cdnjs.cloudflare.com" || url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(caches.open(CACHE).then((c) => c.match(req).then((r) => r || fetch(req).then((res) => { if (res.ok) c.put(req, res.clone()); return res; }))));
  }
  // Le serveur Apps Script n'est jamais mis en cache
});
