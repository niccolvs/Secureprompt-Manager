// Guard: redirige a login si no hay sesión activa -->
    const _cfg = {
      apiKey: "AIzaSyCfJornBnJQnMU0r2qjBOUTTjG2i82ATgw",
      authDomain: "prompt-manager-1f2c5.firebaseapp.com",
      projectId: "prompt-manager-1f2c5",
      storageBucket: "prompt-manager-1f2c5.firebasestorage.app",
      messagingSenderId: "1059291715077",
      appId: "1:1059291715077:web:580fd43dfe54888f9f2e6c"
    };
    firebase.initializeApp(_cfg);
    const _auth = firebase.auth();
    const _storage = firebase.storage();

    // Ocultar el body hasta confirmar sesión (evita flash de contenido)
    document.documentElement.style.visibility = "hidden";

    _auth.onAuthStateChanged((user) => {
      if (!user) {
        // No hay sesión → volver al login
        window.location.replace("login.html");
      } else {
        // Hay sesión → poblar datos del usuario
        const firstName = (user.displayName || user.email).split(/[ @]/)[0];
        const initials = (user.displayName || user.email)
          .split(" ").slice(0, 2).map(w => w[0].toUpperCase()).join("");

        document.getElementById("greeting").textContent = `Hola, ${firstName}!`;
        document.getElementById("user-name").textContent = user.displayName || user.email;
        document.getElementById("user-email").textContent = user.email;

        // Perfil grande
        document.getElementById("profile-name").textContent = user.displayName || user.email;
        document.getElementById("profile-email-lbl").textContent = user.email;

        const avatarEl = document.getElementById("user-avatar");
        const profileAvatarEl = document.getElementById("profile-avatar");
        if (user.photoURL) {
          const imgHtml = `<img src="${user.photoURL}" alt="Foto de ${firstName}" style="width:100%;height:100%;object-fit:cover;">`;
          avatarEl.innerHTML = imgHtml;
          profileAvatarEl.innerHTML = imgHtml;
          profileAvatarEl.classList.remove("avatar-initials");
        } else {
          avatarEl.textContent = initials;
          profileAvatarEl.textContent = initials;
          profileAvatarEl.classList.add("avatar-initials");
        }

        // Mostrar el dashboard
        document.documentElement.style.visibility = "";
      }
    });