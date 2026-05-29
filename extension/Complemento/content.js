console.log("1 SecurePrompt: Modo Botón Flotante Global Activado");

// Indicamos el sector en donde quedará para poder poner el botón
const textareaSelector = '#prompt-textarea';

// Indicamos que colocaremos el boton dentro de la página
function crearBotonFlotante() {
    // En caso de que exista duplicación, lo evitamos
    if (document.getElementById('secure-prompt-global-btn')) return;

    // Creamos el boton
    const boton = document.createElement('button');
    boton.id = "secure-prompt-global-btn";

    // Le añadimos el diseño apra que pueda ser más agradable a la vista del usuario
    boton.innerHTML = "🔐 <span>Anonimizar Prompt</span>";

    // Ahora, condiferentes métricas, lo adaptamos para que se encuentre en el fondo de la pantalla a la derecha
    boton.style.position = "fixed";
    boton.style.bottom = "30px";
    boton.style.right = "30px";
    boton.style.backgroundColor = "#10a37f"; // Asignamos el color de nuestra app / pagina web
    boton.style.color = "white";
    boton.style.border = "none";
    // Asignamos padding para poder establecer un mayor orden y que no se encuentre "pegado" a otra cosa
    boton.style.padding = "12px 18px";
    boton.style.borderRadius = "25px";
    boton.style.cursor = "pointer";
    boton.style.fontSize = "14px";
    boton.style.fontWeight = "600";
    boton.style.zIndex = "99999";
    boton.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)";
    boton.style.display = "flex";
    boton.style.alignItems = "center";
    boton.style.gap = "8px";
    // Le añadimos una transformacion, de forma que se pueda notar el paso entre cambio y demas
    boton.style.transition = "transform 0.2s ease, background-color 0.2s ease";

    // Le añadimos efectos de hover para que el usuario pueda notar que es interactivo y se encuentre más cómodo a la hora de usarlo
    boton.onmouseover = () => {
        boton.style.backgroundColor = "#1a7f64";
        boton.style.transform = "scale(1.05)";
    };
    boton.onmouseout = () => {
        boton.style.backgroundColor = "#10a37f";
        boton.style.transform = "scale(1)";
    };

    // Indicamos que al hacer click
    boton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Buscamos dinámicamente la caja de texto en el momento del click
        const cajaTexto = document.querySelector(textareaSelector);

        // Un if en caso de que no se encuentre el cuadro
        if (!cajaTexto) {
            alert("No se detectó el cuadro de texto de ChatGPT en esta pantalla.");
            return;
        }

        // Obtenemos el texto original, ya sea del value (en caso de textarea) o del innerText (en caso de divs editables)
        const textoOriginal = cajaTexto.value !== undefined ? cajaTexto.value : cajaTexto.innerText;
        if (!textoOriginal || textoOriginal.trim() === "") {
            boton.innerText = "⚠️ Escribe algo primero";
            setTimeout(() => boton.innerHTML = "🛡️ <span>Anonimizar Prompt</span>", 2000);
            return;
        }

        // Establecemos el cambio en el que se analiza
        boton.innerHTML = "⚡ Analizando...";
        boton.style.backgroundColor = "#d97706";

        // Establecemos la segunda accio
        console.log("2 SecurePrompt: Enviando petición al background...");

        // Mandamos el texto al service worker (background.js)
        chrome.runtime.sendMessage(
            {
                action: "analizarTexto",
                payload: {
                    titulo: "Prompt-Flotante",
                    contenido: textoOriginal,
                    categoria: "Chat"
                }
            },
            (response) => {
                if (chrome.runtime.lastError || !response || !response.success) {
                    console.error("-1 SecurePrompt: Error en la petición.", chrome.runtime.lastError);
                    boton.innerHTML = "❌ Error API";
                    boton.style.backgroundColor = "#dc2626"; // Rojo
                    setTimeout(() => restaurarBoton(boton), 2500);
                    return;
                }

                // Notamos en caso de que se haga la peticion con exito
                const textoLimpio = response.data.analisis.texto_limpio;
                console.log("2 SecurePrompt: Éxito ->", textoLimpio);

                // Se coloca ya el texto cambiado nuevamente en ChatGPT
                cajaTexto.focus();
                document.execCommand('selectAll', false, null);
                document.execCommand('insertText', false, textoLimpio);

                // Revisamos el estado
                boton.innerHTML = "✅ ¡Limpio!";
                boton.style.backgroundColor = "#16a34a";
                setTimeout(() => restaurarBoton(boton), 2000);
            }
        );
    });

    // Ahora, lo añadimos al body para que se encuentre visible en la página
    document.body.appendChild(boton);
}

// Como el boton cambia normalmente de estado, esto permite restaurarlo
function restaurarBoton(boton) {
    boton.innerHTML = "🛡️ <span>Anonimizar Prompt</span>";
    boton.style.backgroundColor = "#10a37f";
}

// Ejecutamos cuando el contenido este cargado
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", crearBotonFlotante);
} else {
    crearBotonFlotante();
}

// Por si ChatGPT cambia de vista internamente y borra elementos del body, mantenemos un chequeo ligero
const observer = new MutationObserver(() => {
    crearBotonFlotante();
});
observer.observe(document.body, { childList: true });