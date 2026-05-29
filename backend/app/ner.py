import spacy
import re

# Primero, cargamos el modelo de SpaCy
nlp = spacy.load("es_core_news_lg")

# Establecemos las reglas para detectar localidades Chilenas

ruler = nlp.add_pipe("entity_ruler", before = "ner", config = {"overwrite_ents" : True})

# Ahora, a modo de poder añadior las diferentes localidades, agregamos manualmente las regiones y las comunas de RM

# COMUNAS
COMUNAS_RM = [
    "Melipilla", "Talagante", "Buin", "Paine", "Colina", "Lampa", "Tiltil",
    "Peñaflor", "Padre Hurtado", "Isla de Maipo", "Curacaví", "María Pinto",
    "San Pedro", "Alhué", "Pudahuel", "Maipú", "Puente Alto", "La Florida",
    "Ñuñoa", "Providencia", "Vitacura", "Las Condes", "Lo Barnechea",
    "Peñalolén", "La Reina", "Macul", "San Joaquín", "La Granja", "La Pintana",
    "El Bosque", "Lo Espejo", "Pedro Aguirre Cerda", "San Miguel", "San Ramón",
    "La Cisterna", "Lo Prado", "Cerro Navia", "Quinta Normal", "Renca",
    "Conchalí", "Huechuraba", "Recoleta", "Independencia", "Estación Central",
    "Cerrillos", "Quilicura", "Til Til", "Pirque", "San José de Maipo",
]

# CIUDADES
CIUDADES_CHILE = [
    "Valparaíso", "Viña del Mar", "Concepción", "Talcahuano", "Temuco",
    "Antofagasta", "La Serena", "Coquimbo", "Iquique", "Alto Hospicio",
    "Puerto Montt", "Rancagua", "Talca", "Chillán", "Osorno", "Valdivia",
    "Arica", "Calama", "Copiapó", "Los Ángeles", "Punta Arenas", "Coyhaique",
    "Quillota", "San Antonio", "Ovalle", "San Felipe", "Los Andes",
    "Linares", "Curicó", "Constitución", "Cauquenes", "Parral",
    "Angol", "Victoria", "Villarrica", "Pucón", "Castro", "Ancud",
    "Puerto Natales", "Porvenir",
]

#REGIONES
REGIONES_CHILE = [
    "Metropolitana", "Biobío", "Araucanía", "Los Lagos", "Maule",
    "Ñuble", "O'Higgins", "Atacama", "Tarapacá", "Aysén", "Magallanes",
    "Los Ríos", "Arica y Parinacota", "Antofagasta",
    # Nombres completos de las regiojnes, en caso de que el usuario utilice cualquiera de las dos formar
    "Región Metropolitana", "Región del Biobío", "Región de La Araucanía",
    "Región de Los Lagos", "Región del Maule", "Región de Ñuble",
    "Región del Libertador", "Región de Atacama", "Región de Tarapacá",
    "Región de Aysén", "Región de Magallanes", "Región de Los Ríos",
    "Región de Arica y Parinacota", "Región de Antofagasta",
    "Región de Coquimbo", "Región de Valparaíso",
]

patterns = [{"label": "LOC", "pattern": nombre}
            for nombre in COMUNAS_RM + CIUDADES_CHILE + REGIONES_CHILE]

ruler.add_patterns(patterns)

# Ahora, organizamops las entidades en general para pdoer cubrirlas

# ENTIDADES

ENTIDADES_SENSIBLES = {
    "PER": "Persona",
    "ORG": "Organización",
    "LOC": "Lugar"
}

PATRONES_REGEX = {
    "RUT": r"\b\d{1,2}\.\d{3}\.\d{3}[-‐][0-9kK]\b|\b\d{7,8}[-‐][0-9kK]\b",
    "TARJETA": r"\b(?:\d[ -]*?){13,16}\b",
    "TELEFONO": r"\+?56\s?9\s?\d{4}\s?\d{4}|\b\d{8,9}\b"
}

# Mediante la funcion, asignaremos los patrones para la deteccion y demas
def analizar_prompt(texto: str) -> dict:
    todos_matches = []

    # Primeramente, detectamos los tokens ya revisados en el texto, para evitar duoplicacion o que se evite la anonimizacion
    patron_token_previo = r"\[[A-ZÁÉÍÓÚa-záéíóúÑñ_]+_\d+\]"
    for match in re.finditer(patron_token_previo, texto):
        todos_matches.append((match.start(), match.end(), "TOKEN_EXISTENTE", match.group(0)))

    # Detectamos los patrones del regex sobre el texto original
    for tipo, patron in PATRONES_REGEX.items():
        for match in re.finditer(patron, texto):
            todos_matches.append((match.start(), match.end(), tipo, match.group(0)))

    # Ahora, detectamos las entidades con SpaCy sobre el texto original
    doc = nlp(texto)
    for ent in doc.ents:
        if ent.label_ in ENTIDADES_SENSIBLES:
            tipo = ENTIDADES_SENSIBLES[ent.label_]
            todos_matches.append((ent.start_char, ent.end_char, tipo, ent.text))

    # Ahora, ordenamos los matches, en base a su posicion en el texto, y si ya existe un token previo le damos la prioridad
    todos_matches.sort(key=lambda x: (x[0], 0 if x[2] == "TOKEN_EXISTENTE" else 1, -(x[1] - x[0])))

    # Guardamos los matches validos, de forma que se eviten lso solapamientos
    matches_validos = []
    ultimo_fin = -1
    for match in todos_matches:
        start, end, tipo, valor_real = match
        if start >= ultimo_fin:
            matches_validos.append(match)
            ultimo_fin = end

    # Sincronizamos los contadores, de forma que si ya existia un token previo, el contador de ese tipo se actualice para evitar duplicados
    contadores = {}
    for start, end, tipo, valor_real in matches_validos:
        if tipo == "TOKEN_EXISTENTE":
            partes = valor_real.strip("[]").split("_")
            if len(partes) == 2:
                t_orig = partes[0].upper()
                try:
                    n_orig = int(partes[1])
                    contadores[t_orig] = max(contadores.get(t_orig, 0), n_orig)
                except ValueError:
                    pass

    mapa_tokens = {}
    reemplazos = []

    # Volvemos a ordenar según la lectura normal del texto
    matches_validos.sort(key=lambda x: x[0])

    # Generamos los reemplazos de cada match valido, y actualizamos cada contador establecido anteriormente
    for start, end, tipo, valor_real in matches_validos:
        if tipo == "TOKEN_EXISTENTE":
            reemplazos.append((start, end, valor_real))
            continue

        # Si es una entidad nueva, incrementamos su respectivo contador
        if tipo not in contadores:
            contadores[tipo] = 1
        else:
            contadores[tipo] += 1

        token = f"[{tipo}_{contadores[tipo]}]"
        mapa_tokens[token] = {"valor_real": valor_real, "tipo": tipo}
        reemplazos.append((start, end, token))

    # Ahora, aplicamos los reemplazos al texto original, comenzando desde el final para evitar problemas de desplazamiento en los indices
    texto_limpio = texto
    for start, end, token in reversed(reemplazos):
        texto_limpio = texto_limpio[:start] + token + texto_limpio[end:]

    return {
        "texto_original": texto,
        "texto_limpio": texto_limpio,
        "entidades_detectadas": mapa_tokens,
        "total_entidades": len(mapa_tokens)
    }