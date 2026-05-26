from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models.ai_model import ConcoursFeedback, AISnapshot
from schemas.ai_schemas import ConcoursFeedbackCreate, ConcoursFeedbackResponse, AnonymizedSnapshot
import json

router = APIRouter(prefix="/ai/feedback", tags=["AI Feedback"])


@router.post("/concours", response_model=ConcoursFeedbackResponse, status_code=201)
async def create_feedback(data: ConcoursFeedbackCreate, db: AsyncSession = Depends(get_db)):
    """Enregistre le résultat réel d'un concours pour un pigeon."""
    feedback = ConcoursFeedback(**data.model_dump())
    db.add(feedback)
    await db.commit()
    await db.refresh(feedback)
    return feedback


@router.get("/concours/pigeon/{pigeon_id}", response_model=list[ConcoursFeedbackResponse])
async def get_feedbacks(pigeon_id: str, db: AsyncSession = Depends(get_db)):
    """Historique des feedbacks concours pour un pigeon."""
    result = await db.execute(
        select(ConcoursFeedback)
        .where(ConcoursFeedback.pigeon_id == pigeon_id)
        .order_by(ConcoursFeedback.concours_date.desc())
    )
    return result.scalars().all()


@router.get("/export/anonymized", response_model=list[AnonymizedSnapshot])
async def export_anonymized(db: AsyncSession = Depends(get_db)):
    """
    Export anonymisé pour le modèle collectif.
    Retourne uniquement les feedbacks avec share_anonymized=True.
    Aucune donnée identifiante — features numériques + outcome uniquement.
    """
    result = await db.execute(
        select(ConcoursFeedback)
        .where(ConcoursFeedback.share_anonymized == True)
        .where(ConcoursFeedback.snapshot_id.isnot(None))
    )
    feedbacks = result.scalars().all()

    anonymized = []
    for fb in feedbacks:
        snap_result = await db.execute(
            select(AISnapshot).where(AISnapshot.id == fb.snapshot_id)
        )
        snap = snap_result.scalar_one_or_none()
        if not snap or not snap.features:
            continue

        features = json.loads(snap.features) if isinstance(snap.features, str) else snap.features

        anonymized.append(AnonymizedSnapshot(
            recovery_avg_7d=features.get("recovery_avg_7d"),
            recovery_avg_30d=features.get("recovery_avg_30d"),
            condition_avg_7d=features.get("condition_avg_7d"),
            regularity_index=features.get("regularity_index"),
            training_load_30d=features.get("training_load_30d"),
            fatigue_risk=features.get("fatigue_risk"),
            recovery_trend=features.get("recovery_trend"),
            load_ratio=features.get("load_ratio"),
            distance_km=fb.distance_km,
            conditions_meteo=fb.conditions_meteo,
            outcome=fb.outcome,
            snapshot_version=snap.feature_set_version or "core_v1",
        ))

    return anonymized
