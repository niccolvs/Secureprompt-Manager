// background.js — Service Worker de SecurePrompt Manager
const API_BASE = "http://127.0.0.1:8000";

function detectarPlataforma(url) {
  if (!url) return "Desconocido";
  if (url.includes("chatgpt.com") || url.includes("chat.openai.com")) return "ChatGPT";
  if (url.includes("claude.ai")) return "Claude";
  if (url.includes("gemini.google.com")) return "Gemini";
  if (url.includes("chat.deepseek.com")) return "DeepSeek";
  if (url.includes("manus.im")) return "Manus";
  return "Otro";
}

function registrarHistorial(plataforma, texto_censurado) {
  chrome.storage.local.get("user_id", (result) => {
    const user_id = result.user_id || "";
    console.log("Registrando historial para user_id:", user_id);
    fetch(`${API_BASE}/historial`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id, plataforma, accion: "analisis", texto_censurado }),
    }).catch((err) => console.error("SecurePrompt: Error registrando historial:", err));
  });
}
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
        registrarHistorial(plataforma, contenido);
        sendResponse({ success: true, data });
      })
      .catch((err) => {
        console.error("SecurePrompt background error:", err);
        sendResponse({ success: false, error: err.message });
      });

    return true;
  }

  if (message.action === "registrarHistorial") {
    const { plataforma, accion, texto_censurado } = message.payload;
    registrarHistorial(plataforma, texto_censurado);
    return false;
  }
});

console.log("SecurePrompt: Service Worker cargado");