// historial-main.js — Logica de la pagina Historial

const API_URL  = "http://127.0.0.1:8000";
let activeNav  = "Historial";

let originalTextCache = "";
let censoredTextCache = "";
let isCensoredMode    = false;

// ── Navegacion ─────────────────────────────────────────────────────────────
function renderNav() {
  const nav = document.getElementById("sidenav");
  if (!nav) return;
  nav.innerHTML = `
    <a href="dashboard.html" class="spm-nav-item" style="text-decoration:none;color:inherit;display:block;">Dashboard</a>
    <a href="prompts.html"   class="spm-nav-item" style="text-decoration:none;color:inherit;display:block;">Tus prompts</a>
    <a href="historial.html" class="spm-nav-item active" style="text-decoration:none;color:inherit;display:block;">Historial</a>
  `;
}

// ── Tema ───────────────────────────────────────────────────────────────────
function initTheme() {
  const themeToggle = document.getElementById("theme-toggle");
  if (!themeToggle) return;
  if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark-mode");
    themeToggle.classList.replace("ti-moon", "ti-sun");
  }
  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    const isDark = document.body.classList.contains("dark-mode");
    localStorage.setItem("theme", isDark ? "dark" : "light");
    themeToggle.classList.toggle("ti-sun",  isDark);
    themeToggle.classList.toggle("ti-moon", !isDark);
  });
}

// ── Fetch historial ────────────────────────────────────────────────────────
async function fetchHistorial(userId) {
  try {
    const res  = await fetch(`${API_URL}/historial/${userId}`);
    if (!res.ok) throw new Error("Error del servidor");
    const data = await res.json();
    renderHistorial(data.historial || []);
  } catch (err) {
    console.error("Error cargando historial:", err);
    renderHistorial([]);
  }
}

// ── Render historial ───────────────────────────────────────────────────────
function renderHistorial(historial) {
  const panel = document.getElementById("historial-panel");
  if (!panel) return;

  if (historial.length === 0) {
    panel.innerHTML = `
      <div class="spm-empty-state">
        <i class="ti ti-history" aria-hidden="true"></i>
        <span class="empty-title">Sin actividad reciente</span>
        <span class="empty-sub">Aqui aparecera el registro de tus interacciones con las IAs</span>
      </div>`;
    return;
  }

  panel.innerHTML = historial.map(h => {
    let iconClass = "ti-history";
    if (h.plataforma.toLowerCase().includes("chatgpt")) iconClass = "ti-message-chatbot";
    else if (h.plataforma.toLowerCase().includes("claude"))  iconClass = "ti-brain";
    else if (h.plataforma.toLowerCase().includes("gemini"))  iconClass = "ti-sparkles";

    const safeText = encodeURIComponent(h.texto_censurado || "");

    return `<div class="spm-prompt-item spm-fade-in" data-texto="${safeText}"
      style="cursor:pointer;border-left:4px solid transparent;padding:16px;margin-bottom:12px;position:relative;">
      <div style="flex-shrink:0;width:40px;height:40px;border-radius:50%;background:rgba(92,127,163,0.15);color:#5C7FA3;display:flex;align-items:center;justify-content:center;margin-right:16px;">
        <i class="ti ${iconClass}" aria-hidden="true" style="font-size:18px;"></i>
      </div>
      <div style="flex:1;min-width:0;display:flex;flex-direction:column;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">
          <span style="font-weight:600;font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:85%;">${h.plataforma}</span>
          <span style="font-size:11px;opacity:0.6;white-space:nowrap;margin-top:2px;">${h.fecha} ${h.hora}</span>
        </div>
        <span style="font-size:13px;opacity:0.75;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%;display:block;">Haz clic para ver el contenido censurado de la conversacion.</span>
      </div>
      <div style="display:flex;align-items:center;margin-left:12px;">
        <i class="ti ti-chevron-right" style="color:#6A8099;"></i>
      </div>
    </div>`;
  }).join("");

  panel.querySelectorAll("[data-texto]").forEach(el => {
    el.addEventListener("click", () => {
      abrirModalCensurado(decodeURIComponent(el.dataset.texto));
    });
  });
}

// ── Modal detalle ──────────────────────────────────────────────────────────
function abrirModalCensurado(texto) {
  originalTextCache = texto || "No hay texto registrado.";
  censoredTextCache = "";
  isCensoredMode    = false;

  const contentBox    = document.getElementById("censurado-contenido-box");
  const toggleBtn     = document.getElementById("btn-toggle-censura");
  const toggleBtnText = toggleBtn.querySelector("span");
  const toggleBtnIcon = toggleBtn.querySelector("i");

  contentBox.textContent   = originalTextCache;
  toggleBtnText.textContent = "Censurar Texto";
  toggleBtnIcon.className  = "ti ti-shield-check";

  const isDark       = document.body.classList.contains("dark-mode");
  const modalContent = document.querySelector("#modal-censurado .spm-modal-content");

  if (isDark) {
    modalContent.style.background  = "#15202B";
    modalContent.style.borderColor = "#2C3D58";
    modalContent.querySelector("h2").style.color = "#fff";
    contentBox.style.background  = "#0B1120";
    contentBox.style.color       = "#fff";
    contentBox.style.borderColor = "#2C3D58";
  } else {
    modalContent.style.background  = "#fff";
    modalContent.style.borderColor = "";
    modalContent.querySelector("h2").style.color = "#1C2B3A";
    contentBox.style.background  = "#F4F7FB";
    contentBox.style.color       = "#2A3A4A";
    contentBox.style.borderColor = "#E1E8F0";
  }

  document.getElementById("modal-censurado").style.display = "flex";
}

