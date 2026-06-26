// ── Configuración Firebase (misma que login.js) ───
const firebaseConfig = {
  apiKey: "AIzaSyCfJornBnJQnMU0r2qjBOUTTjG2i82ATgw",
  authDomain: "prompt-manager-1f2c5.firebaseapp.com",
  projectId: "prompt-manager-1f2c5",
  storageBucket: "prompt-manager-1f2c5.firebasestorage.app",
  messagingSenderId: "1059291715077",
  appId: "1:1059291715077:web:580fd43dfe54888f9f2e6c"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// ── Proteger el dashboard ─────────────────────────
// Si el usuario no está autenticado lo manda al login
auth.onAuthStateChanged((user) => {
  if (!user) {
    window.location.href = "login.html";
  } else {
    const nombre = user.displayName || user.email;
    const iniciales = nombre.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    document.getElementById("user-avatar").textContent = iniciales;

    // Mostrar nombre en el menú
    document.getElementById("user-name").textContent = user.displayName || user.email;
  }
});

// ── Menú del avatar ───────────────────────────────
document.getElementById("user-avatar").addEventListener("click", () => {
  document.getElementById("avatar-menu").classList.toggle("visible");
});

// Cerrar menú al hacer click fuera
document.addEventListener("click", (e) => {
  const container = document.querySelector(".avatar-container");
  if (!container.contains(e.target)) {
    document.getElementById("avatar-menu").classList.remove("visible");
  }
});

// ── Cerrar sesión ─────────────────────────────────
document.getElementById("btn-logout").addEventListener("click", async () => {
  await auth.signOut();
  window.location.href = "login.html";
});

// dashboard.js — Lógica del dashboard
// Conecta el frontend con el backend FastAPI

// ── URL del servidor ──────────────────────────────
// En local apunta a tu máquina
// Cuando despleguemos en la nube esto cambiará
const API_URL = "http://127.0.0.1:8000";

// ── Estado de la aplicación ───────────────────────
// Guardamos los prompts en memoria mientras
// el dashboard está abierto
let prompts = [];

// ── Al cargar la página ───────────────────────────
// Esto se ejecuta automáticamente cuando
// el dashboard termina de cargar
document.addEventListener("DOMContentLoaded", () => {
  cargarPrompts();
  configurarEventos();
});

// ── Cargar prompts desde FastAPI ──────────────────
// GET /prompts → trae todos los prompts guardados
async function cargarPrompts() {
  try {
    const response = await fetch(`${API_URL}/prompts`);
    const data = await response.json();

    prompts = data.prompts;
    renderizarPrompts(prompts);
    actualizarEstadisticas(prompts);

  } catch (error) {
    console.error("Error conectando con el servidor:", error);
    mostrarError("No se pudo conectar con el servidor. ¿Está corriendo FastAPI?");
  }
}

// ── Renderizar tarjetas de prompts ────────────────
// Genera el HTML de cada tarjeta dinámicamente
function renderizarPrompts(lista) {
  const grid = document.getElementById("prompts-grid");

  // Limpiar el grid antes de renderizar
  grid.innerHTML = "";

  if (lista.length === 0) {
    grid.innerHTML = `
      <div class="prompt-card-new" id="btn-card-new">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M12 4v16M4 12h16" stroke="#4a6278" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <span>Crea tu primer prompt</span>
      </div>
    `;
    return;
  }

  // Crear una tarjeta por cada prompt
  lista.forEach(prompt => {
    const card = document.createElement("div");
    card.className = "prompt-card";
    card.innerHTML = `
      <div class="prompt-title">${prompt.titulo}</div>
      <div class="prompt-preview">${prompt.contenido_limpio || prompt.contenido}</div>
      <div class="prompt-footer">
        <span class="tag">${prompt.categoria}</span>
        <div class="prompt-actions">
          <button class="action-btn" onclick="copiarPrompt(${prompt.id})">Copiar</button>
          <button class="action-btn danger" onclick="eliminarPrompt(${prompt.id})">Eliminar</button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });

  // Agregar tarjeta de nuevo prompt al final
  const cardNueva = document.createElement("div");
  cardNueva.className = "prompt-card-new";
  cardNueva.id = "btn-card-new";
  cardNueva.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M12 4v16M4 12h16" stroke="#4a6278" stroke-width="1.5" stroke-linecap="round"/>
    </svg>
    <span>Nuevo prompt</span>
  `;
  cardNueva.onclick = () => mostrarModal();
  grid.appendChild(cardNueva);
}

// ── Actualizar estadísticas ───────────────────────
function actualizarEstadisticas(lista) {
  document.getElementById("stat-total").textContent = lista.length;

  // Contar prompts de esta semana
  const ahora = new Date();
  const semana = lista.filter(p => {
    const fecha = new Date(p.fecha_creacion);
    const diff = (ahora - fecha) / (1000 * 60 * 60 * 24);
    return diff <= 7;
  });
  document.getElementById("stat-semana").textContent = semana.length;
}

// ── Configurar eventos ────────────────────────────
function configurarEventos() {
  // Botón nuevo prompt del header
  document.getElementById("btn-new-prompt").onclick = () => mostrarModal();

  // Buscador
  document.getElementById("search-input").addEventListener("input", (e) => {
    const busqueda = e.target.value.toLowerCase();
    const filtrados = prompts.filter(p =>
      p.titulo.toLowerCase().includes(busqueda) ||
      p.contenido.toLowerCase().includes(busqueda) ||
      p.categoria.toLowerCase().includes(busqueda)
    );
    renderizarPrompts(filtrados);
  });
}

// ── Mostrar modal para crear prompt ──────────────
function mostrarModal() {
  // Crear modal dinámicamente
  const modal = document.createElement("div");
  modal.id = "modal";
  modal.style.cssText = `
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.7);
    display: flex; align-items: center; justify-content: center;
    z-index: 1000;
  `;

  modal.innerHTML = `
    <div style="background: #1a2535; border-radius: 14px; padding: 24px; width: 480px; border: 1px solid rgba(255,255,255,0.07);">
      <h2 style="font-size: 16px; margin-bottom: 20px; color: #f0f4f8;">Nuevo prompt</h2>

      <div style="display: flex; flex-direction: column; gap: 14px;">
        <input id="input-titulo" type="text" placeholder="Título del prompt"
          style="background: #0f1923; border: 1px solid rgba(255,255,255,0.07); border-radius: 8px; padding: 10px 14px; color: #f0f4f8; font-size: 13px; outline: none; font-family: inherit;">

        <textarea id="input-contenido" placeholder="Escribe tu prompt aquí..." rows="4"
          style="background: #0f1923; border: 1px solid rgba(255,255,255,0.07); border-radius: 8px; padding: 10px 14px; color: #f0f4f8; font-size: 13px; outline: none; resize: none; font-family: inherit;"></textarea>

        <input id="input-categoria" type="text" placeholder="Categoría (ej: Trabajo, Desarrollo)"
          style="background: #0f1923; border: 1px solid rgba(255,255,255,0.07); border-radius: 8px; padding: 10px 14px; color: #f0f4f8; font-size: 13px; outline: none; font-family: inherit;">

        <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 4px;">
          <button onclick="cerrarModal()"
            style="background: none; border: 1px solid rgba(255,255,255,0.07); border-radius: 8px; color: #7e9ab8; padding: 8px 16px; cursor: pointer; font-family: inherit;">
            Cancelar
          </button>
          <button onclick="guardarPrompt()"
            style="background: #1a9e75; border: none; border-radius: 8px; color: white; padding: 8px 16px; cursor: pointer; font-weight: 600; font-family: inherit;">
            Guardar y analizar
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

// ── Cerrar modal ──────────────────────────────────
function cerrarModal() {
  const modal = document.getElementById("modal");
  if (modal) modal.remove();
}

// ── Guardar prompt via FastAPI ────────────────────
// POST /prompts → envía el prompt al servidor
// FastAPI lo analiza con SpaCy y lo guarda en SQLite
async function guardarPrompt() {
  const titulo = document.getElementById("input-titulo").value.trim();
  const contenido = document.getElementById("input-contenido").value.trim();
  const categoria = document.getElementById("input-categoria").value.trim();

  if (!titulo || !contenido || !categoria) {
    alert("Por favor completa todos los campos");
    return;
  }

  try {
    const response = await fetch(`${API_URL}/prompts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo, contenido, categoria })
    });

    const data = await response.json();

    cerrarModal();
    cargarPrompts(); // Recargar lista

    // Mostrar cuántas entidades se detectaron
    if (data.total_entidades > 0) {
      alert(`✅ Prompt guardado. Se detectaron y protegieron ${data.total_entidades} datos sensibles.`);
    }

  } catch (error) {
    console.error("Error guardando prompt:", error);
    mostrarError("No se pudo guardar el prompt.");
  }
}

// ── Eliminar prompt ───────────────────────────────
// DELETE /prompts/{id}
async function eliminarPrompt(id) {
  if (!confirm("¿Estás seguro de eliminar este prompt?")) return;

  try {
    await fetch(`${API_URL}/prompts/${id}`, { method: "DELETE" });
    cargarPrompts();
  } catch (error) {
    console.error("Error eliminando prompt:", error);
  }
}

// ── Copiar prompt al portapapeles ─────────────────
function copiarPrompt(id) {
  const prompt = prompts.find(p => p.id === id);
  if (prompt) {
    navigator.clipboard.writeText(prompt.contenido);
    alert("✅ Prompt copiado al portapapeles");
  }
}

// ── Mostrar error en pantalla ─────────────────────
function mostrarError(mensaje) {
  const grid = document.getElementById("prompts-grid");
  grid.innerHTML = `
    <div style="color: #f09595; font-size: 13px; padding: 16px;">
      ⚠️ ${mensaje}
    </div>
  `;
}