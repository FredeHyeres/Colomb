from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from database import get_db
from models.sport import (
    TrainingSession, PigeonTrainingResult,
    FeedIngredient, FeedMix, NutritionPlan, Supplement,
)
from schemas.sport import (
    TrainingSessionCreate, TrainingSessionUpdate, TrainingSessionResponse,
    PigeonTrainingResultCreate, PigeonTrainingResultResponse,
    FeedIngredientCreate, FeedIngredientUpdate, FeedIngredientResponse,
    FeedMixCreate, FeedMixUpdate, FeedMixResponse,
    NutritionPlanCreate, NutritionPlanUpdate, NutritionPlanResponse,
    SupplementCreate, SupplementUpdate, SupplementResponse,
    SportDashboardResponse,
)
from typing import List

router = APIRouter(prefix="/sport", tags=["Sport"])


# ── Sessions d'entraînement ───────────────────────────────────────────────────

@router.get("/sessions", response_model=List[TrainingSessionResponse])
async def get_sessions(skip: int = 0, limit: int = 50, db: AsyncSession = Depends(get_db)):
    """Liste toutes les séances d'entraînement, du plus récent au plus ancien."""
    result = await db.execute(
        select(TrainingSession)
        .order_by(TrainingSession.date.desc())
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()


@router.get("/sessions/{session_id}", response_model=TrainingSessionResponse)
async def get_session(session_id: int, db: AsyncSession = Depends(get_db)):
    """Retourne le détail d'une séance avec ses résultats."""
    result = await db.execute(
        select(TrainingSession)
        .options(selectinload(TrainingSession.results))
        .where(TrainingSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Séance non trouvée")
    return session


@router.post("/sessions", response_model=TrainingSessionResponse, status_code=201)
async def create_session(data: TrainingSessionCreate, db: AsyncSession = Depends(get_db)):
    """Crée une nouvelle séance d'entraînement."""
    session = TrainingSession(**data.model_dump())
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


@router.put("/sessions/{session_id}", response_model=TrainingSessionResponse)
async def update_session(session_id: int, data: TrainingSessionUpdate, db: AsyncSession = Depends(get_db)):
    """Met à jour une séance d'entraînement."""
    result = await db.execute(select(TrainingSession).where(TrainingSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Séance non trouvée")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(session, key, value)
    await db.commit()
    await db.refresh(session)
    return session


@router.delete("/sessions/{session_id}", status_code=204)
async def delete_session(session_id: int, db: AsyncSession = Depends(get_db)):
    """Supprime une séance (et ses résultats par cascade)."""
    result = await db.execute(select(TrainingSession).where(TrainingSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Séance non trouvée")
    await db.delete(session)
    await db.commit()


@router.post("/sessions/{session_id}/results", response_model=PigeonTrainingResultResponse, status_code=201)
async def add_result(session_id: int, data: PigeonTrainingResultCreate, db: AsyncSession = Depends(get_db)):
    """Ajoute le résultat d'un pigeon pour une séance."""
    r = await db.execute(select(TrainingSession).where(TrainingSession.id == session_id))
    if not r.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Séance non trouvée")
    result_obj = PigeonTrainingResult(session_id=session_id, **data.model_dump())
    db.add(result_obj)
    await db.commit()
    await db.refresh(result_obj)
    return result_obj


@router.get("/pigeons/{pigeon_id}/history", response_model=List[PigeonTrainingResultResponse])
async def get_pigeon_history(pigeon_id: str, db: AsyncSession = Depends(get_db)):
    """Retourne l'historique d'entraînement complet d'un pigeon."""
    result = await db.execute(
        select(PigeonTrainingResult)
        .where(PigeonTrainingResult.pigeon_id == pigeon_id)
        .order_by(PigeonTrainingResult.id.desc())
    )
    return result.scalars().all()


# ── Dashboard analytique ──────────────────────────────────────────────────────

@router.get("/dashboard", response_model=SportDashboardResponse)
async def get_dashboard(db: AsyncSession = Depends(get_db)):
    """
    Retourne les statistiques globales du domaine sport :
    - total_sessions
    - pigeons_en_forme (recovery >= 7 sur dernière séance)
    - alertes_actives (recovery < 4)
    - sessions_recentes (5 dernières)
    - top_pigeons
    """
    # Total sessions
    total_result = await db.execute(select(func.count(TrainingSession.id)))
    total_sessions = total_result.scalar() or 0

    # 5 dernières sessions
    recent_result = await db.execute(
        select(TrainingSession)
        .order_by(TrainingSession.date.desc())
        .limit(5)
    )
    sessions_recentes = recent_result.scalars().all()

    # Pigeons en forme : recovery >= 7 sur leur dernier résultat
    # Sous-requête : dernier résultat par pigeon
    subq = (
        select(
            PigeonTrainingResult.pigeon_id,
            func.max(PigeonTrainingResult.id).label("last_id"),
        )
        .group_by(PigeonTrainingResult.pigeon_id)
        .subquery()
    )
    forme_result = await db.execute(
        select(func.count()).select_from(
            select(PigeonTrainingResult)
            .join(subq, PigeonTrainingResult.id == subq.c.last_id)
            .where(PigeonTrainingResult.recovery_score >= 7)
            .subquery()
        )
    )
    pigeons_en_forme = forme_result.scalar() or 0

    # Alertes actives : recovery < 4 sur le dernier résultat
    alerte_result = await db.execute(
        select(func.count()).select_from(
            select(PigeonTrainingResult)
            .join(subq, PigeonTrainingResult.id == subq.c.last_id)
            .where(PigeonTrainingResult.recovery_score < 4)
            .subquery()
        )
    )
    alertes_actives = alerte_result.scalar() or 0

    # Top pigeons : meilleur score de récupération moyen
    top_result = await db.execute(
        select(
            PigeonTrainingResult.pigeon_id,
            func.avg(PigeonTrainingResult.recovery_score).label("avg_recovery"),
            func.count(PigeonTrainingResult.id).label("nb_sessions"),
        )
        .group_by(PigeonTrainingResult.pigeon_id)
        .order_by(func.avg(PigeonTrainingResult.recovery_score).desc())
        .limit(5)
    )
    top_pigeons = [
        {
            "pigeon_id": row.pigeon_id,
            "avg_recovery": round(float(row.avg_recovery), 1) if row.avg_recovery else None,
            "nb_sessions": row.nb_sessions,
        }
        for row in top_result.all()
    ]

    return SportDashboardResponse(
        total_sessions=total_sessions,
        pigeons_en_forme=pigeons_en_forme,
        alertes_actives=alertes_actives,
        sessions_recentes=sessions_recentes,
        top_pigeons=top_pigeons,
    )


# ── Nutrition — Ingrédients ───────────────────────────────────────────────────

@router.get("/nutrition/ingredients", response_model=List[FeedIngredientResponse])
async def list_ingredients(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(FeedIngredient).order_by(FeedIngredient.name).offset(skip).limit(limit)
    )
    return result.scalars().all()


@router.post("/nutrition/ingredients", response_model=FeedIngredientResponse, status_code=201)
async def create_ingredient(data: FeedIngredientCreate, db: AsyncSession = Depends(get_db)):
    obj = FeedIngredient(**data.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.put("/nutrition/ingredients/{ingredient_id}", response_model=FeedIngredientResponse)
async def update_ingredient(ingredient_id: int, data: FeedIngredientUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(FeedIngredient).where(FeedIngredient.id == ingredient_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Ingrédient non trouvé")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(obj, key, value)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.delete("/nutrition/ingredients/{ingredient_id}", status_code=204)
async def delete_ingredient(ingredient_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(FeedIngredient).where(FeedIngredient.id == ingredient_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Ingrédient non trouvé")
    await db.delete(obj)
    await db.commit()


# ── Nutrition — Mélanges ──────────────────────────────────────────────────────

@router.get("/nutrition/mixes", response_model=List[FeedMixResponse])
async def list_mixes(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(FeedMix).order_by(FeedMix.name).offset(skip).limit(limit)
    )
    return result.scalars().all()


@router.post("/nutrition/mixes", response_model=FeedMixResponse, status_code=201)
async def create_mix(data: FeedMixCreate, db: AsyncSession = Depends(get_db)):
    obj = FeedMix(**data.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.get("/nutrition/mixes/{mix_id}", response_model=FeedMixResponse)
async def get_mix(mix_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(FeedMix).where(FeedMix.id == mix_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Mélange non trouvé")
    return obj


@router.put("/nutrition/mixes/{mix_id}", response_model=FeedMixResponse)
async def update_mix(mix_id: int, data: FeedMixUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(FeedMix).where(FeedMix.id == mix_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Mélange non trouvé")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(obj, key, value)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.delete("/nutrition/mixes/{mix_id}", status_code=204)
async def delete_mix(mix_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(FeedMix).where(FeedMix.id == mix_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Mélange non trouvé")
    await db.delete(obj)
    await db.commit()


# ── Nutrition — Plans ─────────────────────────────────────────────────────────

@router.get("/nutrition/plans", response_model=List[NutritionPlanResponse])
async def list_plans(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(NutritionPlan).order_by(NutritionPlan.name).offset(skip).limit(limit)
    )
    return result.scalars().all()


@router.post("/nutrition/plans", response_model=NutritionPlanResponse, status_code=201)
async def create_plan(data: NutritionPlanCreate, db: AsyncSession = Depends(get_db)):
    obj = NutritionPlan(**data.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.get("/nutrition/plans/{plan_id}", response_model=NutritionPlanResponse)
async def get_plan(plan_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(NutritionPlan).where(NutritionPlan.id == plan_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Plan non trouvé")
    return obj


@router.put("/nutrition/plans/{plan_id}", response_model=NutritionPlanResponse)
async def update_plan(plan_id: int, data: NutritionPlanUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(NutritionPlan).where(NutritionPlan.id == plan_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Plan non trouvé")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(obj, key, value)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.delete("/nutrition/plans/{plan_id}", status_code=204)
async def delete_plan(plan_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(NutritionPlan).where(NutritionPlan.id == plan_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Plan non trouvé")
    await db.delete(obj)
    await db.commit()


# ── Suppléments ───────────────────────────────────────────────────────────────

@router.get("/supplements", response_model=List[SupplementResponse])
async def list_supplements(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Supplement).order_by(Supplement.name).offset(skip).limit(limit)
    )
    return result.scalars().all()


@router.post("/supplements", response_model=SupplementResponse, status_code=201)
async def create_supplement(data: SupplementCreate, db: AsyncSession = Depends(get_db)):
    obj = Supplement(**data.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.get("/supplements/{supplement_id}", response_model=SupplementResponse)
async def get_supplement(supplement_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Supplement).where(Supplement.id == supplement_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Supplément non trouvé")
    return obj


@router.put("/supplements/{supplement_id}", response_model=SupplementResponse)
async def update_supplement(supplement_id: int, data: SupplementUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Supplement).where(Supplement.id == supplement_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Supplément non trouvé")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(obj, key, value)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.delete("/supplements/{supplement_id}", status_code=204)
async def delete_supplement(supplement_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Supplement).where(Supplement.id == supplement_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Supplément non trouvé")
    await db.delete(obj)
    await db.commit()
