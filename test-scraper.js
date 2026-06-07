const { scrapeSource } = require('./src/services/scraperService');
const sources = require('./src/config/sources.json');

async function testScraper() {
    console.log('--- TEST DE SCRAPER ---');
    // Probamos con Empa-t que es la más fiable
    const source = sources.find(s => s.id === 'empat_cronometraje');
    const resultados = await scrapeSource(source);
    
    console.log('\nResultados (primeros 3):');
    console.log(JSON.stringify(resultados.slice(0, 3), null, 2));
}

testScraper();
