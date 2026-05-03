# app/database.py — Configuración de SQLite
# SQLite es una base de datos que vive en un archivo
# local. No necesita servidor separado, todo se guarda
# en un archivo .db dentro del proyecto.

import sqlite3
import os

# ── Ruta del archivo de base de datos ────────────
# Se creará automáticamente si no existe
DB_PATH = os.path.join(os.path.dirname(__file__), "secureprompt.db")

# ── Crear conexión ────────────────────────────────
def get_connection():
    conn = sqlite3.connect(DB_PATH)
    # Esto hace que los resultados vengan como diccionarios
    # en lugar de tuplas — mucho más fácil de manejar
    conn.row_factory = sqlite3.Row
    return conn

# ── Crear las tablas si no existen ───────────────
# Esta función se ejecuta al iniciar el servidor.
# CREATE TABLE IF NOT EXISTS evita error si ya existe.
def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS prompts (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            titulo      TEXT NOT NULL,
            contenido   TEXT NOT NULL,
            categoria   TEXT NOT NULL,
            fecha_creacion TEXT NOT NULL
        )
    """)

    conn.commit()
    conn.close()
    print("✅ Base de datos inicializada correctamente")