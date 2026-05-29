console.log("SecurePrompt: Background Iniciado.");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

    if (request.action === "analizarTexto") {

        fetch("http://127.0.0.1:8000/prompts/analizar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(request.payload)
        })
        .then(res => {
            if (!res.ok) throw new Error("Error HTTP " + res.status);
            return res.json();
        })
        .then(data => {

            sendResponse({ success: true, data: data });
        })
        .catch(err => {
            sendResponse({ success: false, error: err.message });
        });

        return true;
    }
});