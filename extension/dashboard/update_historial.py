import re

with open('dashboard.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Replace everything from VISTA DASHBOARD down to the end of the content area
html = re.sub(r'<!-- VISTA DASHBOARD -->.*?<!-- Fin VISTA PERFIL -->', '''<!-- VISTA HISTORIAL -->
      <div id="view-historial" style="display: flex; flex-direction: column; flex: 1;">
        <div style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end;">
          <div>
            <h2 class="spm-h2" style="margin-bottom: 4px;">Historial de Censura</h2>
            <p style="font-size: 13px; color: #6A8099; margin: 0;">Registro detallado de tus interacciones con las IAs</p>
          </div>
          <button class="spm-btn spm-btn-ghost" onclick="borrarHistorial()" style="color: #DC2626; border-color: rgba(220,38,38,0.2); height: 38px; display: flex; align-items: center; gap: 6px; padding: 0 16px;">
            <i class="ti ti-trash"></i> Borrar historial
          </button>
        </div>
        
        <div id="historial-panel" class="spm-hist" style="flex: 1; overflow-y: auto; max-height: none; background: transparent; padding: 0; box-shadow: none;">
          <!-- Items render here -->
        </div>
      </div>
      
      <!-- Modal Texto Censurado -->
      <div id="modal-censurado" class="spm-modal" style="display: none; align-items: center; justify-content: center; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); z-index: 1000;">
        <div class="spm-modal-content" style="max-width: 600px; width: 100%;">
          <h2 class="spm-h2" style="margin-top:0">Texto Original Censurado</h2>
          <textarea id="censurado-contenido" class="spm-input spm-textarea" readonly style="margin-top:12px; height:200px; width:100%; border:1px solid #C0D4E8; border-radius:6px; padding:12px; outline:none; resize:none;"></textarea>
          <div style="display: flex; justify-content: flex-end; margin-top: 16px;">
            <button class="spm-btn spm-btn-ghost" onclick="cerrarModalCensurado()">Cerrar</button>
          </div>
        </div>
      </div>
''', html, flags=re.DOTALL)

# Fix renderNav
nav_js = """function renderNav() {
      const nav = document.getElementById("sidenav");
      nav.innerHTML = `
        <a href="dashboard.html" class="spm-nav-item" style="text-decoration:none; color:inherit; display:block;" role="menuitem">Dashboard</a>
        <a href="prompts.html" class="spm-nav-item" style="text-decoration:none; color:inherit; display:block;" role="menuitem">Tus prompts</a>
        <div class="spm-nav-item active" data-nav="Historial" role="menuitem" tabindex="0">Historial</div>
        <a href="perfil.html" class="spm-nav-item" style="text-decoration:none; color:inherit; display:block;" role="menuitem">Perfil</a>
      `;
    }
    
    function abrirModalCensurado(texto) {
      document.getElementById("censurado-contenido").value = texto || 'No hay texto censurado registrado.';
      document.getElementById("modal-censurado").style.display = "flex";
    }
    function cerrarModalCensurado() {
      document.getElementById("modal-censurado").style.display = "none";
    }
    """

html = re.sub(r'function renderNav\(\) \{.*?\n    \}', nav_js, html, flags=re.DOTALL)

# Replace renderHistorial to support click
historial_js = """function renderHistorial(historial) {
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
        <div class="spm-hist-row spm-fade-in" style="cursor: pointer;" onclick="abrirModalCensurado('${(h.texto_censurado || '').replace(/'/g, "\\\\'")}')">
          <span style="font-weight:700;width:80px">${h.plataforma}</span>
          <span style="flex:1">${h.fecha}</span>
          <span style="margin-right: 12px;">${h.hora}</span>
          <i class="ti ti-chevron-right" style="color: #6A8099;"></i>
        </div>
      `).join("");
    }"""
html = re.sub(r'function renderHistorial\(historial\) \{.*?\n    \}', historial_js, html, flags=re.DOTALL)

# Remove unused functions safely by matching block
html = re.sub(r'async function fetchStats\(\) \{.*?\n    \}', '', html, flags=re.DOTALL)
html = re.sub(r'async function fetchPrompts\(\) \{.*?\n    \}', '', html, flags=re.DOTALL)
html = re.sub(r'function renderPrompts\(\) \{.*?\n    \}', '', html, flags=re.DOTALL)
html = re.sub(r'function renderDetail\(\) \{.*?\n    \}', '', html, flags=re.DOTALL)

# Replace init block
init_block = """// ── Inicialización ────────────────────────────
    renderNav();
    fetchHistorial();"""
html = re.sub(r'// ── Inicialización ────────────────────────────.*?fetchTags\(\);', init_block, html, flags=re.DOTALL)

with open('historial.html', 'w', encoding='utf-8') as f:
    f.write(html)
