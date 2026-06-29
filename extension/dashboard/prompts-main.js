const API_URL = "http://127.0.0.1:8000";

let activeNav         = "Tus prompts";
let promptsData       = [];
let allTags           = [];
let modalSelectedTags = [];
let currentTagFilter  = null;

// ── Navegacion ─────────────────────────────────────────────────────────────
function renderNav() {
  const nav = document.getElementById("sidenav");
  if (!nav) return;
  nav.innerHTML = `
    <a href="dashboard.html" class="spm-nav-item" style="text-decoration:none;color:inherit;display:block;">Dashboard</a>
    <a href="prompts.html"   class="spm-nav-item active" style="text-decoration:none;color:inherit;display:block;">Tus prompts</a>
    <a href="historial.html" class="spm-nav-item" style="text-decoration:none;color:inherit;display:block;">Historial</a>
  `;
}

// ── Fetch ──────────────────────────────────────────────────────────────────
async function fetchPrompts(userId) {
  try {
    const res  = await fetch(`${API_URL}/prompts/${userId}`);
    if (!res.ok) throw new Error("Error del servidor");
    const data = await res.json();
    promptsData = data.prompts || [];
    renderFullPrompts();
  } catch (err) {
    console.error("Error cargando prompts:", err);
    promptsData = [];
    renderFullPrompts();
  }
}

async function fetchTags() {
  try {
    const res = await fetch(`${API_URL}/tags`);
    if (!res.ok) throw new Error("Error");
    allTags = await res.json();
  } catch (err) {
    console.error("Error cargando tags:", err);
    allTags = [];
  }
}

