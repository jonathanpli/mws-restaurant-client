const staticCacheName = 'mws-restaurant-cache-v1';
let filesToCache = [
  '/',
  'css/styles.css',
  'data/restaurants.json',
  'index.html',
  'restaurant.html',
  'js/dbhelper.js',
  'js/main.js',
  'js/restaurant_info.js'
];

for (let i = 1; i <= 10; ++i) {
  filesToCache.push(`img/${i}.jpg`);
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(staticCacheName)
      .then(cache => {
        return cache.addAll(filesToCache);
      })
      .catch((error) => {
        console.error('Failed to cache', error);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request).then(response => {
          return caches.open(staticCacheName).then(cache => {
            cache.put(event.request.url, response.clone());
            return response;
          });
        });

      }).catch(error => {
      console.error("Error fetching ", err);
      return error;
    })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [staticCacheName];

  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
