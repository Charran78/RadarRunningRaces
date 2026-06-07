self.addEventListener('push', function(event) {
  console.log('[SW] Notificación Push recibida');
  
  let data = {};
  try {
    data = event.data.json();
  } catch (e) {
    console.error('[SW] Error parseando JSON de notificación:', e);
    data = { title: 'Radar de Carreras', body: event.data.text() };
  }

  const options = {
    body: data.body || 'Nueva actualización disponible',
    icon: data.icon || 'https://cdn-icons-png.flaticon.com/512/1048/1048953.png',
    data: data.data || {},
    badge: 'https://cdn-icons-png.flaticon.com/512/1048/1048953.png',
    vibrate: [100, 50, 100],
    actions: [
      { action: 'explore', title: 'Ver Carrera' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || '¡A correr!', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  if (event.notification.data && event.notification.data.url) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});
