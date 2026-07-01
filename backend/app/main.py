# app/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import router
from app.database import init_db

app = FastAPI(
    title="SecurePrompt Manager API",
    description="API para procesar y gestionar prompts",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inicializar base de datos al arrancar el servidor
@app.on_event("startup")
def startup():
    init_db()

app.include_router(router)

@app.get("/")
def root():
    return {
        "mensaje": "SecurePrompt API funcionando",
        "version": "1.0.0"
    }

@app.get("/health")
def health():
    return {"status": "ok"}