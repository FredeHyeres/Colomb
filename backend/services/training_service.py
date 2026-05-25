"""
Service d'entraînement : récupération et calcul d'indices pour les séances et les pigeons.
"""

from datetime import date, timedelta
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from models.sport import TrainingSession, PigeonTrainingResult


async def get_session_with_results(db: AsyncSession, session_id: int) -> Optional[TrainingSession]:
    """Retourne une séance avec tous ses résultats (pigeon inclus)."""
    result = await db.execute(
        select(TrainingSession)
        .options(selectinload(TrainingSession.results))
        .where(TrainingSession.id == session_id)
    )
    return result.scalar_one_or_none()


async def get_pigeon_training_history(
    db: AsyncSession, pigeon_id: str, limit: int = 20
) -> list[PigeonTrainingResult]:
    """Retourne les derniers résultats d'entraînement d'un pigeon, du plus récent au plus ancien."""
    result = await db.execute(
        select(PigeonTrainingResult)
        .options(selectinload(PigeonTrainingResult.session))
        .where(PigeonTrainingResult.pigeon_id == pigeon_id)
        .order_by(PigeonTrainingResult.id.desc())
        .limit(limit)
    )
    return result.scalars().all()


async def compute_recovery_index(db: AsyncSession, pigeon_id: str) -> float:
    """
    Calcule l'indice de récupération d'un pigeon :
    moyenne du recovery_score sur les 5 dernières séances où le score est renseigné.
    Retourne 0.0 si aucune donnée disponible.
    """
    result = await db.execute(
        select(func.avg(PigeonTrainingResult.recovery_score))
        .where(
            PigeonTrainingResult.pigeon_id == pigeon_id,
            PigeonTrainingResult.recovery_score.is_not(None),
        )
        .order_by(PigeonTrainingResult.id.desc())
        .limit(5)
    )
    avg = result.scalar_one_or_none()
    return round(float(avg), 2) if avg is not None else 0.0


async def compute_condition_index(db: AsyncSession, pigeon_id: str) -> float:
    """
    Calcule l'indice de condition d'un pigeon :
    moyenne de (condition_score + motivation_score) / 2 sur les 5 dernières séances.
    Retourne 0.0 si aucune donnée disponible.
    """
    result = await db.execute(
        select(PigeonTrainingResult)
        .where(
            PigeonTrainingResult.pigeon_id == pigeon_id,
            PigeonTrainingResult.condition_score.is_not(None),
            PigeonTrainingResult.motivation_score.is_not(None),
        )
        .order_by(PigeonTrainingResult.id.desc())
        .limit(5)
    )
    rows = result.scalars().all()
    if not rows:
        return 0.0
    scores = [(r.condition_score + r.motivation_score) / 2 for r in rows]
    return round(sum(scores) / len(scores), 2)


async def compute_regularity_index(db: AsyncSession, pigeon_id: str) -> float:
    """
    Calcule l'indice de régularité d'un pigeon :
    nombre de séances sur les 30 derniers jours × 10 (max théorique = 30×10 = 300,
    normalisé par rapport à ~4 séances/semaine = 100).
    Retourne 0.0 si aucune séance.
    """
    cutoff = date.today() - timedelta(days=30)
    result = await db.execute(
        select(func.count(PigeonTrainingResult.id))
        .join(TrainingSession, PigeonTrainingResult.session_id == TrainingSession.id)
        .where(
            PigeonTrainingResult.pigeon_id == pigeon_id,
            TrainingSession.date >= cutoff,
        )
    )
    count = result.scalar_one_or_none() or 0
    return round(count * 10, 2)
