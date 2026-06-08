const carrerasContainer = document.getElementById('carreras-container');
const loginScreen = document.getElementById('login-screen');
const appContent = document.getElementById('app-content');
const btnLoginMain = document.getElementById('btn-login-main');
const btnLogout = document.getElementById('btn-logout');
const userAvatar = document.getElementById('user-avatar');
const btnDarkMode = document.getElementById('btn-dark-mode');
const filtroLocalidad = document.getElementById('filtro-localidad');
const filtroFecha = document.getElementById('filtro-fecha');
const filtroTexto = document.getElementById('filtro-texto');
const checkPasadas = document.getElementById('check-pasadas');
const chipsContainer = document.getElementById('filter-chips-container');
const btnNotif = document.getElementById('btn-notif');
const btnFiltrar = document.getElementById('btn-filtrar');
let btnShowFavs = document.getElementById('btn-show-favs');

let supabaseClient;
let currentSession = null;
let userFavorites = [];
let allCarreras = [];
let activeType = "";
let showingFavs = false;
let offset = 0;
let limit = 12;
let totalCarreras = 0;
let loading = false;
let hasMore = true;

// ─── Inicialización ──────────────────────────────────────────────────────────

async function init() {
    // Cargar preferencia de Dark Mode
    if (localStorage.getItem('dark-mode') === 'true' || 
        (!localStorage.getItem('dark-mode') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
    }

    try {
        const res = await fetch('/api/config');
        const { supabaseUrl, supabaseAnonKey } = await res.json();
        supabaseClient = window.supabase.createClient(supabaseUrl, supabaseAnonKey);

        supabaseClient.auth.onAuthStateChange((event, session) => {
            currentSession = session;
            updateAuthUI(session);
        });

        const { data: { session } } = await supabaseClient.auth.getSession();
        currentSession = session;
        updateAuthUI(session);
        
        // Setup Infinite Scroll
        setupInfiniteScroll();

    } catch (error) {
        console.error('Error init:', error);
    }
}

function setupInfiniteScroll() {
    window.addEventListener('scroll', () => {
        if (loading || !hasMore || showingFavs) return;
        
        if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
            cargarMasCarreras();
        }
    });
}

async function updateAuthUI(session) {
    if (session) {
        loginScreen.classList.add('hidden');
        appContent.classList.remove('hidden');
        userAvatar.src = session.user.user_metadata.avatar_url || '/assets/img_logo_1.png';
        
        await Promise.all([
            cargarFavoritos(),
            cargarLocalidades(),
            cargarCategorias(),
            resetYCargarCarreras()
        ]);
    } else {
        loginScreen.classList.remove('hidden');
        appContent.classList.add('hidden');
    }
}

// ─── Datos ────────────────────────────────────────────────────────────────────

async function resetYCargarCarreras() {
    offset = 0;
    allCarreras = [];
    hasMore = true;
    carrerasContainer.innerHTML = '';
    await cargarMasCarreras();
}

async function cargarMasCarreras() {
    if (loading || !hasMore) return;
    loading = true;
    
    // Mostrar skeleton al final si ya hay items
    const tempSkeleton = document.createElement('div');
    tempSkeleton.id = 'loading-skeleton';
    tempSkeleton.className = 'col-span-full flex justify-center py-8';
    tempSkeleton.innerHTML = '<div class="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>';
    carrerasContainer.appendChild(tempSkeleton);

    const params = new URLSearchParams({
        solo_futuras: !checkPasadas.checked,
        limit: limit,
        offset: offset
    });
    if (filtroLocalidad.value) params.append('localidad', filtroLocalidad.value);
    if (filtroFecha.value) params.append('fecha_desde', filtroFecha.value);

    try {
        const res = await fetch(`/api/carreras?${params.toString()}`);
        const { data, count } = await res.json();
        
        totalCarreras = count;
        allCarreras = [...allCarreras, ...data];
        offset += data.length;
        
        if (offset >= totalCarreras || data.length < limit) {
            hasMore = false;
        }

        const skeleton = document.getElementById('loading-skeleton');
        if (skeleton) skeleton.remove();

        filtrarYRenderizar();
    } catch (error) {
        console.error('Error cargando carreras:', error);
    } finally {
        loading = false;
    }
}

