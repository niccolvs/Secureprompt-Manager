// login.js — Autenticación con email/contraseña y Google

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
auth.onAuthStateChanged((user) => {
  if (user) {
    window.location.href = "dashboard.html";
  }
});

// ── Mostrar mensajes de error ─────────────────────
function mostrarError(mensaje) {
  errorMsg.textContent = mensaje;
  setTimeout(() => { errorMsg.textContent = ""; }, 4000);
}

// ── Login con email y contraseña ──────────────────
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = inputEmail.value.trim();
  const password = inputPassword.value.trim();

  if (!email || !password) {
    mostrarError("Por favor completa todos los campos");
    return;
  }

  try {
    document.getElementById("btn-submit").textContent = "Cargando...";
    document.getElementById("btn-submit").disabled = true;

    await auth.signInWithEmailAndPassword(email, password);
  } catch (error) {
    switch (error.code) {
      case "auth/user-not-found": mostrarError("No existe una cuenta con ese email"); break;
      case "auth/wrong-password": mostrarError("Contraseña incorrecta"); break;
      case "auth/invalid-email": mostrarError("El email no es válido"); break;
      case "auth/too-many-requests": mostrarError("Demasiados intentos, intenta más tarde"); break;
      default: mostrarError("Error: " + error.message);
    }
    document.getElementById("btn-submit").textContent = "Login";
    document.getElementById("btn-submit").disabled = false;
  }
});

// ── Login con Google (Corregido y plano) ──────────
btnGoogle.addEventListener("click", async () => {
  try {
    btnGoogle.disabled = true;
    btnGoogle.textContent = "Redirigiendo...";

    // Ejecución directa de redirección, sin funciones anidadas
    await auth.signInWithRedirect(provider);

  } catch (error) {
    console.error("Error crítico con Google:", error);
    mostrarError("Error con Google: " + error.message);
    btnGoogle.disabled = false;
    btnGoogle.textContent = "Inicia sesión con Google";
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