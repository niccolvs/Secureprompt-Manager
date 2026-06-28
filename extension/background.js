// background.js — Service Worker de SecurePrompt Manager
// Actúa como puente entre el content script y el backend FastAPI

const API_BASE = "http://127.0.0.1:8000";

// Detectar plataforma según la URL del tab
function detectarPlataforma(url) {
  if (!url) return "Desconocido";
  if (url.includes("chatgpt.com") || url.includes("chat.openai.com")) return "ChatGPT";
  if (url.includes("claude.ai")) return "Claude";
  if (url.includes("gemini.google.com")) return "Gemini";
  if (url.includes("chat.deepseek.com")) return "DeepSeek";
  if (url.includes("manus.im")) return "Manus";
  return "Otro";
}

// Registrar evento en el historial del backend
function registrarHistorial(plataforma, texto_censurado) {
  fetch(`${API_BASE}/historial`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plataforma, accion: "analisis", texto_censurado }),
  }).catch((err) => console.error("SecurePrompt: Error registrando historial:", err));
}

// Escuchar mensajes del content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "analizarTexto") {
    const { titulo, contenido, categoria } = message.payload;
    const plataforma = detectarPlataforma(sender.tab?.url);

    fetch(`${API_BASE}/prompts/analizar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo, contenido, categoria }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        // Registrar en historial tras análisis exitoso
        registrarHistorial(plataforma, contenido);
        sendResponse({ success: true, data });
      })
      .catch((err) => {
        console.error("SecurePrompt background error:", err);
        sendResponse({ success: false, error: err.message });
      });

    // Retornar true indica que sendResponse se llamará de forma asíncrona
    return true;
  }
});

console.log("SecurePrompt: Service Worker cargado");
