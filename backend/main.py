from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os

from database import engine, Base
from routers import (
    lignees_router,
    pigeons_router,
    performances_router,
    sante_router,
    couples_router,
    eleveur_router,
    sport_router,
)

# Créer les tables au démarrage
@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    # Créer le dossier uploads si inexistant
    os.makedirs("/app/uploads", exist_ok=True)
    yield

app = FastAPI(
    title="Colombophilie API",
    description="Gestion d'élevage de pigeons voyageurs",
    version="1.0.0",
    lifespan=lifespan
)

# CORS — permet au frontend d'appeler l'API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Servir les photos uploadées
app.mount("/uploads", StaticFiles(directory="/app/uploads"), name="uploads")

# Inclure les routers
app.include_router(lignees_router, prefix="/api")
app.include_router(pigeons_router, prefix="/api")
app.include_router(performances_router, prefix="/api")
app.include_router(sante_router, prefix="/api")
app.include_router(couples_router, prefix="/api")
app.include_router(eleveur_router, prefix="/api")
app.include_router(sport_router, prefix="/api", tags=["sport"])


@app.get("/")
async def root():
    return {
        "message": "Colombophilie API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
async def health():
    return {"status": "ok"}