async function cargarCarreras() {
    await resetYCargarCarreras();
}

async function cargarLocalidades() {
    try {
        const res = await fetch('/api/localidades');
        const locales = await res.json();
        filtroLocalidad.innerHTML = '<option value="">Cualquier parte</option>' + 
            locales.map(l => `<option value="${l}">${l}</option>`).join('');
    } catch (error) {}
}

async function cargarCategorias() {
    try {
        const params = new URLSearchParams({
            solo_futuras: !checkPasadas.checked
        });
        if (filtroFecha.value) params.append('fecha_desde', filtroFecha.value);

        const res = await fetch(`/api/categorias?${params.toString()}`);
        const categorias = await res.json();
        
        // Mantener "Todas" y "Favoritos"
        const todasHtml = `<button class="filter-chip ${activeType === "" && !showingFavs ? 'active' : ''}" data-type="">Todas</button>`;
        const favCount = userFavorites.length;
        const favsHtml = `<button id="btn-show-favs" class="filter-chip text-pink-500 ${showingFavs ? 'active' : ''}">
            <i class="fas fa-heart mr-1"></i> Favoritos 
            ${favCount > 0 ? `<span class="ml-1 opacity-50 text-[10px] font-normal">${favCount}</span>` : ''}
        </button>`;
        
        const dynamicHtml = categorias.map(c => `
            <button class="filter-chip ${activeType === c.nombre ? 'active' : ''}" data-type="${c.nombre}">
                ${c.nombre} <span class="ml-1 opacity-50 text-[10px] font-normal">${c.total}</span>
            </button>
        `).join('');

        chipsContainer.innerHTML = todasHtml + dynamicHtml + favsHtml;
        
        // Actualizar referencia global de btnShowFavs
        btnShowFavs = document.getElementById('btn-show-favs');
        
        // Re-asignar eventos ya que hemos borrado y recreado los botones
        setupChipEvents();
    } catch (error) {
        console.error('Error cargando categorías:', error);
    }
}

function setupChipEvents() {
    const chips = chipsContainer.querySelectorAll('.filter-chip');
    const favBtn = document.getElementById('btn-show-favs');

    chips.forEach(chip => {
        if (chip.id === 'btn-show-favs') return; // Manejado aparte
        
        chip.addEventListener('click', () => {
            chips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            activeType = chip.dataset.type;
            showingFavs = false;
            filtrarYRenderizar();
        });
    });

    if (favBtn) {
        favBtn.addEventListener('click', () => {
            chips.forEach(c => c.classList.remove('active'));
            favBtn.classList.add('active');
            showingFavs = true;
            activeType = "";
            filtrarYRenderizar();
        });
    }
}

async function cargarFavoritos() {
    if (!currentSession) return;
    try {
        const res = await fetch('/api/favoritos', {
            headers: { 'Authorization': `Bearer ${currentSession.access_token}` }
        });
        userFavorites = await res.json();
    } catch (error) {}
}

