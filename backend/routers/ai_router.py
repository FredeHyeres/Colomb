"""
Router FastAPI pour les endpoints IA colombophile.
Gère les recommandations, snapshots, événements et tableau de bord IA.
"""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.ai_models import AIRecommendation, AITrainingSnapshot, SportEvent
from schemas.ai_schemas import (
    AIRecommendationCreate,
    AIRecommendationRead,
    AITrainingSnapshotRead,
    AIDashboardResponse,
    SportEventCreate,
    SportEventRead,
)
from ai.recommendations.recommendation_engine import (
    generate_recommendations_for_pigeon,
    get_active_recommendations,
    resolve_recommendation,
)
from ai.datasets.snapshot_builder import build_snapshot_for_pigeon

router = APIRouter()


# ── Recommandations ───────────────────────────────────────────────────────────

@router.get(
    "/ai/recommendations/{pigeon_id}",
    response_model=list[AIRecommendationRead],
    summary="Recommandations actives d'un pigeon",
)
async def get_recommendations(
    pigeon_id: str,
    db: AsyncSession = Depends(get_db),
) -> list[AIRecommendationRead]:
    """Retourne toutes les recommandations non résolues pour un pigeon."""
    recs = await get_active_recommendations(db, pigeon_id)
    return recs  # type: ignore[return-value]


@router.post(
    "/ai/recommendations/{pigeon_id}/generate",
    response_model=list[AIRecommendationRead],
    summary="Déclencher l'analyse des règles IA pour un pigeon",
)
async def generate_recommendations(
    pigeon_id: str,
    context_data: dict,
    db: AsyncSession = Depends(get_db),
) -> list[AIRecommendationRead]:
    """
    Évalue toutes les règles métier pour le pigeon et persiste les nouvelles recommandations.
    Le corps de la requête doit contenir le contexte des métriques récentes du pigeon.
    """
    recs = await generate_recommendations_for_pigeon(db, pigeon_id, context_data)
    return recs  # type: ignore[return-value]


@router.put(
    "/ai/recommendations/{rec_id}/resolve",
    summary="Marquer une recommandation comme résolue",
)
async def resolve_rec(
    rec_id: int,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Marque la recommandation identifiée par rec_id comme résolue."""
    ok = await resolve_recommendation(db, rec_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Recommandation introuvable")
    return {"success": True, "rec_id": rec_id}


# ── Snapshots ─────────────────────────────────────────────────────────────────

@router.get(
    "/ai/snapshots/{pigeon_id}",
    response_model=list[AITrainingSnapshotRead],
    summary="Historique des snapshots sportifs d'un pigeon",
)
async def get_snapshots(
    pigeon_id: str,
    db: AsyncSession = Depends(get_db),
) -> list[AITrainingSnapshotRead]:
    """Retourne tous les snapshots sportifs d'un pigeon, du plus récent au plus ancien."""
    result = await db.execute(
        select(AITrainingSnapshot)
        .where(AITrainingSnapshot.pigeon_id == pigeon_id)
        .order_by(AITrainingSnapshot.snapshot_date.desc())
    )
    return list(result.scalars().all())  # type: ignore[return-value]


@router.post(
    "/ai/snapshots/{pigeon_id}/build",
    response_model=AITrainingSnapshotRead,
    summary="Créer un snapshot sportif pour aujourd'hui",
)
async def build_snapshot(
    pigeon_id: str,
    db: AsyncSession = Depends(get_db),
) -> AITrainingSnapshotRead:
    """Calcule et persiste un snapshot sportif pour le pigeon à la date d'aujourd'hui."""
    snapshot = await build_snapshot_for_pigeon(db, pigeon_id, date.today())
    return snapshot  # type: ignore[return-value]


# ── Événements sportifs ───────────────────────────────────────────────────────

@router.get(
    "/ai/events/{pigeon_id}",
    response_model=list[SportEventRead],
    summary="Journal d'événements sportifs d'un pigeon",
)
async def get_events(
    pigeon_id: str,
    db: AsyncSession = Depends(get_db),
) -> list[SportEventRead]:
    """Retourne tous les événements sportifs d'un pigeon, du plus récent au plus ancien."""
    result = await db.execute(
        select(SportEvent)
        .where(SportEvent.pigeon_id == pigeon_id)
        .order_by(SportEvent.event_date.desc())
    )
    return list(result.scalars().all())  # type: ignore[return-value]


@router.post(
    "/ai/events",
    response_model=SportEventRead,
    status_code=201,
    summary="Ajouter un événement sportif",
)
async def create_event(
    event_in: SportEventCreate,
    db: AsyncSession = Depends(get_db),
) -> SportEventRead:
    """Ajoute un nouvel événement dans le journal sportif du pigeon."""
    event = SportEvent(**event_in.model_dump())
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return event  # type: ignore[return-value]


# ── Tableau de bord IA ────────────────────────────────────────────────────────

@router.get(
    "/ai/dashboard/{pigeon_id}",
    response_model=AIDashboardResponse,
    summary="Résumé IA complet d'un pigeon",
)
async def get_dashboard(
    pigeon_id: str,
    db: AsyncSession = Depends(get_db),
) -> AIDashboardResponse:
    """
    Retourne un résumé IA complet :
      - Recommandations actives (avec comptage par sévérité)
      - Dernier snapshot sportif
      - Indices visuels principaux
    """
    # Recommandations actives
    recs = await get_active_recommendations(db, pigeon_id)

    # Dernier snapshot
    result = await db.execute(
        select(AITrainingSnapshot)
        .where(AITrainingSnapshot.pigeon_id == pigeon_id)
        .order_by(AITrainingSnapshot.snapshot_date.desc())
        .limit(1)
    )
    latest = result.scalar_one_or_none()

    # Comptage par sévérité
    total_critical = sum(1 for r in recs if r.severity == "critical")
    total_warnings = sum(1 for r in recs if r.severity == "warning")

    return AIDashboardResponse(
        pigeon_id=pigeon_id,
        active_recommendations=recs,  # type: ignore[arg-type]
        latest_snapshot=latest,  # type: ignore[arg-type]
        recovery_index=latest.recovery_index if latest else None,
        condition_index=latest.condition_index if latest else None,
        regularity_index=latest.regularity_index if latest else None,
        performance_label=latest.performance_label if latest else None,
        total_active_critical=total_critical,
        total_active_warnings=total_warnings,
    )
