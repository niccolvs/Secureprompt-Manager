console.log("SecurePrompt: Activado");

// Indicamos los selectores para poder encontrar la caja de texto en cada sitio especifico, antes de usar los genericos
const SELECTORES_POR_SITIO = {
    "chatgpt.com": ["#prompt-textarea"],
    "chat.openai.com": ["#prompt-textarea"],
    "claude.ai": ['div.ProseMirror[contenteditable="true"]', '[contenteditable="true"]'],
    "gemini.google.com": ['.ql-editor[contenteditable="true"]', 'div[contenteditable="true"]'],
    "chat.deepseek.com": ["#chat-input", "textarea"],
    "manus.im": ['[contenteditable="true"]', "textarea"],
};

const SELECTORES_GENERICOS = ['[contenteditable="true"]', "textarea"];

// Verificamos si la caja de texto es visible
function esVisible(el) {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && el.offsetParent !== null;
}

// Buscamos la caja en base a los selectores especificos, los genericos y los activos
function encontrarCajaTexto() {
    const host = window.location.hostname.replace(/^www\./, "");
    const selectores = SELECTORES_POR_SITIO[host] || [];

    for (const sel of [...selectores, ...SELECTORES_GENERICOS]) {
        for (const el of document.querySelectorAll(sel)) {
            if (esVisible(el)) return el;
        }
    }

    const activo = document.activeElement;
    if (activo && (activo.isContentEditable || activo.tagName === "TEXTAREA")) return activo;

    return [...document.querySelectorAll('textarea, [contenteditable="true"]')]
        .filter(esVisible)
        .sort((a, b) => {
            const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
            return (rb.width * rb.height) - (ra.width * ra.height);
        })[0] || null;
}

// Obtenemos el texto de la caja para poder anonimizarlo
function obtenerTexto(caja) {
    return (caja.tagName === "TEXTAREA" || caja.tagName === "INPUT")
        ? caja.value
        : caja.innerText;
}

// Establecemos el texto anonimizado en la caja, para poder reemplazarlo despues de analizarlo
function establecerTexto(caja, texto) {
    caja.focus();

    // Identificamos si es un textarea/input o un contenteditable, para establecer el texto de forma compatible con cada uno
    if (caja.tagName === "TEXTAREA" || caja.tagName === "INPUT") {
        const proto = caja.tagName === "TEXTAREA"
            ? window.HTMLTextAreaElement.prototype
            : window.HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(proto, "value").set.call(caja, texto);
        caja.dispatchEvent(new Event("input", { bubbles: true }));
        caja.dispatchEvent(new Event("change", { bubbles: true }));
        return;
    }

    // Intentamos insertar el texto
    const sel = window.getSelection();
    const rango = document.createRange();
    rango.selectNodeContents(caja);
    sel.removeAllRanges();
    sel.addRange(rango);
    const ok = document.execCommand("insertText", false, texto);

    if (!ok) {
        // En caso de que no funcione lo anterior, realizamos un fallback manual
        caja.innerHTML = "";
        const frag = document.createDocumentFragment();
        texto.split("\n").forEach((linea, i) => {
            if (i > 0) frag.appendChild(document.createElement("br"));
            frag.appendChild(document.createTextNode(linea));
        });
        caja.appendChild(frag);

        // Ahora, disparamos los eventos para que se detecten los cambios
        caja.dispatchEvent(new InputEvent("input", {
            bubbles: true,
            inputType: "insertText",
            data: texto,
        }));
        caja.dispatchEvent(new Event("change", { bubbles: true }));
    }
}


