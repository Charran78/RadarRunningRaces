require('dotenv').config();
const express = require('express');
const cron = require('node-cron');
const { fetchCarrerasWP } = require('./services/wpService');
const { scrapeAllSources } = require('./services/scraperService');
const { 
  saveCarreras, 
  getCarreras, 
  saveSubscription, 
  toggleFavorite, 
  getUserFavorites, 
  getUniqueLocalidades,
  getActiveCategories,
  deleteExpiredImages,
  supabase 
} = require('./services/db');
const { enviarNotificacionNuevaCarrera } = require('./services/notificaciones');

const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Middleware para verificar Auth de Supabase
async function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No autorizado' });

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Token inválido' });

  req.user = user;
  next();
}

// ─── Función de actualización compartida ─────────────────────────────────────
async function actualizarCarreras() {
  console.log('⏰ [3:30 AM] Iniciando actualización masiva de carreras...');
  try {
    const carrerasWP = await fetchCarrerasWP();
    const carrerasScraped = await scrapeAllSources();
    const todas = [...carrerasWP, ...carrerasScraped];
    
    if (todas.length === 0) return { total: 0, nuevas: 0 };
    
    const nuevas = await saveCarreras(todas);
    
    // Limpieza de imágenes caducadas
    const hoy = new Date().toISOString().split('T')[0];
    const { data: pasadas } = await supabase
      .from('carreras')
      .select('slug')
      .lt('fecha_carrera', hoy);
    
    if (pasadas && pasadas.length > 0) {
      const filesToDelete = pasadas.map(p => `${p.slug}.jpg`);
      await deleteExpiredImages(filesToDelete);
      console.log(`🧹 Limpieza: ${filesToDelete.length} imágenes de carreras pasadas eliminadas.`);
    }

    if (nuevas.length > 0) {
      for (const carrera of nuevas) {
        await enviarNotificacionNuevaCarrera(carrera);
      }
    }
    return { total: todas.length, nuevas: nuevas.length };
  } catch (error) {
    console.error('❌ Error en actualización programada:', error.message);
    return { error: error.message };
  }
}

// ─── Rutas API ──────────────────────────────────────────────────────────────

// Obtener carreras con filtros avanzados
app.get('/api/carreras', async (req, res) => {
  try {
    const { localidad, tipo, fecha_desde, solo_futuras, limit, offset } = req.query;
    
    // Por defecto, ocultar pasadas si no se especifica lo contrario
    const hoy = new Date().toISOString().split('T')[0];
    const filtroFecha = solo_futuras === 'false' ? fecha_desde : (fecha_desde || hoy);

    const result = await getCarreras({ 
      localidad, 
      tipo, 
      fecha_desde: filtroFecha,
      limit: parseInt(limit) || 12,
      offset: parseInt(offset) || 0
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener localidades únicas para el filtro
app.get('/api/localidades', async (req, res) => {
  const locales = await getUniqueLocalidades();
  res.json(locales);
});

// Obtener categorías activas con contadores
app.get('/api/categorias', async (req, res) => {
  const { solo_futuras, fecha_desde } = req.query;
  const hoy = new Date().toISOString().split('T')[0];
  const filtroFecha = solo_futuras === 'false' ? fecha_desde : (fecha_desde || hoy);

  const categorias = await getActiveCategories({ fecha_desde: filtroFecha });
  res.json(categorias);
});

// Favoritos (Protegido)
app.post('/api/favoritos/toggle', authenticate, async (req, res) => {
  const { carreraId } = req.body;
  const result = await toggleFavorite(req.user.id, carreraId);
  res.json(result);
});

app.get('/api/favoritos', authenticate, async (req, res) => {
  const favorites = await getUserFavorites(req.user.id);
  res.json(favorites);
});

// RSS Feed para Bots
app.get('/api/rss', async (req, res) => {
  const hoy = new Date().toISOString().split('T')[0];
  const carreras = await getCarreras({ fecha_desde: hoy });
  
  let rss = `<?xml version="1.0" encoding="UTF-8" ?>
  <rss version="2.0">
  <channel>
    <title>Radar de Carreras Asturias</title>
    <link>${req.protocol}://${req.get('host')}</link>
    <description>Próximas carreras en Asturias y alrededores</description>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
  `;

  carreras.forEach(c => {
    rss += `
    <item>
      <title>${c.titulo}</title>
      <link>${c.enlace}</link>
      <description>${c.tipo} en ${c.localidad || 'Asturias'} - Fecha: ${c.fecha_carrera}</description>
      <guid>${c.slug}</guid>
      <pubDate>${new Date(c.creado_en).toUTCString()}</pubDate>
    </item>`;
  });

  rss += `</channel></rss>`;
  res.set('Content-Type', 'text/xml');
  res.send(rss);
});

// Obtener configuración pública (Supabase URL y Anon Key)
app.get('/api/config', (req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY
  });
});

// Obtener VAPID Public Key
app.get('/api/notificaciones/vapid-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

// Suscribirse a notificaciones push
app.post('/api/notificaciones/suscribir', async (req, res) => {
  try {
    const subscription = req.body;
    await saveSubscription(subscription);
    res.status(201).json({ ok: true, message: 'Suscripción guardada correctamente' });
  } catch (error) {
    console.error('❌ Error en /api/notificaciones/suscribir:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Forzar actualización (solo desarrollo o admin)
app.get('/api/admin/actualizar', async (req, res) => {
  const resultado = await actualizarCarreras();
  res.json({ ok: true, ...resultado });
});

// Exportar para Vercel
module.exports = app;

// ─── Tarea programada (3:30 AM) - Solo en local ─────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  cron.schedule('30 3 * * *', actualizarCarreras);
}

// ─── Arrancar servidor ────────────────────────────────────────────────────────
if (require.main === module) {
  app.listen(PORT, async () => {
    console.log(`🚀 Servidor radar en http://localhost:${PORT}`);
    
    // Carga inicial
    try {
      const enBD = await getCarreras();
      if (enBD.length === 0) {
        console.log('📂 Base de datos vacía en Supabase. Realizando carga inicial...');
        await actualizarCarreras();
      } else {
        console.log(`📂 ${enBD.length} carreras encontradas en Supabase.`);
      }
    } catch (error) {
      console.error('❌ Error en el arranque:', error.message);
    }
  });
}
