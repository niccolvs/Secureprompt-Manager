console.log("SecurePrompt: Activado");

// Indicamos los selectores para poder encontrar la caja de texto en cada sitio especifico, antes de usar los genericos
const SELECTORES_POR_SITIO = {
    "chatgpt.com":        ["#prompt-textarea"],
    "chat.openai.com":    ["#prompt-textarea"],
    "claude.ai":          ['div.ProseMirror[contenteditable="true"]', '[contenteditable="true"]'],
    "gemini.google.com":  ['.ql-editor[contenteditable="true"]', 'div[contenteditable="true"]'],
    "chat.deepseek.com":  ["#chat-input", "textarea"],
    "manus.im":           ['[contenteditable="true"]', "textarea"],
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
        caja.dispatchEvent(new Event("input",  { bubbles: true }));
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
            bubbles:   true,
            inputType: "insertText",
            data:      texto,
        }));
        caja.dispatchEvent(new Event("change", { bubbles: true }));
    }
}

// Establecemos el boton flotante
function crearBotonFlotante() {
    if (document.getElementById("secure-prompt-global-btn")) return;

    const boton = document.createElement("button");
    boton.id = "secure-prompt-global-btn";

    // Creamos el contenido del boton, el emoji y el texto
    const iconSpan = document.createElement("span");
    iconSpan.textContent = "\uD83D\uDEE1\uFE0F"; // escudo

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
        position:        "fixed",
        bottom:          "85px",
        right:           "20px",
        backgroundColor: "#10a37f",
        color:           "white",
        border:          "none",
        width:           "44px",
        height:          "44px",
        borderRadius:    "50%",
        cursor:          "pointer",
        fontSize:        "20px",
        zIndex:          "99999",
        boxShadow:       "0 4px 12px rgba(0,0,0,0.25)",
        display:         "flex",
        alignItems:      "center",
        justifyContent:  "center",
        padding:         "0 14px",
        overflow:        "hidden",
        userSelect:      "none",
        transition:      "width 0.25s ease, border-radius 0.25s ease, background-color 0.2s ease",
    });

    let expandido = false;

    // Establecemos el estado expandido
    const expandir = () => {
        expandido                   = true;
        boton.style.width           = "165px";
        boton.style.borderRadius    = "25px";
        boton.style.backgroundColor = "#1a7f64";
        labelSpan.style.opacity     = "1";
        labelSpan.style.maxWidth    = "130px";
        labelSpan.style.marginLeft  = "6px";
    };

    // Establecemos el estado colapsado
    const colapsar = () => {
        expandido                   = false;
        boton.style.width           = "44px";
        boton.style.borderRadius    = "50%";
        boton.style.backgroundColor = "#10a37f";
        labelSpan.style.opacity     = "0";
        labelSpan.style.maxWidth    = "0";
        labelSpan.style.marginLeft  = "0";
    };

    // Permitimos que se pueda arrastrar por la pagina
    let arrastrando = false;
    let movidoPx    = 0;
    let offsetX     = 0;
    let offsetY     = 0;

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
                    boton.style.right  = "auto";
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
                boton.style.top  = y + "px";
            }
        };

        // Permitimos el poder soltar, para que se retraiga el boton
        const soltar = () => {
            document.removeEventListener("mousemove", mover);
            document.removeEventListener("mouseup",   soltar);
            boton.style.transition = "width 0.25s ease, border-radius 0.25s ease, background-color 0.2s ease";
            setTimeout(() => { arrastrando = false; }, 50);
        };

        document.addEventListener("mousemove", mover);
        document.addEventListener("mouseup",   soltar);
    });

    // Se establecen los estados en base a la cantidad de clicks
    boton.addEventListener("click", (e) => {
        if (movidoPx > 5) return; // fue arrastre, no click
        e.preventDefault();
        e.stopPropagation();

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

        iconSpan.textContent        = "\u26A1";
        boton.style.backgroundColor = "#d97706";
        colapsar();


        // Verificar que la conexion con la extension sigue activa
        if (!chrome?.runtime?.sendMessage) {
            iconSpan.textContent        = "\u274C";
            boton.style.backgroundColor = "#dc2626";
            setTimeout(() => {
                iconSpan.textContent        = "\uD83D\uDEE1\uFE0F";
                boton.style.backgroundColor = "#10a37f";
                colapsar();
            }, 2500);
            console.warn("SecurePrompt: recarga la pestana para reconectar la extension.");
            return;
        }

        chrome.runtime.sendMessage(
            {
                action:  "analizarTexto",
                payload: { titulo: "Prompt-Flotante", contenido: textoOriginal, categoria: "Chat" },
            },
            (response) => {
                if (chrome.runtime.lastError || !response || !response.success) {
                    iconSpan.textContent        = "\u274C";
                    boton.style.backgroundColor = "#dc2626";
                    setTimeout(() => {
                        iconSpan.textContent        = "\uD83D\uDEE1\uFE0F";
                        boton.style.backgroundColor = "#10a37f";
                    }, 2500);
                    return;
                }

                establecerTexto(cajaTexto, response.data.analisis.texto_limpio);
                iconSpan.textContent        = "\u2705";
                boton.style.backgroundColor = "#16a34a";
                setTimeout(() => {
                    iconSpan.textContent        = "\uD83D\uDEE1\uFE0F";
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