const Parser = require('rss-parser');
const parser = new Parser();

// URL del RSS de eventos de crono empate
const FEED_URL = 'https://www.empa-t.com/feed/?post_type=eventos';

async function fetchCarreras() {
  try {
    const feed = await parser.parseURL(FEED_URL);
    const carreras = feed.items.map(item => ({
      titulo: item.title,
      enlace: item.link,
      fecha: item.pubDate ? new Date(item.pubDate) : null,
      descripcion: item.contentSnippet || item.content || '',
      // Aquí puedes intentar extraer localidad, distancia, etc.
    }));
    return carreras;
  } catch (error) {
    console.error('Error al leer RSS:', error.message);
    return [];
  }
}

module.exports = { fetchCarreras };