async function toggleFav(carreraId, btn) {
    if (!currentSession) return;
    const id = parseInt(carreraId); // <--- FORZAR NÚMERO
    try {
        const res = await fetch('/api/favoritos/toggle', {
            method: 'POST',
            body: JSON.stringify({ carreraId: id }),
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentSession.access_token}` 
            }
        });
        const { favorited } = await res.json();
        
        if (favorited) {
            userFavorites.push(id);
            btn.classList.add('text-pink-500');
            btn.querySelector('i').classList.replace('far', 'fas');
        } else {
            userFavorites = userFavorites.filter(favId => parseInt(favId) !== id);
            btn.classList.remove('text-pink-500');
            btn.querySelector('i').classList.replace('fas', 'far');
            if (showingFavs) filtrarYRenderizar();
        }
        // Actualizar chips para reflejar el nuevo conteo de favoritos
        cargarCategorias();
    } catch (error) {}
}

// ─── Renderizado ──────────────────────────────────────────────────────────────

function filtrarYRenderizar() {
    const texto = filtroTexto.value.toLowerCase();
    
    let filtradas = allCarreras.filter(c => {
        const matchTexto = c.titulo.toLowerCase().includes(texto) || 
                          (c.localidad && c.localidad.toLowerCase().includes(texto));
        const matchTipo = activeType === "" || c.tipo === activeType;
        const matchFav = !showingFavs || userFavorites.includes(c.id);
        
        return matchTexto && matchTipo && matchFav;
    });

    renderCarreras(filtradas);
    updateSchema(filtradas);
}

function renderCarreras(carreras) {
    if (carreras.length === 0) {
        carrerasContainer.innerHTML = `
            <div class="col-span-full py-20 text-center">
                <i class="fas fa-search-minus text-5xl text-slate-300 mb-4"></i>
                <p class="text-slate-500 font-bold text-xl">No hay metas a la vista</p>
                <p class="text-slate-400">Prueba a cambiar los filtros o la búsqueda.</p>
            </div>
        `;
        return;
    }

    carrerasContainer.innerHTML = carreras.map(c => {
        const isFav = userFavorites.includes(c.id);
        const fecha = c.fecha_carrera ? new Date(c.fecha_carrera) : null;
        const imagen = c.imagen || '/assets/img_fallback_2.png';

        return `
            <div class="group bg-white dark:bg-slate-800 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden hover:shadow-2xl transition-all duration-500 flex flex-col h-full">
                <!-- Imagen -->
                <div class="relative h-48 overflow-hidden">
                    <img src="${imagen}" alt="${c.titulo}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110">
                    <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    <button onclick="toggleFav(${c.id}, this)" class="absolute top-4 right-4 w-10 h-10 rounded-full glass flex items-center justify-center text-white hover:scale-110 transition-transform ${isFav ? 'text-pink-500' : ''}">
                        <i class="${isFav ? 'fas' : 'far'} fa-heart"></i>
                    </button>
                    <div class="absolute bottom-4 left-4">
                        <span class="px-3 py-1 rounded-lg bg-primary text-white text-[10px] font-bold uppercase tracking-wider shadow-lg">
                            ${c.tipo || 'Evento'}
                        </span>
                    </div>
                </div>

                <!-- Info -->
                <div class="p-6 flex flex-col flex-grow">
                    <div class="flex justify-between items-start mb-3">
                        <div class="flex flex-col">
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">${c.localidad || 'Asturias'}</span>
                            <h3 class="text-lg font-extrabold leading-tight text-slate-800 dark:text-white line-clamp-2 min-h-[3rem] group-hover:text-primary transition-colors">
                                ${c.titulo}
                            </h3>
                        </div>
                    </div>

                    <div class="mt-auto pt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-700">
                        <div class="flex flex-col">
                            <span class="text-[10px] font-bold text-slate-400 uppercase">Fecha</span>
                            <span class="text-sm font-bold text-slate-700 dark:text-slate-300">
                                ${fecha ? fecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Próximamente'}
                            </span>
                        </div>
                        <a href="${c.enlace}" target="_blank" class="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-primary hover:text-white transition-all">
                            <i class="fas fa-arrow-right"></i>
                        </a>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderSkeletons() {
    carrerasContainer.innerHTML = Array(8).fill(0).map(() => `
        <div class="animate-pulse bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-100 dark:border-slate-700 overflow-hidden h-[400px]">
            <div class="h-48 bg-slate-200 dark:bg-slate-700"></div>
            <div class="p-6 space-y-4">
                <div class="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
                <div class="h-8 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                <div class="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mt-auto"></div>
            </div>
        </div>
    `).join('');
}

// ─── SEO ──────────────────────────────────────────────────────────────────────

function updateSchema(carreras) {
    const schema = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "itemListElement": carreras.slice(0, 10).map((c, i) => ({
            "@type": "ListItem",
            "position": i + 1,
            "item": {
                "@type": "Event",
                "name": c.titulo,
                "startDate": c.fecha_carrera,
                "location": {
                    "@type": "Place",
                    "name": c.localidad || "Asturias",
                    "address": "Asturias, España"
                },
                "image": c.imagen,
                "description": c.descripcion,
                "url": c.enlace
            }
        }))
    };
    document.getElementById('schema-ld').textContent = JSON.stringify(schema);
}

// ─── Notificaciones Push ──────────────────────────────────────────────────────

async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            return registration;
        } catch (error) {
            console.error('Error registrando SW', error);
        }
    }
}

