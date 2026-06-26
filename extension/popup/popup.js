document.addEventListener('DOMContentLoaded', () => {
  const btnTheme = document.getElementById('btn-theme');
  const body = document.body;
  const logo = document.querySelector('.logo-img');

  // Recuperar preferencia de tema si existe
  const currentTheme = localStorage.getItem('spm_theme');
  if (currentTheme === 'dark') {
    enableDarkMode();
  }

  btnTheme.addEventListener('click', () => {
    if (body.classList.contains('dark-mode')) {
      disableDarkMode();
    } else {
      enableDarkMode();
    }
  });

  function enableDarkMode() {
    document.documentElement.classList.add('dark-mode');
    body.classList.add('dark-mode');
    btnTheme.classList.replace('ti-moon', 'ti-sun');
    logo.src = '../assets/logo/SPM_logo_claro.png';
    localStorage.setItem('spm_theme', 'dark');
  }

  function disableDarkMode() {
    document.documentElement.classList.remove('dark-mode');
    body.classList.remove('dark-mode');
    btnTheme.classList.replace('ti-sun', 'ti-moon');
    logo.src = '../assets/logo/SPM_logo_oscuro.png';
    localStorage.setItem('spm_theme', 'light');
  }

  // ── Lógica del toggle de protección ──
  const protectionToggle = document.getElementById('protection-toggle');
  const statusText = document.getElementById('status-text');
  const statusCard = document.getElementById('status-card');

  // Recuperar estado de protección (por defecto Activo = true)
  const isProtected = localStorage.getItem('spm_protection') !== 'false';
  protectionToggle.checked = isProtected;
  updateProtectionUI(isProtected);

  protectionToggle.addEventListener('change', (e) => {
    const active = e.target.checked;
    localStorage.setItem('spm_protection', active);
    updateProtectionUI(active);
  });

  function updateProtectionUI(active) {
    if (active) {
      statusText.textContent = 'Activo';
      statusText.classList.remove('inactive');
      statusCard.classList.remove('inactive');
    } else {
      statusText.textContent = 'Inactivo';
      statusText.classList.add('inactive');
      statusCard.classList.add('inactive');
    }
  }

  // ── Lógica de botones inferiores ──
  document.getElementById('btn-reload').addEventListener('click', () => {
    // Si estuviéramos en una extensión real, usaríamos chrome.runtime.reload()
    window.location.reload();
  });

  document.getElementById('btn-dashboard').addEventListener('click', () => {
    window.open('../dashboard/dashboard.html', '_blank');
  });
});
