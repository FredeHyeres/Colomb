"""
Service analytique sport : tableaux de bord et résumés par pigeon.
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, distinct

from models.sport import TrainingSession, PigeonTrainingResult, NutritionPlan
from services.training_service import (
    compute_recovery_index,
    compute_condition_index,
    compute_regularity_index,
)


async def get_sport_dashboard(db: AsyncSession) -> dict:
    """
    Retourne les statistiques globales du domaine sport :
    - Nombre de séances
    - Nombre total de résultats
    - Nombre de pigeons actifs (ayant au moins un résultat)
    - Moyenne globale du recovery_score
    - Moyenne globale du condition_score
    - Nom du premier plan nutritionnel actif
    """
    # Nombre de séances
    r = await db.execute(select(func.count(TrainingSession.id)))
    total_sessions = r.scalar_one() or 0

    # Nombre de résultats
    r = await db.execute(select(func.count(PigeonTrainingResult.id)))
    total_results = r.scalar_one() or 0

    # Pigeons distincts ayant participé à au moins une séance
    r = await db.execute(
        select(func.count(distinct(PigeonTrainingResult.pigeon_id)))
    )
    active_pigeons = r.scalar_one() or 0

    # Moyenne globale du recovery_score
    r = await db.execute(
        select(func.avg(PigeonTrainingResult.recovery_score)).where(
            PigeonTrainingResult.recovery_score.is_not(None)
        )
    )
    avg_recovery = r.scalar_one_or_none()
    avg_recovery = round(float(avg_recovery), 2) if avg_recovery is not None else None

    # Moyenne globale du condition_score
    r = await db.execute(
        select(func.avg(PigeonTrainingResult.condition_score)).where(
            PigeonTrainingResult.condition_score.is_not(None)
        )
    )
    avg_condition = r.scalar_one_or_none()
    avg_condition = round(float(avg_condition), 2) if avg_condition is not None else None

    # Pigeon avec le meilleur recovery moyen
    r = await db.execute(
        select(
            PigeonTrainingResult.pigeon_id,
            func.avg(PigeonTrainingResult.recovery_score).label("avg_rec"),
        )
        .where(PigeonTrainingResult.recovery_score.is_not(None))
        .group_by(PigeonTrainingResult.pigeon_id)
        .order_by(func.avg(PigeonTrainingResult.recovery_score).desc())
        .limit(1)
    )
    best_row = r.first()
    best_recovery_pigeon_id = best_row.pigeon_id if best_row else None

    # Premier plan nutritionnel disponible
    r = await db.execute(select(NutritionPlan.name).limit(1))
    active_plan = r.scalar_one_or_none()

    return {
        "total_sessions": total_sessions,
        "total_results": total_results,
        "active_pigeons": active_pigeons,
        "avg_recovery": avg_recovery,
        "avg_condition": avg_condition,
        "best_recovery_pigeon_id": best_recovery_pigeon_id,
        "active_plan": active_plan,
    }


async def get_pigeon_sport_summary(db: AsyncSession, pigeon_id: str) -> dict:
    """
    Retourne un résumé sport pour un pigeon donné :
    nombre de séances, indices de récupération, condition et régularité.
    """
    r = await db.execute(
        select(func.count(PigeonTrainingResult.id)).where(
            PigeonTrainingResult.pigeon_id == pigeon_id
        )
    )
    total_sessions = r.scalar_one() or 0

    recovery_index = await compute_recovery_index(db, pigeon_id)
    condition_index = await compute_condition_index(db, pigeon_id)
    regularity_index = await compute_regularity_index(db, pigeon_id)

    return {
        "pigeon_id": pigeon_id,
        "total_sessions": total_sessions,
        "recovery_index": recovery_index,
        "condition_index": condition_index,
        "regularity_index": regularity_index,
    }