async function subscribeToPush() {
    if (!('Notification' in window)) {
        alert('Tu navegador no soporta notificaciones.');
        return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
        alert('Necesitamos tu permiso para enviarte alertas.');
        return;
    }

    const registration = await registerServiceWorker();
    if (!registration) return;

    try {
        const btnNotif = document.getElementById('btn-notif');
        btnNotif.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i>';
        
        const response = await fetch('/api/notificaciones/vapid-key');
        const { publicKey } = await response.json();

        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: publicKey
        });

        const subscriptionJSON = subscription.toJSON();

        await fetch('/api/notificaciones/suscribir', {
            method: 'POST',
            body: JSON.stringify(subscriptionJSON),
            headers: { 'Content-Type': 'application/json' }
        });

        btnNotif.innerHTML = '<i class="fas fa-check text-green-500"></i>';
        document.getElementById('notif-badge').classList.remove('hidden');
        setTimeout(() => { btnNotif.innerHTML = '<i class="fas fa-bell"></i>'; }, 2000);
    } catch (error) {
        console.error('Error al suscribir', error);
        alert('Hubo un problema al activar las notificaciones.');
    }
}

// ─── Eventos ──────────────────────────────────────────────────────────────────

btnDarkMode.addEventListener('click', () => {
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('dark-mode', document.documentElement.classList.contains('dark'));
});

filtroTexto.addEventListener('input', filtrarYRenderizar);
filtroLocalidad.addEventListener('change', cargarCarreras);
filtroFecha.addEventListener('change', cargarCarreras);
checkPasadas.addEventListener('change', cargarCarreras);
btnFiltrar.addEventListener('click', cargarCarreras);
btnNotif.addEventListener('click', subscribeToPush);

// Nota: Los eventos de chips se manejan dentro de cargarCategorias -> setupChipEvents

btnLoginMain.addEventListener('click', async () => {
    await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin }
    });
});

btnLogout.addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    window.location.reload();
});

// ─── Zona Runner & IA ─────────────────────────────────────────────────────────

function toggleDrawer() {
    const drawer = document.getElementById('runner-drawer');
    drawer.classList.toggle('open');
}

function switchTab(tab) {
    const btnCalc = document.getElementById('tab-btn-calc');
    const btnIA = document.getElementById('tab-btn-ia');
    const contentCalc = document.getElementById('tab-content-calc');
    const contentIA = document.getElementById('tab-content-ia');

    if (tab === 'calc') {
        btnCalc.classList.add('border-orange-500', 'text-orange-500');
        btnCalc.classList.remove('border-transparent', 'text-slate-400');
        btnIA.classList.add('border-transparent', 'text-slate-400');
        btnIA.classList.remove('border-orange-500', 'text-orange-500');
        contentCalc.classList.remove('hidden');
        contentIA.classList.add('hidden');
    } else {
        btnIA.classList.add('border-orange-500', 'text-orange-500');
        btnIA.classList.remove('border-transparent', 'text-slate-400');
        btnCalc.classList.add('border-transparent', 'text-slate-400');
        btnCalc.classList.remove('border-orange-500', 'text-orange-500');
        contentIA.classList.remove('hidden');
        contentCalc.classList.add('hidden');
    }
}

