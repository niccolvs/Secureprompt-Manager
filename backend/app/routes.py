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

# Importar el analizador NER al inicio del archivo
from app.ner import analizar_prompt

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