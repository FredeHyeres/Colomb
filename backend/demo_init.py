"""demo_init.py — Initialisation du mode démo (Railway)

Prépare 3 schémas PostgreSQL isolés (demo_fr, demo_nl, demo_en) dans la
même base de données, chacun contenant la même structure de tables et
des données seedées dans la langue correspondante.

Idempotent : peut être exécuté à chaque démarrage sans tout re-seeder.
N'est appelé (par railway.toml / main.py) que si DEMO_MODE=true.
"""
import asyncio
import logging
import os

import asyncpg

import models  # noqa: F401  (peuple Base.metadata avec tous les modèles)
from database import Base, ASYNCPG_DSN, DEMO_SCHEMAS, get_engine_for_schema
import seed_fr
import seed_nl
import seed_en
import seed_demo_fr
import seed_demo_nl
import seed_demo_en

DEMO_MODE = os.environ.get("DEMO_MODE", "false").lower() == "true"

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("demo_init")

SEED_MODULES = {
    "fr": seed_fr,
    "nl": seed_nl,
    "en": seed_en,
}

DEMO_SEED_MODULES = {
    "fr": seed_demo_fr,
    "nl": seed_demo_nl,
    "en": seed_demo_en,
}


async def create_schemas() -> None:
    """Crée les schémas demo_fr / demo_nl / demo_en s'ils n'existent pas."""
    conn = await asyncpg.connect(ASYNCPG_DSN)
    try:
        for lang, schema in DEMO_SCHEMAS.items():
            await conn.execute(f'CREATE SCHEMA IF NOT EXISTS "{schema}"')
            logger.info(f"✅ Schéma prêt : {schema} ({lang})")
    finally:
        await conn.close()


async def create_tables(schema: str) -> None:
    """Crée les tables du modèle dans le schéma donné (si absentes)."""
    schema_engine = get_engine_for_schema(schema)
    async with schema_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info(f"✅ Tables prêtes dans le schéma {schema}")


async def _table_count(schema: str, table: str) -> int:
    conn = await asyncpg.connect(ASYNCPG_DSN)
    try:
        return await conn.fetchval(f'SELECT COUNT(*) FROM "{schema}".{table}') or 0
    finally:
        await conn.close()


async def init_schema(lang: str, schema: str) -> None:
    logger.info(f"--- Initialisation {schema} ({lang}) ---")
    await create_tables(schema)

    if await _table_count(schema, "feed_ingredients") > 0:
        logger.info(f"⏭️  {schema} : catalogue nutrition déjà seedé, on passe.")
    else:
        logger.info(f"🌱 Seed nutrition de {schema} en cours...")
        await SEED_MODULES[lang].main(schema=schema)
        logger.info(f"🎉 {schema} : catalogue nutrition seedé avec succès.")

    if await _table_count(schema, "pigeons") > 0:
        logger.info(f"⏭️  {schema} : élevage de démo déjà seedé, on passe.")
    else:
        logger.info(f"🌱 Seed élevage de démo de {schema} en cours...")
        await DEMO_SEED_MODULES[lang].main(schema=schema)
        logger.info(f"🎉 {schema} : élevage de démo seedé avec succès.")


async def main() -> None:
    if not DEMO_MODE:
        logger.info("DEMO_MODE != true : demo_init ignoré (mode normal).")
        return

    logger.info("=== demo_init : initialisation des schémas démo ===")
    await create_schemas()

    for lang, schema in DEMO_SCHEMAS.items():
        await init_schema(lang, schema)

    logger.info("=== demo_init : terminé ===")


if __name__ == "__main__":
    asyncio.run(main())
