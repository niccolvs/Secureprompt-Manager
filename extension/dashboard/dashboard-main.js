    // ── Configuración ─────────────────────────────
    const API_URL = "http://127.0.0.1:8000";
    const NAV = ["Dashboard", "Tus prompts", "Historial", "Extensión", "Perfil"];

    let activeNav = "Dashboard";
    let selectedId = null;
    let promptsData = [];

    // ── Navegación ────────────────────────────────
    function renderNav() {
      const nav = document.getElementById("sidenav");
      nav.innerHTML = NAV.map(item =>
        `<div class="spm-nav-item${item === activeNav ? ' active' : ''}" data-nav="${item}" role="menuitem" tabindex="0">${item}</div>`
      ).join("");
      nav.querySelectorAll(".spm-nav-item").forEach(el =>
        el.addEventListener("click", () => {
          activeNav = el.dataset.nav;
          renderNav();
        })
      );

      // Mostrar/Ocultar vistas
      if (activeNav === "Perfil") {
        document.getElementById("view-dashboard").style.display = "none";
        document.getElementById("view-perfil").style.display = "flex";
      } else {
        document.getElementById("view-dashboard").style.display = "flex";
        document.getElementById("view-perfil").style.display = "none";
      }
    }

    // ── Fetch datos del backend ───────────────────
    async function fetchPrompts() {
      try {
        const res = await fetch(`${API_URL}/prompts`);
        if (!res.ok) throw new Error("Error del servidor");
        const data = await res.json();
        promptsData = data.prompts || [];
        selectedId = promptsData.length > 0 ? promptsData[0].id : null;
        renderPrompts();
        renderDetail();
        hideConnError();
      } catch (err) {
        console.error("Error cargando prompts:", err);
        promptsData = [];
        selectedId = null;
        renderPrompts();
        renderDetail();
        showConnError();
      }
    }

    async function fetchStats() {
      try {
        const res = await fetch(`${API_URL}/stats`);
        if (!res.ok) throw new Error("Error del servidor");
        const data = await res.json();
        const censurasEl = document.getElementById("stat-censuras");
        const plantillasEl = document.getElementById("stat-plantillas");
        censurasEl.textContent = data.total_censuras || 0;
        plantillasEl.textContent = data.plantillas_usadas || 0;
        censurasEl.classList.add("spm-fade-in");
        plantillasEl.classList.add("spm-fade-in");
      } catch (err) {
        console.error("Error cargando stats:", err);
        document.getElementById("stat-censuras").textContent = "0";
        document.getElementById("stat-plantillas").textContent = "0";
      }
    }

    async function fetchHistorial() {
      try {
        const res = await fetch(`${API_URL}/historial`);
        if (!res.ok) throw new Error("Error del servidor");
        const data = await res.json();
        renderHistorial(data.historial || []);
      } catch (err) {
        console.error("Error cargando historial:", err);
        renderHistorial([]);
      }
    }

    // ── Render: Historial ─────────────────────────
    function renderHistorial(historial) {
      const panel = document.getElementById("historial-panel");

      if (historial.length === 0) {
        panel.innerHTML = `
          <div class="spm-empty-state">
            <i class="ti ti-history" aria-hidden="true"></i>
            <span class="empty-title">Sin actividad reciente</span>
            <span class="empty-sub">Aquí aparecerá el registro de tus interacciones con las IAs</span>
          </div>`;
        return;
      }

      panel.innerHTML = historial.map(h => `
        <div class="spm-hist-row spm-fade-in">
          <span style="font-weight:700;width:68px">${h.plataforma}</span>
          <span style="flex:1">${h.fecha}</span>
          <span>${h.hora}</span>
        </div>
      `).join("");
    }

    // ── Render: Prompts ───────────────────────────
    function renderPrompts() {
      const list = document.getElementById("prompts-list");

      if (promptsData.length === 0) {
        list.innerHTML = `
          <div class="spm-empty-state spm-fade-in">
            <i class="ti ti-file-text" aria-hidden="true"></i>
            <span class="empty-title">Aún no tienes plantillas guardadas</span>
            <span class="empty-sub">Crea tu primer prompt desde la sección "Tus prompts" o desde la extensión del navegador</span>
          </div>`;
        return;
      }

      list.innerHTML = promptsData.map(p =>
        `<div class="spm-prompt-item spm-fade-in${p.id === selectedId ? ' sel' : ''}" data-id="${p.id}" role="button" tabindex="0">
          <i class="ti ti-file-text" aria-hidden="true" style="font-size:16px;color:#5C7FA3;flex-shrink:0"></i>
          ${p.titulo}
        </div>`
      ).join("");

      list.querySelectorAll(".spm-prompt-item").forEach(el =>
        el.addEventListener("click", () => { selectedId = +el.dataset.id; renderPrompts(); renderDetail(); })
      );
    }

    // ── Render: Detalle ───────────────────────────
    function renderDetail() {
      const panel = document.getElementById("detail-panel");

      if (!selectedId || promptsData.length === 0) {
        panel.innerHTML = `
          <div class="spm-empty-state">
            <i class="ti ti-info-circle" aria-hidden="true"></i>
            <span class="empty-title">Selecciona un prompt</span>
            <span class="empty-sub">Haz clic en uno de tus prompts para ver sus detalles aquí</span>
          </div>`;
        return;
      }

      const p = promptsData.find(x => x.id === selectedId);
      if (!p) {
        panel.innerHTML = `
          <div class="spm-empty-state">
            <i class="ti ti-info-circle" aria-hidden="true"></i>
            <span class="empty-title">Selecciona un prompt</span>
            <span class="empty-sub">Haz clic en uno de tus prompts para ver sus detalles aquí</span>
          </div>`;
        return;
      }

      const tag = `<span class="spm-tag" style="background:#B5D4F4;color:#0C447C">${p.categoria}</span>`;
      panel.innerHTML = `
        <div class="spm-fade-in">
          <div style="font-size:11px;color:#5A7291;margin-bottom:9px">Creado: ${p.fecha_creacion || '—'}</div>
          <div style="margin-bottom:10px">${tag}</div>
          <p style="font-size:12px;color:#2A3A4A;line-height:1.55;margin:0 0 14px">${p.contenido_limpio || p.contenido}</p>
          <div style="display:flex;gap:7px;justify-content:flex-end">
            <button class="spm-btn spm-btn-ghost" onclick="eliminarPrompt(${p.id})">Eliminar</button>
            <button class="spm-btn spm-btn-dark" onclick="copiarPrompt('${(p.contenido_limpio || p.contenido).replace(/'/g, "\\'")}')">Copiar</button>
          </div>
        </div>`;
    }

    // ── Acciones ───────────────────────────────────
    async function eliminarPrompt(id) {
      if (!confirm("¿Estás seguro de que deseas eliminar este prompt?")) return;
      try {
        const res = await fetch(`${API_URL}/prompts/${id}`, { method: "DELETE" });
        if (res.ok) {
          fetchPrompts();
          fetchStats();
        }
      } catch (err) {
        console.error("Error eliminando:", err);
      }
    }

    function copiarPrompt(texto) {
      navigator.clipboard.writeText(texto)
        .then(() => alert("✅ Copiado al portapapeles"))
        .catch(err => console.error("Error al copiar:", err));
    }

    // ── Modal Añadir Prompt ───────────────────────
    function mostrarModal() {
      cerrarModal();

      const modalHTML = `
        <div id="modal-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 25, 35, 0.85); display: flex; justify-content: center; align-items: center; z-index: 1000; backdrop-filter: blur(4px);">
          <div style="background: #fff; width: 100%; max-width: 500px; padding: 24px; border-radius: 10px; border: 1px solid #C0D4E8; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
            <h2 style="margin-bottom: 20px; font-size: 18px; color: #1C2B3A; font-weight: 500;">Añadir Nuevo Prompt</h2>
            
            <input type="text" id="prompt-titulo" placeholder="Ej: Análisis de Vulnerabilidades" style="width: 100%; padding: 12px; margin-bottom: 12px; background: #EFF4FA; border: 1px solid #C0D4E8; border-radius: 6px; color: #1C2B3A; font-family: inherit; font-size: 14px; outline: none;">
            
            <input type="text" id="prompt-categoria" placeholder="Categoría (Ej: Ciberseguridad, IoT)" style="width: 100%; padding: 12px; margin-bottom: 12px; background: #EFF4FA; border: 1px solid #C0D4E8; border-radius: 6px; color: #1C2B3A; font-family: inherit; font-size: 14px; outline: none;">
            
            <textarea id="prompt-contenido" placeholder="Escribe el prompt aquí. ¡Los datos sensibles serán detectados!" rows="5" style="width: 100%; padding: 12px; margin-bottom: 20px; background: #EFF4FA; border: 1px solid #C0D4E8; border-radius: 6px; color: #1C2B3A; font-family: inherit; font-size: 14px; resize: vertical; outline: none;"></textarea>
            
            <div style="display: flex; justify-content: flex-end; gap: 12px;">
              <button id="btn-cerrar-modal" style="padding: 10px 16px; background: transparent; border: 1px solid #C0D4E8; color: #6A8099; border-radius: 6px; cursor: pointer; transition: 0.2s; font-family: inherit;">Cancelar</button>
              <button id="btn-guardar-modal" style="padding: 10px 16px; background: #2C3D58; border: none; color: white; border-radius: 6px; cursor: pointer; font-weight: 600; transition: 0.2s; font-family: inherit;">Guardar y Analizar</button>
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

      const btnGuardar = document.getElementById("btn-guardar-modal");
      const btnTextoOriginal = btnGuardar.innerText;
      btnGuardar.innerText = "Guardando...";
      btnGuardar.disabled = true;

      try {
        const response = await fetch(`${API_URL}/prompts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ titulo, contenido, categoria })
        });

        if (!response.ok) throw new Error("Error al guardar");

        const data = await response.json();
        cerrarModal();

        // Recargar datos
        fetchPrompts();
        fetchStats();

        if (data.total_entidades > 0) {
          alert(`✅ Guardado con éxito. Se censuraron ${data.total_entidades} datos sensibles.`);
        }

      } catch (error) {
        console.error(error);
        alert("Error al intentar guardar el prompt. Revisa que FastAPI esté encendido.");
        btnGuardar.innerText = btnTextoOriginal;
        btnGuardar.disabled = false;
      }
    }

    // ── Error de conexión ─────────────────────────
    function showConnError() {
      document.getElementById("conn-error").style.display = "flex";
    }

    function hideConnError() {
      document.getElementById("conn-error").style.display = "none";
    }

    // ── Inicialización ────────────────────────────
    renderNav();

    // Cargar datos del backend
    fetchPrompts();
    fetchStats();
    fetchHistorial();

    // ── Cerrar sesión ─────────────────────────────
    document.getElementById("btn-logout").addEventListener("click", () => {
      _auth.signOut().then(() => {
        window.location.replace("login.html");
      });
    });

    // ── Cambiar foto de perfil ────────────────────
    const btnCamera = document.getElementById("btn-camera");
    const avatarUpload = document.getElementById("avatar-upload");

    btnCamera.addEventListener("click", () => {
      avatarUpload.click();
    });

    avatarUpload.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const user = _auth.currentUser;
      if (!user) return;

      try {
        const profileAvatarEl = document.getElementById("profile-avatar");
        const topAvatarEl = document.getElementById("user-avatar");

        profileAvatarEl.innerHTML = '<i class="ti ti-loader" style="animation: spin 1s linear infinite;"></i>';

        const storageRef = _storage.ref();
        const avatarRef = storageRef.child(`avatars/${user.uid}`);
        await avatarRef.put(file);
        const downloadURL = await avatarRef.getDownloadURL();
        await user.updateProfile({ photoURL: downloadURL });

        const imgHtml = `<img src="${downloadURL}" alt="Foto de perfil" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
        profileAvatarEl.innerHTML = imgHtml;
        profileAvatarEl.classList.remove("avatar-initials");
        topAvatarEl.innerHTML = imgHtml;
      } catch (error) {
        console.error("Error al subir imagen:", error);
        alert("Hubo un error al subir la imagen. Verifica los permisos de Firebase Storage.");
      }
    });