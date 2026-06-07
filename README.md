# 3xR - Radar Running Races Asturias 🏃‍♂️💨

![3xR](public/assets/img_fallback_2.png)

![Version](https://img.shields.io/badge/version-2.2-blue)
![PWA](https://img.shields.io/badge/PWA-Ready-green)
![License](https://img.shields.io/badge/license-MIT-orange)

El centro de control definitivo para los corredores en Asturias. Una Progressive Web App (PWA) diseñada para centralizar, filtrar y notificar todas las carreras populares, trail running, asfalto y más en la región.

## 🚀 Características Principales

- **Scraping Multi-fuente**: Extracción automática de datos de federaciones, clubes y plataformas de cronometraje (Crono Empa-t, etc.).
- **Deduplicación Inteligente**: Sistema avanzado para evitar carreras repetidas basándose en títulos, fechas y enlaces únicos.
- **Interfaz Mobile-First**: Diseño moderno, optimizado para móviles con soporte nativo para **Dark Mode**.
- **Filtros Dinámicos**: Menú de categorías inteligente que solo muestra opciones con carreras activas y contadores en tiempo real.
- **Sistema de Favoritos**: Guarda tus metas y sincronízalas entre dispositivos.
- **Notificaciones Push**: Recibe alertas instantáneas cuando se detecta una nueva carrera.
- **Almacenamiento Intermedio**: Cacheo de carteles de carreras en Supabase Storage para evitar enlaces rotos y mejorar la velocidad.
- **SEO & Schema.org**: Datos estructurados para que las carreras aparezcan correctamente en buscadores.

## 🛠️ Stack Tecnológico

- **Backend**: Node.js, Express.
- **Base de Datos**: Supabase (PostgreSQL).
- **Autenticación**: Supabase Auth (OAuth con Google).
- **Frontend**: Vanilla JS, Tailwind CSS.
- **Scraping**: Axios, Cheerio.
- **Tareas Programadas**: Node-cron (Actualización diaria a las 3:30 AM).
- **PWA**: Service Workers para soporte offline y notificaciones.

## 📦 Instalación y Configuración

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/Charran78/RadarRunningRaces.git
   cd radar-carreras
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno:**
   Crea un archivo `.env` en la raíz con las siguientes claves:
   ```env
   PORT=3000
   SUPABASE_URL=tu_url_de_supabase
   SUPABASE_ANON_KEY=tu_clave_anon_de_supabase
   SUPABASE_SERVICE_ROLE_KEY=tu_clave_service_role_de_supabase
   VAPID_PUBLIC_KEY=tu_clave_publica_vapid
   VAPID_PRIVATE_KEY=tu_clave_privada_vapid
   VAPID_EMAIL=tu@email.com
   ```

4. **Iniciar el servidor:**
   ```bash
   npm start
   ```

## 🧹 Mantenimiento Automático

El sistema incluye una tarea programada que se ejecuta cada noche para:
1. Scrapear nuevas carreras de todas las fuentes configuradas.
2. Eliminar imágenes de eventos pasados del almacenamiento para optimizar espacio.
3. Enviar notificaciones push sobre las novedades detectadas.

## 🤝 Contribuciones

¿Has encontrado un bug o tienes una idea para una nueva funcionalidad? ¡Las Pull Requests son bienvenidas!

## 📄 Licencia

Este proyecto está bajo la licencia MIT.

---
Desarrollado con ❤️ para la comunidad runner de Asturias.
