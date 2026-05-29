"""
Migration manuelle : ajoute les colonnes nutritionnelles à feed_ingredients.
À exécuter UNE FOIS avant seed_nutrition.py.

docker exec colombo_backend python migrate_ingredient_nutrition.py
"""
import asyncio
from sqlalchemy import text
from database import engine


COLUMNS = [
    ("proteines_pct",  "FLOAT"),
    ("lipides_pct",    "FLOAT"),
    ("glucides_pct",   "FLOAT"),
    ("energie_kcal",   "FLOAT"),
    ("notes_eleveurs", "TEXT"),
]


async def migrate():
    async with engine.begin() as conn:
        for col, col_type in COLUMNS:
            await conn.execute(text(
                f"ALTER TABLE feed_ingredients ADD COLUMN IF NOT EXISTS {col} {col_type}"
            ))
            print(f"  + feed_ingredients.{col} ({col_type})")
    print("Migration OK.")


if __name__ == "__main__":
    asyncio.run(migrate())
