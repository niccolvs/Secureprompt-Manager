import spacy
import re

nlp = spacy.load("es_core_news_sm")

ENTIDADES_SENSIBLES = {
    "PER": "Persona",
    "ORG": "Organización",
    "LOC": "Lugar"
}

# ── Nuevos patrones Regex ────────────────────────
PATRONES_REGEX = {
    "RUT": r"\b\d{1,2}\.\d{3}\.\d{3}[-‐][0-9kK]\b|\b\d{7,8}[-‐][0-9kK]\b",
    "TARJETA": r"\b(?:\d[ -]*?){13,16}\b",
    "TELEFONO": r"\+?56\s?9\s?\d{4}\s?\d{4}|\b\d{8,9}\b"
}


def analizar_prompt(texto: str) -> dict:
    texto_limpio = texto
    mapa_tokens = {}
    contador = 1

    # 1. Primero buscamos con Regex (RUT, Tarjetas, etc.)
    for tipo, patron in PATRONES_REGEX.items():
        coincidencias = re.finditer(patron, texto_limpio)
        for match in coincidencias:
            valor_real = match.group(0)
            token = f"[{tipo}_{contador}]"

            mapa_tokens[token] = {
                "valor_real": valor_real,
                "tipo": tipo
            }
            texto_limpio = texto_limpio.replace(valor_real, token)
            contador += 1

    # 2. Luego pasamos SpaCy al texto restante
    doc = nlp(texto_limpio)
    for entidad in doc.ents:
        if entidad.label_ in ENTIDADES_SENSIBLES:
            tipo = ENTIDADES_SENSIBLES[entidad.label_]
            token = f"[{tipo.upper()}_{contador}]"

            mapa_tokens[token] = {
                "valor_real": entidad.text,
                "tipo": tipo
            }
            texto_limpio = texto_limpio.replace(entidad.text, token)
            contador += 1

    return {
        "texto_original": texto,
        "texto_limpio": texto_limpio,
        "entidades_detectadas": mapa_tokens,
        "total_entidades": len(mapa_tokens)
    }