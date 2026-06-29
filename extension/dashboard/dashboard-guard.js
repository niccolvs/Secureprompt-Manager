// dashboard-guard.js
// Inicializa Firebase y redirige a login si no hay sesion activa.
// Las variables _auth y _storage quedan en el scope global
// para que dashboard-main.js pueda usarlas.

const _cfg = {
  apiKey: "AIzaSyCfJornBnJQnMU0r2qjBOUTTjG2i82ATgw",
  authDomain: "prompt-manager-1f2c5.firebaseapp.com",
  projectId: "prompt-manager-1f2c5",
  storageBucket: "prompt-manager-1f2c5.firebasestorage.app",
  messagingSenderId: "1059291715077",
  appId: "1:1059291715077:web:580fd43dfe54888f9f2e6c"
};

firebase.initializeApp(_cfg);
const _auth    = firebase.auth();
const _storage = firebase.storage();

// Ocultar el body hasta confirmar sesion (evita flash de contenido)
document.documentElement.style.visibility = "hidden";

_auth.onAuthStateChanged((user) => {
  if (!user) {
    window.location.replace("login.html");
    return;
  }

  chrome.storage.local.set({ user_id: user.uid });

  const firstName = (user.displayName || user.email).split(/[ @]/)[0];
  const initials  = (user.displayName || user.email)
    .split(" ").slice(0, 2).map(w => w[0].toUpperCase()).join("");

  const greetEl = document.getElementById("greeting");
  if (greetEl) greetEl.textContent = `Hola, ${firstName}!`;

  const nameEl = document.getElementById("user-name");
  if (nameEl) nameEl.textContent = user.displayName || user.email;

  const emailEl = document.getElementById("user-email");
  if (emailEl) emailEl.textContent = user.email;

  const profileNameEl = document.getElementById("profile-name");
  if (profileNameEl) profileNameEl.textContent = user.displayName || user.email;

  const profileEmailEl = document.getElementById("profile-email-lbl");
  if (profileEmailEl) profileEmailEl.textContent = user.email;

  const avatarEl        = document.getElementById("user-avatar");
  const profileAvatarEl = document.getElementById("profile-avatar");

  if (user.photoURL) {
    const imgHtml = `<img src="${user.photoURL}" alt="Foto de ${firstName}" style="width:100%;height:100%;object-fit:cover;">`;
    if (avatarEl)        avatarEl.innerHTML        = imgHtml;
    if (profileAvatarEl) profileAvatarEl.innerHTML = imgHtml;
    if (profileAvatarEl) profileAvatarEl.classList.remove("avatar-initials");
  } else {
    if (avatarEl)        avatarEl.textContent       = initials;
    if (profileAvatarEl) profileAvatarEl.textContent = initials;
    if (profileAvatarEl) profileAvatarEl.classList.add("avatar-initials");
  }

  document.documentElement.style.visibility = "";
});