import re

nav_js = """function renderNav() {
      const nav = document.getElementById("sidenav");
      nav.innerHTML = `
        <a href="dashboard.html" class="spm-nav-item ${activeNav === 'Dashboard' ? 'active' : ''}" style="text-decoration:none; color:inherit; display:block;" role="menuitem">Dashboard</a>
        <a href="prompts.html" class="spm-nav-item ${activeNav === 'Tus prompts' ? 'active' : ''}" style="text-decoration:none; color:inherit; display:block;" role="menuitem">Tus prompts</a>
        <a href="historial.html" class="spm-nav-item ${activeNav === 'Historial' ? 'active' : ''}" style="text-decoration:none; color:inherit; display:block;" role="menuitem">Historial</a>
        <a href="perfil.html" class="spm-nav-item ${activeNav === 'Perfil' ? 'active' : ''}" style="text-decoration:none; color:inherit; display:block;" role="menuitem">Perfil</a>
      `;
    }"""

def update_nav(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        html = f.read()
    # It replaces the renderNav function entirely
    new_html = re.sub(r'function renderNav\(\) \{.*?\n    \}', nav_js, html, flags=re.DOTALL)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_html)

update_nav('dashboard.html')
update_nav('prompts.html')
update_nav('historial.html')
update_nav('perfil.html')

print("Nav updated in all files")
