from typing import Optional

from fastapi import Request
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    postgres_user: str = "postgres"
    postgres_password: str = "postgres"
    postgres_db: str = "colombophilie"
    postgres_host: str = "db"
    postgres_port: int = 5432
    # Fourni directement par Railway (Postgres addon) : prioritaire sur les
    # variables postgres_* ci-dessus si présent.
    database_url: Optional[str] = None

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()

if settings.database_url:
    DATABASE_URL = settings.database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
else:
    DATABASE_URL = (
        f"postgresql+asyncpg://{settings.postgres_user}"
        f":{settings.postgres_password}"
        f"@{settings.postgres_host}"
        f":{settings.postgres_port}"
        f"/{settings.postgres_db}"
    )

if settings.database_url:
    ASYNCPG_DSN = settings.database_url.replace("postgresql+asyncpg://", "postgresql://", 1)
else:
    ASYNCPG_DSN = (
        f"postgresql://{settings.postgres_user}:{settings.postgres_password}"
        f"@{settings.postgres_host}:{settings.postgres_port}/{settings.postgres_db}"
    )

engine = create_async_engine(DATABASE_URL, echo=True)

AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# Mode démo : un schéma PostgreSQL isolé par langue, dans la même base.
DEMO_SCHEMAS = {
    "fr": "demo_fr",
    "nl": "demo_nl",
    "en": "demo_en",
}
DEFAULT_DEMO_LANG = "fr"


class Base(DeclarativeBase):
    pass


def get_engine_for_schema(schema: Optional[str]):
    """Retourne un engine dont le search_path est basculé sur `schema`.

    Repose sur schema_translate_map de SQLAlchemy : les modèles ne
    déclarent aucun schéma (None), donc None est mappé vers le schéma
    démo correspondant à la langue du visiteur. En mode normal (schema
    None), retourne l'engine par défaut sans changement de comportement.
    """
    if schema is None:
        return engine
    return engine.execution_options(schema_translate_map={None: schema})


async def get_db(request: Request):
    """Dependency FastAPI fournissant une session SQLAlchemy.

    En mode normal, identique à avant (session liée à AsyncSessionLocal).
    En mode démo, le middleware de langue place le schéma à utiliser dans
    request.state.db_schema et la session est rebranchée sur ce schéma.
    """
    schema = getattr(request.state, "db_schema", None)
    if schema is None:
        session_factory = AsyncSessionLocal
    else:
        session_factory = sessionmaker(
            get_engine_for_schema(schema),
            class_=AsyncSession,
            expire_on_commit=False,
        )

    async with session_factory() as session:
        try:
            yield session
        finally:
            await session.close()