// ── Render: Lista completa de prompts ──────────────────────────────────────
function renderFullPrompts() {
  const list        = document.getElementById("full-prompts-list");
  const searchInput = document.getElementById("prompts-search-input");
  if (!list) return;

  const search = searchInput ? searchInput.value.toLowerCase() : "";
  let filtered = promptsData;
  if (search) filtered = filtered.filter(p =>
    p.titulo.toLowerCase().includes(search) ||
    (p.contenido && p.contenido.toLowerCase().includes(search))
  );
  if (currentTagFilter) filtered = filtered.filter(p =>
    p.tags && p.tags.some(t => t.nombre === currentTagFilter)
  );

  if (filtered.length === 0) {
    list.innerHTML = `
      <div class="spm-empty-state spm-fade-in" style="flex:1;display:flex;flex-direction:column;justify-content:center;">
        <i class="ti ti-file-text" aria-hidden="true" style="font-size:32px;margin-bottom:8px;"></i>
        <span class="empty-title">No se encontraron prompts</span>
        <span class="empty-sub">Intenta buscar con otros terminos o agregar una nueva plantilla</span>
      </div>`;
    return;
  }

  list.innerHTML = filtered.map(p => {
    let iconHtml = `<i class="ti ti-file-text" aria-hidden="true" style="font-size:16px;"></i>`;
    if (p.icono) {
      iconHtml = p.icono.startsWith("ti-")
        ? `<i class="ti ${p.icono}" aria-hidden="true" style="font-size:16px;"></i>`
        : `<span style="font-size:16px;line-height:1">${p.icono}</span>`;
    }

    let tagsHtml = "";
    if (p.tags && p.tags.length > 0) {
      tagsHtml = p.tags.map(t =>
        `<span style="font-size:10px;padding:2px 8px;border-radius:12px;background:${t.color};color:#2C3D58;font-weight:500;">${t.nombre}</span>`
      ).join("");
    } else if (p.categoria) {
      tagsHtml = `<span style="font-size:10px;padding:2px 8px;border-radius:12px;background:rgba(92,127,163,0.2);font-weight:500;">${p.categoria}</span>`;
    }

    const cleanContent = (p.contenido_limpio || p.contenido || "Sin contenido").replace(/<[^>]+>/g, "").substring(0, 120);
    const safeContent  = encodeURIComponent(p.contenido_limpio || p.contenido || "");

    return `<div class="spm-prompt-item spm-fade-in" data-fullid="${p.id}"
      style="border-left:4px solid transparent;padding:16px;margin-bottom:12px;position:relative;cursor:pointer;">
      <div class="spm-prompt-icon-btn" data-action="emoji" data-promptid="${p.id}"
        style="flex-shrink:0;cursor:pointer;width:40px;height:40px;border-radius:50%;background:rgba(92,127,163,0.15);color:#5C7FA3;display:flex;align-items:center;justify-content:center;transition:all 0.2s;" title="Cambiar icono">
        ${iconHtml}
      </div>
      <div style="flex:1;min-width:0;display:flex;flex-direction:column;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">
          <span style="font-weight:600;font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:85%;">${p.titulo}</span>
          <span style="font-size:11px;opacity:0.6;white-space:nowrap;margin-top:2px;">${p.fecha_creacion ? p.fecha_creacion.split(" ")[0] : ""}</span>
        </div>
        <span style="font-size:13px;opacity:0.75;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%;display:block;margin-bottom:10px;">${cleanContent}</span>
        <div style="display:flex;gap:8px;">${tagsHtml}</div>
      </div>
      <div class="prompt-hover-actions" style="position:absolute;right:16px;top:16px;display:none;gap:8px;">
        <button class="spm-btn-icon" data-action="copiar" data-content="${safeContent}"
          style="background:rgba(92,127,163,0.2);color:inherit;border:none;border-radius:6px;cursor:pointer;width:32px;height:32px;display:flex;align-items:center;justify-content:center;" title="Copiar">
          <i class="ti ti-copy" style="font-size:16px;opacity:0.8;"></i>
        </button>
        <button class="spm-btn-icon" data-action="eliminar" data-promptid="${p.id}"
          style="background:rgba(92,127,163,0.2);color:#e74c3c;border:none;border-radius:6px;cursor:pointer;width:32px;height:32px;display:flex;align-items:center;justify-content:center;" title="Eliminar">
          <i class="ti ti-trash" style="font-size:16px;opacity:0.8;"></i>
        </button>
      </div>
    </div>`;
  }).join("");

  // Event listeners para cada item
  list.querySelectorAll("[data-fullid]").forEach(el => {
    el.addEventListener("click", () => mostrarDetalleModal(+el.dataset.fullid));
  });
  list.querySelectorAll('[data-action="copiar"]').forEach(btn => {
    btn.addEventListener("click", (e) => { e.stopPropagation(); copiarPrompt(decodeURIComponent(btn.dataset.content)); });
  });
  list.querySelectorAll('[data-action="eliminar"]').forEach(btn => {
    btn.addEventListener("click", (e) => { e.stopPropagation(); eliminarPrompt(+btn.dataset.promptid); });
  });
}

