"""reset_db.py — Vide TOUTES les tables (TRUNCATE CASCADE)"""
import asyncio
import asyncpg
from database import settings

DSN = (
    f"postgresql://{settings.postgres_user}:{settings.postgres_password}"
    f"@{settings.postgres_host}:{settings.postgres_port}/{settings.postgres_db}"
)

TABLES = [
    "ai_recommendations", "ai_snapshots", "sport_events",
    "pigeon_training_results", "training_sessions",
    "nutrition_assignments", "nutrition_plans",
    "feed_mix_ingredients", "feed_mixes", "supplements", "feed_ingredients",
    "performances", "sante", "nichees", "couples",
    "pigeons", "lignees", "eleveur",
]


async def main():
    conn = await asyncpg.connect(DSN)
    tlist = ", ".join(TABLES)
    await conn.execute(f"TRUNCATE {tlist} CASCADE")
    print("✅ TRUNCATE CASCADE exécuté\n")

    print("Vérification des comptages :")
    all_empty = True
    for t in TABLES:
        n = await conn.fetchval(f"SELECT COUNT(*) FROM {t}")
        status = "✅" if n == 0 else "❌"
        print(f"  {status}  {t:<40} {n} enregistrements")
        if n != 0:
            all_empty = False

    print()
    if all_empty:
        print("✅ Toutes les tables sont vides. Prêt pour le seed.")
    else:
        print("❌ Certaines tables ne sont pas vides !")

    await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
