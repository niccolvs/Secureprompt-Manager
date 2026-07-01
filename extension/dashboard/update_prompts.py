import re

with open('prompts.html', 'r', encoding='utf-8') as f:
    code = f.read()

# Make view-prompts visible by default
code = code.replace('<div id="view-prompts" style="display: none;', '<div id="view-prompts" style="display: flex;')

# Update renderNav logic
nav_js = '''
    function renderNav() {
      const nav = document.getElementById("sidenav");
      nav.innerHTML = `
        <a href="dashboard.html" class="spm-nav-item" style="text-decoration:none; color:inherit; display:block;" role="menuitem">Dashboard</a>
        <div class="spm-nav-item active" data-nav="Tus prompts" role="menuitem" tabindex="0">Tus prompts</div>
        <a href="dashboard.html?tab=historial" class="spm-nav-item" style="text-decoration:none; color:inherit; display:block;" role="menuitem">Historial</a>
        <a href="dashboard.html?tab=perfil" class="spm-nav-item" style="text-decoration:none; color:inherit; display:block;" role="menuitem">Perfil</a>
      `;
    }
'''
code = re.sub(r'function renderNav\(\) \{.*?\n    \}', nav_js, code, flags=re.DOTALL)

# Update fetchPrompts to always call renderFullPrompts
code = code.replace('if (activeNav === "Tus prompts") renderFullPrompts();', 'renderFullPrompts();')

# Remove fetchStats() calls in prompts.html as we don't have the stats UI here
code = code.replace('fetchStats();', '// fetchStats();')

# Remove empty views
code = re.sub(r'<!-- VISTA DASHBOARD -->.*?<!-- Fin VISTA DASHBOARD -->', '', code, flags=re.DOTALL)
code = re.sub(r'<!-- VISTA PERFIL -->.*?<!-- Fin VISTA PERFIL -->', '', code, flags=re.DOTALL)

# Write back
with open('prompts.html', 'w', encoding='utf-8') as f:
    f.write(code)
