// ==========================================
// 1. CONFIGURACIÓN Y VARIABLES GLOBALES
// ==========================================
const API_URL = "http://127.0.0.1:8000";
const NAV = ["Dashboard", "Tus prompts", "Historial", "Perfil"];
const urlParams = new URLSearchParams(window.location.search);
const tabParam = urlParams.get('tab');

let activeNav = "Dashboard";
if (tabParam === 'historial') activeNav = "Historial";
if (tabParam === 'perfil') activeNav = "Perfil";

let selectedId = null;
let promptsData = [];
let allTags = [];
let modalSelectedTags = [];
let currentTagFilter = null;
let chartInstance = null;
let currentEmojiPromptId = null;

// Firebase Init
const firebaseConfig = {
  apiKey: "AIzaSyCfJornBnJQnMU0r2qjBOUTTjG2i82ATgw",
  authDomain: "prompt-manager-1f2c5.firebaseapp.com",
  projectId: "prompt-manager-1f2c5",
  storageBucket: "prompt-manager-1f2c5.firebasestorage.app",
  messagingSenderId: "1059291715077",
  appId: "1:1059291715077:web:580fd43dfe54888f9f2e6c"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const _auth = firebase.auth();
const _storage = firebase.storage();

// ==========================================
// 2. INICIALIZACIÓN (DOM Load & Auth)
// ==========================================
document.documentElement.style.visibility = "hidden";

_auth.onAuthStateChanged((user) => {
  if (!user) {
    window.location.replace("login.html");
  } else {
    configurarUsuarioUI(user);
    document.documentElement.style.visibility = "";
    iniciarApp();
  }
});

function configurarUsuarioUI(user) {
  const firstName = (user.displayName || user.email).split(/[ @]/)[0];
  const initials = (user.displayName || user.email).split(" ").slice(0, 2).map(w => w[0].toUpperCase()).join("");

  document.getElementById("greeting").textContent = `Hola, ${firstName}!`;
  document.getElementById("user-name").textContent = user.displayName || user.email;
  document.getElementById("user-email").textContent = user.email;

  const profileName = document.getElementById("profile-name");
  const profileEmail = document.getElementById("profile-email-lbl");
  if(profileName) profileName.textContent = user.displayName || user.email;
  if(profileEmail) profileEmail.textContent = user.email;

  const avatarEl = document.getElementById("user-avatar");
  const profileAvatarEl = document.getElementById("profile-avatar");
  
  if (user.photoURL) {
    const imgHtml = `<img src="${user.photoURL}" alt="Foto" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    avatarEl.innerHTML = imgHtml;
    if(profileAvatarEl) {
      profileAvatarEl.innerHTML = imgHtml;
      profileAvatarEl.classList.remove("avatar-initials");
    }
  } else {
    avatarEl.textContent = initials;
    if(profileAvatarEl) {
      profileAvatarEl.textContent = initials;
      profileAvatarEl.classList.add("avatar-initials");
    }
  }
}

function iniciarApp() {
  renderNav();
  fetchPrompts();
  fetchStats();
  fetchHistorial();
  fetchTags();
  configurarEventosEstaticos();
  cargarTema();
}

// ==========================================
// 3. EVENTOS ESTÁTICOS (Botones fijos)
// ==========================================
function configurarEventosEstaticos() {
  // Manejo de Dropdown de perfil
  document.getElementById("user-avatar").addEventListener("click", (e) => {
    e.stopPropagation();
    document.getElementById("profile-dropdown").classList.toggle("show");
  });

  document.getElementById("btn-logout")?.addEventListener("click", cerrarSesion);
  document.getElementById("btn-dropdown-logout")?.addEventListener("click", cerrarSesion);
  document.getElementById("btn-dropdown-delete")?.addEventListener("click", borrarCuenta);

  // Botón dismiss error de conexión
  document.getElementById("btn-dismiss-error")?.addEventListener("click", (e) => {
    e.target.parentElement.style.display = 'none';
  });

  // Botones de acción del Dashboard
  document.getElementById("btn-delete-history")?.addEventListener("click", borrarHistorial);
  document.getElementById("btn-nuevo-prompt-dash")?.addEventListener("click", () => mostrarModal());

  // Cerrar menús al hacer clic fuera
  document.addEventListener("click", (e) => {
    const dropdown = document.getElementById("profile-dropdown");
    if (dropdown && !dropdown.contains(e.target)) dropdown.classList.remove("show");

    const emojiContainer = document.getElementById("emoji-picker-container");
    if (emojiContainer && !emojiContainer.contains(e.target) && !e.target.closest('.spm-prompt-icon-btn')) {
      emojiContainer.style.display = "none";
    }
  });

  // Tema
  document.getElementById("theme-toggle").addEventListener("click", alternarTema);
  
  // Emoji picker
  const picker = document.querySelector('emoji-picker');
  if (picker) {
    picker.addEventListener('emoji-click', cambiarIconoEmoji);
  }
}

// ==========================================
// 4. DELEGACIÓN DE EVENTOS (Para HTML Dinámico)
// ==========================================
document.addEventListener("click", (e) => {
  // Clic en cambiar ícono
  const btnIcon = e.target.closest('.btn-change-icon');
  if (btnIcon) {
    e.stopPropagation();
    openEmojiPicker(e, btnIcon.dataset.id);
  }

  // Clic en copiar prompt
  const btnCopy = e.target.closest('.btn-copy-prompt');
  if (btnCopy) {
    e.stopPropagation();
    copiarPrompt(decodeURIComponent(btnCopy.dataset.content));
  }

  // Clic en eliminar prompt
  const btnDelete = e.target.closest('.btn-delete-prompt');
  if (btnDelete) {
    e.stopPropagation();
    eliminarPrompt(btnDelete.dataset.id);
  }

  // Clic en seleccionar un prompt de la lista
  const promptItem = e.target.closest('.spm-prompt-item.selectable');
  if (promptItem) {
    selectedId = parseInt(promptItem.dataset.id);
    renderPrompts();
    renderDetail();
  }

  // Clic en editar desde el panel de detalles
  const btnEdit = e.target.closest('.btn-edit-prompt');
  if (btnEdit) {
    mostrarModal(btnEdit.dataset.id);
  }
});

// ==========================================
// 5. FETCH & RENDER (Lógica de interfaz)
// ==========================================
async function fetchPrompts() {
  try {
    const res = await fetch(`${API_URL}/prompts`);
    if (!res.ok) throw new Error("Error del servidor");
    const data = await res.json();
    promptsData = data.prompts || [];
    if (!selectedId && promptsData.length > 0) selectedId = promptsData[0].id;
    renderPrompts();
    renderDetail();
    document.getElementById("conn-error").style.display = "none";
  } catch (err) {
    console.error("Error cargando prompts:", err);
    document.getElementById("conn-error").style.display = "flex";
  }
}

// NOTA: Para no hacer este script inmenso aquí, 
// puedes mantener tus funciones de renderización (renderPrompts, renderDetail, fetchStats, etc)
// IGUALES a como las tenías, pero asegúrate de usar data-attributes en vez de onclick.

function renderPrompts() {
  const list = document.getElementById("prompts-list");
  if (promptsData.length === 0) {
    list.innerHTML = `<div class="spm-empty-state">No hay prompts.</div>`;
    return;
  }

  let html = promptsData.slice(0, 3).map(p => {
    const isSel = p.id === selectedId;
    const safeContent = encodeURIComponent(p.contenido_limpio || p.contenido || '');
    
    // Fíjate que aquí reemplacé el onclick por clases y data-attributes
    return `<div class="spm-prompt-item selectable ${isSel ? 'sel' : ''}" data-id="${p.id}">
      <div class="spm-prompt-icon-btn btn-change-icon" data-id="${p.id}" title="Cambiar ícono">
        <i class="ti ti-file-text"></i>
      </div>
      <div style="flex:1;">
        <span class="prompt-title">${p.titulo}</span>
      </div>
      <div class="prompt-hover-actions">
         <button class="spm-btn-icon btn-copy-prompt" data-content="${safeContent}" title="Copiar"><i class="ti ti-copy"></i></button>
         <button class="spm-btn-icon btn-delete-prompt" data-id="${p.id}" title="Eliminar"><i class="ti ti-trash"></i></button>
      </div>
    </div>`;
  }).join("");

  list.innerHTML = html;
}

function renderDetail() {
  const panel = document.getElementById("detail-panel");
  if (!selectedId) return panel.innerHTML = "Selecciona un prompt.";
  
  const p = promptsData.find(x => x.id == selectedId);
  if (!p) return;

  const safeContent = encodeURIComponent(p.contenido_limpio || p.contenido || '');
  
  // Reemplazo de onclicks por clases y data-attributes
  panel.innerHTML = `
    <div>
      <p>${p.contenido_limpio || p.contenido}</p>
      <div style="display:flex; gap:8px;">
        <button class="spm-btn spm-btn-ghost btn-delete-prompt" data-id="${p.id}">Eliminar</button>
        <button class="spm-btn spm-btn-ghost btn-edit-prompt" data-id="${p.id}">Editar</button>
        <button class="spm-btn spm-btn-dark btn-copy-prompt" data-content="${safeContent}">Copiar</button>
      </div>
    </div>`;
}

// ==========================================
// 6. FUNCIONES DE ACCIÓN Y MODAL
// ==========================================
function copiarPrompt(texto) {
  navigator.clipboard.writeText(texto).then(() => alert("✅ Copiado al portapapeles"));
}

async function eliminarPrompt(id) {
  if (!confirm("¿Estás seguro de que deseas eliminar este prompt?")) return;
  try {
    const res = await fetch(`${API_URL}/prompts/${id}`, { method: "DELETE" });
    if (res.ok) { fetchPrompts(); fetchStats(); }
  } catch (err) { console.error("Error eliminando:", err); }
}

async function borrarHistorial() {
  if (!confirm("¿Quieres borrar el historial?")) return;
  await fetch(`${API_URL}/historial`, { method: "DELETE" });
  fetchHistorial();
}

function cerrarSesion() {
  _auth.signOut().then(() => window.location.replace("login.html"));
}

function borrarCuenta() {
  if(confirm("¿Seguro que quieres borrar tu cuenta?")) {
    _auth.currentUser?.delete().then(() => window.location.replace("login.html"));
  }
}

// Emoji Picker Lógica
function openEmojiPicker(e, promptId) {
  currentEmojiPromptId = promptId;
  const container = document.getElementById("emoji-picker-container");
  container.style.top = (e.currentTarget.getBoundingClientRect().top + window.scrollY - 400) + "px";
  container.style.left = (e.currentTarget.getBoundingClientRect().left + window.scrollX) + "px";
  container.style.display = "block";
}

async function cambiarIconoEmoji(event) {
  if (!currentEmojiPromptId) return;
  const emoji = event.detail.unicode;
  document.getElementById("emoji-picker-container").style.display = "none";
  // Aquí tu fetch al backend para guardar el icono...
}

// Tema Oscuro/Claro
function cargarTema() {
  if (localStorage.getItem("theme") === "dark") document.body.classList.add("dark-mode");
}

function alternarTema() {
  document.body.classList.toggle("dark-mode");
  localStorage.setItem("theme", document.body.classList.contains("dark-mode") ? "dark" : "light");
}

// Manten tus funciones fetchStats, fetchHistorial, renderModal, etc. 
// solo quitando los onclick como lo hice arriba.

// ==========================================
// 7. FUNCIONES FALTANTES (Navegación, Gráficos e Historial)
// ==========================================

function renderNav() {
  const nav = document.getElementById("sidenav");
  if (!nav) return;
  nav.innerHTML = `
    <a href="dashboard.html" class="spm-nav-item ${activeNav === 'Dashboard' ? 'active' : ''}" style="text-decoration:none; color:inherit; display:block;" role="menuitem">Dashboard</a>
    <a href="prompts.html" class="spm-nav-item ${activeNav === 'Tus prompts' ? 'active' : ''}" style="text-decoration:none; color:inherit; display:block;" role="menuitem">Tus prompts</a>
    <a href="historial.html" class="spm-nav-item ${activeNav === 'Historial' ? 'active' : ''}" style="text-decoration:none; color:inherit; display:block;" role="menuitem">Historial</a>
  `;
}

async function fetchStats() {
  try {
    const res = await fetch(`${API_URL}/stats`);
    if (!res.ok) throw new Error("Error del servidor");
    const data = await res.json();

    document.getElementById("stat-censuras").textContent = data.total_censuras || 0;
    document.getElementById("stat-plantillas").textContent = data.plantillas_usadas || 0;

    if (data.uso_plataformas && data.uso_plataformas.length > 0) {
      document.getElementById("chart-plataformas").style.display = "block";
      document.getElementById("chart-empty-state").style.display = "none";
      renderChart(data.uso_plataformas);
    } else {
      document.getElementById("chart-plataformas").style.display = "none";
      document.getElementById("chart-empty-state").style.display = "flex";
    }
  } catch (err) {
    console.error("Error cargando stats:", err);
  }
}

function renderChart(plataformas) {
  const ctx = document.getElementById('chart-plataformas').getContext('2d');
  if (chartInstance) chartInstance.destroy();

  const isDark = document.body.classList.contains("dark-mode");
  const textColor = isDark ? '#ffffff' : '#666';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: plataformas.map(p => p.plataforma),
      datasets: [{
        label: 'Uso por IA',
        data: plataformas.map(p => p.cantidad),
        backgroundColor: '#5C7FA3',
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { color: textColor }, grid: { color: gridColor } },
        x: { grid: { display: false }, ticks: { color: textColor } }
      }
    }
  });
}

async function fetchHistorial() {
  try {
    const res = await fetch(`${API_URL}/historial`);
    if (!res.ok) throw new Error("Error del servidor");
    const data = await res.json();

    const panel = document.getElementById("historial-panel");
    if (!data.historial || data.historial.length === 0) {
      panel.innerHTML = `<div class="spm-empty-state"><span class="empty-title">Sin actividad reciente</span></div>`;
      return;
    }

    panel.innerHTML = data.historial.map(h => `
      <div class="spm-hist-row spm-fade-in">
        <span style="font-weight:700;width:68px">${h.plataforma}</span>
        <span style="flex:1">${h.fecha}</span>
        <span>${h.hora}</span>
      </div>
    `).join("");
  } catch (err) {
    console.error("Error cargando historial:", err);
  }
}

// ==========================================
// 8. ETIQUETAS (Tags) Y CÁMARA
// ==========================================

async function fetchTags() {
  try {
    const res = await fetch(`${API_URL}/tags`);
    if (res.ok) allTags = await res.json();
  } catch (err) {
    console.error("Error cargando tags:", err);
  }
}

// Subida de Avatar
const btnCamera = document.getElementById("btn-camera");
const avatarUpload = document.getElementById("avatar-upload");

if (btnCamera && avatarUpload) {
  btnCamera.addEventListener("click", () => avatarUpload.click());

  avatarUpload.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    const user = _auth.currentUser;
    if (!file || !user) return;

    try {
      const profileAvatarEl = document.getElementById("profile-avatar");
      profileAvatarEl.innerHTML = '<i class="ti ti-loader" style="animation: spin 1s linear infinite;"></i>';

      const avatarRef = _storage.ref().child(`avatars/${user.uid}`);
      await avatarRef.put(file);
      const downloadURL = await avatarRef.getDownloadURL();
      await user.updateProfile({ photoURL: downloadURL });

      const imgHtml = `<img src="${downloadURL}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
      profileAvatarEl.innerHTML = imgHtml;
      document.getElementById("user-avatar").innerHTML = imgHtml;
    } catch (error) {
      console.error("Error al subir imagen:", error);
    }
  });
}

