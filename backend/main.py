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
from routers.concours import router as concours_router
import config_manager
from demo_middleware import DemoLangMiddleware

# Créer les tables au démarrage
@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    # Créer le dossier uploads si inexistant
    os.makedirs("/app/uploads", exist_ok=True)

    # Premier lancement : on n'exécute pas le seed automatiquement,
    # l'utilisateur le déclenche via l'assistant de configuration (POST /api/config/setup).
    # Si une configuration existe déjà mais que la base est vide (ex. volume DB recréé),
    # on relance le seed dans la langue précédemment choisie.
    if not config_manager.check_first_launch():
        config = config_manager.load_config()
        if config and not await config_manager.is_database_seeded():
            await config_manager.run_seed(config.get("lang", config_manager.DEFAULT_LANG))

    yield

app = FastAPI(
    title="Colombophilie API",
    description="Gestion d'élevage de pigeons voyageurs",
    version="1.0.0",
    lifespan=lifespan
)

_default_origins = "http://localhost:8080,http://127.0.0.1:8080"
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get("ALLOWED_ORIGINS", _default_origins).split(",")
    if origin.strip()
]

# CORS — permet au frontend d'appeler l'API
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    # True : nécessaire pour que le cookie demo_lang (mode démo) circule
    # entre le frontend et l'API si servis sur des origines différentes.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mode démo : bascule de schéma PostgreSQL selon la langue du visiteur
app.add_middleware(DemoLangMiddleware)


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
app.include_router(concours_router, prefix="/api/concours", tags=["Concours"])
app.include_router(config_manager.router)


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


# Déploiement "un seul service" (Railway) : si le dossier frontend a été
# copié dans l'image, FastAPI le sert directement (mêmes origine/port que
# l'API). En local (Docker Desktop), le frontend est servi par un conteneur
# nginx séparé et ce dossier n'existe pas dans l'image backend : on ne
# monte donc rien, comportement inchangé.
FRONTEND_DIR = "/app/frontend"
if os.path.isdir(FRONTEND_DIR):
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")