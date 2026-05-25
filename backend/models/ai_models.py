"""
Modèles SQLAlchemy pour le domaine IA :
  - AIRecommendation : recommandations générées par les règles métier
  - AITrainingSnapshot : instantané sportif d'un pigeon à une date donnée
  - SportEvent : journal d'événements sportifs (event store)
"""

from datetime import date, datetime
from typing import Optional

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from database import Base


class AIRecommendation(Base):
    """Recommandation générée par le moteur de règles IA pour un pigeon."""
    __tablename__ = "ai_recommendations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    pigeon_id: Mapped[str] = mapped_column(String, ForeignKey("pigeons.id"), nullable=False, index=True)

    # Type de recommandation
    recommendation_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # fatigue_risk / hydration_warning / nutrition_adjustment / overload_warning / recovery_alert / conditioning_advice

    # Niveau de sévérité
    severity: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # info / warning / critical

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)

    # Source de la recommandation
    source: Mapped[str] = mapped_column(
        String(50), nullable=False, default="expert_rules"
    )  # expert_rules / ml_model / analytics

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    resolved: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relation vers le pigeon
    pigeon: Mapped["Pigeon"] = relationship("Pigeon")  # type: ignore[name-defined]

    __table_args__ = (
        Index("ix_ai_rec_pigeon_resolved", "pigeon_id", "resolved"),
    )


class AITrainingSnapshot(Base):
    """Instantané complet de l'état sportif d'un pigeon à une date donnée."""
    __tablename__ = "ai_training_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    pigeon_id: Mapped[str] = mapped_column(String, ForeignKey("pigeons.id"), nullable=False, index=True)
    snapshot_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)

    # Caractéristiques du pigeon
    age_days: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Charge d'entraînement
    training_load_7d: Mapped[Optional[float]] = mapped_column(Float, nullable=True)   # nb séances 7 derniers jours
    training_load_30d: Mapped[Optional[float]] = mapped_column(Float, nullable=True)  # nb séances 30 derniers jours

    # Scores moyens sur 7 jours
    recovery_avg_7d: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    condition_avg_7d: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    hydration_avg_7d: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Nutrition moyenne
    nutrition_energy_avg: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    nutrition_protein_avg: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    nutrition_fat_avg: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Conditions climatiques moyennes
    average_temperature: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    average_humidity: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    wind_exposure_index: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Contexte course
    upcoming_race_distance: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Indices calculés
    regularity_index: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    recovery_index: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    condition_index: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Label de performance classifié
    performance_label: Mapped[Optional[str]] = mapped_column(
        String(20), nullable=True
    )  # excellent / good / average / poor

    # Relation vers le pigeon
    pigeon: Mapped["Pigeon"] = relationship("Pigeon")  # type: ignore[name-defined]

    __table_args__ = (
        Index("ix_ai_snapshot_pigeon_date", "pigeon_id", "snapshot_date"),
    )


class SportEvent(Base):
    """Journal d'événements sportifs (event store) pour un pigeon."""
    __tablename__ = "sport_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    pigeon_id: Mapped[str] = mapped_column(String, ForeignKey("pigeons.id"), nullable=False, index=True)

    # Type d'événement
    event_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # training / nutrition / recovery / race / health / hydration

    event_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)

    # Données complémentaires en JSON sérialisé
    payload_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    # Relation vers le pigeon
    pigeon: Mapped["Pigeon"] = relationship("Pigeon")  # type: ignore[name-defined]

    __table_args__ = (
        Index("ix_sport_event_pigeon_type_date", "pigeon_id", "event_type", "event_date"),
    )
