// Service Worker — Suivi Tensionnel
// Version du cache — incrémentez à chaque mise à jour
var CACHE_NAME = 'suivi-tensionnel-v25';

// Fichiers à mettre en cache pour le mode hors-ligne
var FILES_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  'https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js'
];

// Installation : mise en cache des ressources
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      console.log('[SW] Mise en cache des ressources...');
      return cache.addAll(FILES_TO_CACHE).catch(function(err) {
        console.log('[SW] Erreur cache (normal si hors-ligne) :', err);
      });
    })
  );
  self.skipWaiting();
});

// Activation : nettoyage des anciens caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(name) {
          return name !== CACHE_NAME;
        }).map(function(name) {
          console.log('[SW] Suppression ancien cache :', name);
          return caches.delete(name);
        })
      );
    })
  );
  self.clients.claim();
});

// Interception des requêtes : cache en priorité, réseau en fallback
self.addEventListener('fetch', function(event) {
  // Ignorer les requêtes non-GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(function(cachedResponse) {
      if (cachedResponse) {
        // Ressource trouvée dans le cache — servie immédiatement
        // Mise à jour en arrière-plan si connexion disponible
        fetch(event.request).then(function(networkResponse) {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, networkResponse.clone());
            });
          }
        }).catch(function() {});
        return cachedResponse;
      }
      // Pas dans le cache — requête réseau
      return fetch(event.request).then(function(networkResponse) {
        if (networkResponse && networkResponse.status === 200) {
          var responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(function() {
        // Hors-ligne et pas dans le cache : retourner la page principale
        return caches.match('./index.html');
      });
    })
  );
});
