require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    console.log('--- TEST DE CONEXIÓN SUPABASE ---');
    console.log('URL:', supabaseUrl);
    
    // Test lectura carreras
    console.log('\n1. Probando lectura de tabla "carreras"...');
    const { data: carreras, error: errorC } = await supabase.from('carreras').select('*').limit(1);
    if (errorC) {
        console.error('❌ Error leyendo carreras:', errorC.message);
        if (errorC.message.includes('RLS')) {
            console.log('👉 SUGERENCIA: Desactiva RLS o añade políticas de lectura en Supabase.');
        }
    } else {
        console.log('✅ Lectura exitosa. Carreras encontradas:', carreras.length);
    }

    // Test lectura suscripciones
    console.log('\n2. Probando lectura de tabla "suscripciones_push"...');
    const { data: subs, error: errorS } = await supabase.from('suscripciones_push').select('*').limit(1);
    if (errorS) {
        console.error('❌ Error leyendo suscripciones:', errorS.message);
    } else {
        console.log('✅ Lectura exitosa. Suscripciones encontradas:', subs.length);
    }
}

testConnection();
