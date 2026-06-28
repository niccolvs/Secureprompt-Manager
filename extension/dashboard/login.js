// login.js — Autenticación con Google y Email/Password via Firebase

// ── Configuración de Firebase ─────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyCfJornBnJQnMU0r2qjBOUTTjG2i82ATgw",
  authDomain: "prompt-manager-1f2c5.firebaseapp.com",
  projectId: "prompt-manager-1f2c5",
  storageBucket: "prompt-manager-1f2c5.firebasestorage.app",
  messagingSenderId: "1059291715077",
  appId: "1:1059291715077:web:580fd43dfe54888f9f2e6c"
};

// ID de cliente OAuth de tu proyecto (Google Cloud Console)
// Consola Firebase → Configuración del proyecto → General → Tus apps → OAuth 2.0
// También en: console.cloud.google.com → APIs → Credenciales → ID de cliente web
const GOOGLE_CLIENT_ID = "1059291715077-j8fsb70pi3f2i07qcd4oh7dn485s0qis.apps.googleusercontent.com";

// ── Inicializar Firebase ──────────────────────────
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// ── Helper: mostrar error ─────────────────────────
function showError(msg) {
  let el = document.getElementById("error-msg");
  if (!el) {
    el = document.createElement("p");
    el.id = "error-msg";
    el.style.cssText = "color:#c0392b;font-size:13px;text-align:center;margin-top:12px";
    document.querySelector(".form-wrapper").appendChild(el);
  }
  el.textContent = msg;
}

function clearError() {
  const el = document.getElementById("error-msg");
  if (el) el.textContent = "";
}

// ── Verificar si ya está autenticado ──────────────
// Si el usuario ya inició sesión antes lo mandamos
// directo al dashboard sin pasar por el login
auth.onAuthStateChanged((user) => {
  if (user) {
    window.location.href = "dashboard.html";
  }
});

// ── Formulario Email / Contraseña ─────────────────
document.querySelector("form").addEventListener("submit", async (e) => {
  e.preventDefault();
  clearError();

  const email    = document.querySelector('input[type="email"]').value.trim();
  const password = document.querySelector('input[type="password"]').value;

  try {
    await auth.signInWithEmailAndPassword(email, password);
    // onAuthStateChanged detectará el cambio y redirigirá
  } catch (error) {
    showError("Error al iniciar sesión: " + error.message);
  }
});

// ── Botón Google ─────────────────────────────────
// Detecta si corre como extensión de Chrome o en navegador normal
document.querySelector(".btn-google").addEventListener("click", async () => {
  clearError();

  const btnGoogle = document.querySelector(".btn-google");
  const originalHtml = btnGoogle.innerHTML;
  btnGoogle.classList.add("loading");
  btnGoogle.innerHTML = `<span class="google-loader"></span> Conectando con Google...`;

  const isExtension = typeof chrome !== "undefined"
    && chrome.runtime
    && chrome.runtime.id
    && typeof chrome.identity !== "undefined";

  try {
    if (isExtension) {
      // ── Modo extensión: chrome.identity.launchWebAuthFlow ──
      const redirectUri = `https://${chrome.runtime.id}.chromiumapp.org/`;
      const nonce = Math.random().toString(36).substring(2);

      const authUrl = new URL("https://accounts.google.com/o/oauth2/auth");
      authUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
      authUrl.searchParams.set("response_type", "id_token");
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("scope", "openid email profile");
      authUrl.searchParams.set("nonce", nonce);

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

      const params = new URLSearchParams(new URL(responseUrl).hash.slice(1));
      const idToken = params.get("id_token");
      if (!idToken) throw new Error("No se recibió token de Google.");

      const credential = firebase.auth.GoogleAuthProvider.credential(idToken);
      await auth.signInWithCredential(credential);

    } else {
      // ── Modo navegador (Live Server / http) : signInWithPopup ──
      const provider = new firebase.auth.GoogleAuthProvider();
      await auth.signInWithPopup(provider);
    }
    // onAuthStateChanged detectará el cambio y redirigirá

  } catch (error) {
    showError("Error con Google: " + error.message);
    btnGoogle.classList.remove("loading");
    btnGoogle.innerHTML = originalHtml;
  }
});