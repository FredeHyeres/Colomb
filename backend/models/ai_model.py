import enum
import json
from sqlalchemy import Column, String, Integer, Float, Date, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database import Base


class Tendance(enum.Enum):
    progression = "progression"
    stable = "stable"
    declin = "declin"


class RecommendationType(enum.Enum):
    concours = "concours"
    repos = "repos"
    entrainement_leger = "entrainement_leger"
    reforme = "reforme"


class AIRecommendation(Base):
    __tablename__ = "ai_recommendations"
    id = Column(Integer, primary_key=True, autoincrement=True)
    pigeon_id = Column(String, ForeignKey("pigeons.id"), nullable=False, index=True)
    generated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    score_forme = Column(Float, nullable=True)        # 0-100
    score_endurance = Column(Float, nullable=True)    # 0-100
    score_vitesse = Column(Float, nullable=True)      # 0-100
    score_global = Column(Float, nullable=True)       # 0-100
    tendance = Column(String(20), nullable=True)      # progression/stable/declin
    recommendation = Column(String(30), nullable=True)  # concours/repos/entrainement_leger/reforme
    confiance = Column(Float, nullable=True)          # 0-1
    facteurs_explicatifs = Column(Text, nullable=True)  # JSON sérialisé
    title = Column(String(120), nullable=True)
    message = Column(Text, nullable=True)
    action = Column(Text, nullable=True)
    resolved = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    pigeon = relationship("Pigeon")


class AISnapshot(Base):
    __tablename__ = "ai_snapshots"
    id = Column(Integer, primary_key=True, autoincrement=True)
    pigeon_id = Column(String, ForeignKey("pigeons.id"), nullable=False, index=True)
    snapshot_date = Column(Date, nullable=False, index=True)
    snapshot_version = Column(String(20), default="v1", nullable=False)
    feature_set_version = Column(String(20), default="core_v1", nullable=False)
    features = Column(Text, nullable=True)  # JSON sérialisé — 20 features
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    pigeon = relationship("Pigeon")


class SportEvent(Base):
    __tablename__ = "sport_events"
    id = Column(Integer, primary_key=True, autoincrement=True)
    pigeon_id = Column(String, ForeignKey("pigeons.id"), nullable=False, index=True)
    event_type = Column(String(50), nullable=False)  # training/nutrition/recovery/race/health/recommendation_generated
    event_date = Column(Date, nullable=False, index=True)
    payload = Column(Text, nullable=True)  # JSON sérialisé
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    pigeon = relationship("Pigeon")
