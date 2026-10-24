// Service worker de SoundBlue: guarda la interfaz para abrirla sin internet.
// La música viene de YouTube y nunca pasa por aquí: otros dominios siempre van a la red.
// No edites VERSION ni la lista a mano: `npm run build` las completa (ver vite.config.ts).

const VERSION = '__PREFIJO__-__VERSION__';
const ARCHIVOS = self.__ARCHIVOS__ || [];
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  ...ARCHIVOS,
];

self.addEventListener('install', (event) => {
  // { cache: 'reload' }: copias recién bajadas del servidor, no las que el navegador tenga guardadas
  // (GitHub Pages deja guardar cada archivo 10 minutos y podía quedar una versión vieja).
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(SHELL.map((url) => new Request(url, { cache: 'reload' })))));
  self.skipWaiting();
});

// Al activarse borra las copias viejas: las de versiones anteriores y las del nombre anterior (bluemusic-…).
// Solo las propias: en usuario.github.io pueden vivir otras apps con sus propias copias (y el preview, «sbpreview-»).
const PROPIAS = new RegExp('^(__LIMPIAR__)-');

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => PROPIAS.test(key) && key !== VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  // Solo los archivos de la app (/soundblue/…). YouTube y las API de los intermediarios (/jam-api, /ytm-api)
  // van siempre a la red: guardarlas mostraría datos viejos (p. ej. una Jam que ya terminó).
  if (!request.url.startsWith(self.registration.scope)) return;
  // version.json dice cuál es la última versión publicada: siempre a la red, nunca de una copia.
  if (new URL(request.url).pathname.endsWith('/version.json')) return;

  // Páginas: primero la red, preguntando SIEMPRE al servidor si cambió (cache: 'no-cache'); sin conexión, la copia
  // guardada. Antes se pedía sin eso y el navegador podía entregar una página vieja: GitHub Pages deja guardarla
  // 10 minutos y, al reabrir una pestaña, Chrome usa la que tenga aunque sea más vieja.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request.url, { cache: 'no-cache', credentials: 'same-origin' })
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(VERSION).then((cache) => cache.put('./index.html', copy));
          }
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Archivos de la app: primero la copia guardada (rápido y sin conexión); en paralelo se actualiza.
  event.respondWith(
    caches.open(VERSION).then(async (cache) => {
      const cached = await cache.match(request);
      const network = fetch(request)
        .then((response) => {
          if (response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
