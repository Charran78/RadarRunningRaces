require('dotenv').config();
const webpush = require('web-push');
const { getSubscriptions, deleteSubscription } = require('./db');

// Configurar claves VAPID
webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

async function enviarNotificacionNuevaCarrera(carrera) {
  const suscripciones = await getSubscriptions();
  
  // Base URL para iconos locales (cambiar por tu dominio real al publicar)
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  
  const body = `${carrera.titulo} en ${carrera.localidad || 'Asturias'}`;
  const icon = carrera.imagen && carrera.imagen.startsWith('http') 
    ? carrera.imagen 
    : `${baseUrl}/icon-192x192.png`;

  const payload = JSON.stringify({
    title: '¡Nueva Carrera!',
    body: body.length > 100 ? body.substring(0, 97) + '...' : body,
    icon: icon,
    badge: `${baseUrl}/icon-192x192.png`,
    data: {
      url: carrera.enlace
    }
  });

  console.log(`Enviando notificaciones para: ${carrera.titulo} a ${suscripciones.length} dispositivos.`);

  const promesas = suscripciones.map(async (sub) => {
    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth
      }
    };

    try {
      await webpush.sendNotification(pushSubscription, payload);
    } catch (error) {
      if (error.statusCode === 404 || error.statusCode === 410) {
        console.log(`Suscripción expirada o inválida: ${sub.endpoint}. Eliminando...`);
        await deleteSubscription(sub.endpoint);
      } else {
        console.error(`Error enviando notificación a ${sub.endpoint}:`, error);
      }
    }
  });

  await Promise.all(promesas);
}

module.exports = {
  enviarNotificacionNuevaCarrera
};
