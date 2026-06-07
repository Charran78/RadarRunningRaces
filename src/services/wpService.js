// wpService.js – Obtiene carreras desde la API REST de WordPress y extrae datos reales del HTML
const WP_API = 'https://www.empa-t.com/wp-json/wp/v2/eventos';

const BLACKLIST = [
  'FOTOGRAFÍAS', 'ASAMBLEA', 'CURSO', 'CONVENIO', '¿QUIÉNES SOMOS?', 
  'CARTEL SEMANAL', 'RESOLUCIÓN', 'ÉXITO', 'SUBVENCIONES', 'CONCENTRACIÓN',
  'REGLAMENTO', 'CLASIFICACIÓN', 'RESULTADOS', 'GALERÍA', 'INICIO', 'CONTACTO'
];

// Helper para extraer fecha, localidad, tipo e imagen desde el HTML
function parseHTMLDetails(html) {
  let fecha = null;
  let localidad = null;
  let tipo = null;
  let imagen = null;

  // 1. Intentar con meta description (muy rápido y directo)
  const metaMatch = html.match(/<meta[^>]*(name|property)=["'](og:)?description["'][^>]*content=["']([^"']*)["']/i) ||
                    html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*(name|property)=["'](og:)?description["']/i);
  
  if (metaMatch) {
    const content = metaMatch[3] || metaMatch[1];
    const dateLocMatch = content.match(/se\s+carrera\s+el\s+(\d{8})/i) || content.match(/se\s+celebra\s+el\s+(\d{8})/i);
    if (dateLocMatch) {
      const dateStr = dateLocMatch[1];
      fecha = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
    }
  }

  // 2. Buscar imagen destacada (og:image)
  const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["']/i);
  if (ogImageMatch) {
    imagen = ogImageMatch[1];
  }

  // 3. Buscar en el body recorriendo los elementor-icon-list-text para mayor precisión
  const listTexts = [...html.matchAll(/<span\s+class=["']elementor-icon-list-text["']>([^<]+)<\/span>/gi)].map(m => m[1].trim());
  
  // Patrón DD/MM/YYYY
  const dateIndex = listTexts.findIndex(text => /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(text));
  if (dateIndex !== -1) {
    const potentialDate = listTexts[dateIndex];
    const parts = potentialDate.split('/');
    fecha = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    
    if (dateIndex + 1 < listTexts.length) localidad = listTexts[dateIndex + 1];
    if (dateIndex + 2 < listTexts.length) tipo = listTexts[dateIndex + 2];
  } else {
    // Intentar buscar cualquier fecha en el texto (ej: "24 de junio de 2026")
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const textBody = listTexts.join(' ');
    const longDateMatch = textBody.match(/(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+de\s+(\d{4})/i);
    
    if (longDateMatch) {
      const [_, d, m, y] = longDateMatch;
      const monthIdx = meses.indexOf(m.toLowerCase()) + 1;
      fecha = `${y}-${monthIdx.toString().padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
  }

  // 4. Limpiar Tipo si es muy genérico
  if (tipo && (tipo.includes('Carreras Populares') || tipo.includes('Eventos'))) {
    tipo = 'Otros';
  }

  // 5. Asegurar que la imagen no es un logo genérico de empa-t
  if (imagen && imagen.toUpperCase().includes('LOGO-EMPA-T')) {
    imagen = null;
  }

  return { fecha, localidad, tipo, imagen };
}

async function fetchCarrerasWP() {
  try {
    // Pedimos hasta 100 eventos (máximo por página en WordPress por defecto)
    const url = `${WP_API}?per_page=100&_embed`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const eventos = await response.json();

    // Mapeamos y obtenemos los detalles reales del HTML de cada evento de forma concurrente
    const promesas = eventos.map(async (ev) => {
      const tituloUpper = ev.title.rendered.toUpperCase();
      const esBasura = BLACKLIST.some(palabra => tituloUpper.includes(palabra));
      if (esBasura) return null;

      let fechaCarrera = null;
      let localidad = null;
      let tipo = null;
      let imagen = null;

      try {
        if (ev.link) {
          const detailRes = await fetch(ev.link);
          if (detailRes.ok) {
            const html = await detailRes.text();
            const extracted = parseHTMLDetails(html);
            fechaCarrera = extracted.fecha;
            localidad = extracted.localidad;
            tipo = extracted.tipo;
            imagen = extracted.imagen;
          }
        }
      } catch (err) {
        console.error(`Error al scrapear detalles de ${ev.link}:`, err.message);
      }

      // Si no hay imagen de og:image, intentar con la de WordPress embed
      if (!imagen && ev._embedded && ev._embedded['wp:featuredmedia']) {
        imagen = ev._embedded['wp:featuredmedia'][0].source_url;
      }

      return {
        titulo: ev.title.rendered,
        enlace: ev.link,
        imagen: imagen,
        fecha_publicacion: ev.date,
        fecha_carrera: fechaCarrera,
        localidad: localidad,
        tipo: tipo,
        descripcion: ev.excerpt?.rendered?.replace(/<[^>]*>/g, '') || '',
        slug: ev.slug,
      };
    });

    const resultados = await Promise.all(promesas);
    return resultados.filter(r => r !== null);
  } catch (error) {
    console.error('Error en API WP:', error.message);
    return [];
  }
}

module.exports = { fetchCarrerasWP };
