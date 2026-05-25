"""
Construction des snapshots sportifs pour les pigeons.
Agrège les données des séances d'entraînement et calcule les indices.
"""

from datetime import date, timedelta
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.ai_models import AITrainingSnapshot
from models.sport import PigeonTrainingResult, TrainingSession
from ai.scoring.sport_scoring import (
    calculate_regularity_index,
    calculate_recovery_index,
    calculate_condition_index,
)


async def build_snapshot_for_pigeon(
    db: AsyncSession,
    pigeon_id: str,
    snapshot_date: date,
) -> AITrainingSnapshot:
    """
    Calcule et persiste un snapshot complet de l'état sportif d'un pigeon
    à une date donnée. Agrège les données des 7 et 30 derniers jours depuis
    pigeon_training_results et training_sessions.
    """
    date_7j = snapshot_date - timedelta(days=7)
    date_30j = snapshot_date - timedelta(days=30)

    # ── Nombre de séances sur 7 et 30 jours ──────────────────────────────────
    count_7d = await _count_sessions(db, pigeon_id, date_7j, snapshot_date)
    count_30d = await _count_sessions(db, pigeon_id, date_30j, snapshot_date)

    # ── Moyennes des scores sur 7 jours ──────────────────────────────────────
    recovery_avg = await _avg_score(db, pigeon_id, date_7j, snapshot_date, "recovery_score")
    condition_avg = await _avg_score(db, pigeon_id, date_7j, snapshot_date, "condition_score")
    hydration_avg = await _avg_score(db, pigeon_id, date_7j, snapshot_date, "hydration_score")

    # ── Température moyenne des séances sur 7 jours ───────────────────────────
    avg_temp = await _avg_temperature(db, pigeon_id, date_7j, snapshot_date)

    # ── Calcul des indices ─────────────────────────────────────────────────────
    regularity = calculate_regularity_index(count_7d, count_30d)
    rec_index = calculate_recovery_index(recovery_avg)
    cond_index = calculate_condition_index(condition_avg)

    # ── Étiquette de performance ───────────────────────────────────────────────
    label = await label_performance(
        recovery_avg if recovery_avg is not None else 0.0,
        condition_avg if condition_avg is not None else 0.0,
        regularity,
    )

    snapshot = AITrainingSnapshot(
        pigeon_id=pigeon_id,
        snapshot_date=snapshot_date,
        training_load_7d=float(count_7d),
        training_load_30d=float(count_30d),
        recovery_avg_7d=recovery_avg,
        condition_avg_7d=condition_avg,
        hydration_avg_7d=hydration_avg,
        average_temperature=avg_temp,
        regularity_index=regularity,
        recovery_index=rec_index,
        condition_index=cond_index,
        performance_label=label,
    )

    db.add(snapshot)
    await db.commit()
    await db.refresh(snapshot)
    return snapshot


async def label_performance(
    recovery_avg: float,
    condition_avg: float,
    regularity: float,
) -> str:
    """
    Classifie la performance : excellent / good / average / poor selon les seuils métier.
      excellent : recovery >= 75 ET condition >= 75 ET regularity >= 80
      good      : recovery >= 55 ET condition >= 55 ET regularity >= 60
      average   : recovery >= 35 ET condition >= 35 ET regularity >= 30
      poor      : reste
    """
    if recovery_avg >= 75 and condition_avg >= 75 and regularity >= 80:
        return "excellent"
    elif recovery_avg >= 55 and condition_avg >= 55 and regularity >= 60:
        return "good"
    elif recovery_avg >= 35 and condition_avg >= 35 and regularity >= 30:
        return "average"
    else:
        return "poor"


# ── Helpers privés ────────────────────────────────────────────────────────────

async def _count_sessions(
    db: AsyncSession,
    pigeon_id: str,
    date_from: date,
    date_to: date,
) -> int:
    """Compte le nombre de séances d'entraînement d'un pigeon dans une période."""
    result = await db.execute(
        select(func.count(PigeonTrainingResult.id))
        .join(TrainingSession, PigeonTrainingResult.session_id == TrainingSession.id)
        .where(PigeonTrainingResult.pigeon_id == pigeon_id)
        .where(TrainingSession.date >= date_from)
        .where(TrainingSession.date <= date_to)
    )
    return result.scalar_one() or 0


async def _avg_score(
    db: AsyncSession,
    pigeon_id: str,
    date_from: date,
    date_to: date,
    score_column: str,
) -> Optional[float]:
    """Calcule la moyenne d'un score sur une période donnée."""
    col = getattr(PigeonTrainingResult, score_column)
    result = await db.execute(
        select(func.avg(col))
        .join(TrainingSession, PigeonTrainingResult.session_id == TrainingSession.id)
        .where(PigeonTrainingResult.pigeon_id == pigeon_id)
        .where(TrainingSession.date >= date_from)
        .where(TrainingSession.date <= date_to)
        .where(col.isnot(None))
    )
    val = result.scalar_one_or_none()
    return float(val) if val is not None else None


async def _avg_temperature(
    db: AsyncSession,
    pigeon_id: str,
    date_from: date,
    date_to: date,
) -> Optional[float]:
    """Calcule la température moyenne des séances sur une période donnée."""
    result = await db.execute(
        select(func.avg(TrainingSession.temperature_c))
        .join(PigeonTrainingResult, PigeonTrainingResult.session_id == TrainingSession.id)
        .where(PigeonTrainingResult.pigeon_id == pigeon_id)
        .where(TrainingSession.date >= date_from)
        .where(TrainingSession.date <= date_to)
        .where(TrainingSession.temperature_c.isnot(None))
    )
    val = result.scalar_one_or_none()
    return float(val) if val is not None else None
