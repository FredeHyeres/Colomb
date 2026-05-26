import enum
from sqlalchemy import Column, String, Integer, Float, Date, DateTime, ForeignKey, Enum as SAEnum, Text, Table
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database import Base


# Enums (sans accents, sans majuscules)
class SessionType(enum.Enum):
    loft = "loft"
    toss = "toss"
    race = "race"


class IngredientCategory(enum.Enum):
    energie = "energie"
    depuratif = "depuratif"
    sport = "sport"
    proteine = "proteine"
    graisse = "graisse"
    motivation = "motivation"
    pre_concours = "pre_concours"


class MixUsage(enum.Enum):
    recuperation = "recuperation"
    entrainement = "entrainement"
    pre_panier = "pre_panier"
    enlogement = "enlogement"


class SupplementType(enum.Enum):
    electrolyte = "electrolyte"
    vitamine = "vitamine"
    probiotique = "probiotique"
    autre = "autre"


# Table association FeedMix <-> FeedIngredient
feed_mix_ingredients = Table(
    "feed_mix_ingredients",
    Base.metadata,
    Column("mix_id", Integer, ForeignKey("feed_mixes.id"), primary_key=True),
    Column("ingredient_id", Integer, ForeignKey("feed_ingredients.id"), primary_key=True),
    Column("percentage", Float, nullable=False, default=0.0),
)


class TrainingSession(Base):
    __tablename__ = "training_sessions"
    id = Column(Integer, primary_key=True, autoincrement=True)
    date = Column(Date, nullable=False)
    session_type = Column(SAEnum(SessionType), nullable=False)
    distance_km = Column(Float, nullable=True)
    weather = Column(String(100), nullable=True)
    temperature = Column(Float, nullable=True)
    wind_speed = Column(Float, nullable=True)
    wind_direction = Column(String(20), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    results = relationship("PigeonTrainingResult", back_populates="session", cascade="all, delete-orphan")


class PigeonTrainingResult(Base):
    __tablename__ = "pigeon_training_results"
    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("training_sessions.id"), nullable=False)
    pigeon_id = Column(String, ForeignKey("pigeons.id"), nullable=False)
    return_time = Column(Float, nullable=True)
    internal_rank = Column(Integer, nullable=True)
    recovery_score = Column(Integer, nullable=True)
    motivation_score = Column(Integer, nullable=True)
    condition_score = Column(Integer, nullable=True)
    hydration_score = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    session = relationship("TrainingSession", back_populates="results")
    pigeon = relationship("Pigeon")


class FeedIngredient(Base):
    __tablename__ = "feed_ingredients"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, unique=True)
    category = Column(SAEnum(IngredientCategory), nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class FeedMix(Base):
    __tablename__ = "feed_mixes"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, unique=True)
    usage = Column(SAEnum(MixUsage), nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    ingredients = relationship("FeedIngredient", secondary=feed_mix_ingredients)


class NutritionPlan(Base):
    __tablename__ = "nutrition_plans"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, unique=True)
    goal = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    composition = Column(Text, nullable=True)  # JSON: [{"ingredient_id": 1, "ingredient_name": "Blé", "percentage": 60}, ...]
    lundi = Column(String(200), nullable=True)
    mardi = Column(String(200), nullable=True)
    mercredi = Column(String(200), nullable=True)
    jeudi = Column(String(200), nullable=True)
    vendredi = Column(String(200), nullable=True)
    samedi = Column(String(200), nullable=True)
    dimanche = Column(String(200), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class NutritionAssignment(Base):
    __tablename__ = "nutrition_assignments"
    id = Column(Integer, primary_key=True, autoincrement=True)
    plan_id = Column(Integer, ForeignKey("nutrition_plans.id"), nullable=False)
    pigeon_id = Column(String, ForeignKey("pigeons.id"), nullable=True)   # null = assignation groupe
    group_name = Column(String(50), nullable=True)                         # null = assignation individuelle
    day_of_week = Column(Integer, nullable=False)                          # 0=lundi, 6=dimanche
    week_start = Column(Date, nullable=False)                              # lundi de la semaine
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    plan = relationship("NutritionPlan")


class Supplement(Base):
    __tablename__ = "supplements"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, unique=True)
    type = Column(SAEnum(SupplementType), nullable=True)
    description = Column(Text, nullable=True)
    dosage = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
