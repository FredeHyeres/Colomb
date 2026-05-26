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


class AIDashboardResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    pigeon_id: str
    last_recommendation: Optional[AIRecommendationResponse] = None
    score_global: Optional[float] = None
    tendance: Optional[str] = None
    snapshots_count: int = 0
    events_recents: List[SportEventResponse] = []
