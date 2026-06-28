import re

with open('dashboard.html', 'r', encoding='utf-8') as f:
    html = f.read()

# For perfil, we want to keep ONLY VISTA PERFIL, replacing VISTA DASHBOARD.
perfil_regex = re.compile(r'<!-- VISTA DASHBOARD -->.*?<!-- VISTA PERFIL -->', re.DOTALL)
html = perfil_regex.sub('<!-- VISTA PERFIL -->', html)

# Then we remove the `display: none` from view-perfil
html = html.replace('<div id="view-perfil" style="display: none; align-items: center; justify-content: center; gap: 60px; flex: 1;">', '<div id="view-perfil" style="display: flex; align-items: center; justify-content: center; gap: 60px; flex: 1;">')

# Ensure activeNav is correct
html = re.sub(r'let activeNav = "Dashboard";', 'let activeNav = "Perfil";', html)

# Remove unused functions
html = re.sub(r'async function fetchStats\(\) \{.*?\n    \}', '', html, flags=re.DOTALL)
html = re.sub(r'async function fetchPrompts\(\) \{.*?\n    \}', '', html, flags=re.DOTALL)
html = re.sub(r'function renderPrompts\(\) \{.*?\n    \}', '', html, flags=re.DOTALL)
html = re.sub(r'function renderDetail\(\) \{.*?\n    \}', '', html, flags=re.DOTALL)
html = re.sub(r'function fetchHistorial\(\) \{.*?\n    \}', '', html, flags=re.DOTALL)
html = re.sub(r'function renderHistorial\(historial\) \{.*?\n    \}', '', html, flags=re.DOTALL)

# Replace init block
init_block = """// ── Inicialización ────────────────────────────
    renderNav();"""
html = re.sub(r'// ── Inicialización ────────────────────────────.*?fetchTags\(\);', init_block, html, flags=re.DOTALL)

with open('perfil.html', 'w', encoding='utf-8') as f:
    f.write(html)
