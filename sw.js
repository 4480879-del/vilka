importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

// 🔥 Апаем версию, чтобы браузер 100% скачал этот новый файл
const KILL_CACHE_VERSION = 'v-kill-1';

self.addEventListener('install', (event) => {
  // Форсируем немедленную установку
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          // 🔥 СЖИГАЕМ АБСОЛЮТНО ВСЕ КЭШИ, созданные ранее
          console.log('Убиваем кэш:', name);
          return caches.delete(name);
        })
      );
    })
  );
  // Забираем контроль у старого воркера
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // 🔥 БЛОК ПУСТ. Мы больше не вмешиваемся в сеть. 
  // Браузер будет сам ходить на сервер напрямую.
});