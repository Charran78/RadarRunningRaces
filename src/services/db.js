require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Guardar carreras evitando duplicados y retornando las que son nuevas
async function saveCarreras(carreras) {
  const nuevasCarreras = [];

  for (const carrera of carreras) {
    // Verificamos si ya existe por enlace (URL única)
    const { data: existing, error: selectError } = await supabase
      .from('carreras')
      .select('id')
      .eq('enlace', carrera.enlace)
      .maybeSingle();

    if (selectError) {
      console.error(`Error al verificar carrera ${carrera.titulo}:`, selectError.message);
      continue;
    }

    if (!existing) {
      console.log(`📡 Insertando nueva carrera de ${carrera.slug.split('-')[0]}: ${carrera.titulo}`);
      // Si tiene imagen externa, la subimos a nuestro storage primero
      let finalImagen = carrera.imagen;
      if (carrera.imagen && carrera.imagen.startsWith('http')) {
        const fileName = `${carrera.slug}.jpg`;
        const localUrl = await uploadImageFromUrl(carrera.imagen, fileName);
        if (localUrl) finalImagen = localUrl;
      }

      // Es una carrera nueva, la insertamos
      const { error: insertError } = await supabase
        .from('carreras')
        .insert({
          titulo: carrera.titulo,
          enlace: carrera.enlace,
          imagen: finalImagen,
          fecha_publicacion: carrera.fecha_publicacion,
          fecha_carrera: carrera.fecha_carrera,
          localidad: carrera.localidad,
          tipo: carrera.tipo,
          descripcion: carrera.descripcion,
          slug: carrera.slug
        });
      
      if (insertError) {
        console.error(`Error al insertar carrera ${carrera.titulo}:`, insertError.message);
      } else {
        console.log(`✨ Nueva carrera detectada: ${carrera.titulo}`);
        nuevasCarreras.push(carrera);
      }
    } else {
      // Ya existe, actualizamos los datos por si han cambiado
      const { error: updateError } = await supabase
        .from('carreras')
        .update({
          titulo: carrera.titulo,
          imagen: carrera.imagen,
          fecha_publicacion: carrera.fecha_publicacion,
          fecha_carrera: carrera.fecha_carrera,
          localidad: carrera.localidad,
          tipo: carrera.tipo,
          descripcion: carrera.descripcion,
          actualizado_en: new Date().toISOString()
        })
        .eq('enlace', carrera.enlace);
      
      if (updateError) {
        console.error(`Error al actualizar carrera ${carrera.titulo}:`, updateError.message);
      }
    }
  }

  return nuevasCarreras;
}

// Consultar carreras aplicando filtros opcionales
async function getCarreras(filtros = {}) {
  console.log('🔍 Consultando carreras en Supabase con filtros:', filtros);
  let query = supabase
    .from('carreras')
    .select('*', { count: 'exact' });

  if (filtros.localidad) {
    query = query.ilike('localidad', `%${filtros.localidad}%`);
  }

  if (filtros.tipo) {
    query = query.eq('tipo', filtros.tipo);
  }

  if (filtros.fecha_desde) {
    // Incluir carreras con fecha >= filtro O carreras sin fecha (asumiendo que son anuncios futuros)
    query = query.or(`fecha_carrera.gte.${filtros.fecha_desde},fecha_carrera.is.null`);
  }

  // Paginación
  const limit = filtros.limit || 12;
  const offset = filtros.offset || 0;
  
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query
    .order('fecha_carrera', { ascending: true })
    .order('fecha_publicacion', { ascending: false });

  if (error) {
    console.error('❌ Error de Supabase al obtener carreras:', error.message);
    return { data: [], count: 0 };
  }

  console.log(`📊 Se encontraron ${data ? data.length : 0} carreras de un total de ${count}.`);
  return { data, count };
}

// Funciones para suscripciones push
async function saveSubscription(subscription) {
  console.log('💾 Intentando guardar suscripción en Supabase...');
  if (!subscription || !subscription.endpoint || !subscription.keys) {
    throw new Error('Formato de suscripción inválido');
  }

  const { data, error } = await supabase
    .from('suscripciones_push')
    .upsert({
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth
    }, { onConflict: 'endpoint' });

  if (error) {
    console.error('❌ Error de Supabase al guardar suscripción:', error.message);
    console.error('Detalles del error:', error);
    throw error;
  }
  return data;
}

async function getSubscriptions() {
  const { data, error } = await supabase
    .from('suscripciones_push')
    .select('*');

  if (error) {
    console.error('Error al obtener suscripciones:', error.message);
    return [];
  }
  return data;
}

async function deleteSubscription(endpoint) {
  const { error } = await supabase
    .from('suscripciones_push')
    .delete()
    .eq('endpoint', endpoint);

  if (error) {
    console.error('Error al borrar suscripción:', error.message);
  }
}

// Favoritos
async function toggleFavorite(userId, carreraId) {
  const id = parseInt(carreraId);
  const { data: existing } = await supabase
    .from('favoritos')
    .select('*')
    .eq('user_id', userId)
    .eq('carrera_id', id)
    .maybeSingle();

  if (existing) {
    await supabase.from('favoritos').delete().eq('id', existing.id);
    return { favorited: false };
  } else {
    await supabase.from('favoritos').insert({ user_id: userId, carrera_id: id });
    return { favorited: true };
  }
}

async function getUserFavorites(userId) {
  const { data, error } = await supabase
    .from('favoritos')
    .select('carrera_id')
    .eq('user_id', userId);
  
  if (error) return [];
  return data.map(f => f.carrera_id);
}

// Utilidades
async function getUniqueLocalidades() {
  const { data, error } = await supabase
    .from('carreras')
    .select('localidad')
    .not('localidad', 'is', null);
  
  if (error) return [];
  const unique = [...new Set(data.map(d => d.localidad.trim()))].sort();
  return unique;
}

// Almacenamiento de imágenes en Supabase Storage
async function uploadImageFromUrl(url, fileName) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('No se pudo descargar la imagen');
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Subir a Supabase Storage
    const { data, error } = await supabase.storage
      .from('carteles')
      .upload(fileName, buffer, {
        contentType: response.headers.get('content-type') || 'image/jpeg',
        upsert: true
      });

    if (error) throw error;

    // Obtener URL pública
    const { data: { publicUrl } } = supabase.storage
      .from('carteles')
      .getPublicUrl(fileName);

    return publicUrl;
  } catch (error) {
    console.error(`❌ Error subiendo imagen ${fileName}:`, error.message);
    return null;
  }
}

async function deleteExpiredImages(fileNames) {
  if (fileNames.length === 0) return;
  const { error } = await supabase.storage
    .from('carteles')
    .remove(fileNames);
  if (error) console.error('❌ Error borrando imágenes caducadas:', error.message);
}

module.exports = {
  saveCarreras,
  getCarreras,
  saveSubscription,
  getSubscriptions,
  deleteSubscription,
  toggleFavorite,
  getUserFavorites,
  getUniqueLocalidades,
  uploadImageFromUrl,
  deleteExpiredImages,
  supabase
};
