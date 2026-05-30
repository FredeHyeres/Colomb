import enum
import uuid
from sqlalchemy import (
    Column, String, Integer, Float, Date, Text, ForeignKey,
    Enum as SAEnum, Boolean, UniqueConstraint
)
from sqlalchemy.orm import relationship
from database import Base


class StatutConcours(enum.Enum):
    a_venir = "a_venir"
    en_cours = "en_cours"
    termine = "termine"
    annule = "annule"


class CategorieConcours(enum.Enum):
    vieux_coqs = "vieux_coqs"
    yearlings = "yearlings"
    jeunes = "jeunes"
    femelles = "femelles"


class StatutEngagement(enum.Enum):
    engage = "engage"
    rentre_classe = "rentre_classe"
    rentre_non_classe = "rentre_non_classe"
    non_rentre_jour = "non_rentre_jour"
    perdu = "perdu"


class Concours(Base):
    __tablename__ = "concours"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    nom = Column(String(200), nullable=False)
    date = Column(Date, nullable=False)
    lieu_lacher = Column(String(200), nullable=True)
    distance_m = Column(Integer, nullable=True)          # mètres depuis le colombier
    heure_lacher = Column(String(8), nullable=True)      # "HH:MM:SS"
    nb_total_engages_officiel = Column(Integer, nullable=True)
    statut = Column(SAEnum(StatutConcours), default=StatutConcours.a_venir)
    notes = Column(Text, nullable=True)

    # Liaison avec le module Sport
    session_id = Column(Integer, ForeignKey("training_sessions.id"), nullable=True)

    # Traçabilité / future synchro fédération
    ref_fede = Column(String(100), nullable=True)        # ID externe FCF/PiRcube
    source = Column(String(50), nullable=True)           # "manuel", "import_fede", "import_csv"

    # Relations
    session = relationship("TrainingSession")
    engagements = relationship(
        "ConcoursEngagement",
        back_populates="concours",
        cascade="all, delete-orphan",
        order_by="ConcoursEngagement.categorie"
    )

    def __repr__(self):
        return f"<Concours {self.nom} {self.date}>"


class ConcoursEngagement(Base):
    __tablename__ = "concours_engagements"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    concours_id = Column(String, ForeignKey("concours.id"), nullable=False)
    pigeon_id = Column(String, ForeignKey("pigeons.id"), nullable=False)
    categorie = Column(SAEnum(CategorieConcours), nullable=False)
    mise = Column(Float, nullable=True)
    statut = Column(SAEnum(StatutEngagement), default=StatutEngagement.engage)

    # Constatation arrivée
    heure_arrivee = Column(String(8), nullable=True)         # "HH:MM:SS"
    correction_horloge_sec = Column(Integer, default=0)      # correction constateur (secondes)
    vitesse_m_min = Column(Float, nullable=True)             # calculée automatiquement
    source_arrivee = Column(String(20), nullable=True)       # "manuelle", "csv", "benzing"

    # Résultat officiel
    classement_officiel = Column(Integer, nullable=True)
    nb_engages_categorie = Column(Integer, nullable=True)

    # Éligibilité FCF
    eligible = Column(Boolean, default=True)
    raison_ineligibilite = Column(Text, nullable=True)

    notes = Column(Text, nullable=True)

    # Liaison module Sport
    training_result_id = Column(Integer, ForeignKey("pigeon_training_results.id"), nullable=True)

    # Relations
    concours = relationship("Concours", back_populates="engagements")
    pigeon = relationship("Pigeon")
    training_result = relationship("PigeonTrainingResult")

    __table_args__ = (
        UniqueConstraint("concours_id", "pigeon_id", name="uq_engagement_concours_pigeon"),
    )

    def __repr__(self):
        return f"<ConcoursEngagement pigeon={self.pigeon_id} concours={self.concours_id}>"
