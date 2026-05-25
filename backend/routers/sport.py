"""
Router FastAPI pour le domaine SPORT :
  - Séances d'entraînement et résultats
  - Dashboard analytique
  - Nutrition : ingrédients, mélanges, plans
  - Suppléments
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List

from database import get_db
from models.sport import (
    TrainingSession, PigeonTrainingResult,
    FeedIngredient, FeedMix, FeedMixIngredient,
    NutritionPlan, NutritionPlanDay,
    Supplement,
)
from schemas.sport import (
    TrainingSessionCreate, TrainingSessionUpdate, TrainingSessionResponse,
    PigeonTrainingResultCreate, PigeonTrainingResultResponse,
    FeedIngredientCreate, FeedIngredientUpdate, FeedIngredientResponse,
    FeedMixCreate, FeedMixUpdate, FeedMixResponse,
    NutritionPlanCreate, NutritionPlanResponse,
    SupplementCreate, SupplementUpdate, SupplementResponse,
    SportDashboardResponse, PigeonSportHistoryResponse,
)
from services.training_service import get_pigeon_training_history
from services.analytics_service import get_sport_dashboard, get_pigeon_sport_summary

router = APIRouter()


# ── Séances d'entraînement ────────────────────────────────────────────────────

@router.get("/sport/sessions", response_model=List[TrainingSessionResponse])
async def list_sessions(
    skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)
):
    """Liste toutes les séances d'entraînement, du plus récent au plus ancien."""
    result = await db.execute(
        select(TrainingSession)
        .order_by(TrainingSession.date.desc())
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()


@router.post("/sport/sessions", response_model=TrainingSessionResponse, status_code=201)
async def create_session(
    payload: TrainingSessionCreate, db: AsyncSession = Depends(get_db)
):
    """Crée une nouvelle séance d'entraînement."""
    session = TrainingSession(**payload.model_dump())
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


@router.get("/sport/sessions/{session_id}", response_model=TrainingSessionResponse)
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


@router.put("/sport/sessions/{session_id}", response_model=TrainingSessionResponse)
async def update_session(
    session_id: int, payload: TrainingSessionUpdate, db: AsyncSession = Depends(get_db)
):
    """Met à jour une séance d'entraînement."""
    result = await db.execute(select(TrainingSession).where(TrainingSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Séance non trouvée")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(session, key, value)
    await db.commit()
    await db.refresh(session)
    return session


@router.delete("/sport/sessions/{session_id}", status_code=204)
async def delete_session(session_id: int, db: AsyncSession = Depends(get_db)):
    """Supprime une séance (et ses résultats par cascade)."""
    result = await db.execute(select(TrainingSession).where(TrainingSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Séance non trouvée")
    await db.delete(session)
    await db.commit()


@router.post(
    "/sport/sessions/{session_id}/results",
    response_model=PigeonTrainingResultResponse,
    status_code=201,
)
async def add_result(
    session_id: int,
    payload: PigeonTrainingResultCreate,
    db: AsyncSession = Depends(get_db),
):
    """Ajoute le résultat d'un pigeon pour une séance."""
    # Vérifier que la séance existe
    r = await db.execute(select(TrainingSession).where(TrainingSession.id == session_id))
    if not r.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Séance non trouvée")

    data = payload.model_dump()
    data["session_id"] = session_id  # forcer le bon session_id
    result_obj = PigeonTrainingResult(**data)
    db.add(result_obj)
    await db.commit()
    await db.refresh(result_obj)
    return result_obj


# ── Historique pigeon ─────────────────────────────────────────────────────────

@router.get(
    "/sport/pigeons/{pigeon_id}/history",
    response_model=PigeonSportHistoryResponse,
)
async def pigeon_history(pigeon_id: str, db: AsyncSession = Depends(get_db)):
    """Retourne l'historique sport complet d'un pigeon avec ses indices calculés."""
    summary = await get_pigeon_sport_summary(db, pigeon_id)
    results = await get_pigeon_training_history(db, pigeon_id)
    return {**summary, "results": results}


# ── Dashboard analytique ──────────────────────────────────────────────────────

@router.get("/sport/dashboard", response_model=SportDashboardResponse)
async def dashboard(db: AsyncSession = Depends(get_db)):
    """Retourne les statistiques globales du domaine sport."""
    return await get_sport_dashboard(db)


# ── Nutrition — Ingrédients ───────────────────────────────────────────────────

@router.get("/sport/nutrition/ingredients", response_model=List[FeedIngredientResponse])
async def list_ingredients(
    skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(FeedIngredient).order_by(FeedIngredient.name).offset(skip).limit(limit)
    )
    return result.scalars().all()


@router.post(
    "/sport/nutrition/ingredients",
    response_model=FeedIngredientResponse,
    status_code=201,
)
async def create_ingredient(
    payload: FeedIngredientCreate, db: AsyncSession = Depends(get_db)
):
    obj = FeedIngredient(**payload.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.put(
    "/sport/nutrition/ingredients/{ingredient_id}",
    response_model=FeedIngredientResponse,
)
async def update_ingredient(
    ingredient_id: int,
    payload: FeedIngredientUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(FeedIngredient).where(FeedIngredient.id == ingredient_id)
    )
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Ingrédient non trouvé")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, key, value)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.delete("/sport/nutrition/ingredients/{ingredient_id}", status_code=204)
async def delete_ingredient(ingredient_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(FeedIngredient).where(FeedIngredient.id == ingredient_id)
    )
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Ingrédient non trouvé")
    await db.delete(obj)
    await db.commit()


# ── Nutrition — Mélanges ──────────────────────────────────────────────────────

@router.get("/sport/nutrition/mixes", response_model=List[FeedMixResponse])
async def list_mixes(
    skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(FeedMix)
        .options(selectinload(FeedMix.ingredients).selectinload(FeedMixIngredient.ingredient))
        .order_by(FeedMix.name)
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()


@router.post("/sport/nutrition/mixes", response_model=FeedMixResponse, status_code=201)
async def create_mix(payload: FeedMixCreate, db: AsyncSession = Depends(get_db)):
    """Crée un mélange avec ses ingrédients."""
    data = payload.model_dump(exclude={"ingredients"})
    mix = FeedMix(**data)
    db.add(mix)
    await db.flush()

    if payload.ingredients:
        for ing_data in payload.ingredients:
            fmi = FeedMixIngredient(
                mix_id=mix.id,
                ingredient_id=ing_data.ingredient_id,
                percentage=ing_data.percentage,
            )
            db.add(fmi)

    await db.commit()
    # Recharger avec les relations
    result = await db.execute(
        select(FeedMix)
        .options(selectinload(FeedMix.ingredients).selectinload(FeedMixIngredient.ingredient))
        .where(FeedMix.id == mix.id)
    )
    return result.scalar_one()


@router.get("/sport/nutrition/mixes/{mix_id}", response_model=FeedMixResponse)
async def get_mix(mix_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(FeedMix)
        .options(selectinload(FeedMix.ingredients).selectinload(FeedMixIngredient.ingredient))
        .where(FeedMix.id == mix_id)
    )
    mix = result.scalar_one_or_none()
    if not mix:
        raise HTTPException(status_code=404, detail="Mélange non trouvé")
    return mix


# ── Nutrition — Plans ─────────────────────────────────────────────────────────

@router.get("/sport/nutrition/plans", response_model=List[NutritionPlanResponse])
async def list_plans(
    skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(NutritionPlan)
        .options(selectinload(NutritionPlan.days))
        .order_by(NutritionPlan.name)
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()


@router.post("/sport/nutrition/plans", response_model=NutritionPlanResponse, status_code=201)
async def create_plan(payload: NutritionPlanCreate, db: AsyncSession = Depends(get_db)):
    """Crée un plan nutritionnel avec ses jours."""
    data = payload.model_dump(exclude={"days"})
    plan = NutritionPlan(**data)
    db.add(plan)
    await db.flush()

    if payload.days:
        for day_data in payload.days:
            day = NutritionPlanDay(plan_id=plan.id, **day_data.model_dump())
            db.add(day)

    await db.commit()
    result = await db.execute(
        select(NutritionPlan)
        .options(selectinload(NutritionPlan.days))
        .where(NutritionPlan.id == plan.id)
    )
    return result.scalar_one()


@router.get("/sport/nutrition/plans/{plan_id}", response_model=NutritionPlanResponse)
async def get_plan(plan_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(NutritionPlan)
        .options(selectinload(NutritionPlan.days))
        .where(NutritionPlan.id == plan_id)
    )
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan non trouvé")
    return plan


# ── Suppléments ───────────────────────────────────────────────────────────────

@router.get("/sport/supplements", response_model=List[SupplementResponse])
async def list_supplements(
    skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Supplement).order_by(Supplement.name).offset(skip).limit(limit)
    )
    return result.scalars().all()


@router.post("/sport/supplements", response_model=SupplementResponse, status_code=201)
async def create_supplement(payload: SupplementCreate, db: AsyncSession = Depends(get_db)):
    obj = Supplement(**payload.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj
