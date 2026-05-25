"""
Seed données sport réalistes pour tester les alertes IA.
Exécuter: docker exec colombo_backend python seed_sport.py
"""
import asyncio
import json
from datetime import date, timedelta, datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from database import AsyncSessionLocal
from sqlalchemy import select


async def seed():
    async with AsyncSessionLocal() as db:
        # Récupérer les pigeons existants
        from models.pigeon import Pigeon
        result = await db.execute(select(Pigeon).limit(5))
        pigeons = result.scalars().all()
        if not pigeons:
            print("Aucun pigeon trouvé. Exécuter d'abord seed.py")
            return

        from models.sport import (
            TrainingSession, PigeonTrainingResult,
            FeedIngredient, FeedMix, NutritionPlan, Supplement,
            SessionType, IngredientCategory, MixUsage, SupplementType,
        )

        today = date.today()

        # 3 sessions
        sessions_data = [
            {
                "date": today - timedelta(days=25),
                "session_type": SessionType.loft,
                "distance_km": None,
                "weather": "ensoleille",
                "temperature": 18.0,
            },
            {
                "date": today - timedelta(days=12),
                "session_type": SessionType.toss,
                "distance_km": 80.0,
                "weather": "nuageux",
                "temperature": 15.0,
            },
            {
                "date": today - timedelta(days=3),
                "session_type": SessionType.race,
                "distance_km": 250.0,
                "weather": "vent fort",
                "temperature": 12.0,
                "wind_speed": 35.0,
            },
        ]

        sessions = []
        for sd in sessions_data:
            s = TrainingSession(**sd)
            db.add(s)
            sessions.append(s)
        await db.flush()

        # Résultats variés pour tester alertes
        score_sets = [
            # bons scores
            {"recovery_score": 8, "motivation_score": 9, "condition_score": 8, "hydration_score": 7},
            # scores moyens
            {"recovery_score": 6, "motivation_score": 6, "condition_score": 5, "hydration_score": 6},
            # mauvais scores (déclenche alertes)
            {"recovery_score": 3, "motivation_score": 4, "condition_score": 3, "hydration_score": 2},
        ]

        for i, session in enumerate(sessions):
            for j, pigeon in enumerate(pigeons[:3]):
                scores = score_sets[(i + j) % 3]
                result_obj = PigeonTrainingResult(
                    session_id=session.id,
                    pigeon_id=pigeon.id,
                    return_time=session.distance_km * 3.2 if session.distance_km else None,
                    internal_rank=j + 1,
                    **scores,
                )
                db.add(result_obj)

        # Ingrédients
        ingredients = [
            FeedIngredient(
                name="Mais",
                category=IngredientCategory.energie,
                description="Cereale energetique de base",
            ),
            FeedIngredient(
                name="Orge",
                category=IngredientCategory.depuratif,
                description="Cereale depurative",
            ),
            FeedIngredient(
                name="Dari",
                category=IngredientCategory.sport,
                description="Grain sport haute energie",
            ),
            FeedIngredient(
                name="Pois",
                category=IngredientCategory.proteine,
                description="Legumineuse riche en proteines",
            ),
            FeedIngredient(
                name="Chanvre",
                category=IngredientCategory.motivation,
                description="Graine de motivation",
            ),
        ]
        for ing in ingredients:
            db.add(ing)

        # Mélanges
        mix_dep = FeedMix(
            name="Depuratif standard",
            usage=MixUsage.recuperation,
            description="Melange de recuperation post-concours",
        )
        mix_sport = FeedMix(
            name="Sport intensif",
            usage=MixUsage.entrainement,
            description="Melange haute energie pour entrainement",
        )
        db.add(mix_dep)
        db.add(mix_sport)

        # Plan nutritionnel
        plan = NutritionPlan(
            name="Demi-fond Yearlings Provence",
            description="Plan nutritionnel 7 jours adapte au demi-fond en conditions mediterraneennes",
            lundi="Depuratif 60% + Pois 20% + Mais 20% -- Recuperation active",
            mardi="Sport 50% + Mais 30% + Chanvre 20% -- Regain d energie",
            mercredi="Sport intensif 70% + Pois 30% -- Charge maximale",
            jeudi="Sport 50% + Depuratif 30% + Chanvre 20% -- Maintien",
            vendredi="Depuratif 40% + Mais 40% + Pois 20% -- Allegement",
            samedi="Sport 80% + Chanvre 20% -- Pre-panier",
            dimanche="Repos alimentaire -- eau enrichie electrolytes uniquement",
        )
        db.add(plan)

        # Suppléments
        db.add(Supplement(
            name="Electrolytes Sport+",
            type=SupplementType.electrolyte,
            description="Melange electrolytes recuperation effort",
            dosage="5g/L eau",
        ))
        db.add(Supplement(
            name="Vitamix Complex",
            type=SupplementType.vitamine,
            description="Complexe vitamines B + E",
            dosage="3 gouttes/pigeon/jour",
        ))

        await db.commit()
        print(
            f"Seed sport OK : 3 sessions, {len(pigeons[:3]) * 3} resultats, "
            f"5 ingredients, 2 melanges, 1 plan, 2 supplements"
        )

        # Générer recommandations IA
        from services.xai_engine import generate_ai_recommendation
        for pigeon in pigeons[:3]:
            try:
                rec = await generate_ai_recommendation(pigeon.id, db)
                print(
                    f"Recommandation IA pigeon {pigeon.matricule}: "
                    f"{rec.recommendation} (score {rec.score_global})"
                )
            except Exception as e:
                print(f"Recommandation IA pigeon {pigeon.matricule}: {e}")


if __name__ == "__main__":
    asyncio.run(seed())
