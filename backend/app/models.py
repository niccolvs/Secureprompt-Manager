# app/models.py — Modelos de datos
# Aquí definimos la estructura de los datos
# que la extensión nos va a enviar y recibir.
# Pydantic valida automáticamente que los datos
# tengan el formato correcto.

from pydantic import BaseModel
from datetime import datetime

# ── Modelo para recibir un prompt ────────────────
# Esto es lo que la extensión nos enviará
class PromptCreate(BaseModel):
    titulo: str        # Título del prompt
    contenido: str     # El texto del prompt
    categoria: str     # Ej: "Trabajo", "Desarrollo"

# ── Modelo para devolver un prompt ───────────────
# Esto es lo que el servidor responderá
class PromptResponse(BaseModel):
    id: int
    titulo: str
    contenido: str
    categoria: str
    fecha_creacion: str

# ── Modelo para registrar historial ──────────────
class HistorialCreate(BaseModel):
    plataforma: str    # Ej: "ChatGPT", "Claude", "Gemini"
    accion: str = "analisis"  # Tipo de acción realizada