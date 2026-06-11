"""demo_middleware.py — Bascule de schéma PostgreSQL par langue (mode démo)

Actif uniquement si DEMO_MODE=true. Lit la langue choisie par le visiteur
(header X-Demo-Lang ou cookie demo_lang, défaut "fr") et place le schéma
PostgreSQL correspondant dans request.state.db_schema, utilisé ensuite
par database.get_db() pour rebrancher la session SQLAlchemy.
"""
from starlette.middleware.base import BaseHTTPMiddleware

import config_manager
from database import DEMO_SCHEMAS, DEFAULT_DEMO_LANG

DEMO_LANG_COOKIE = "demo_lang"
DEMO_LANG_HEADER = "X-Demo-Lang"


class DemoLangMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        if not config_manager.DEMO_MODE:
            return await call_next(request)

        lang = (
            request.headers.get(DEMO_LANG_HEADER)
            or request.cookies.get(DEMO_LANG_COOKIE)
            or DEFAULT_DEMO_LANG
        )
        if lang not in DEMO_SCHEMAS:
            lang = DEFAULT_DEMO_LANG

        request.state.demo_lang = lang
        request.state.db_schema = DEMO_SCHEMAS[lang]

        return await call_next(request)