// ==========================================
// 9. MODAL DE AÑADIR/EDITAR (Sin inline events)
// ==========================================

function mostrarModal(editId = null) {
  cerrarModal();
  let p = null;
  let title = "Añadir Nuevo Prompt";
  let btnText = "Guardar";
  modalSelectedTags = [];

  if (editId) {
    p = promptsData.find(x => x.id == editId);
    if (p) {
      title = "Editar Prompt";
      btnText = "Guardar Cambios";
      modalSelectedTags = (p.tags || []).map(t => t.nombre);
    }
  }

  // Se inyecta el HTML limpio (CERO onclicks)
  const modalHTML = `
    <div id="modal-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15,25,35,0.85); display: flex; justify-content: center; align-items: center; z-index: 1000; backdrop-filter: blur(4px);">
      <div class="spm-modal-content" style="background: var(--bg-card, #fff); width: 100%; max-width: 500px; padding: 24px; border-radius: 10px;">
        <h2 style="margin-bottom: 20px; font-size: 18px;">${title}</h2>
        <input type="text" id="prompt-titulo" class="spm-input" placeholder="Título" style="width: 100%; padding: 12px; margin-bottom: 12px; outline: none;">
        <textarea id="prompt-contenido" class="spm-textarea" placeholder="Ingresa tu plantilla" rows="5" style="width: 100%; padding: 12px; margin-bottom: 20px; outline: none;"></textarea>
        <div style="display: flex; justify-content: flex-end; gap: 12px;">
          <button id="btn-cerrar-modal" class="spm-btn-ghost" style="padding: 10px 16px; cursor: pointer;">Cancelar</button>
          <button id="btn-guardar-modal" data-editid="${editId || ''}" style="padding: 10px 16px; background: #2C3D58; color: white; border:none; border-radius:6px; cursor: pointer;">${btnText}</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);

  if (p) {
    document.getElementById("prompt-titulo").value = p.titulo || "";
    document.getElementById("prompt-contenido").value = p.contenido || "";
  }

  // ASIGNACIÓN DE EVENTOS DE FORMA SEGURA (CSP compliance)
  document.getElementById("btn-cerrar-modal").addEventListener("click", cerrarModal);
  document.getElementById("btn-guardar-modal").addEventListener("click", guardarNuevoPrompt);

  // Cerrar haciendo clic fuera
  document.getElementById('modal-overlay').addEventListener('click', (ev) => {
    if (ev.target.id === 'modal-overlay') cerrarModal();
  });
}

function cerrarModal() {
  const modal = document.getElementById("modal-overlay");
  if (modal) modal.remove();
}

async function guardarNuevoPrompt(e) {
  const btnGuardar = e.target;
  const editId = btnGuardar.dataset.editid;
  const titulo = document.getElementById("prompt-titulo").value.trim();
  const contenido = document.getElementById("prompt-contenido").value.trim();

  if (!titulo || !contenido) {
    alert("Por favor completa el título y el contenido.");
    return;
  }

  const btnTextoOriginal = btnGuardar.innerText;
  btnGuardar.innerText = "Guardando...";
  btnGuardar.disabled = true;

  try {
    let url = `${API_URL}/prompts`;
    let method = "POST";
    if (editId) {
      url = `${API_URL}/prompts/${editId}`;
      method = "PUT";
    }

    const response = await fetch(url, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo, contenido, categoria: "General", tags: [] })
    });

    if (!response.ok) throw new Error("Error al guardar");

    cerrarModal();
    fetchPrompts();
    fetchStats();
  } catch (error) {
    console.error(error);
    alert("Error al intentar guardar el prompt.");
    btnGuardar.innerText = btnTextoOriginal;
    btnGuardar.disabled = false;
  }
}