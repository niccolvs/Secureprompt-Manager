// login.js — Autenticación con Google via Firebase
// Mismo Firebase que usamos en la app Android

// ── Configuración de Firebase ─────────────────────
// Estos datos los encuentras en Firebase Console
// Configuración del proyecto → General → Tu app web
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

// ── Verificar si ya está autenticado ──────────────
// Si el usuario ya inició sesión antes lo mandamos
// directo al dashboard sin pasar por el login
auth.onAuthStateChanged((user) => {
  if (user) {
    window.location.href = "dashboard.html";
  }
});

// ── Botón Google ──────────────────────────────────
document.getElementById("btn-google").addEventListener("click", async () => {
  const errorMsg = document.getElementById("error-msg");
  errorMsg.textContent = "";

  try {
    await auth.signInWithPopup(provider);
    // onAuthStateChanged detectará el cambio y redirigirá
  } catch (error) {
    errorMsg.textContent = "Error al iniciar sesión: " + error.message;
  }
});