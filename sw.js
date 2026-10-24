// Офлайн-режим: оболочка приложения в кэше, страница — сначала из сети, шрифты — из кэша с фоновым обновлением.
// При изменении файлов приложения поднимайте VERSION, иначе у пользователей останется старый кэш.
const VERSION = 'bloomline-2026-10-24-5';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'js/app.js', 'js/i18n.js', 'js/store.js', 'js/grinders.js', 'js/schemes.js', 'js/core.js', 'js/ui.js',
  'js/timer.js', 'js/brew.js', 'js/schemes-view.js', 'js/journal.js', 'js/settings.js', 'js/guide.js',
  'data/grinders.json',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png',
];

self.addEventListener('install', e => {
  // cache: 'reload' — мимо HTTP-кэша браузера: GitHub Pages разрешает хранить файлы 10 минут,
  // и без этого в новую версию попадала смесь старых и новых модулей
  const fresh = SHELL.map(u => new Request(u, { cache: 'reload' }));
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(fresh)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(res => {
      const copy = res.clone(); caches.open(VERSION).then(c => c.put('index.html', copy));
      return res;
    }).catch(() => caches.match('index.html')));
    return;
  }

  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin === location.origin || isFont) {
    e.respondWith(caches.open(VERSION).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req, { cache: 'no-cache' }).then(res => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    }));
  }
});
