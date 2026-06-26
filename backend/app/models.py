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
# Esto es lo que la extensión nos enviará
class PromptCreate(BaseModel):
    titulo: str        # Título del prompt
    contenido: str     # El texto del prompt
    categoria: str = "" # Mantenido por compatibilidad
    tags: List[str] = [] # Nombres de las etiquetas seleccionadas/creadas

# ── Modelo para actualizar ícono de un prompt ────
class PromptIconUpdate(BaseModel):
    icono: str

# ── Modelo para devolver un prompt ───────────────
# Esto es lo que el servidor responderá
class PromptResponse(BaseModel):
    id: int
    titulo: str
    contenido: str
    categoria: str
    fecha_creacion: str
    tags: List[TagItem] = []

# ── Modelo para registrar historial ──────────────
class HistorialCreate(BaseModel):
    plataforma: str    # Ej: "ChatGPT", "Claude", "Gemini"
    accion: str = "analisis"  # Tipo de acción realizada