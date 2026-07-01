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

    # Tabla de prompts con user_id
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS prompts (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id          TEXT NOT NULL DEFAULT '',
            titulo           TEXT NOT NULL,
            contenido        TEXT NOT NULL,
            contenido_limpio TEXT NOT NULL,
            categoria        TEXT NOT NULL,
            icono            TEXT NOT NULL DEFAULT 'ti-file-text',
            fecha_creacion   TEXT NOT NULL
        )
    """)

    # Migraciones de columnas si no existen
    for migration in [
        "ALTER TABLE prompts ADD COLUMN icono TEXT DEFAULT 'ti-file-text'",
        "ALTER TABLE prompts ADD COLUMN user_id TEXT DEFAULT ''",
    ]:
        try:
            cursor.execute(migration)
        except sqlite3.OperationalError:
            pass

    # Tablas para el sistema de Etiquetas (Tags)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tags (
            id     INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL UNIQUE,
            color  TEXT NOT NULL DEFAULT '#E0E0E0'
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS prompt_tags (
            prompt_id INTEGER NOT NULL,
            tag_id    INTEGER NOT NULL,
            PRIMARY KEY (prompt_id, tag_id),
            FOREIGN KEY (prompt_id) REFERENCES prompts(id) ON DELETE CASCADE,
            FOREIGN KEY (tag_id)    REFERENCES tags(id)    ON DELETE CASCADE
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tokens (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            prompt_id  INTEGER NOT NULL,
            token      TEXT NOT NULL,
            valor_real TEXT NOT NULL,
            tipo       TEXT NOT NULL,
            FOREIGN KEY (prompt_id) REFERENCES prompts(id)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS historial (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id         TEXT NOT NULL DEFAULT '',
            plataforma      TEXT NOT NULL,
            accion          TEXT NOT NULL DEFAULT 'analisis',
            texto_censurado TEXT,
            fecha           TEXT NOT NULL,
            hora            TEXT NOT NULL
        )
    """)

    # Migraciones de columnas para historial
    for migration in [
        "ALTER TABLE historial ADD COLUMN texto_censurado TEXT",
        "ALTER TABLE historial ADD COLUMN user_id TEXT DEFAULT ''",
    ]:
        try:
            cursor.execute(migration)
        except sqlite3.OperationalError:
            pass

    # Tabla de usuarios para avatar
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS usuarios (
            user_id    TEXT PRIMARY KEY,
            avatar     TEXT,
            nombre     TEXT,
            email      TEXT,
            updated_at TEXT
        )
    """)

    conn.commit()
    conn.close()
    print("[OK] Base de datos inicializada correctamente")