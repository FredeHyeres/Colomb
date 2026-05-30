from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.exceptions import HTTPException as StarletteHTTPException
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
    ai_router,
)
from routers.concours_feedback import router as feedback_router

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

ALLOWED_ORIGINS = ["http://localhost:8080", "http://127.0.0.1:8080"]

# CORS — permet au frontend d'appeler l'API
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    origin = request.headers.get("origin", "")
    headers = {}
    if origin in ALLOWED_ORIGINS:
        headers["Access-Control-Allow-Origin"] = origin
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=headers,
    )


# Garantit que les headers CORS sont présents même sur les 500
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    origin = request.headers.get("origin", "")
    headers = {}
    if origin in ALLOWED_ORIGINS:
        headers["Access-Control-Allow-Origin"] = origin
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
        headers=headers,
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
app.include_router(ai_router, prefix="/api", tags=["ai"])
app.include_router(feedback_router, prefix="/api", tags=["AI Feedback"])


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