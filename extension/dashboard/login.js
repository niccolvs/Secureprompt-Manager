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

// ── Inicializar Firebase ──────────────────────────
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

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

// ── Botón Google ──────────────────────────────────
document.querySelector(".btn-google").addEventListener("click", async () => {
  clearError();
  try {
    await auth.signInWithPopup(provider);
    // onAuthStateChanged detectará el cambio y redirigirá
  } catch (error) {
    showError("Error con Google: " + error.message);
  }
});