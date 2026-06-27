from fastapi import APIRouter, HTTPException
from app.models import PromptCreate
from app.database import get_connection
from app.ner import analizar_prompt
from datetime import datetime

router = APIRouter()

# ── GET /prompts/{user_id} ────────────────────────
# Trae solo los prompts del usuario autenticado
@router.get("/prompts/{user_id}")
def obtener_prompts(user_id: str):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT * FROM prompts WHERE user_id = ? ORDER BY id DESC",
        (user_id,)
    )
    prompts = [dict(row) for row in cursor.fetchall()]
    conn.close()

    return {"prompts": prompts}

# ── POST /prompts ─────────────────────────────────
# Crea un prompt para el usuario autenticado
@router.post("/prompts")
def crear_prompt(prompt: PromptCreate):
    resultado = analizar_prompt(prompt.contenido)

    conn = get_connection()
    cursor = conn.cursor()
    fecha = datetime.now().strftime("%Y-%m-%d %H:%M")

    cursor.execute("""
        INSERT INTO prompts (user_id, titulo, contenido, contenido_limpio, categoria, fecha_creacion)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        prompt.user_id,
        prompt.titulo,
        prompt.contenido,
        resultado["texto_limpio"],
        prompt.categoria,
        fecha
    ))

    prompt_id = cursor.lastrowid

    for token, datos in resultado["entidades_detectadas"].items():
        cursor.execute("""
            INSERT INTO tokens (prompt_id, token, valor_real, tipo)
            VALUES (?, ?, ?, ?)
        """, (prompt_id, token, datos["valor_real"], datos["tipo"]))

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
# Elimina un prompt verificando que pertenece al usuario
@router.delete("/prompts/{prompt_id}")
def eliminar_prompt(prompt_id: int, user_id: str):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT id FROM prompts WHERE id = ? AND user_id = ?",
        (prompt_id, user_id)
    )
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Prompt no encontrado")

    cursor.execute("DELETE FROM prompts WHERE id = ?", (prompt_id,))
    conn.commit()
    conn.close()

    return {"mensaje": f"Prompt {prompt_id} eliminado"}

# ── PUT /prompts/{id} ─────────────────────────────
# Actualiza un prompt verificando que pertenece al usuario
@router.put("/prompts/{prompt_id}")
def actualizar_prompt(prompt_id: int, prompt: PromptCreate):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT id FROM prompts WHERE id = ? AND user_id = ?",
        (prompt_id, prompt.user_id)
    )
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
# Analiza un prompt sin guardarlo
@router.post("/prompts/analizar")
def analizar(prompt: PromptCreate):
    resultado = analizar_prompt(prompt.contenido)
    return {
        "titulo": prompt.titulo,
        "categoria": prompt.categoria,
        "analisis": resultado
    }


# ── GET /stats/{user_id} ──────────────────────────
# Estadísticas del usuario
@router.get("/stats/{user_id}")
def obtener_stats(user_id: str):
    conn = get_connection()
    cursor = conn.cursor()

    # Total de censuras (tokens detectados)
    cursor.execute("""
        SELECT COUNT(t.id) FROM tokens t
        JOIN prompts p ON t.prompt_id = p.id
        WHERE p.user_id = ?
    """, (user_id,))
    total_censuras = cursor.fetchone()[0]

    # Total de prompts usados como plantillas
    cursor.execute(
        "SELECT COUNT(*) FROM prompts WHERE user_id = ?",
        (user_id,)
    )
    plantillas_usadas = cursor.fetchone()[0]

    conn.close()

    return {
        "total_censuras": total_censuras,
        "plantillas_usadas": plantillas_usadas
    }

# ── GET /historial/{user_id} ──────────────────────
# Historial de prompts del usuario
@router.get("/historial/{user_id}")
def obtener_historial(user_id: str):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT titulo, categoria, fecha_creacion
        FROM prompts
        WHERE user_id = ?
        ORDER BY id DESC
        LIMIT 10
    """, (user_id,))

    historial = [{
        "plataforma": row[1],
        "fecha": row[2].split(" ")[0] if row[2] else "",
        "hora": row[2].split(" ")[1] if row[2] and " " in row[2] else ""
    } for row in cursor.fetchall()]

    conn.close()

    return {"historial": historial}