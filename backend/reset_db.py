import asyncio
from sqlalchemy import text
from database import engine

async def reset():
    async with engine.begin() as conn:
        # Désactive les contraintes FK temporairement
        await conn.execute(
            text("SET session_replication_role = 'replica'")
        )

        # Vide toutes les tables dans l'ordre
        # (des plus dépendantes aux moins dépendantes)
        tables = [
            'performances',
            'sante',
            'nichees',
            'couples',
            'pigeons',
            'lignees',
            'eleveur'
        ]

        for table in tables:
            await conn.execute(text(f"TRUNCATE TABLE {table} CASCADE"))
            print(f"✅ Table {table} vidée")

        # Réactive les contraintes FK
        await conn.execute(
            text("SET session_replication_role = 'origin'")
        )

        print("\n🎉 Base de données vidée avec succès")
        print("Structure des tables conservée")
        print("Prêt pour les vraies données !")

asyncio.run(reset())
