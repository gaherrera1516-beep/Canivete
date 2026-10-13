/* Canivete do Dia a Dia: guarda o site no aparelho para funcionar sem internet */
const CACHE = 'canivete-v2';
const BASE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './privacidade.html'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(BASE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // Só guarda o próprio site, as fontes e a biblioteca do QR Code.
  // Músicas, vídeos e o YouTube passam direto, sem ocupar espaço no aparelho.
  const url = new URL(req.url);
  const proprio = url.origin === self.location.origin;
  const permitido = proprio || /(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(url.hostname) || url.hostname === 'cdn.jsdelivr.net';
  if (!permitido || req.headers.has('range') || req.destination === 'audio' || req.destination === 'video') return;

  // Páginas: tenta a internet primeiro (para pegar atualizações) e usa a cópia guardada sem conexão
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html')))
    );
    return;
  }

  // Fontes, ícones e bibliotecas: usa a cópia guardada e atualiza em segundo plano
  e.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req)
        .then((res) => {
          if (res && (res.ok || res.type === 'opaque')) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => hit);
      return hit || net;
    })
  );
});
