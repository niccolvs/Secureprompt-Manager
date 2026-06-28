import re

common_js = """<script>
    const API_URL = "http://127.0.0.1:8000";
    let activeNav = "___ACTIVE_NAV___";

    function renderNav() {
      const nav = document.getElementById("sidenav");
      if (!nav) return;
      nav.innerHTML = `
        <a href="dashboard.html" class="spm-nav-item ${activeNav === 'Dashboard' ? 'active' : ''}" style="text-decoration:none; color:inherit; display:block;" role="menuitem">Dashboard</a>
        <a href="prompts.html" class="spm-nav-item ${activeNav === 'Tus prompts' ? 'active' : ''}" style="text-decoration:none; color:inherit; display:block;" role="menuitem">Tus prompts</a>
        <a href="historial.html" class="spm-nav-item ${activeNav === 'Historial' ? 'active' : ''}" style="text-decoration:none; color:inherit; display:block;" role="menuitem">Historial</a>
        <a href="perfil.html" class="spm-nav-item ${activeNav === 'Perfil' ? 'active' : ''}" style="text-decoration:none; color:inherit; display:block;" role="menuitem">Perfil</a>
      `;
    }

    // ── Tema Oscuro ──────────────────────────────
    const themeToggle = document.getElementById("theme-toggle");
    if (themeToggle) {
        if (localStorage.getItem("theme") === "dark") {
          document.body.classList.add("dark-mode");
          themeToggle.classList.remove("ti-moon");
          themeToggle.classList.add("ti-sun");
        }
        themeToggle.addEventListener("click", () => {
          document.body.classList.toggle("dark-mode");
          const isDark = document.body.classList.contains("dark-mode");
          localStorage.setItem("theme", isDark ? "dark" : "light");
          if (isDark) {
            themeToggle.classList.remove("ti-moon");
            themeToggle.classList.add("ti-sun");
          } else {
            themeToggle.classList.remove("ti-sun");
            themeToggle.classList.add("ti-moon");
          }
        });
    }
    
    // ── Auth y Header ────────────────────────────
    if (typeof firebase !== 'undefined') {
        const _auth = firebase.auth();
        _auth.onAuthStateChanged(user => {
            if (!user) {
              window.location.replace("login.html");
            } else {
              let firstName = "Usuario";
              if (user.displayName) {
                firstName = user.displayName.split(" ")[0];
              }
              const greetingEl = document.getElementById("greeting");
              if (greetingEl) greetingEl.textContent = `Hola, ${firstName}!`;
              
              const nameEl = document.getElementById("user-name");
              if (nameEl) nameEl.textContent = user.displayName || user.email;
              
              const emailEl = document.getElementById("user-email");
              if (emailEl) emailEl.textContent = user.email;
              
              if (user.photoURL) {
                const imgHtml = `<img src="${user.photoURL}" alt="Foto" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
                const topAvatar = document.getElementById("user-avatar");
                if (topAvatar) topAvatar.innerHTML = imgHtml;
                const profileAvatar = document.getElementById("profile-avatar");
                if (profileAvatar) profileAvatar.innerHTML = imgHtml;
              }
            }
        });
        
        const btnLogout = document.getElementById("btn-logout");
        if (btnLogout) {
            btnLogout.addEventListener("click", () => {
              _auth.signOut().then(() => window.location.replace("login.html"));
            });
        }
    }
"""

historial_js = """
    function abrirModalCensurado(texto) {
      document.getElementById("censurado-contenido").value = texto || 'No hay texto censurado registrado.';
      document.getElementById("modal-censurado").style.display = "flex";
    }
    function cerrarModalCensurado() {
      document.getElementById("modal-censurado").style.display = "none";
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

    function renderHistorial(historial) {
      const panel = document.getElementById("historial-panel");
      if (!panel) return;
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
    }

    async function borrarHistorial() {
      if (!confirm("¿Quieres borrar el historial?")) return;
      try {
        const res = await fetch(`${API_URL}/historial`, { method: "DELETE" });
        if (res.ok) fetchHistorial();
      } catch (err) {
        console.error("Error al borrar historial:", err);
      }
    }

    renderNav();
    fetchHistorial();
  </script>
</body>
</html>
"""

perfil_js = """
    const btnCamera = document.getElementById("btn-camera");
    const avatarUpload = document.getElementById("avatar-upload");
    if (btnCamera && avatarUpload) {
        btnCamera.addEventListener("click", () => avatarUpload.click());
        avatarUpload.addEventListener("change", async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          const user = firebase.auth().currentUser;
          if (!user) return;
          try {
            const profileAvatarEl = document.getElementById("profile-avatar");
            const topAvatarEl = document.getElementById("user-avatar");
            profileAvatarEl.innerHTML = '<i class="ti ti-loader" style="animation: spin 1s linear infinite;"></i>';
            const storageRef = firebase.storage().ref();
            const avatarRef = storageRef.child(`avatars/${user.uid}`);
            await avatarRef.put(file);
            const downloadURL = await avatarRef.getDownloadURL();
            await user.updateProfile({ photoURL: downloadURL });
            const imgHtml = `<img src="${downloadURL}" alt="Foto" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
            profileAvatarEl.innerHTML = imgHtml;
            profileAvatarEl.classList.remove("avatar-initials");
            if (topAvatarEl) topAvatarEl.innerHTML = imgHtml;
          } catch (error) {
            console.error("Error al subir imagen:", error);
            alert("Hubo un error al subir la imagen.");
          }
        });
    }

    renderNav();
  </script>
</body>
</html>
"""

def inject(fname, script):
    with open(fname, 'r', encoding='utf-8') as f:
        html = f.read()
    # Find </body> and replace from there
    html = re.sub(r'</body>\s*</html>', script, html)
    with open(fname, 'w', encoding='utf-8') as f:
        f.write(html)

inject('historial.html', common_js.replace('___ACTIVE_NAV___', 'Historial') + historial_js)
inject('perfil.html', common_js.replace('___ACTIVE_NAV___', 'Perfil') + perfil_js)
