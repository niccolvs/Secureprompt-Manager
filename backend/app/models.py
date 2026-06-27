# app/models.py — Modelos de datos
# Aquí definimos la estructura de los datos
# que la extensión nos va a enviar y recibir.
# Pydantic valida automáticamente que los datos
# tengan el formato correcto.

from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

# ── Modelo para Etiquetas (Tags) ────────────────
class TagItem(BaseModel):
    id: Optional[int] = None
    nombre: str
    color: str = "#E0E0E0"

# ── Modelo para recibir un prompt ────────────────
class PromptCreate(BaseModel):
    user_id: str       # ID único del usuario de Firebase
    titulo: str
    contenido: str
    categoria: str

# ── Modelo para devolver un prompt ───────────────
class PromptResponse(BaseModel):
    id: int
    user_id: str
    titulo: str
    contenido: str
    contenido_limpio: str
    categoria: str
    fecha_creacion: str

# ── Modelo para registrar historial ──────────────
class HistorialCreate(BaseModel):
    plataforma: str    # Ej: "ChatGPT", "Claude", "Gemini"
    accion: str = "analisis"  # Tipo de acción realizada