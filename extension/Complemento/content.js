console.log("1 SecurePrompt: Modo automático V5 activado (Delegación a Background)");

const textareaSelector = '#prompt-textarea';
let timeoutId = null;
let isProcessing = false;

const observer = new MutationObserver(() => {
    const cajaTexto = document.querySelector(textareaSelector);

    if (cajaTexto && !cajaTexto.dataset.securePromptAttached) {
        cajaTexto.dataset.securePromptAttached = "true";
        console.log("1 SecurePrompt: Escuchando la caja de texto...");

        ['input', 'keyup'].forEach(eventType => {
            cajaTexto.addEventListener(eventType, (e) => {
                if (isProcessing) return;

                const textoOriginal = cajaTexto.value !== undefined ? cajaTexto.value : cajaTexto.innerText;
                if (!textoOriginal || textoOriginal.trim() === "") return;

                clearTimeout(timeoutId);

                timeoutId = setTimeout(() => {
                    console.log("2 SecurePrompt: Solicitando análisis al background script...");

                    chrome.runtime.sendMessage(
                        {
                            action: "analizarTexto",
                            payload: {
                                titulo: "Auto-Prompt",
                                contenido: textoOriginal,
                                categoria: "Chat"
                            }
                        },
                        (response) => {
                            if (chrome.runtime.lastError) {
                                console.error("-1 SecurePrompt: Error de comunicación interna.", chrome.runtime.lastError.message);
                                return;
                            }

                            if (!response.success) {
                                console.error("-1 SecurePrompt: Error en la API local.", response.error);
                                return;
                            }

                            const textoLimpio = response.data.analisis.texto_limpio;
                            console.log("2 SecurePrompt: Respuesta recibida ->", textoLimpio);

                            if (textoOriginal !== textoLimpio) {
                                isProcessing = true;

                                cajaTexto.focus();
                                document.execCommand('selectAll', false, null);
                                document.execCommand('insertText', false, textoLimpio);

                                setTimeout(() => { isProcessing = false; }, 100);
                                console.log("1 SecurePrompt: ¡Censurado automáticamente!");
                            } else {
                                console.log("0 SecurePrompt: Sin datos sensibles, texto intacto.");
                            }
                        }
                    );
                }, 800);
            });
        });
    }
});

observer.observe(document.body, { childList: true, subtree: true });