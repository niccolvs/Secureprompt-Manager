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

    # Tabla de prompts (ya existe)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS prompts (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            titulo         TEXT NOT NULL,
            contenido      TEXT NOT NULL,
            contenido_limpio TEXT NOT NULL,
            categoria      TEXT NOT NULL,
            icono          TEXT NOT NULL DEFAULT 'ti-file-text',
            fecha_creacion TEXT NOT NULL
        )
    """)

    # Migrar base de datos existente si es necesario
    try:
        cursor.execute("ALTER TABLE prompts ADD COLUMN icono TEXT DEFAULT 'ti-file-text'")
    except sqlite3.OperationalError:
        pass # La columna ya existe

    # Tablas para el sistema de Etiquetas (Tags)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tags (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre      TEXT NOT NULL UNIQUE,
            color       TEXT NOT NULL DEFAULT '#E0E0E0'
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS prompt_tags (
            prompt_id   INTEGER NOT NULL,
            tag_id      INTEGER NOT NULL,
            PRIMARY KEY (prompt_id, tag_id),
            FOREIGN KEY (prompt_id) REFERENCES prompts(id) ON DELETE CASCADE,
            FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
        )
    """)

    # Tabla nueva — guarda el mapa token → dato real
    # Cada token está relacionado con un prompt por prompt_id
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tokens (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            prompt_id   INTEGER NOT NULL,
            token       TEXT NOT NULL,
            valor_real  TEXT NOT NULL,
            tipo        TEXT NOT NULL,
            FOREIGN KEY (prompt_id) REFERENCES prompts(id)
        )
    """)

    # Tabla de historial — registra cada uso de la extensión
    # plataforma: ChatGPT, Claude, Gemini, etc.
    # accion: "analisis" cuando se analiza un prompt
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS historial (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            plataforma  TEXT NOT NULL,
            accion      TEXT NOT NULL DEFAULT 'analisis',
            fecha       TEXT NOT NULL,
            hora        TEXT NOT NULL
        )
    """)

    conn.commit()
    conn.close()
    print("[OK] Base de datos inicializada correctamente")