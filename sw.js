// sw.js — Service Worker Pagar-SNI PKTN
// Letakkan file ini SEJAJAR dengan index.html (di root repo), bukan di dalam folder assets/,
// karena cakupan (scope) service worker dibatasi ke lokasi file ini berada.

const CACHE_NAME = 'pagar-sni-pktn-v3'; // dinaikkan supaya browser mengambil cache baru & membuang yang lama
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon-maskable-192.png',
  './assets/icon-maskable-512.png',
  './assets/apple-touch-icon.png',
  './assets/logo-pagar-sni-mini.png',
  './assets/logo-pagar-sni-full.png',
  './assets/login-bg-sni.png',
  './assets/banner-sni.png'
];

// Sumber daya CDN yang boleh dicoba disimpan di cache (best-effort)
const CDN_ASSETS = [
  'https://cdn.tailwindcss.com/3.4.17',
  'https://cdn.jsdelivr.net/npm/lucide@0.263.0/dist/umd/lucide.min.js',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // PENTING: setiap file dicoba SATU PER SATU (bukan addAll) supaya satu file yang
      // hilang/salah nama TIDAK menggagalkan seluruh instalasi Service Worker seperti sebelumnya.
      const cacheEach = (list) =>
        Promise.allSettled(list.map((url) => cache.add(url).catch((err) => {
          console.log('[SW] Gagal menyimpan ke cache (dilewati):', url, err);
        })));
      return cacheEach(APP_SHELL).then(() => cacheEach(CDN_ASSETS));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

// Strategi: coba jaringan dulu (data selalu terbaru saat online), kalau gagal (offline) ambil dari cache.
// Untuk permintaan navigasi (membuka halaman/PWA dari ikon), SELALU sediakan fallback ke index.html
// yang sudah tersimpan, ini kunci supaya aplikasi tetap bisa DIBUKA sepenuhnya tanpa internet.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return; // POST ke Apps Script tidak disentuh di sini

  const isNavigation = event.request.mode === 'navigate';

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => {
          if (cached) return cached;
          if (isNavigation) return caches.match('./index.html'); // fallback utama saat offline
          return caches.match('./'); // upaya terakhir
        })
      )
  );
});
