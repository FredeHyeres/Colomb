"""
Migration : colonnes jour de nutrition_plans VARCHAR(200) -> TEXT
docker exec colombo_backend python migrate_plan_days_to_text.py
"""
import asyncio
from sqlalchemy import text
from database import engine

DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

async def migrate():
    async with engine.begin() as conn:
        for day in DAYS:
            await conn.execute(text(f"ALTER TABLE nutrition_plans ALTER COLUMN {day} TYPE TEXT"))
            print(f"  + nutrition_plans.{day} -> TEXT")
    print("Migration OK.")

if __name__ == "__main__":
    asyncio.run(migrate())
