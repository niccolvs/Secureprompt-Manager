# app/routes.py — Rutas usando SQLite

from fastapi import APIRouter, HTTPException
from app.models import PromptCreate, HistorialCreate, PromptIconUpdate
from app.database import get_connection
from datetime import datetime
from app.ner import analizar_prompt
from pydantic import BaseModel
import random

router = APIRouter()

# Modelo simple para el endpoint /analizar — no requiere user_id
# porque lo llama la extension sin saber quien esta autenticado
class PromptAnalizar(BaseModel):
    titulo:    str = ""
    contenido: str
    categoria: str = ""

# ── COLORES PARA TAGS ─────────────────────────────
TAG_COLORS = ["#FFEFC3", "#CDE6D3", "#EDD4F2", "#E3EEFD"]


# ── GET /prompts/{user_id} ────────────────────────
# Obtiene solo los prompts del usuario autenticado
@router.get("/prompts/{user_id}")
def obtener_prompts(user_id: str):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM prompts WHERE user_id = ? ORDER BY id DESC", (user_id,))
    prompts_rows = cursor.fetchall()

    prompts = []
    for row in prompts_rows:
        prompt_dict = dict(row)
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

# ── POST /prompts ─────────────────────────────────
@router.post("/prompts")
def crear_prompt(prompt: PromptCreate):
    # Anonimizar el contenido antes de guardar
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
        resultado["texto_limpio"],  # ahora sí guarda el texto anonimizado
        prompt.categoria,
        fecha
    ))

    prompt_id = cursor.lastrowid

    for tag_name in prompt.tags:
        cursor.execute("SELECT id FROM tags WHERE nombre = ?", (tag_name,))
        tag_row = cursor.fetchone()
        if tag_row:
            tag_id = tag_row["id"]
        else:
            color = random.choice(TAG_COLORS)
            cursor.execute("INSERT INTO tags (nombre, color) VALUES (?, ?)", (tag_name, color))
            tag_id = cursor.lastrowid
        cursor.execute("INSERT INTO prompt_tags (prompt_id, tag_id) VALUES (?, ?)", (prompt_id, tag_id))

    conn.commit()
    conn.close()

    return {"mensaje": "Prompt guardado", "prompt_id": prompt_id}

# ── DELETE /prompts/{id} ──────────────────────────
@router.delete("/prompts/{prompt_id}")
def eliminar_prompt(prompt_id: int, user_id: str):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM prompts WHERE id = ? AND user_id = ?", (prompt_id, user_id))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Prompt no encontrado")

    cursor.execute("DELETE FROM prompts WHERE id = ?", (prompt_id,))
    conn.commit()
    conn.close()

    return {"mensaje": f"Prompt {prompt_id} eliminado"}

# ── PUT /prompts/{id} ─────────────────────────────
@router.put("/prompts/{prompt_id}")
def actualizar_prompt(prompt_id: int, prompt: PromptCreate):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM prompts WHERE id = ? AND user_id = ?", (prompt_id, prompt.user_id))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Prompt no encontrado")

    cursor.execute("""
        UPDATE prompts
        SET titulo = ?, contenido = ?, contenido_limpio = ?, categoria = ?
        WHERE id = ?
    """, (prompt.titulo, prompt.contenido, prompt.contenido, prompt.categoria, prompt_id))

    cursor.execute("DELETE FROM tokens WHERE prompt_id = ?", (prompt_id,))
    cursor.execute("DELETE FROM prompt_tags WHERE prompt_id = ?", (prompt_id,))

    for tag_name in prompt.tags:
        cursor.execute("SELECT id FROM tags WHERE nombre = ?", (tag_name,))
        tag_row = cursor.fetchone()
        if tag_row:
            tag_id = tag_row["id"]
        else:
            color = random.choice(TAG_COLORS)
            cursor.execute("INSERT INTO tags (nombre, color) VALUES (?, ?)", (tag_name, color))
            tag_id = cursor.lastrowid
        cursor.execute("INSERT INTO prompt_tags (prompt_id, tag_id) VALUES (?, ?)", (prompt_id, tag_id))

    conn.commit()
    conn.close()

    return {"mensaje": f"Prompt {prompt_id} actualizado"}

# ── GET /stats/{user_id} ──────────────────────────
@router.get("/stats/{user_id}")
def obtener_stats(user_id: str):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) as total FROM prompts WHERE user_id = ?", (user_id,))
    total_prompts = cursor.fetchone()["total"]

    cursor.execute("""
        SELECT COUNT(*) as total FROM tokens t
        JOIN prompts p ON t.prompt_id = p.id
        WHERE p.user_id = ?
    """, (user_id,))
    total_censuras = cursor.fetchone()["total"]

    cursor.execute("""
        SELECT plataforma, COUNT(*) as cantidad
        FROM historial
        WHERE user_id = ?
        GROUP BY plataforma
        ORDER BY cantidad DESC
    """, (user_id,))
    plataformas = [dict(row) for row in cursor.fetchall()]

    conn.close()

    return {
        "total_prompts": total_prompts,
        "total_censuras": total_censuras,
        "plantillas_usadas": total_prompts,
        "uso_plataformas": plataformas
    }

# ── GET /historial/{user_id} ──────────────────────
@router.get("/historial/{user_id}")
def obtener_historial(user_id: str):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT * FROM historial WHERE user_id = ? ORDER BY id DESC LIMIT 20",
        (user_id,)
    )
    historial = [dict(row) for row in cursor.fetchall()]

    conn.close()
    return {"historial": historial}

# ── POST /historial ───────────────────────────────
@router.post("/historial")
def registrar_historial(entry: HistorialCreate):
    conn = get_connection()
    cursor = conn.cursor()

    ahora = datetime.now()
    fecha = ahora.strftime("%d-%m")
    hora = ahora.strftime("%H:%M")

    cursor.execute("""
        INSERT INTO historial (user_id, plataforma, accion, texto_censurado, fecha, hora)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (entry.user_id, entry.plataforma, entry.accion, entry.texto_censurado, fecha, hora))

    conn.commit()
    conn.close()

    return {"mensaje": "Historial registrado"}


# ── GET /tags ─────────────────────────────────────
@router.get("/tags")
def obtener_tags():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM tags ORDER BY nombre ASC")
    tags = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return tags

# ── PATCH /prompts/{id}/icono ─────────────────────
@router.patch("/prompts/{prompt_id}/icono")
def actualizar_icono(prompt_id: int, update: PromptIconUpdate):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM prompts WHERE id = ?", (prompt_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Prompt no encontrado")
    cursor.execute("UPDATE prompts SET icono = ? WHERE id = ?", (update.icono, prompt_id))
    conn.commit()
    conn.close()
    return {"mensaje": f"Icono del prompt {prompt_id} actualizado"}

# ── POST /prompts/analizar ────────────────────────
# Lo llama la extension (background.js) sin user_id
@router.post("/prompts/analizar")
def analizar(prompt: PromptAnalizar):
    resultado = analizar_prompt(prompt.contenido)
    return {
        "titulo": prompt.titulo,
        "categoria": prompt.categoria,
        "analisis": resultado
    }

# ── DELETE /historial ─────────────────────────────
@router.delete("/historial")
def eliminar_historial():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM historial")
    conn.commit()
    conn.close()
    return {"mensaje": "Historial eliminado"}