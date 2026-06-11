"""config_manager.py — Configuration de premier lancement

Gère le fichier /data/config.json (volume Docker persistant) :
- détection du premier lancement
- sauvegarde / chargement de la configuration éleveur
- déclenchement du seed dans la langue choisie

Expose un router FastAPI avec :
  GET  /api/config/status
  GET  /api/config/lang
  POST /api/config/setup
"""
import importlib
import json
import os
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel, EmailStr
from sqlalchemy import select, func

from database import AsyncSessionLocal
from models.eleveur import Eleveur
from models.pigeon import Pigeon

CONFIG_DIR = Path(os.environ.get("CONFIG_DIR", "/data"))
CONFIG_PATH = CONFIG_DIR / "config.json"

SEED_MODULES = {
    "fr": "seed_fr",
    "nl": "seed_nl",
    "en": "seed_en",
}

DEFAULT_LANG = "fr"

# Mode démo (Railway) : pas de config.json, pas de persistance entre
# sessions, chaque visiteur est traité comme un premier lancement.
DEMO_MODE = os.environ.get("DEMO_MODE", "false").lower() == "true"


def check_first_launch() -> bool:
    """Retourne True si aucune configuration n'a encore été enregistrée.

    En mode démo, toujours True : chaque visiteur passe par l'assistant
    de configuration (setup.html), sans rien persister.
    """
    if DEMO_MODE:
        return True
    return not CONFIG_PATH.exists()


def load_config() -> Optional[dict]:
    """Charge la configuration sauvegardée, ou None si absente.

    En mode démo, il n'y a jamais de config.json persistée.
    """
    if DEMO_MODE:
        return None
    if not CONFIG_PATH.exists():
        return None
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def save_config(config: dict) -> None:
    """Sauvegarde la configuration dans /data/config.json.

    En mode démo, ne fait rien : aucune donnée ne doit persister
    après la fermeture du navigateur.
    """
    if DEMO_MODE:
        return
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(config, f, ensure_ascii=False, indent=2)


async def is_database_seeded() -> bool:
    """Vérifie si le seed a déjà été exécuté (présence de pigeons)."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(func.count()).select_from(Pigeon))
        return (result.scalar() or 0) > 0


async def run_seed(lang: str) -> None:
    """Exécute le seed correspondant à la langue donnée."""
    module_name = SEED_MODULES.get(lang, SEED_MODULES[DEFAULT_LANG])
    module = importlib.import_module(module_name)
    await module.main()


router = APIRouter(prefix="/api/config", tags=["Config"])


class SetupRequest(BaseModel):
    lang: str
    nom: str
    prenom: Optional[str] = None
    nom_colombier: Optional[str] = None
    ville: Optional[str] = None
    pays: Optional[str] = None
    federation: Optional[str] = None
    email: Optional[EmailStr] = None


@router.get("/mode")
async def get_config_mode():
    """Indique au frontend si l'instance tourne en mode démonstration."""
    return {"demo": DEMO_MODE}


@router.get("/status")
async def get_config_status(request: Request):
    if DEMO_MODE:
        # Premier lancement tant que le visiteur n'a pas choisi sa langue
        # (cookie demo_lang absent). Une fois choisi, on n'affiche plus
        # l'assistant pour le reste de la session.
        return {
            "first_launch": "demo_lang" not in request.cookies,
            "config": None,
        }
    return {
        "first_launch": check_first_launch(),
        "config": load_config(),
    }


@router.get("/lang")
async def get_config_lang(request: Request):
    if DEMO_MODE:
        return {"lang": getattr(request.state, "demo_lang", DEFAULT_LANG)}
    config = load_config()
    lang = (config or {}).get("lang", DEFAULT_LANG)
    return {"lang": lang}


@router.post("/setup")
async def setup_config(body: SetupRequest, response: Response):
    if body.lang not in SEED_MODULES:
        raise HTTPException(status_code=400, detail=f"Langue non supportée : {body.lang}")

    if DEMO_MODE:
        # Pas de config.json, pas de seed (déjà fait par demo_init.py),
        # pas de modification de l'éleveur : on pose juste le cookie de
        # langue qui détermine le schéma utilisé pour cette session.
        # Cookie de session (pas de max_age) : expire à la fermeture du
        # navigateur, conformément au principe "rien ne persiste" du mode
        # démo. Tant qu'il existe, /api/config/status considère que la
        # langue a été choisie pour cette session.
        response.set_cookie(
            "demo_lang",
            body.lang,
            samesite="lax",
        )
        return {"success": True, "demo": True}

    save_config(body.model_dump())

    if not await is_database_seeded():
        try:
            await run_seed(body.lang)
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Échec du seed : {exc}")

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Eleveur))
        eleveur = result.scalars().first()
        if eleveur:
            eleveur.nom = body.nom
            eleveur.prenom = body.prenom
            eleveur.nom_colombier = body.nom_colombier
            eleveur.ville = body.ville
            eleveur.email = body.email
            eleveur.association = body.federation
            await db.commit()

    return {"success": True}