// ── Modal detalle ──────────────────────────────────────────────────────────
function mostrarDetalleModal(id) {
  cerrarModal();
  const p = promptsData.find(x => x.id === id);
  if (!p) return;

  const tagsHtml = (p.tags && p.tags.length > 0)
    ? p.tags.map(t => `<span class="spm-tag" style="background:${t.color};color:#2A3A4A">${t.nombre}</span>`).join("")
    : (p.categoria ? `<span class="spm-tag" style="background:#E3EEFD;color:#2A3A4A">${p.categoria}</span>` : "");

  const overlay = document.createElement("div");
  overlay.id = "modal-overlay";
  overlay.className = "spm-fade-in";
  overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000;";

  overlay.innerHTML = `
    <div class="spm-modal-content" style="background:#fff;width:100%;max-width:600px;max-height:85vh;border-radius:12px;display:flex;flex-direction:column;box-shadow:0 10px 25px rgba(0,0,0,0.2);">
      <div style="padding:20px 24px;border-bottom:1px solid #EEF2F8;display:flex;justify-content:space-between;align-items:center;">
        <h2 style="margin:0;font-size:18px;color:#1C2B3A;">${p.titulo}</h2>
        <button id="modal-detail-cerrar" style="border:none;background:transparent;cursor:pointer;font-size:18px;color:#1C2B3A;">&times;</button>
      </div>
      <div style="padding:24px;overflow-y:auto;flex:1;">
        <div style="font-size:12px;color:#5A7291;margin-bottom:12px">Creado: ${p.fecha_creacion || "?"}</div>
        <div style="margin-bottom:16px">${tagsHtml}</div>
        <div style="background:#F4F7FB;padding:16px;border-radius:8px;font-size:14px;color:#2C3D58;line-height:1.6;white-space:pre-wrap;border:1px solid #E2E8F0;">${p.contenido_limpio || p.contenido}</div>
      </div>
      <div style="padding:16px 24px;border-top:1px solid #EEF2F8;display:flex;justify-content:flex-end;gap:12px;">
        <button id="modal-detail-eliminar" class="spm-btn spm-btn-ghost">Eliminar</button>
        <button id="modal-detail-editar"   class="spm-btn spm-btn-ghost">Editar</button>
        <button id="modal-detail-copiar"   class="spm-btn spm-btn-dark">Copiar</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);

  overlay.addEventListener("click",                                (e) => { if (e.target === overlay) cerrarModal(); });
  overlay.querySelector("#modal-detail-cerrar").addEventListener("click",   cerrarModal);
  overlay.querySelector("#modal-detail-eliminar").addEventListener("click", () => { cerrarModal(); eliminarPrompt(p.id); });
  overlay.querySelector("#modal-detail-editar").addEventListener("click",   () => { cerrarModal(); mostrarModal(p.id); });
  overlay.querySelector("#modal-detail-copiar").addEventListener("click",   () => copiarPrompt(p.contenido_limpio || p.contenido));
}

// ── Acciones ───────────────────────────────────────────────────────────────
async function eliminarPrompt(id) {
  if (!confirm("¿Estas seguro de que deseas eliminar este prompt?")) return;
  const user = _auth.currentUser;
  if (!user) return;
  try {
    const res = await fetch(`${API_URL}/prompts/${id}?user_id=${user.uid}`, { method: "DELETE" });
    if (res.ok) fetchPrompts(user.uid);
  } catch (err) { console.error("Error eliminando:", err); }
}

function copiarPrompt(texto) {
  navigator.clipboard.writeText(texto)
    .then(() => alert("Copiado al portapapeles"))
    .catch(err => console.error("Error al copiar:", err));
}

// ── Tags ───────────────────────────────────────────────────────────────────
function renderModalTags() {
  const container = document.getElementById("modal-tags-selected");
  if (!container) return;
  container.innerHTML = modalSelectedTags.map(name => {
    const existing = allTags.find(t => t.nombre === name);
    const color    = existing ? existing.color : "#E3EEFD";
    return `<span class="spm-tag" data-tagname="${name}" style="background:${color};color:#2A3A4A;cursor:pointer;" title="Clic para quitar">${name} <span style="margin-left:4px;font-weight:700;">&times;</span></span>`;
  }).join("");

  container.querySelectorAll("[data-tagname]").forEach(span => {
    span.addEventListener("click", () => removeModalTag(span.dataset.tagname));
  });

  const input = document.getElementById("prompt-tag-input");
  if (input) {
    input.disabled    = modalSelectedTags.length >= 4;
    input.placeholder = modalSelectedTags.length >= 4 ? "Maximo 4 etiquetas" : "Escribe o selecciona una etiqueta";
  }
}

function addModalTag(name) {
  name = name.trim();
  if (!name || modalSelectedTags.length >= 4 || modalSelectedTags.includes(name)) return;
  modalSelectedTags.push(name);
  renderModalTags();
  renderTagSuggestions("");
}

function removeModalTag(name) {
  modalSelectedTags = modalSelectedTags.filter(t => t !== name);
  renderModalTags();
}

function renderTagSuggestions(filter) {
  const list    = document.getElementById("modal-tags-suggestions");
  if (!list) return;
  const isDark  = document.body.classList.contains("dark-mode");
  const hoverBg = isDark ? "#2C3D58" : "#EFF4FA";
  const available = allTags.filter(t =>
    !modalSelectedTags.includes(t.nombre) &&
    t.nombre.toLowerCase().includes(filter.toLowerCase())
  );

  list.innerHTML = available.map(t =>
    `<div class="tag-suggestion" data-tagname="${t.nombre}"
      style="padding:6px 10px;cursor:pointer;font-size:12px;border-radius:4px;display:flex;align-items:center;gap:6px;">
      <span style="width:10px;height:10px;border-radius:50%;background:${t.color};flex-shrink:0;"></span>${t.nombre}
    </div>`
  ).join("");

  list.querySelectorAll(".tag-suggestion").forEach(div => {
    div.addEventListener("mouseover", () => { div.style.background = hoverBg; });
    div.addEventListener("mouseout",  () => { div.style.background = "transparent"; });
    div.addEventListener("click",     () => addModalTag(div.dataset.tagname));
  });
}

// ── Modal añadir/editar ────────────────────────────────────────────────────
function mostrarModal(editId = null) {
  cerrarModal();

  let p       = null;
  let title   = "Añadir Nuevo Prompt";
  let btnText = "Guardar";
  modalSelectedTags = [];

  if (editId) {
    p = promptsData.find(x => x.id === editId);
    if (p) {
      title   = "Editar Prompt";
      btnText = "Guardar Cambios";
      modalSelectedTags = (p.tags || []).map(t => t.nombre);
    }
  }

  const modalHTML = `
    <div id="modal-overlay" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,25,35,0.85);display:flex;justify-content:center;align-items:center;z-index:1000;backdrop-filter:blur(4px);">
      <div class="spm-modal-content" style="background:#fff;width:100%;max-width:500px;padding:24px;border-radius:10px;border:1px solid #C0D4E8;box-shadow:0 10px 30px rgba(0,0,0,0.5);">
        <h2 style="margin-bottom:20px;font-size:18px;color:#1C2B3A;font-weight:500;">${title}</h2>
        <input type="text" id="prompt-titulo" class="spm-input" placeholder="Ej: Analisis de Vulnerabilidades"
          style="width:100%;padding:12px;margin-bottom:12px;background:#EFF4FA;border:1px solid #C0D4E8;border-radius:6px;color:#1C2B3A;font-family:inherit;font-size:14px;outline:none;">
        <div style="margin-bottom:12px;">
          <label style="font-size:12px;color:#5A7291;margin-bottom:6px;display:block;">Etiquetas (max. 4)</label>
          <div id="modal-tags-selected" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;"></div>
          <div style="position:relative;">
            <input type="text" id="prompt-tag-input" class="spm-input" placeholder="Escribe o selecciona una etiqueta"
              style="width:100%;padding:10px 12px;background:#EFF4FA;border:1px solid #C0D4E8;border-radius:6px;color:#1C2B3A;font-family:inherit;font-size:13px;outline:none;">
            <div id="modal-tags-suggestions" style="position:absolute;top:100%;left:0;right:0;background:#fff;border:1px solid #C0D4E8;border-radius:0 0 6px 6px;max-height:120px;overflow-y:auto;z-index:10;display:none;"></div>
          </div>
        </div>
        <textarea id="prompt-contenido" class="spm-textarea" placeholder="Ingresa tu plantilla aqui" rows="5"
          style="width:100%;padding:12px;margin-bottom:20px;background:#EFF4FA;border:1px solid #C0D4E8;border-radius:6px;color:#1C2B3A;font-family:inherit;font-size:14px;resize:vertical;outline:none;"></textarea>
        <div style="display:flex;justify-content:flex-end;gap:12px;">
          <button id="btn-cerrar-modal" style="padding:10px 16px;background:transparent;border:1px solid #C0D4E8;color:#6A8099;border-radius:6px;cursor:pointer;font-family:inherit;">Cancelar</button>
          <button id="btn-guardar-modal" data-editid="${editId || ""}" style="padding:10px 16px;background:#2C3D58;border:none;color:white;border-radius:6px;cursor:pointer;font-weight:600;font-family:inherit;">${btnText}</button>
        </div>
      </div>
    </div>`;

  document.body.insertAdjacentHTML("beforeend", modalHTML);

  if (p) {
    document.getElementById("prompt-titulo").value    = p.titulo    || "";
    document.getElementById("prompt-contenido").value = p.contenido || "";
  }

  renderModalTags();

  const tagInput       = document.getElementById("prompt-tag-input");
  const suggestionsBox = document.getElementById("modal-tags-suggestions");

  tagInput.addEventListener("focus", () => { suggestionsBox.style.display = "block"; renderTagSuggestions(tagInput.value); });
  tagInput.addEventListener("input", () => { suggestionsBox.style.display = "block"; renderTagSuggestions(tagInput.value); });
  tagInput.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") {
      ev.preventDefault();
      const val = tagInput.value.trim();
      if (val) { addModalTag(val); tagInput.value = ""; renderTagSuggestions(""); }
    }
  });

  document.getElementById("modal-overlay").addEventListener("click", (ev) => {
    if (!ev.target.closest("#modal-tags-suggestions") && ev.target.id !== "prompt-tag-input") {
      suggestionsBox.style.display = "none";
    }
  });

  document.getElementById("btn-cerrar-modal").addEventListener("click", cerrarModal);
  document.getElementById("btn-guardar-modal").addEventListener("click", guardarNuevoPrompt);
}

function cerrarModal() {
  const modal = document.getElementById("modal-overlay");
  if (modal) modal.remove();
}

async function guardarNuevoPrompt(e) {
  const btnGuardar = e.target;
  const editId     = btnGuardar.dataset.editid;
  const user       = _auth.currentUser;
  if (!user) return;

  const titulo    = document.getElementById("prompt-titulo").value.trim();
  const contenido = document.getElementById("prompt-contenido").value.trim();
  const tags      = [...modalSelectedTags];
  const categoria = tags[0] || "";

  if (!titulo) { alert("Por favor completa el titulo."); return; }
  if (tags.length === 0) { alert("Agrega al menos una etiqueta."); return; }

  const btnTextoOriginal = btnGuardar.innerText;
  btnGuardar.innerText   = "Guardando...";
  btnGuardar.disabled    = true;

  try {
    const url    = editId ? `${API_URL}/prompts/${editId}` : `${API_URL}/prompts`;
    const method = editId ? "PUT" : "POST";
    const res    = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user.uid, titulo, contenido, categoria, tags })
    });
    if (!res.ok) throw new Error("Error al guardar");
    cerrarModal();
    fetchPrompts(user.uid);
    fetchTags();
  } catch (error) {
    console.error(error);
    alert("Error al guardar el prompt.");
    btnGuardar.innerText = btnTextoOriginal;
    btnGuardar.disabled  = false;
  }
}

// ── Filtro de etiquetas ────────────────────────────────────────────────────
function renderFilterDropdown() {
  const dropdown  = document.getElementById("filter-dropdown");
  if (!dropdown) return;
  const isDark    = document.body.classList.contains("dark-mode");
  const hoverBg   = isDark ? "#2C3D58" : "#EFF4FA";
  const textColor = isDark ? "#fff" : "#1C2B3A";

  if (allTags.length === 0) {
    dropdown.innerHTML = `<div style="padding:8px 10px;font-size:12px;color:#5A7291;text-align:center;">No hay etiquetas</div>`;
    return;
  }

  dropdown.innerHTML = `
    <div id="filter-opt-all" style="padding:8px 10px;cursor:pointer;font-size:12px;border-radius:4px;color:${textColor};margin-bottom:4px;">Todas las etiquetas</div>
    ${allTags.map(t => {
      const isSel = currentTagFilter === t.nombre;
      return `<div class="filter-opt-tag" data-tagname="${t.nombre}"
        style="padding:8px 10px;cursor:pointer;font-size:12px;border-radius:4px;display:flex;align-items:center;gap:6px;color:${textColor};${isSel ? `background:${hoverBg};font-weight:bold;` : ""}">
        <span style="width:10px;height:10px;border-radius:50%;background:${t.color};flex-shrink:0;"></span>${t.nombre}
      </div>`;
    }).join("")}`;

  if (isDark) { dropdown.style.background = "#0B1120"; dropdown.style.borderColor = "#2C3D58"; }
  else        { dropdown.style.background = "#fff";    dropdown.style.borderColor = "#C0D4E8"; }

  dropdown.querySelector("#filter-opt-all").addEventListener("click", () => setTagFilter(null));
  dropdown.querySelectorAll(".filter-opt-tag").forEach(div => {
    div.addEventListener("mouseover", () => { div.style.background = hoverBg; });
    div.addEventListener("mouseout",  () => { div.style.background = currentTagFilter === div.dataset.tagname ? hoverBg : "transparent"; });
    div.addEventListener("click",     () => setTagFilter(div.dataset.tagname));
  });
}

function setTagFilter(tag) {
  currentTagFilter = tag;
  const btnText   = document.getElementById("filter-btn-text");
  const filterBtn = document.getElementById("prompts-filter-btn");
  if (tag) {
    if (btnText)   btnText.innerText           = tag;
    if (filterBtn) filterBtn.style.borderColor = "#5C7FA3";
    if (filterBtn) filterBtn.style.color       = "#5C7FA3";
  } else {
    if (btnText)   btnText.innerText           = "Filtrar";
    if (filterBtn) filterBtn.style.borderColor = "";
    if (filterBtn) filterBtn.style.color       = "";
  }
  const dropdown = document.getElementById("filter-dropdown");
  if (dropdown) dropdown.style.display = "none";
  renderFullPrompts();
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

// ── Inicializacion ─────────────────────────────────────────────────────────
renderNav();
initTheme();

// Nuevo
const btnNuevo = document.getElementById("btn-nuevo-prompt");
if (btnNuevo) btnNuevo.addEventListener("click", () => mostrarModal());

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

// Busqueda
const searchInput = document.getElementById("prompts-search-input");
if (searchInput) searchInput.addEventListener("input", renderFullPrompts);

// Filtro
const filterBtn = document.getElementById("prompts-filter-btn");
if (filterBtn) {
  filterBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const dropdown = document.getElementById("filter-dropdown");
    if (!dropdown) return;
    if (dropdown.style.display === "block") { dropdown.style.display = "none"; }
    else { dropdown.style.display = "block"; renderFilterDropdown(); }
  });
}

// Cerrar dropdowns al hacer click fuera
document.addEventListener("click", (e) => {
  const dropdownProfile = document.getElementById("profile-dropdown");
  const avatar          = document.getElementById("user-avatar");
  if (dropdownProfile && dropdownProfile.classList.contains("show") &&
      !dropdownProfile.contains(e.target) && avatar && !avatar.contains(e.target)) {
    dropdownProfile.classList.remove("show");
  }

  const dropdown  = document.getElementById("filter-dropdown");
  const filterBtnEl = document.getElementById("prompts-filter-btn");
  if (dropdown && dropdown.style.display === "block" &&
      !dropdown.contains(e.target) && filterBtnEl && !filterBtnEl.contains(e.target)) {
    dropdown.style.display = "none";
  }
});

// Cargar datos cuando Firebase confirme la sesion
_auth.onAuthStateChanged((user) => {
  if (user) {
    chrome.storage.local.set({ user_id: user.uid });
    fetchPrompts(user.uid);
    fetchTags();
  }
});