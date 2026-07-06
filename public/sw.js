self.addEventListener('fetch', function(event) {
  // No interceptar peticions a Firebase ni a /auth
  if (event.request.url.includes('firebasedatabase.app') ||
      event.request.url.includes('/auth')) {
    return;
  }
  event.respondWith(
    caches.match(event.request).then(function(response) {
      return response || fetch(event.request);
    })
  );
});
