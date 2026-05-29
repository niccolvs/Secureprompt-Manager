const API_URL = "http://127.0.0.1:8000";

document.addEventListener("DOMContentLoaded", () => {
    obtenerPrompts();
    configurarEnlaces();
});

async function obtenerPrompts() {
    const listaContenedor = document.getElementById("prompts-lista");

    try {
        const response = await fetch(`${API_URL}/prompts`);
        if (!response.ok) throw new Error("Error al conectar con la API");

        const data = await response.json();
        const prompts = data.prompts;

        listaContenedor.innerHTML = "";

        if (prompts.length === 0) {
            listaContenedor.innerHTML = '<div class="loading">No tienes prompts guardados todavía.</div>';
            return;
        }

        prompts.forEach(prompt => {
            const btnPrompt = document.createElement("button");
            btnPrompt.className = "prompt-item";
            btnPrompt.innerHTML = `
                <div class="prompt-item-title">${prompt.titulo}</div>
                <div class="prompt-item-category">${prompt.categoria}</div>
            `;

            btnPrompt.onclick = () => {
                navigator.clipboard.writeText(prompt.contenido);

                const tituloOriginal = prompt.titulo;
                const tituloElement = btnPrompt.querySelector(".prompt-item-title");
                tituloElement.textContent = "¡Copiado con éxito! ✅";
                tituloElement.style.color = "#24c491";

                setTimeout(() => {
                    tituloElement.textContent = tituloOriginal;
                    tituloElement.style.color = "#f0f4f8";
                }, 1000);
            };

            listaContenedor.appendChild(btnPrompt);
        });

    } catch (error) {
        console.error(error);
        listaContenedor.innerHTML = '<div class="error-msg">⚠️ No se pudo conectar al servidor. Asegúrate de iniciar FastAPI.</div>';
    }
}

function configurarEnlaces() {
    document.getElementById("btn-abrir-dashboard").onclick = () => {
        chrome.tabs.create({ url: chrome.runtime.getURL("dashboard/dashboard.html") });
    };
}