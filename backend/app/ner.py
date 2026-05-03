# app/ner.py — Reconocimiento de Entidades Nombradas (NER)
# SpaCy analiza el texto y detecta automáticamente
# información sensible como nombres, organizaciones,
# lugares, fechas, etc.

import spacy

# ── Cargar el modelo de español ───────────────────
# Lo cargamos una sola vez al iniciar para no
# repetir este proceso en cada petición (es lento)
nlp = spacy.load("es_core_news_sm")

# ── Tipos de entidades que nos interesan ─────────
# SpaCy detecta muchos tipos, pero estos son los
# más relevantes para proteger datos sensibles
ENTIDADES_SENSIBLES = {
    "PER":  "Persona",       # Nombres de personas
    "ORG":  "Organización",  # Empresas, instituciones
    "LOC":  "Lugar",         # Ciudades, países
    "MISC": "Misceláneo"     # Otros datos relevantes
}

# ── Función principal de análisis ────────────────
# Recibe un texto y devuelve:
# 1. El texto con entidades reemplazadas por tokens
# 2. El mapa de tokens → datos reales
def analizar_prompt(texto: str) -> dict:
    # Procesar el texto con SpaCy
    doc = nlp(texto)

    texto_limpio = texto
    mapa_tokens = {}
    contador = 1

    # Recorrer todas las entidades detectadas
    for entidad in doc.ents:
        # Solo procesar entidades sensibles
        if entidad.label_ in ENTIDADES_SENSIBLES:
            # Crear token único para reemplazar la entidad
            # Ejemplo: [PERSONA_1], [ORG_1], [LOC_1]
            tipo = ENTIDADES_SENSIBLES[entidad.label_]
            token = f"[{tipo.upper()}_{contador}]"

            # Guardar el mapa token → dato real
            mapa_tokens[token] = {
                "valor_real": entidad.text,
                "tipo": tipo
            }

            # Reemplazar en el texto limpio
            texto_limpio = texto_limpio.replace(entidad.text, token)
            contador += 1

    return {
        "texto_original": texto,
        "texto_limpio": texto_limpio,
        "entidades_detectadas": mapa_tokens,
        "total_entidades": len(mapa_tokens)
    }