function setCalcDist(dist) {
    document.getElementById('calc-km').value = dist;
}

function calcularRitmo() {
    const km = parseFloat(document.getElementById('calc-km').value);
    const h = parseInt(document.getElementById('calc-h').value) || 0;
    const m = parseInt(document.getElementById('calc-m').value) || 0;
    const s = parseInt(document.getElementById('calc-s').value) || 0;

    if (!km || km <= 0) return;

    const totalSeconds = (h * 3600) + (m * 60) + s;
    const paceSeconds = totalSeconds / km;

    const paceM = Math.floor(paceSeconds / 60);
    const paceS = Math.floor(paceSeconds % 60);
    const speed = (km / (totalSeconds / 3600)).toFixed(2);

    document.getElementById('res-pace').textContent = `${paceM}:${paceS.toString().padStart(2, '0')} min/km`;
    document.getElementById('res-speed').textContent = `${speed} km/h`;
    document.getElementById('calc-results').classList.remove('hidden');
}

function exportarFavoritosICS() {
    if (userFavorites.length === 0) {
        alert('Primero añade algunas carreras a tus favoritos.');
        return;
    }

    const favoritas = allCarreras.filter(c => userFavorites.includes(c.id));
    
    let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//3xR Radar Carreras//ES\n";
    
    favoritas.forEach(c => {
        if (!c.fecha_carrera) return;
        const fecha = c.fecha_carrera.replace(/-/g, '');
        icsContent += "BEGIN:VEVENT\n";
        icsContent += `SUMMARY:${c.titulo}\n`;
        icsContent += `DTSTART:${fecha}T090000\n`;
        icsContent += `DTEND:${fecha}T120000\n`;
        icsContent += `LOCATION:${c.localidad || 'Asturias'}\n`;
        icsContent += `DESCRIPTION:Carrera tipo ${c.tipo}. Más info en: ${c.enlace}\n`;
        icsContent += "END:VEVENT\n";
    });

    icsContent += "END:VCALENDAR";

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', 'mis_carreras_asturias.ics');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ─── Xuan IA Coach ───────────────────────────────────────────────────────────

async function sendUserMessage() {
    const input = document.getElementById('ia-chat-input');
    const message = input.value.trim();
    if (!message) return;

    appendChatMessage('user', message);
    input.value = '';
    
    const btn = document.getElementById('btn-send-ia');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i>';

    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: message })
        });
        const data = await res.json();
        appendChatMessage('xuan', data.text);
    } catch (error) {
        appendChatMessage('xuan', 'Lo siento, fíu, hay mala cobertura por aquí. Inténtalo de nuevo.');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-paper-plane text-xs"></i>';
    }
}

function appendChatMessage(role, text) {
    const container = document.getElementById('chat-container-ia');
    const div = document.createElement('div');
    
    if (role === 'user') {
        div.className = 'p-3 rounded-2xl bg-primary text-white max-w-[90%] self-end text-[10px]';
        div.textContent = text;
    } else {
        div.className = 'p-3 rounded-2xl bg-slate-900 border border-slate-800 max-w-[90%] self-start';
        div.innerHTML = `
            <div class="flex items-center gap-2 text-orange-400 font-bold mb-1 text-[10px]">
                <i class="fa-solid fa-circle-user"></i>
                <span>Xuan Coach Astur</span>
            </div>
            <p class="text-slate-300 leading-relaxed text-[10px]">${text}</p>
        `;
    }
    
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function sendQuickPrompt(prompt) {
    document.getElementById('ia-chat-input').value = prompt;
    sendUserMessage();
}

function handleChatEnter(e) {
    if (e.key === 'Enter') sendUserMessage();
}

init();
