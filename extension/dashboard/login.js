// login.js — Autenticación con email/contraseña y Google
// Firebase maneja toda la autenticación

// ── Configuración de Firebase ─────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyCfJornBnJQnMU0r2qjBOUTTjG2i82ATgw",
  authDomain: "prompt-manager-1f2c5.firebaseapp.com",
  projectId: "prompt-manager-1f2c5",
  storageBucket: "prompt-manager-1f2c5.firebasestorage.app",
  messagingSenderId: "1059291715077",
  appId: "1:1059291715077:web:580fd43dfe54888f9f2e6c"
};


// ── Inicializar Firebase ──────────────────────────
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

// ── Referencias a elementos del DOM ──────────────
const errorMsg = document.getElementById("error-msg");
const btnGoogle = document.getElementById("btn-google");
const btnForgot = document.getElementById("btn-forgot");
const loginForm = document.getElementById("login-form");
const inputEmail = document.getElementById("input-email");
const inputPassword = document.getElementById("input-password");

// ── Verificar si ya está autenticado ──────────────
// Si el usuario ya inició sesión lo manda al dashboard
auth.onAuthStateChanged((user) => {
  if (user) {
    chrome.storage.local.set({ user_id: user.uid }, () => {
      window.location.href = "dashboard.html";
    });
  }
});

// ── Mostrar mensajes de error ─────────────────────
function mostrarError(mensaje) {
  errorMsg.textContent = mensaje;
  setTimeout(() => { errorMsg.textContent = ""; }, 4000);
}

// ── Login con email y contraseña ──────────────────
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault(); // Evitar que el formulario recargue la página

  const email = inputEmail.value.trim();
  const password = inputPassword.value.trim();

  if (!email || !password) {
    mostrarError("Por favor completa todos los campos");
    return;
  }

  try {
    // Deshabilitar botón mientras carga
    document.getElementById("btn-submit").textContent = "Cargando...";
    document.getElementById("btn-submit").disabled = true;

    await auth.signInWithEmailAndPassword(email, password);
    // onAuthStateChanged detectará el cambio y redirigirá al dashboard

  } catch (error) {
    // Traducir errores de Firebase al español
    switch (error.code) {
      case "auth/user-not-found":
        mostrarError("No existe una cuenta con ese email");
        break;
      case "auth/wrong-password":
        mostrarError("Contraseña incorrecta");
        break;
      case "auth/invalid-email":
        mostrarError("El email no es válido");
        break;
      case "auth/too-many-requests":
        mostrarError("Demasiados intentos, intenta más tarde");
        break;
      default:
        mostrarError("Error: " + error.message);
    }

    document.getElementById("btn-submit").textContent = "Login";
    document.getElementById("btn-submit").disabled = false;
  }
});

// ── Login con Google ──────────────────────────────
// Detecta si corre como extension (usa chrome.identity) o navegador normal (popup)
const GOOGLE_CLIENT_ID = "1059291715077-j8fsb70pi3f2i07qcd4oh7dn485s0qis.apps.googleusercontent.com";

const GOOGLE_SVG = `
  <svg viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
  Inicia sesión con Google`;

function restaurarBtnGoogle() {
  btnGoogle.classList.remove("loading");
  btnGoogle.innerHTML = GOOGLE_SVG;
}

btnGoogle.addEventListener("click", async () => {
  btnGoogle.classList.add("loading");
  btnGoogle.innerHTML = `<span class="google-loader"></span> Conectando...`;

  const isExtension = typeof chrome !== "undefined"
    && chrome.runtime?.id
    && typeof chrome.identity !== "undefined";

  try {
    if (isExtension) {
      // ── Modo extension: chrome.identity.launchWebAuthFlow ──────────────
      const redirectUri = `https://${chrome.runtime.id}.chromiumapp.org/`;
      const nonce = Math.random().toString(36).substring(2);

      const authUrl = new URL("https://accounts.google.com/o/oauth2/auth");
      authUrl.searchParams.set("client_id",     GOOGLE_CLIENT_ID);
      authUrl.searchParams.set("response_type", "id_token");
      authUrl.searchParams.set("redirect_uri",  redirectUri);
      authUrl.searchParams.set("scope",         "openid email profile");
      authUrl.searchParams.set("nonce",         nonce);

      const responseUrl = await new Promise((resolve, reject) => {
        chrome.identity.launchWebAuthFlow(
          { url: authUrl.toString(), interactive: true },
          (url) => {
            if (chrome.runtime.lastError || !url) {
              reject(new Error(chrome.runtime.lastError?.message || "Cancelado por el usuario"));
            } else {
              resolve(url);
            }
          }
        );
      });

      const params  = new URLSearchParams(new URL(responseUrl).hash.slice(1));
      const idToken = params.get("id_token");
      if (!idToken) throw new Error("No se recibio token de Google.");

      const credential = firebase.auth.GoogleAuthProvider.credential(idToken);
      await auth.signInWithCredential(credential);

    } else {
      // ── Modo navegador normal: signInWithPopup ──────────────────────────
      await auth.signInWithPopup(provider);
    }
    // onAuthStateChanged detectara el cambio y redirigira

  } catch (error) {
    if (error.code === "auth/popup-closed-by-user" || error.message === "Cancelado por el usuario") {
      mostrarError("Cerraste la ventana de Google");
    } else if (error.code !== "auth/cancelled-popup-request") {
      mostrarError("Error con Google: " + error.message);
    }
    restaurarBtnGoogle();
  }
});

// ── Recuperar contraseña ──────────────────────────
btnForgot.addEventListener("click", async (e) => {
  e.preventDefault();

  const email = inputEmail.value.trim();

  if (!email) {
    mostrarError("Ingresa tu email primero para recuperar tu contraseña");
    return;
  }

  try {
    await auth.sendPasswordResetEmail(email);
    errorMsg.style.color = "#38a169";
    errorMsg.textContent = "✅ Email de recuperación enviado, revisa tu bandeja";
    setTimeout(() => {
      errorMsg.textContent = "";
      errorMsg.style.color = "#e53e3e";
    }, 5000);
  } catch (error) {
    mostrarError("No existe una cuenta con ese email");
  }
});