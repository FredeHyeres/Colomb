"""
Modèles SQLAlchemy pour le domaine SPORT :
  - Séances d'entraînement et résultats par pigeon
  - Ingrédients alimentaires, mélanges, plans nutritionnels
  - Suppléments
"""

import enum
from datetime import date, datetime
from typing import Optional, List

from sqlalchemy import (
    String, Integer, Float, Date, DateTime, ForeignKey,
    Enum as SAEnum, Index, Text, PrimaryKeyConstraint
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from database import Base


# ── Enums ─────────────────────────────────────────────────────────────────────

class SessionType(enum.Enum):
    loft = "loft"
    toss = "toss"
    race = "race"


# ── Séances d'entraînement ────────────────────────────────────────────────────

class TrainingSession(Base):
    """Séance d'entraînement collective (loft, toss ou course)."""
    __tablename__ = "training_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    session_type: Mapped[SessionType] = mapped_column(SAEnum(SessionType), nullable=False)
    distance_km: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    weather: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    temperature_c: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    wind: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    # Relations
    results: Mapped[List["PigeonTrainingResult"]] = relationship(
        "PigeonTrainingResult", back_populates="session", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_training_sessions_date", "date"),
    )


class PigeonTrainingResult(Base):
    """Résultat individuel d'un pigeon pour une séance d'entraînement."""
    __tablename__ = "pigeon_training_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    pigeon_id: Mapped[str] = mapped_column(String, ForeignKey("pigeons.id"), nullable=False)
    session_id: Mapped[int] = mapped_column(Integer, ForeignKey("training_sessions.id"), nullable=False)

    # Temps de retour en minutes (null si pigeon non rentré)
    return_time_minutes: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    # Rang parmi les pigeons de la séance
    internal_rank: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Scores d'observation (1-10)
    recovery_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    motivation_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    condition_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    hydration_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relations
    session: Mapped["TrainingSession"] = relationship("TrainingSession", back_populates="results")
    pigeon: Mapped["Pigeon"] = relationship("Pigeon")  # type: ignore[name-defined]

    __table_args__ = (
        Index("ix_ptr_pigeon_id", "pigeon_id"),
        Index("ix_ptr_session_id", "session_id"),
    )


# ── Nutrition — Ingrédients ───────────────────────────────────────────────────

class FeedIngredient(Base):
    """Ingrédient de base entrant dans la composition des mélanges alimentaires."""
    __tablename__ = "feed_ingredients"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    category: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # céréale, légumineuse, graine…
    protein_pct: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    fat_pct: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    carbs_pct: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    energy_index: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    digestion_speed: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # lent/moyen/rapide
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relations
    mix_ingredients: Mapped[List["FeedMixIngredient"]] = relationship(
        "FeedMixIngredient", back_populates="ingredient"
    )


# ── Nutrition — Mélanges ──────────────────────────────────────────────────────

class FeedMix(Base):
    """Mélange alimentaire composé de plusieurs ingrédients."""
    __tablename__ = "feed_mixes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    category: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # entraînement, repos, course…
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relations
    ingredients: Mapped[List["FeedMixIngredient"]] = relationship(
        "FeedMixIngredient", back_populates="mix", cascade="all, delete-orphan"
    )
    plan_days: Mapped[List["NutritionPlanDay"]] = relationship(
        "NutritionPlanDay", back_populates="mix"
    )


class FeedMixIngredient(Base):
    """Table associative : composition d'un mélange (ingrédient + pourcentage)."""
    __tablename__ = "feed_mix_ingredients"

    mix_id: Mapped[int] = mapped_column(Integer, ForeignKey("feed_mixes.id"), primary_key=True)
    ingredient_id: Mapped[int] = mapped_column(Integer, ForeignKey("feed_ingredients.id"), primary_key=True)
    percentage: Mapped[float] = mapped_column(Float, nullable=False)  # 0–100

    # Relations
    mix: Mapped["FeedMix"] = relationship("FeedMix", back_populates="ingredients")
    ingredient: Mapped["FeedIngredient"] = relationship("FeedIngredient", back_populates="mix_ingredients")


# ── Nutrition — Plans ─────────────────────────────────────────────────────────

class NutritionPlan(Base):
    """Plan nutritionnel hebdomadaire."""
    __tablename__ = "nutrition_plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    category: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # entraînement, repos, course…
    target_type: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # yearling/old/breeding
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relations
    days: Mapped[List["NutritionPlanDay"]] = relationship(
        "NutritionPlanDay", back_populates="plan", cascade="all, delete-orphan"
    )


class NutritionPlanDay(Base):
    """Jour d'un plan nutritionnel (0=lundi … 6=dimanche)."""
    __tablename__ = "nutrition_plan_days"

    plan_id: Mapped[int] = mapped_column(Integer, ForeignKey("nutrition_plans.id"), nullable=False)
    day_of_week: Mapped[int] = mapped_column(Integer, nullable=False)  # 0-6
    mix_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("feed_mixes.id"), nullable=True)
    quantity_grams: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    supplements: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Clé primaire composite
    __table_args__ = (
        PrimaryKeyConstraint("plan_id", "day_of_week"),
    )

    # Relations
    plan: Mapped["NutritionPlan"] = relationship("NutritionPlan", back_populates="days")
    mix: Mapped[Optional["FeedMix"]] = relationship("FeedMix", back_populates="plan_days")


# ── Suppléments ───────────────────────────────────────────────────────────────

class Supplement(Base):
    """Supplément alimentaire ou vitaminique."""
    __tablename__ = "supplements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    category: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # vitamines, minéraux, probiotiques…
    usage_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    dosage: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
