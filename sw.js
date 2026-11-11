/* AE Global Traders – iPad app: offline cache. Pages: network first (5 s), then cache. Assets: cache first. Map tiles and external sites: network only. */
const V = "aegt-core-e02de79e", PAGES = "aegt-pages", CORE = ["./", "index.html", "manifest.webmanifest", "assets/style.css", "assets/app.js", "de/index.html", "de/trip.html", "de/map.html", "en/index.html", "en/trip.html", "en/map.html", "zh/index.html", "zh/trip.html", "zh/map.html", "assets/brand/aegt-icon-192.png", "assets/brand/aegt-icon-512.png", "assets/brand/aegt-icon-maskable-512.png", "assets/brand/aegt-logo-header-light.svg", "assets/brand/aegt-logo-light.svg", "assets/brand/aegt-logo-mail.png", "assets/brand/aegt-logo.png", "assets/brand/aegt-logo.svg", "assets/brand/aegt-mark.svg", "assets/brand/aegt-touch-180.png", "assets/fonts/italiana.woff2", "assets/fonts/montserrat-vf.woff2", "assets/vendor/leaflet/images/layers-2x.png", "assets/vendor/leaflet/images/layers.png", "assets/vendor/leaflet/images/marker-icon-2x.png", "assets/vendor/leaflet/images/marker-icon.png", "assets/vendor/leaflet/images/marker-shadow.png", "assets/vendor/leaflet/leaflet.css", "assets/vendor/leaflet/leaflet.js"];
self.addEventListener("install", e => e.waitUntil(caches.open(V).then(c => Promise.all(CORE.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting())));
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("aegt-core-") && k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())));
const OFF = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font:16px system-ui;padding:40px;background:#F6F5F3;color:#242424">
<h2>Offline</h2><p>Diese Seite ist noch nicht offline gespeichert. Startseite → „Offline speichern“ (mit Internet).</p><p>This page is not saved offline yet. Home → “Save offline” (while online).</p><p><a href="javascript:history.back()">← zurück / back</a></p>`;
const late = (p, ms) => Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error("timeout")), ms))]);
async function netFirst(req) {
  const c = await caches.open(PAGES);
  try { const res = await late(fetch(req), 5000); if (res.ok) c.put(req, res.clone()); return res; }
  catch (x) { return (await caches.match(req, { ignoreSearch: true })) || new Response(OFF, { headers: { "Content-Type": "text/html; charset=utf-8" } }); }
}
async function cacheFirst(req) {
  const hit = await caches.match(req, { ignoreSearch: true }); if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) (await caches.open(/\.(css|js|woff2?)$/.test(new URL(req.url).pathname) ? V : PAGES)).put(req, res.clone());
  return res;
}
self.addEventListener("fetch", e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== location.origin) return;
  e.respondWith(r.mode === "navigate" || /(\.html|\.json|\/)$/.test(u.pathname) ? netFirst(r) : cacheFirst(r));
});
