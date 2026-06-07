// Definición del modelo Carrera – refleja la estructura de la tabla SQLite
//
// Tabla: carreras
// ┌──────────────────┬────────────────────────────────────────────────────┐
// │ Campo            │ Descripción                                        │
// ├──────────────────┼────────────────────────────────────────────────────┤
// │ id               │ INTEGER PRIMARY KEY AUTOINCREMENT                  │
// │ titulo           │ Nombre del evento                                  │
// │ enlace           │ URL del evento (UNIQUE)                            │
// │ fecha_publicacion│ Fecha de publicación en WordPress                  │
// │ fecha_carrera    │ Fecha real del evento (YYYY-MM-DD)                 │
// │ localidad        │ Lugar de celebración                               │
// │ tipo             │ Disciplina: Trail Running, Natación, Otros…        │
// │ descripcion      │ Extracto de texto                                  │
// │ slug             │ Identificador único del post (UNIQUE)              │
// │ creado_en        │ Timestamp de inserción                             │
// │ actualizado_en   │ Timestamp de última actualización                  │
// └──────────────────┴────────────────────────────────────────────────────┘

class Carrera {
  constructor({
    titulo,
    enlace,
    fecha_publicacion,
    fecha_carrera,
    localidad,
    tipo,
    descripcion,
    slug,
  }) {
    this.titulo = titulo;
    this.enlace = enlace;
    this.fecha_publicacion = fecha_publicacion || null;
    this.fecha_carrera = fecha_carrera || null;
    this.localidad = localidad || null;
    this.tipo = tipo || null;
    this.descripcion = descripcion || '';
    this.slug = slug;
  }
}

module.exports = Carrera;
