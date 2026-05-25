"""
Schémas Pydantic v2 pour le domaine SPORT.
"""

from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import date, datetime

from models.sport import SessionType


# ── TrainingSession ───────────────────────────────────────────────────────────

class TrainingSessionBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    date: date
    session_type: SessionType
    distance_km: Optional[float] = None
    weather: Optional[str] = None
    temperature_c: Optional[float] = None
    wind: Optional[str] = None
    notes: Optional[str] = None


class TrainingSessionCreate(TrainingSessionBase):
    pass


class TrainingSessionUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    date: Optional[date] = None
    session_type: Optional[SessionType] = None
    distance_km: Optional[float] = None
    weather: Optional[str] = None
    temperature_c: Optional[float] = None
    wind: Optional[str] = None
    notes: Optional[str] = None


class TrainingSessionResponse(TrainingSessionBase):
    id: int
    created_at: datetime


# ── PigeonTrainingResult ──────────────────────────────────────────────────────

class PigeonTrainingResultBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    pigeon_id: str
    session_id: int
    return_time_minutes: Optional[float] = None
    internal_rank: Optional[int] = None
    recovery_score: Optional[int] = None
    motivation_score: Optional[int] = None
    condition_score: Optional[int] = None
    hydration_score: Optional[int] = None
    notes: Optional[str] = None


class PigeonTrainingResultCreate(PigeonTrainingResultBase):
    pass


class PigeonTrainingResultUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    return_time_minutes: Optional[float] = None
    internal_rank: Optional[int] = None
    recovery_score: Optional[int] = None
    motivation_score: Optional[int] = None
    condition_score: Optional[int] = None
    hydration_score: Optional[int] = None
    notes: Optional[str] = None


class PigeonTrainingResultResponse(PigeonTrainingResultBase):
    id: int


# ── FeedIngredient ────────────────────────────────────────────────────────────

class FeedIngredientBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str
    category: Optional[str] = None
    protein_pct: Optional[float] = None
    fat_pct: Optional[float] = None
    carbs_pct: Optional[float] = None
    energy_index: Optional[float] = None
    digestion_speed: Optional[str] = None
    notes: Optional[str] = None


class FeedIngredientCreate(FeedIngredientBase):
    pass


class FeedIngredientUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: Optional[str] = None
    category: Optional[str] = None
    protein_pct: Optional[float] = None
    fat_pct: Optional[float] = None
    carbs_pct: Optional[float] = None
    energy_index: Optional[float] = None
    digestion_speed: Optional[str] = None
    notes: Optional[str] = None


class FeedIngredientResponse(FeedIngredientBase):
    id: int


# ── FeedMixIngredient ─────────────────────────────────────────────────────────

class FeedMixIngredientCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    ingredient_id: int
    percentage: float


class FeedMixIngredientResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    ingredient_id: int
    percentage: float
    ingredient: Optional[FeedIngredientResponse] = None


# ── FeedMix ───────────────────────────────────────────────────────────────────

class FeedMixBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str
    category: Optional[str] = None
    description: Optional[str] = None


class FeedMixCreate(FeedMixBase):
    ingredients: Optional[List[FeedMixIngredientCreate]] = None


class FeedMixUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None


class FeedMixResponse(FeedMixBase):
    id: int
    ingredients: List[FeedMixIngredientResponse] = []


# ── NutritionPlan ─────────────────────────────────────────────────────────────

class NutritionPlanDayCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    day_of_week: int  # 0-6
    mix_id: Optional[int] = None
    quantity_grams: Optional[float] = None
    supplements: Optional[str] = None


class NutritionPlanDayResponse(NutritionPlanDayCreate):
    plan_id: int


class NutritionPlanBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str
    category: Optional[str] = None
    target_type: Optional[str] = None
    description: Optional[str] = None


class NutritionPlanCreate(NutritionPlanBase):
    days: Optional[List[NutritionPlanDayCreate]] = None


class NutritionPlanUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: Optional[str] = None
    category: Optional[str] = None
    target_type: Optional[str] = None
    description: Optional[str] = None


class NutritionPlanResponse(NutritionPlanBase):
    id: int
    days: List[NutritionPlanDayResponse] = []


# ── Supplement ────────────────────────────────────────────────────────────────

class SupplementBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str
    category: Optional[str] = None
    usage_notes: Optional[str] = None
    dosage: Optional[str] = None


class SupplementCreate(SupplementBase):
    pass


class SupplementUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: Optional[str] = None
    category: Optional[str] = None
    usage_notes: Optional[str] = None
    dosage: Optional[str] = None


class SupplementResponse(SupplementBase):
    id: int


# ── Réponses analytiques ──────────────────────────────────────────────────────

class SportDashboardResponse(BaseModel):
    """Résumé analytique global du domaine sport."""
    model_config = ConfigDict(from_attributes=True)

    total_sessions: int
    total_results: int
    active_pigeons: int
    avg_recovery: Optional[float] = None
    avg_condition: Optional[float] = None
    best_recovery_pigeon_id: Optional[str] = None
    active_plan: Optional[str] = None


class PigeonSportHistoryResponse(BaseModel):
    """Historique sport d'un pigeon avec indices calculés."""
    model_config = ConfigDict(from_attributes=True)

    pigeon_id: str
    total_sessions: int
    recovery_index: float
    condition_index: float
    regularity_index: float
    results: List[PigeonTrainingResultResponse] = []