function crearPanel(mapaTokens, onRevertirPrompt) {
    if (document.getElementById("secure-prompt-panel")) return;

    // Fondo transparente para cerrar al hacer click fuera
    const overlay = document.createElement("div");
    overlay.id = "secure-prompt-panel-overlay";
    Object.assign(overlay.style, {
        position: "fixed", inset: "0", zIndex: "99998",
    });

    const panel = document.createElement("div");
    panel.id = "secure-prompt-panel";
    Object.assign(panel.style, {
        position: "fixed",
        bottom: "140px",
        right: "20px",
        width: "360px",
        backgroundColor: "#E6F0FA",
        borderRadius: "16px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
        zIndex: "99999",
        padding: "20px",
        color: "#1C2B3A",
        fontFamily: "system-ui, sans-serif",
        fontSize: "13px",
    });

    panel.innerHTML = `
        <div id="sp-panel-header" style="position:relative;margin-bottom:16px;cursor:grab;user-select:none;">
            <button id="sp-cerrar" style="position:absolute;top:0;right:0;background:none;border:none;color:#7A90A4;font-size:20px;cursor:pointer;padding:0;line-height:1;">&times;</button>
            <h3 style="margin:0 0 4px 0;font-size:20px;font-weight:700;color:#000000;pointer-events:none;">Gestor de censura</h3>
            <p style="margin:0;font-size:13px;color:#7A90A4;pointer-events:none;">Devuelve el texto original despu\u00e9s de la censura</p>
        </div>

        <label style="font-size:14px;font-weight:600;color:#1C2B3A;display:block;margin-bottom:8px;">
            Pega la respuesta del chat:
        </label>
        <textarea id="sp-input"
            style="width:100%;height:100px;background:#F4F8FB;border:1px solid #7A90A4;
                   border-radius:12px;color:#1C2B3A;padding:12px;font-size:13px;
                   resize:vertical;box-sizing:border-box;margin-bottom:12px;outline:none;font-family:inherit;"></textarea>

        <button id="sp-revertir-respuesta"
            style="width:100%;padding:12px;background:#3B5270;border:none;border-radius:24px;
                   color:white;font-weight:600;font-size:14px;cursor:pointer;margin-bottom:16px;font-family:inherit;">
            Revertir respuesta
        </button>

        <div id="sp-resultado-wrap" style="display:none;margin-bottom:16px;">
            <label style="font-size:14px;font-weight:600;color:#1C2B3A;display:block;margin-bottom:8px;">Resultado:</label>
            <textarea id="sp-resultado" readonly
                style="width:100%;height:100px;background:#F4F8FB;border:1px solid #7A90A4;
                       border-radius:12px;color:#1C2B3A;padding:12px;font-size:13px;
                       resize:vertical;box-sizing:border-box;margin-bottom:8px;outline:none;font-family:inherit;"></textarea>
            <button id="sp-copiar"
                style="width:100%;padding:12px;background:#A5BFD8;border:none;
                       border-radius:24px;color:#2C3D58;font-weight:600;cursor:pointer;font-size:14px;font-family:inherit;">
                Copiar resultado
            </button>
        </div>

        <hr style="border:none;border-top:1px solid #C0D4E8;margin:0 0 16px 0;">

        <div style="display:flex;justify-content:space-between;align-items:center;">
            <button id="sp-revertir-prompt"
                style="padding:8px 16px;background:#A5BFD8;border:none;
                       border-radius:20px;color:#3B5270;font-weight:600;cursor:pointer;font-size:13px;font-family:inherit;">
                Revertir tambi\u00e9n el prompt
            </button>
            <img src="${chrome.runtime.getURL('assets/logo/SPM_logo_extension.png')}" alt="Logo" style="width:32px;height:32px;border-radius:50%;object-fit:contain;">
        </div>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(panel);

    // Lógica para arrastrar el panel
    const header = panel.querySelector("#sp-panel-header");
    let isDraggingPanel = false;
    let dragStartX, dragStartY;
    let initialLeft, initialTop;

    header.addEventListener("mousedown", (e) => {
        if (e.target.id === "sp-cerrar") return;
        isDraggingPanel = true;
        header.style.cursor = "grabbing";
        dragStartX = e.clientX;
        dragStartY = e.clientY;

        const rect = panel.getBoundingClientRect();
        panel.style.bottom = "auto";
        panel.style.right = "auto";
        panel.style.left = rect.left + "px";
        panel.style.top = rect.top + "px";
        
        initialLeft = rect.left;
        initialTop = rect.top;
        e.preventDefault();
    });

    const onMouseMove = (e) => {
        if (!isDraggingPanel) return;
        const dx = e.clientX - dragStartX;
        const dy = e.clientY - dragStartY;
        panel.style.left = (initialLeft + dx) + "px";
        panel.style.top = (initialTop + dy) + "px";
    };

    const onMouseUp = () => {
        if (isDraggingPanel) {
            isDraggingPanel = false;
            header.style.cursor = "grab";
        }
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);

    const cerrar = () => { 
        overlay.remove(); 
        panel.remove(); 
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
    };
    overlay.addEventListener("click", cerrar);
    panel.querySelector("#sp-cerrar").addEventListener("click", cerrar);

    // Revertir la respuesta pegada
    panel.querySelector("#sp-revertir-respuesta").addEventListener("click", () => {
        const input = panel.querySelector("#sp-input").value;
        if (!input.trim()) return;

        let texto = input;
        for (const [token, datos] of Object.entries(mapaTokens)) {
            texto = texto.replaceAll(token, datos.valor_real);
        }

        panel.querySelector("#sp-resultado").value = texto;
        panel.querySelector("#sp-resultado-wrap").style.display = "block";
    });

    // Copiar resultado
    panel.querySelector("#sp-copiar").addEventListener("click", () => {
        navigator.clipboard.writeText(panel.querySelector("#sp-resultado").value).then(() => {
            const btn = panel.querySelector("#sp-copiar");
            btn.textContent = "\u2705 Copiado";
            setTimeout(() => { btn.textContent = "\uD83D\uDCCB Copiar resultado"; }, 1500);
        });
    });

    // Revertir el prompt original
    panel.querySelector("#sp-revertir-prompt").addEventListener("click", () => {
        onRevertirPrompt();
        cerrar();
    });
}

// Establecemos el boton flotante
function crearBotonFlotante() {
    if (document.getElementById("secure-prompt-global-btn")) return;

    const boton = document.createElement("button");
    boton.id = "secure-prompt-global-btn";

    // Creamos el contenido del boton, el logo y el texto
    const iconSpan = document.createElement("img");
    iconSpan.src = chrome.runtime.getURL("assets/logo/SPM_logo_extension.png");
    iconSpan.style.cssText = "width:44px;height:44px;object-fit:cover;border-radius:50%;pointer-events:none;flex-shrink:0;";

    const labelSpan = document.createElement("span");
    labelSpan.textContent = "Anonimizar";
    // Utilizamos style para poder centralizar los emojis y textos, sin que el "expandir" del boton lo malogre
    labelSpan.style.cssText = [
        "opacity:0",
        "max-width:0",
        "overflow:hidden",
        "white-space:nowrap",
        "font-size:13px",
        "font-weight:600",
        "margin-left:0",
        "transition:opacity 0.2s ease, max-width 0.25s ease, margin-left 0.25s ease",
    ].join(";");

    boton.appendChild(iconSpan);
    boton.appendChild(labelSpan);

    Object.assign(boton.style, {
        position: "fixed",
        bottom: "85px",
        right: "20px",
        backgroundColor: "#C0D4E8",
        color: "#1C2B3A",
        border: "none",
        width: "44px",
        height: "44px",
        borderRadius: "50%",
        cursor: "pointer",
        fontSize: "20px",
        zIndex: "99999",
        boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0",
        overflow: "hidden",
        userSelect: "none",
        transition: "width 0.25s ease, border-radius 0.25s ease, background-color 0.2s ease",
    });

    // Creamos las variables para póder realizar la reversion a los datos originales
    let mapaTokensActual = {};
    let estadoRevertible = false;
    let expandido = false;

    // Establecemos el estado expandido
    const expandir = () => {
        expandido = true;
        boton.style.width = "165px";
        boton.style.borderRadius = "25px";
        boton.style.backgroundColor = "#A5BFD8";
        boton.style.padding = "0 12px";
        iconSpan.style.width = "28px";
        iconSpan.style.height = "28px";
        labelSpan.style.opacity = "1";
        labelSpan.style.maxWidth = "130px";
        labelSpan.style.marginLeft = "6px";
    };

    // Establecemos el estado colapsado
    const colapsar = () => {
        expandido = false;
        boton.style.width = "44px";
        boton.style.borderRadius = "50%";
        boton.style.backgroundColor = "#C0D4E8";
        boton.style.padding = "0";
        iconSpan.style.width = "44px";
        iconSpan.style.height = "44px";
        labelSpan.style.opacity = "0";
        labelSpan.style.maxWidth = "0";
        labelSpan.style.marginLeft = "0";
    };

    // Permitimos que se pueda arrastrar por la pagina
    let arrastrando = false;
    let movidoPx = 0;
    let offsetX = 0;
    let offsetY = 0;

    boton.addEventListener("mousedown", (e) => {
        if (e.button !== 0) return;

        const startX = e.clientX;
        const startY = e.clientY;
        movidoPx = 0;

        const rect = boton.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;

        // Permitimos el movimiento
        const mover = (ev) => {
            movidoPx = Math.hypot(ev.clientX - startX, ev.clientY - startY);
            if (movidoPx > 5) {
                if (!arrastrando) {
                    arrastrando = true;
                    colapsar();
                    boton.style.transition = "none";
                    boton.style.right = "auto";
                    boton.style.bottom = "auto";
                }

                // Mantenemos un margen para poder moverlo, para que no se salga de la pagina
                const margen = 10;
                const x = Math.min(
                    Math.max(margen, ev.clientX - offsetX),
                    window.innerWidth - boton.offsetWidth - margen
                );
                const y = Math.min(
                    Math.max(margen, ev.clientY - offsetY),
                    window.innerHeight - boton.offsetHeight - margen
                );

                boton.style.left = x + "px";
                boton.style.top = y + "px";
            }
        };

        // Permitimos el poder soltar, para que se retraiga el boton
        const soltar = () => {
            document.removeEventListener("mousemove", mover);
            document.removeEventListener("mouseup", soltar);
            boton.style.transition = "width 0.25s ease, border-radius 0.25s ease, background-color 0.2s ease";
            setTimeout(() => { arrastrando = false; }, 50);
        };

        document.addEventListener("mousemove", mover);
        document.addEventListener("mouseup", soltar);
    });

    // Se establecen los estados en base a la cantidad de clicks
    boton.addEventListener("click", (e) => {
        if (movidoPx > 5) return; // fue arrastre, no click
        e.preventDefault();
        e.stopPropagation();


        // Segundo click en modo revertible → abrir panel
        if (expandido && estadoRevertible) {
            colapsar();
            crearPanel(
                mapaTokensActual,
                () => {
                    // Callback: revertir el prompt desde el panel
                    const cajaTexto = encontrarCajaTexto();
                    if (cajaTexto) {
                        let texto = obtenerTexto(cajaTexto);
                        for (const [token, datos] of Object.entries(mapaTokensActual)) {
                            texto = texto.replaceAll(token, datos.valor_real);
                        }
                        establecerTexto(cajaTexto, texto);
                    }
                    mapaTokensActual = {};
                    estadoRevertible = false;
                    iconSpan.textContent = "\uD83D\uDEE1\uFE0F";
                    labelSpan.textContent = "Anonimizar";
                }
            );
            return;
        }

        // Primero se expande
        if (!expandido) {
            expandir();
            return;
        }

        // Despues se realiza la anonimizacion
        const cajaTexto = encontrarCajaTexto();
        if (!cajaTexto) {
            iconSpan.textContent = "\u26A0\uFE0F";
            setTimeout(() => { iconSpan.textContent = "\uD83D\uDEE1\uFE0F"; colapsar(); }, 2000);
            return;
        }

        const textoOriginal = obtenerTexto(cajaTexto);
        if (!textoOriginal || textoOriginal.trim() === "") {
            iconSpan.textContent = "\u270F\uFE0F";
            setTimeout(() => { iconSpan.textContent = "\uD83D\uDEE1\uFE0F"; colapsar(); }, 2000);
            return;
        }

        iconSpan.textContent = "\u26A1";
        boton.style.backgroundColor = "#d97706";
        colapsar();


        // Verificar que la conexion con la extension sigue activa
        if (!chrome?.runtime?.sendMessage) {
            iconSpan.textContent = "\u274C";
            boton.style.backgroundColor = "#dc2626";
            setTimeout(() => {
                iconSpan.textContent = "\uD83D\uDEE1\uFE0F";
                boton.style.backgroundColor = "#10a37f";
                colapsar();
            }, 2500);
            console.warn("SecurePrompt: recarga la pestana para reconectar la extension.");
            return;
        }

        chrome.runtime.sendMessage(
            {
                action: "analizarTexto",
                payload: { titulo: "Prompt-Flotante", contenido: textoOriginal, categoria: "Chat" },
            },
            (response) => {
                if (chrome.runtime.lastError || !response || !response.success) {
                    iconSpan.textContent = "\u274C";
                    boton.style.backgroundColor = "#dc2626";
                    setTimeout(() => {
                        iconSpan.textContent = "\uD83D\uDEE1\uFE0F";
                        boton.style.backgroundColor = "#10a37f";
                    }, 2500);
                    return;
                }

                establecerTexto(cajaTexto, response.data.analisis.texto_limpio);

                // Guardamos el mapa para poder revertirlo
                mapaTokensActual = response.data.analisis.entidades_detectadas;
                estadoRevertible = true;

                // Registrar en el historial
                const plataforma = window.location.hostname.replace(/^www\./, "").split(".")[0];
                chrome.runtime.sendMessage({
                    action: "registrarHistorial",
                    payload: {
                        plataforma: plataforma,
                        accion: "anonimizacion",
                        texto_censurado: response.data.analisis.texto_limpio
                    }
                });

                // Mostramos el check brevemente, luego cambiamos al icono de revertir
                // para indicarle al usuario que puede deshacer la anonimizacion
                iconSpan.textContent = "\u2705";
                boton.style.backgroundColor = "#16a34a";
                setTimeout(() => {
                    iconSpan.textContent = "\u21A9\uFE0F";
                    labelSpan.textContent = "Revertir";
                    boton.style.backgroundColor = "#10a37f";
                }, 2000);
            }
        );
    });

    document.body.appendChild(boton);
}

// Inicializacion general
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", crearBotonFlotante);
} else {
    crearBotonFlotante();
}

// Se recrea el boton en caso de que haya cambios en el DOM
let timeoutObserver = null;
const observer = new MutationObserver(() => {
    if (timeoutObserver) return;
    timeoutObserver = setTimeout(() => {
        crearBotonFlotante();
        timeoutObserver = null;
    }, 500);
});
observer.observe(document.body, { childList: true, subtree: true });