async function toggleCensura() {
  const contentBox    = document.getElementById("censurado-contenido-box");
  const toggleBtn     = document.getElementById("btn-toggle-censura");
  const toggleBtnText = toggleBtn.querySelector("span");
  const toggleBtnIcon = toggleBtn.querySelector("i");

  if (!isCensoredMode) {
    if (!censoredTextCache) {
      toggleBtnText.textContent = "Censurando...";
      try {
        const res = await fetch(`${API_URL}/prompts/analizar`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ titulo: "Historial", contenido: originalTextCache, categoria: "General" })
        });
        if (res.ok) {
          const data     = await res.json();
          censoredTextCache = data.analisis?.texto_limpio || originalTextCache;
        } else {
          censoredTextCache = "Error al censurar.";
        }
      } catch (e) {
        censoredTextCache = "Error de conexion al censurar.";
      }
    }
    contentBox.textContent    = censoredTextCache;
    toggleBtnText.textContent = "Ver Original";
    toggleBtnIcon.className   = "ti ti-eye";
    isCensoredMode            = true;
  } else {
    contentBox.textContent    = originalTextCache;
    toggleBtnText.textContent = "Censurar Texto";
    toggleBtnIcon.className   = "ti ti-shield-check";
    isCensoredMode            = false;
  }
}

function cerrarModalCensurado() {
  document.getElementById("modal-censurado").style.display = "none";
}

// ── Borrar historial ───────────────────────────────────────────────────────
async function borrarHistorial() {
  if (!confirm("¿Quieres borrar el historial?")) return;
  const user = _auth.currentUser;
  if (!user) return;
  try {
    const res = await fetch(`${API_URL}/historial/${user.uid}`, { method: "DELETE" });
    if (res.ok) fetchHistorial(user.uid);
  } catch (err) { console.error("Error al borrar historial:", err); }
}

// ── Sesion ─────────────────────────────────────────────────────────────────
function cerrarSesion() {
  _auth.signOut().then(() => window.location.replace("login.html"));
}

function borrarCuenta() {
  if (!confirm("¿Estas seguro de que quieres borrar tu cuenta?")) return;
  const user = _auth.currentUser;
  if (!user) return;
  user.delete()
    .then(() => window.location.replace("login.html"))
    .catch(err => {
      console.error(err);
      alert("Error al borrar la cuenta. Puede que necesites volver a iniciar sesion.");
    });
}

// ── Inicializacion ─────────────────────────────────────────────────────────
renderNav();
initTheme();

// Avatar dropdown
const avatarEl = document.getElementById("user-avatar");
if (avatarEl) {
  avatarEl.addEventListener("click", () => {
    document.getElementById("profile-dropdown").classList.toggle("show");
  });
}

// Dropdown items
const btnCerrarSesion = document.getElementById("dropdown-cerrar-sesion");
if (btnCerrarSesion) btnCerrarSesion.addEventListener("click", cerrarSesion);

const btnBorrarCuenta = document.getElementById("dropdown-borrar-cuenta");
if (btnBorrarCuenta) btnBorrarCuenta.addEventListener("click", borrarCuenta);

// Logout
const btnLogout = document.getElementById("btn-logout");
if (btnLogout) btnLogout.addEventListener("click", cerrarSesion);

// Borrar historial
const btnBorrarHistorial = document.getElementById("btn-borrar-historial");
if (btnBorrarHistorial) btnBorrarHistorial.addEventListener("click", borrarHistorial);

// Modal
const btnCerrarModal = document.getElementById("btn-cerrar-modal-censurado");
if (btnCerrarModal) btnCerrarModal.addEventListener("click", cerrarModalCensurado);

const btnCerrarFooter = document.getElementById("btn-cerrar-modal-footer");
if (btnCerrarFooter) btnCerrarFooter.addEventListener("click", cerrarModalCensurado);

const btnToggleCensura = document.getElementById("btn-toggle-censura");
if (btnToggleCensura) btnToggleCensura.addEventListener("click", toggleCensura);

// Cerrar modal al click fuera
document.getElementById("modal-censurado").addEventListener("click", (e) => {
  if (e.target === document.getElementById("modal-censurado")) cerrarModalCensurado();
});

// Cerrar dropdown al click fuera
document.addEventListener("click", (e) => {
  const dropdown = document.getElementById("profile-dropdown");
  const avatar   = document.getElementById("user-avatar");
  if (dropdown && dropdown.classList.contains("show") &&
      !dropdown.contains(e.target) && avatar && !avatar.contains(e.target)) {
    dropdown.classList.remove("show");
  }
});

// Cargar datos cuando Firebase confirme la sesion
_auth.onAuthStateChanged((user) => {
  if (user) {
    chrome.storage.local.set({ user_id: user.uid });
    fetchHistorial(user.uid);
  }
});