const API_URL = "http://127.0.0.1:8000";
let prompts = [];

document.addEventListener("DOMContentLoaded", () => {
  cargarPrompts();
  configurarEventos();
});

async function cargarPrompts() {
  try {
    const response = await fetch(`${API_URL}/prompts`);
    if (!response.ok) throw new Error("Error del servidor");

    const data = await response.json();
    prompts = data.prompts;

    renderizarPrompts(prompts);
    actualizarEstadisticas(prompts);
  } catch (error) {
    console.error("Error conectando con FastAPI:", error);
    mostrarError("⚠️ No se pudo conectar al servidor. Asegúrate de que FastAPI esté corriendo.");
  }
}

function renderizarPrompts(lista) {
  const grid = document.getElementById("prompts-grid");
  grid.innerHTML = "";

  if (lista.length === 0) {
    grid.innerHTML = `
      <div class="prompt-card-new" id="btn-card-new-empty">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M12 4v16M4 12h16" stroke="#4a6278" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <span>Crea tu primer prompt</span>
      </div>
    `;
    document.getElementById("btn-card-new-empty").addEventListener("click", mostrarModal);
    return;
  }

  lista.forEach(prompt => {
    const card = document.createElement("div");
    card.className = "prompt-card";
    card.innerHTML = `
      <div class="prompt-title">${prompt.titulo}</div>
      <div class="prompt-preview" title="${prompt.contenido_limpio}">${prompt.contenido_limpio}</div>
      <div class="prompt-footer">
        <span class="tag">${prompt.categoria}</span>
        <div class="prompt-actions">
          <button class="action-btn btn-copiar" data-texto="${prompt.contenido_limpio}">Copiar</button>
          <button class="action-btn danger btn-eliminar" data-id="${prompt.id}">Borrar</button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });

  const cardNueva = document.createElement("div");
  cardNueva.className = "prompt-card-new";
  cardNueva.addEventListener("click", mostrarModal);
  cardNueva.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M12 4v16M4 12h16" stroke="#4a6278" stroke-width="1.5" stroke-linecap="round"/>
    </svg>
    <span>Nuevo prompt</span>
  `;
  grid.appendChild(cardNueva);

  document.querySelectorAll('.btn-copiar').forEach(btn => {
    btn.addEventListener('click', (e) => copiarPrompt(e.target.dataset.texto));
  });

  document.querySelectorAll('.btn-eliminar').forEach(btn => {
    btn.addEventListener('click', (e) => eliminarPrompt(e.target.dataset.id));
  });
}

function configurarEventos() {
  document.getElementById("btn-new-prompt").addEventListener("click", mostrarModal);

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

function mostrarModal() {
  cerrarModal();

  const modalHTML = `
    <div id="modal-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 25, 35, 0.85); display: flex; justify-content: center; align-items: center; z-index: 1000; backdrop-filter: blur(4px);">
      <div style="background: var(--bg-card); width: 100%; max-width: 500px; padding: 24px; border-radius: var(--radius-lg); border: 1px solid var(--border); box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
        <h2 style="margin-bottom: 20px; font-size: 18px; color: var(--text-primary);">Añadir Nuevo Prompt</h2>
        
        <input type="text" id="prompt-titulo" placeholder="Ej: Análisis de Vulnerabilidades" style="width: 100%; padding: 12px; margin-bottom: 12px; background: var(--bg-primary); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text-primary); font-family: inherit; font-size: 14px; outline: none;">
        
        <input type="text" id="prompt-categoria" placeholder="Categoría (Ej: Ciberseguridad, IoT)" style="width: 100%; padding: 12px; margin-bottom: 12px; background: var(--bg-primary); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text-primary); font-family: inherit; font-size: 14px; outline: none;">
        
        <textarea id="prompt-contenido" placeholder="Escribe el prompt aquí. ¡Los datos sensibles serán detectados!" rows="5" style="width: 100%; padding: 12px; margin-bottom: 20px; background: var(--bg-primary); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text-primary); font-family: inherit; font-size: 14px; resize: vertical; outline: none;"></textarea>
        
        <div style="display: flex; justify-content: flex-end; gap: 12px;">
          <button id="btn-cerrar-modal" style="padding: 10px 16px; background: transparent; border: 1px solid var(--border); color: var(--text-secondary); border-radius: var(--radius-sm); cursor: pointer; transition: 0.2s;">Cancelar</button>
          <button id="btn-guardar-modal" style="padding: 10px 16px; background: var(--accent); border: none; color: white; border-radius: var(--radius-sm); cursor: pointer; font-weight: 600; transition: 0.2s;">Guardar y Analizar</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);

  document.getElementById("btn-cerrar-modal").addEventListener("click", cerrarModal);
  document.getElementById("btn-guardar-modal").addEventListener("click", guardarNuevoPrompt);
}

function cerrarModal() {
  const modal = document.getElementById("modal-overlay");
  if (modal) modal.remove();
}

async function guardarNuevoPrompt() {
  const titulo = document.getElementById("prompt-titulo").value.trim();
  const categoria = document.getElementById("prompt-categoria").value.trim();
  const contenido = document.getElementById("prompt-contenido").value.trim();

  if (!titulo || !contenido || !categoria) {
    alert("Por favor completa todos los campos.");
    return;
  }

  try {
    const response = await fetch(`${API_URL}/prompts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo, contenido, categoria })
    });

    if (!response.ok) throw new Error("Error al guardar");

    const data = await response.json();
    cerrarModal();
    cargarPrompts();

    if (data.total_entidades > 0) {
      alert(`✅ Guardado con éxito. Se censuraron ${data.total_entidades} datos sensibles.`);
    }

  } catch (error) {
    console.error(error);
    alert("Error al intentar guardar el prompt. Revisa que FastAPI esté encendido.");
  }
}

async function eliminarPrompt(id) {
  if (!confirm("¿Estás seguro de que deseas eliminar este prompt?")) return;

  try {
    const response = await fetch(`${API_URL}/prompts/${id}`, { method: "DELETE" });
    if (response.ok) cargarPrompts();
  } catch (error) {
    console.error(error);
  }
}

function copiarPrompt(texto) {
  navigator.clipboard.writeText(texto)
    .then(() => alert("✅ Copiado al portapapeles"))
    .catch(err => console.error('Error al copiar: ', err));
}

function actualizarEstadisticas(lista) {
  document.getElementById("stat-total").innerText = lista.length;
  document.getElementById("stat-favoritos").innerText = lista.filter(p => p.categoria.toLowerCase() === 'favorito').length || '0';
  document.getElementById("stat-semana").innerText = lista.length;
}

function mostrarError(mensaje) {
  const grid = document.getElementById("prompts-grid");
  grid.innerHTML = `<div style="color: #e24b4a; padding: 20px;">${mensaje}</div>`;
}