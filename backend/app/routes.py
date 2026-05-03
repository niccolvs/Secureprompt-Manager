# app/routes.py — Rutas usando SQLite

from fastapi import APIRouter, HTTPException
from app.models import PromptCreate
from app.database import get_connection
from datetime import datetime

router = APIRouter()

# ── GET /prompts ──────────────────────────────────
# Obtiene todos los prompts desde SQLite
@router.get("/prompts")
def obtener_prompts():
    conn = get_connection()
    cursor = conn.cursor()

    # Trae todos los prompts ordenados por más reciente
    cursor.execute("SELECT * FROM prompts ORDER BY id DESC")
    prompts = [dict(row) for row in cursor.fetchall()]

    conn.close()
    return {"prompts": prompts}

# ── POST /prompts ─────────────────────────────────
# Guarda un nuevo prompt en SQLite
@router.post("/prompts")
def crear_prompt(prompt: PromptCreate):
    conn = get_connection()
    cursor = conn.cursor()

    fecha = datetime.now().strftime("%Y-%m-%d %H:%M")

    cursor.execute("""
        INSERT INTO prompts (titulo, contenido, categoria, fecha_creacion)
        VALUES (?, ?, ?, ?)
    """, (prompt.titulo, prompt.contenido, prompt.categoria, fecha))

    conn.commit()

    # Obtener el ID del prompt recién creado
    nuevo_id = cursor.lastrowid
    conn.close()

    return {
        "mensaje": "Prompt guardado",
        "prompt": {
            "id": nuevo_id,
            "titulo": prompt.titulo,
            "contenido": prompt.contenido,
            "categoria": prompt.categoria,
            "fecha_creacion": fecha
        }
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