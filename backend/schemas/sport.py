from pydantic import BaseModel, ConfigDict, field_validator
from typing import Optional, List
from datetime import date, datetime
from enum import Enum


class SessionTypeEnum(str, Enum):
    loft = "loft"
    toss = "toss"
    race = "race"


class IngredientCategoryEnum(str, Enum):
    energie = "energie"
    depuratif = "depuratif"
    sport = "sport"
    proteine = "proteine"
    graisse = "graisse"
    motivation = "motivation"
    pre_concours = "pre_concours"


class MixUsageEnum(str, Enum):
    recuperation = "recuperation"
    entrainement = "entrainement"
    pre_panier = "pre_panier"
    enlogement = "enlogement"


class SupplementTypeEnum(str, Enum):
    electrolyte = "electrolyte"
    vitamine = "vitamine"
    probiotique = "probiotique"
    autre = "autre"


# ── TrainingSession ───────────────────────────────────────────────────────────

class TrainingSessionBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    date: date
    session_type: SessionTypeEnum
    distance_km: Optional[float] = None
    weather: Optional[str] = None
    temperature: Optional[float] = None
    wind_speed: Optional[float] = None
    wind_direction: Optional[str] = None
    notes: Optional[str] = None


class TrainingSessionCreate(TrainingSessionBase):
    pass


class TrainingSessionUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    date: Optional[date] = None
    session_type: Optional[SessionTypeEnum] = None
    distance_km: Optional[float] = None
    weather: Optional[str] = None
    temperature: Optional[float] = None
    wind_speed: Optional[float] = None
    wind_direction: Optional[str] = None
    notes: Optional[str] = None


class TrainingSessionResponse(TrainingSessionBase):
    id: int
    created_at: datetime
    results: List['PigeonTrainingResultResponse'] = []


# ── PigeonTrainingResult ──────────────────────────────────────────────────────

class PigeonTrainingResultBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    pigeon_id: str
    return_time: Optional[float] = None
    internal_rank: Optional[int] = None
    recovery_score: Optional[int] = None
    motivation_score: Optional[int] = None
    condition_score: Optional[int] = None
    hydration_score: Optional[int] = None
    notes: Optional[str] = None

    @field_validator("recovery_score", "motivation_score", "condition_score", "hydration_score", mode="before")
    @classmethod
    def validate_score(cls, v):
        if v is not None:
            v = int(round(float(v)))
            if not (0 <= v <= 10):
                raise ValueError("Score doit être entre 0 et 10")
        return v


class PigeonTrainingResultCreate(PigeonTrainingResultBase):
    pass


class PigeonTrainingResultResponse(PigeonTrainingResultBase):
    id: int
    session_id: int
    created_at: datetime


# Résolution de la référence forward dans TrainingSessionResponse.results
TrainingSessionResponse.model_rebuild()


# ── FeedIngredient ────────────────────────────────────────────────────────────

class FeedIngredientBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    name: str
    category: Optional[str] = None
    description: Optional[str] = None


class FeedIngredientCreate(FeedIngredientBase):
    pass


class FeedIngredientUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None


class FeedIngredientResponse(FeedIngredientBase):
    id: int
    created_at: datetime


# ── FeedMix ───────────────────────────────────────────────────────────────────

class FeedMixBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    name: str
    usage: Optional[str] = None
    description: Optional[str] = None
    composition: Optional[str] = None  # JSON string


class FeedMixCreate(FeedMixBase):
    pass


class FeedMixUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    name: Optional[str] = None
    usage: Optional[str] = None
    description: Optional[str] = None
    composition: Optional[str] = None


class FeedMixResponse(FeedMixBase):
    id: int
    created_at: datetime


# ── NutritionPlan ─────────────────────────────────────────────────────────────

class NutritionPlanBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    name: str
    goal: Optional[str] = None
    description: Optional[str] = None
    composition: Optional[str] = None  # JSON string
    mix_id: Optional[int] = None
    lundi: Optional[str] = None
    mardi: Optional[str] = None
    mercredi: Optional[str] = None
    jeudi: Optional[str] = None
    vendredi: Optional[str] = None
    samedi: Optional[str] = None
    dimanche: Optional[str] = None


class NutritionPlanCreate(NutritionPlanBase):
    pass


class NutritionPlanUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    name: Optional[str] = None
    goal: Optional[str] = None
    description: Optional[str] = None
    composition: Optional[str] = None
    mix_id: Optional[int] = None
    lundi: Optional[str] = None
    mardi: Optional[str] = None
    mercredi: Optional[str] = None
    jeudi: Optional[str] = None
    vendredi: Optional[str] = None
    samedi: Optional[str] = None
    dimanche: Optional[str] = None


class NutritionPlanResponse(NutritionPlanBase):
    id: int
    created_at: datetime


# ── Supplement ────────────────────────────────────────────────────────────────

class SupplementBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    name: str
    type: Optional[str] = None
    description: Optional[str] = None
    dosage: Optional[str] = None


class SupplementCreate(SupplementBase):
    pass


class SupplementUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    name: Optional[str] = None
    type: Optional[str] = None
    description: Optional[str] = None
    dosage: Optional[str] = None


class SupplementResponse(SupplementBase):
    id: int
    created_at: datetime


# ── NutritionAssignment ───────────────────────────────────────────────────────

class NutritionAssignmentBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    plan_id: int
    pigeon_id: Optional[str] = None
    group_name: Optional[str] = None
    day_of_week: int  # 0=lundi, 6=dimanche
    week_start: date


class NutritionAssignmentCreate(NutritionAssignmentBase):
    pass


class NutritionAssignmentResponse(NutritionAssignmentBase):
    id: int
    created_at: datetime
    plan: Optional[NutritionPlanResponse] = None


# ── NutritionResolved ─────────────────────────────────────────────────────────

class NutritionResolvedDay(BaseModel):
    day_of_week: int
    plan: Optional[NutritionPlanResponse] = None
    source: Optional[str] = None  # "individual" | "group"


class NutritionResolvedResponse(BaseModel):
    pigeon_id: str
    week_start: date
    days: List[NutritionResolvedDay]


# ── Dashboard ─────────────────────────────────────────────────────────────────

class SportDashboardResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    total_sessions: int
    pigeons_en_forme: int
    alertes_actives: int
    sessions_recentes: List[TrainingSessionResponse] = []
    top_pigeons: List[dict] = []
