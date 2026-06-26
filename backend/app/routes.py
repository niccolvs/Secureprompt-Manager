# app/routes.py — Rutas usando SQLite

from fastapi import APIRouter, HTTPException
from app.models import PromptCreate, HistorialCreate
from app.database import get_connection
from datetime import datetime
from app.ner import analizar_prompt
import random

router = APIRouter()

# ── GET /prompts ──────────────────────────────────
# Obtiene todos los prompts desde SQLite
@router.get("/prompts")
def obtener_prompts():
    conn = get_connection()
    cursor = conn.cursor()

    # Trae todos los prompts ordenados por más reciente
    cursor.execute("SELECT * FROM prompts ORDER BY id DESC")
    prompts_rows = cursor.fetchall()
    
    prompts = []
    for row in prompts_rows:
        prompt_dict = dict(row)
        # Fetch tags for this prompt
        cursor.execute("""
            SELECT t.id, t.nombre, t.color 
            FROM tags t 
            JOIN prompt_tags pt ON t.id = pt.tag_id 
            WHERE pt.prompt_id = ?
        """, (prompt_dict["id"],))
        prompt_dict["tags"] = [dict(t) for t in cursor.fetchall()]
        prompts.append(prompt_dict)

    conn.close()
    return {"prompts": prompts}

# ── COLORES PARA TAGS ─────────────────────────────
TAG_COLORS = ["#F4E8D1", "#D1E8D1", "#F4D1D1", "#D1D1E8", "#E8D1F4", "#D1F4F4", "#F4F4D1"]

# ── GET /tags ─────────────────────────────────────
@router.get("/tags")
def obtener_tags():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM tags ORDER BY nombre ASC")
    tags = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return tags

# ── POST /prompts ─────────────────────────────────
# Analiza el prompt con SpaCy y guarda todo en SQLite
@router.post("/prompts")
def crear_prompt(prompt: PromptCreate):
    # 1. Analizar el prompt con SpaCy
    resultado = analizar_prompt(prompt.contenido)

    conn = get_connection()
    cursor = conn.cursor()
    fecha = datetime.now().strftime("%Y-%m-%d %H:%M")

    # 2. Guardar el prompt con el texto limpio
    cursor.execute("""
        INSERT INTO prompts (titulo, contenido, contenido_limpio, categoria, fecha_creacion)
        VALUES (?, ?, ?, ?, ?)
    """, (
        prompt.titulo,
        prompt.contenido,
        resultado["texto_limpio"],
        prompt.categoria,
        fecha
    ))

    prompt_id = cursor.lastrowid

    # 3. Guardar cada token detectado por SpaCy
    for token, datos in resultado["entidades_detectadas"].items():
        cursor.execute("""
            INSERT INTO tokens (prompt_id, token, valor_real, tipo)
            VALUES (?, ?, ?, ?)
        """, (prompt_id, token, datos["valor_real"], datos["tipo"]))

    # 4. Guardar etiquetas (Tags)
    for tag_name in prompt.tags:
        # Check si existe
        cursor.execute("SELECT id FROM tags WHERE nombre = ?", (tag_name,))
        tag_row = cursor.fetchone()
        if tag_row:
            tag_id = tag_row["id"]
        else:
            # Crear nuevo tag con color aleatorio predefinido
            color = random.choice(TAG_COLORS)
            cursor.execute("INSERT INTO tags (nombre, color) VALUES (?, ?)", (tag_name, color))
            tag_id = cursor.lastrowid
        
        # Vincular
        cursor.execute("INSERT INTO prompt_tags (prompt_id, tag_id) VALUES (?, ?)", (prompt_id, tag_id))

    conn.commit()
    conn.close()

    return {
        "mensaje": "Prompt guardado y analizado",
        "prompt_id": prompt_id,
        "texto_limpio": resultado["texto_limpio"],
        "entidades_detectadas": resultado["entidades_detectadas"],
        "total_entidades": resultado["total_entidades"]
    }


# ── DELETE /prompts/{id} ──────────────────────────
# Elimina un prompt por su ID
@router.delete("/prompts/{prompt_id}")
def eliminar_prompt(prompt_id: int):
    conn = get_connection()
    cursor = conn.cursor()

    # Verificar que el prompt existe antes de eliminar
    cursor.execute("SELECT id FROM prompts WHERE id = ?", (prompt_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Prompt no encontrado")

    cursor.execute("DELETE FROM prompts WHERE id = ?", (prompt_id,))
    conn.commit()
    conn.close()

    return {"mensaje": f"Prompt {prompt_id} eliminado"}

# ── PUT /prompts/{id} ─────────────────────────────
# Actualiza un prompt existente
@router.put("/prompts/{prompt_id}")
def actualizar_prompt(prompt_id: int, prompt: PromptCreate):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM prompts WHERE id = ?", (prompt_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Prompt no encontrado")

    cursor.execute("""
        UPDATE prompts
        SET titulo = ?, contenido = ?, categoria = ?
        WHERE id = ?
    """, (prompt.titulo, prompt.contenido, prompt.categoria, prompt_id))

    conn.commit()
    conn.close()

    return {"mensaje": f"Prompt {prompt_id} actualizado"}

# ── POST /prompts/analizar ────────────────────────
# Analiza un prompt y detecta datos sensibles
# antes de guardarlo
@router.post("/prompts/analizar")
def analizar(prompt: PromptCreate):
    resultado = analizar_prompt(prompt.contenido)
    return {
        "titulo": prompt.titulo,
        "categoria": prompt.categoria,
        "analisis": resultado
    }

# ── GET /stats ────────────────────────────────────
# Devuelve estadísticas de uso del sistema
@router.get("/stats")
def obtener_stats():
    conn = get_connection()
    cursor = conn.cursor()

    # Total de prompts guardados
    cursor.execute("SELECT COUNT(*) as total FROM prompts")
    total_prompts = cursor.fetchone()["total"]

    # Total de censuras (tokens detectados)
    cursor.execute("SELECT COUNT(*) as total FROM tokens")
    total_censuras = cursor.fetchone()["total"]

    conn.close()

    return {
        "total_prompts": total_prompts,
        "total_censuras": total_censuras,
        "plantillas_usadas": total_prompts
    }

# ── GET /historial ────────────────────────────────
# Devuelve las últimas entradas del historial de uso
@router.get("/historial")
def obtener_historial():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM historial ORDER BY id DESC LIMIT 20")
    historial = [dict(row) for row in cursor.fetchall()]

    conn.close()
    return {"historial": historial}

# ── POST /historial ───────────────────────────────
# Registra un nuevo evento de uso desde la extensión
@router.post("/historial")
def registrar_historial(entry: HistorialCreate):
    conn = get_connection()
    cursor = conn.cursor()

    ahora = datetime.now()
    fecha = ahora.strftime("%d-%m")
    hora = ahora.strftime("%H:%M")

    cursor.execute("""
        INSERT INTO historial (plataforma, accion, fecha, hora)
        VALUES (?, ?, ?, ?)
    """, (entry.plataforma, entry.accion, fecha, hora))

    conn.commit()
    conn.close()

    return {"mensaje": "Historial registrado"}