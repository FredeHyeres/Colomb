"""
Schémas Pydantic v2 pour le domaine IA.
"""

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


# ── AIRecommendation ──────────────────────────────────────────────────────────

class AIRecommendationBase(BaseModel):
    """Champs communs pour une recommandation IA."""
    pigeon_id: str
    recommendation_type: str
    severity: str
    title: str
    message: str
    source: str = "expert_rules"


class AIRecommendationCreate(AIRecommendationBase):
    """Schéma de création d'une recommandation IA."""
    pass


class AIRecommendationRead(AIRecommendationBase):
    """Schéma de lecture d'une recommandation IA."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    resolved: bool


# ── AITrainingSnapshot ────────────────────────────────────────────────────────

class AITrainingSnapshotRead(BaseModel):
    """Schéma de lecture d'un snapshot sportif."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    pigeon_id: str
    snapshot_date: date
    age_days: Optional[int] = None
    training_load_7d: Optional[float] = None
    training_load_30d: Optional[float] = None
    recovery_avg_7d: Optional[float] = None
    condition_avg_7d: Optional[float] = None
    hydration_avg_7d: Optional[float] = None
    nutrition_energy_avg: Optional[float] = None
    nutrition_protein_avg: Optional[float] = None
    nutrition_fat_avg: Optional[float] = None
    average_temperature: Optional[float] = None
    average_humidity: Optional[float] = None
    wind_exposure_index: Optional[float] = None
    upcoming_race_distance: Optional[float] = None
    regularity_index: Optional[float] = None
    recovery_index: Optional[float] = None
    condition_index: Optional[float] = None
    performance_label: Optional[str] = None


# ── SportEvent ────────────────────────────────────────────────────────────────

class SportEventBase(BaseModel):
    """Champs communs pour un événement sportif."""
    pigeon_id: str
    event_type: str
    event_date: date
    payload_json: Optional[str] = None


class SportEventCreate(SportEventBase):
    """Schéma de création d'un événement sportif."""
    pass


class SportEventRead(SportEventBase):
    """Schéma de lecture d'un événement sportif."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


# ── AIDashboardResponse ───────────────────────────────────────────────────────

class AIDashboardResponse(BaseModel):
    """Résumé IA complet pour un pigeon (tableau de bord)."""
    pigeon_id: str
    active_recommendations: list[AIRecommendationRead]
    latest_snapshot: Optional[AITrainingSnapshotRead] = None
    # Indices calculés du dernier snapshot pour affichage rapide
    recovery_index: Optional[float] = None
    condition_index: Optional[float] = None
    regularity_index: Optional[float] = None
    performance_label: Optional[str] = None
    total_active_critical: int = 0
    total_active_warnings: int = 0
