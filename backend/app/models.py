# app/models.py — Modelos de datos

from pydantic import BaseModel
from typing import List, Optional

# ── Modelo para Etiquetas (Tags) ────────────────
class TagItem(BaseModel):
    id: Optional[int] = None
    nombre: str
    color: str = "#E0E0E0"

# ── Modelo para recibir un prompt ────────────────
class PromptCreate(BaseModel):
    user_id: str = ""  # ID del usuario de Firebase
    titulo: str
    contenido: str
    categoria: str = ""
    tags: List[str] = []

# ── Modelo para actualizar ícono de un prompt ────
class PromptIconUpdate(BaseModel):
    icono: str

# ── Modelo para devolver un prompt ───────────────
class PromptResponse(BaseModel):
    id: int
    user_id: str = ""
    titulo: str
    contenido: str
    categoria: str
    fecha_creacion: str
    tags: List[TagItem] = []

# ── Modelo para registrar historial ──────────────
class HistorialCreate(BaseModel):
    user_id: str = ""  # ID del usuario de Firebase
    plataforma: str
    accion: str = "analisis"
    texto_censurado: Optional[str] = None

# ── Modelo para avatar de usuario ────────────────
class AvatarUpdate(BaseModel):
    user_id: str
    nombre: str = ""
    email: str = ""