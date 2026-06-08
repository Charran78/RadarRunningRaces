# 3xR - Radar Running Races Asturias 🏃‍♂️💨

![Version](https://img.shields.io/badge/version-2.5-blue)
![PWA](https://img.shields.io/badge/PWA-Ready-green)
![IA](https://img.shields.io/badge/IA-Coach_Xuan-orange)
![License](https://img.shields.io/badge/license-MIT-orange)

El centro de control definitivo para los corredores en Asturias. Una Progressive Web App (PWA) diseñada para centralizar, filtrar y notificar todas las carreras populares, trail running, asfalto y más en la región.

## 🚀 Características Principales

- **Scraping Multi-fuente**: Extracción automática de datos de federaciones, clubes y plataformas de cronometraje.
- **Deduplicación Inteligente**: Sistema avanzado para evitar carreras repetidas basándose en títulos, fechas y enlaces únicos.
- **Interfaz Mobile-First**: Diseño moderno con soporte nativo para **Dark Mode**.
- **Filtros Dinámicos**: Menú de categorías inteligente con contadores en tiempo real.
- **Zona Runner & IA (Nuevo!)**:
  - **Coach Xuan**: Asistente de IA experto en la tierrina para resolver dudas sobre entrenamientos, equipación y motivación.
  - **Calculadora de Ritmos**: Herramienta interactiva para planificar tus objetivos en carrera.
  - **Exportación ICS**: Descarga tus carreras favoritas directamente al calendario de tu móvil.
- **Notificaciones Push**: Recibe alertas instantáneas cuando se detecta una nueva carrera.
- **Almacenamiento Intermedio**: Cacheo de carteles en Supabase Storage para máxima fiabilidad.

## 🛠️ Stack Tecnológico

- **Backend**: Node.js, Express.
- **IA**: Groq API (Llama 3.1 8B).
- **Base de Datos**: Supabase (PostgreSQL).
- **Autenticación**: Supabase Auth (OAuth con Google).
- **Frontend**: Vanilla JS, Tailwind CSS.
- **Scraping**: Axios, Cheerio.
- **Despliegue**: Vercel (Serverless & Crons).

## 📦 Instalación y Configuración

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/tu-usuario/radar-carreras.git
   cd radar-carreras
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno:**
   Crea un archivo `.env` con las claves de Supabase, VAPID y tu `GROQ_API_KEY`.

4. **Iniciar el servidor:**
   ```bash
   npm start
   ```

## 🧹 Mantenimiento Automático

El sistema incluye una tarea programada (Vercel Cron) que se ejecuta cada noche a las 3:30 AM para actualizar el calendario y limpiar recursos antiguos.

---
Desarrollado con ❤️ para la comunidad runner de Asturias.
