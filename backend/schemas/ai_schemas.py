from pydantic import BaseModel, ConfigDict, field_validator
from typing import Optional, List, Any
from datetime import date, datetime


class AIRecommendationBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    pigeon_id: str
    score_forme: Optional[float] = None
    score_endurance: Optional[float] = None
    score_vitesse: Optional[float] = None
    score_global: Optional[float] = None
    tendance: Optional[str] = None
    recommendation: Optional[str] = None
    confiance: Optional[float] = None
    facteurs_explicatifs: Optional[Any] = None  # JSON parsé en lecture
    title: Optional[str] = None
    message: Optional[str] = None
    action: Optional[str] = None
    resolved_at: Optional[datetime] = None
    outcome: Optional[str] = None
    outcome_notes: Optional[str] = None
    outcome_date: Optional[date] = None


class AIRecommendationResponse(AIRecommendationBase):
    id: int
    generated_at: datetime
    resolved: bool
    created_at: datetime


class AISnapshotBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    pigeon_id: str
    snapshot_date: date
    snapshot_version: str = "v1"
    feature_set_version: str = "core_v1"
    features: Optional[Any] = None  # JSON parsé en lecture


class AISnapshotResponse(AISnapshotBase):
    id: int
    created_at: datetime


class SportEventBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    pigeon_id: str
    event_type: str
    event_date: date
    payload: Optional[Any] = None  # JSON parsé en lecture


class SportEventCreate(SportEventBase):
    pass


class SportEventResponse(SportEventBase):
    id: int
    created_at: datetime


class ConcoursFeedbackCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    pigeon_id: str
    snapshot_id: Optional[int] = None
    recommendation_id: Optional[int] = None
    concours_date: date
    distance_km: Optional[float] = None
    conditions_meteo: Optional[str] = None
    outcome: str
    classement: Optional[int] = None
    vitesse_mpm: Optional[float] = None
    nb_engages: Optional[int] = None
    notes: Optional[str] = None
    share_anonymized: bool = False


class ConcoursFeedbackResponse(ConcoursFeedbackCreate):
    id: int
    created_at: datetime


class AnonymizedSnapshot(BaseModel):
    """Export anonymisé pour le modèle collectif — aucune donnée identifiante."""
    recovery_avg_7d: Optional[float] = None
    recovery_avg_30d: Optional[float] = None
    condition_avg_7d: Optional[float] = None
    regularity_index: Optional[float] = None
    training_load_30d: Optional[int] = None
    fatigue_risk: Optional[str] = None
    recovery_trend: Optional[str] = None
    load_ratio: Optional[float] = None
    distance_km: Optional[float] = None
    conditions_meteo: Optional[str] = None
    outcome: str
    region: Optional[str] = None
    systeme: Optional[str] = None
    snapshot_version: str = "core_v1"


class AIDashboardResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    pigeon_id: str
    last_recommendation: Optional[AIRecommendationResponse] = None
    score_global: Optional[float] = None
    tendance: Optional[str] = None
    snapshots_count: int = 0
    events_recents: List[SportEventResponse] = []
