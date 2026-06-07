const axios = require('axios');
const cheerio = require('cheerio');
const sources = require('../config/sources.json');

const USER_AGENT = "AsturiasRacingBot/1.0 (+https://radar-carreras.vercel.app; contacto@piterdata.com)";

const BLACKLIST = [
  'FOTOGRAFÍAS', 'ASAMBLEA', 'CURSO', 'CONVENIO', '¿QUIÉNES SOMOS?', 
  'CARTEL SEMANAL', 'RESOLUCIÓN', 'ÉXITO', 'SUBVENCIONES', 'CONCENTRACIÓN',
  'REGLAMENTO', 'CLASIFICACIÓN', 'RESULTADOS', 'GALERÍA', 'INICIO', 'CONTACTO'
];

const CONCEJOS_ASTURIAS = [
  'GIJÓN', 'OVIEDO', 'AVILÉS', 'SIERO', 'LANGREO', 'MIERES', 'CASTRILLÓN', 'SAN MARTÍN DEL REY AURELIO', 
  'CORVERA', 'VILLAVICIOSA', 'LLANERA', 'LLANES', 'LAVIANA', 'CANGAS DEL NARCEA', 'VALDÉS', 'LENA', 
  'ALLER', 'CARREÑO', 'GOZÓN', 'GRADO', 'TIREO', 'NAVIA', 'PRAVIA', 'PILOÑA', 'CANGAS DE ONÍS', 'RIBADESELLA'
];

async function scrapeSource(source) {
  console.log(`[*] Iniciando scraping ético en: ${source.nombre} (${source.web_principal})`);
  
  try {
    const response = await axios.get(source.web_principal, {
      headers: { 'User-Agent': USER_AGENT },
      timeout: 15000
    });

    if (response.status !== 200) return [];

    const $ = cheerio.load(response.data);
    const carrerasEncontradas = [];

    $(source.selector).each((i, el) => {
      const texto = $(el).text().trim();
      const textoUpper = texto.toUpperCase();
      const contenedor = $(el).closest('article, div, li, .post, .entry');
      const contexto = contenedor.text().toUpperCase();

      const esBasura = BLACKLIST.some(palabra => textoUpper.includes(palabra));
      if (esBasura || texto.length < 5) return;

      // 1. Inferencia de Localidad (Buscando concejos en el contexto)
      let localidad = "Asturias";
      for (const concejo of CONCEJOS_ASTURIAS) {
        if (contexto.includes(concejo)) {
          localidad = concejo.charAt(0) + concejo.slice(1).toLowerCase();
          break;
        }
      }

      // 2. Inferencia de Fecha Mejorada
      let fechaCarrera = null;
      // Patrón DD/MM/YYYY o DD-MM-YYYY
      const dateMatch = contexto.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
      if (dateMatch) {
        let [_, d, m, y] = dateMatch;
        if (y.length === 2) y = "20" + y;
        fechaCarrera = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      } else {
        // Patrón "24 de junio de 2026"
        const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
        const longDateMatch = contexto.match(/(\d{1,2})\s+DE\s+(ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE)\s+DE\s+(\d{4})/i);
        if (longDateMatch) {
          const [_, d, m, y] = longDateMatch;
          const monthIdx = meses.indexOf(m.toUpperCase()) + 1;
          fechaCarrera = `${y}-${monthIdx.toString().padStart(2, '0')}-${d.padStart(2, '0')}`;
        }
      }

      // 3. Inferencia de Modalidad
      let modalidad = source.modalidad_predominante;
      if (textoUpper.includes("TRAIL") || textoUpper.includes("CXM")) modalidad = "Trail Running";
      else if (textoUpper.includes("TRIATLÓN")) modalidad = "Triatlón";
      else if (textoUpper.includes("DUATLÓN")) modalidad = "Duatlón";
      else if (textoUpper.includes("BTT") || textoUpper.includes("MTB")) modalidad = "BTT / Ciclismo";
      else if (textoUpper.includes("CROSS")) modalidad = "Cross";
      else if (textoUpper.includes("SOLIDARIA") || textoUpper.includes("BENÉFICA")) modalidad = "Solidaria";
      else if (modalidad === "Plataforma de Inscripciones" || modalidad === "Agregador de Calendario") {
        modalidad = "Otros";
      }

      // 4. Extracción de Enlace e Imagen Mejorada
      let enlace = source.web_principal;
      let imagen = null;

      const linkElement = $(el).is('a') ? $(el) : $(el).find('a').first();
      if (linkElement.length > 0) {
        const href = linkElement.attr('href');
        if (href) {
          enlace = href.startsWith('http') ? href : new URL(href, source.web_principal).href;
        }
      }

      // Buscar imagen ignorando logos
      const container = $(el).closest('article, div, li, .post, .entry');
      const allImgs = container.find('img');
      
      for (let i = 0; i < allImgs.length; i++) {
        const img = $(allImgs[i]);
        const src = img.attr('src') || img.attr('data-src') || img.attr('srcset')?.split(' ')[0];
        if (!src || src.includes('base64')) continue;
        
        const srcUpper = src.toUpperCase();
        // Ignorar logos específicos y patrones genéricos de WordPress
        const isLogo = [
          'LOGO', 'ICON', 'BANNER', 'HEADER', 'FOOTER', 'AVATAR', 
          'EMPA-T-HORIZONTAL', 'DEFAULT', 'PLACEHOLDER'
        ].some(word => srcUpper.includes(word));
        
        // No ignorar WP-CONTENT/UPLOADS porque ahí están los carteles
        if (!isLogo) {
          imagen = src.startsWith('http') ? src : new URL(src, source.web_principal).href;
          break; 
        }
      }

      const slug = texto.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      carrerasEncontradas.push({
        titulo: texto,
        enlace: enlace,
        imagen: imagen,
        tipo: modalidad,
        slug: `${source.id}-${slug}`,
        fecha_publicacion: new Date().toISOString(),
        descripcion: `Detectado vía scraper desde ${source.nombre}`,
        localidad: "Asturias"
      });
    });

    console.log(`[+] Se han extraído ${carrerasEncontradas.length} elementos válidos de ${source.siglas}.`);
    return carrerasEncontradas;

  } catch (error) {
    console.error(`[!] Error en ${source.siglas}: ${error.message}`);
    return [];
  }
}

async function scrapeAllSources() {
  let todasLasCarreras = [];
  
  for (const source of sources) {
    const resultados = await scrapeSource(source);
    todasLasCarreras = todasLasCarreras.concat(resultados);
    // Delay de cortesía entre fuentes
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  return todasLasCarreras;
}

module.exports = {
  scrapeAllSources,
  scrapeSource
};
