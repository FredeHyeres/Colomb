from sqlalchemy import Column, String, Integer, Text, ForeignKey, Enum, DateTime, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid
import enum
from database import Base


class Sexe(enum.Enum):
    male = "male"
    femelle = "femelle"


class Statut(enum.Enum):
    actif = "actif"
    reproducteur = "reproducteur"
    concours = "concours"
    retraite = "retraite"
    perdu = "perdu"
    decede = "decede"


class Pigeon(Base):
    __tablename__ = "pigeons"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    date_creation = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    matricule = Column(String(50), nullable=False, unique=True)
    annee_naissance = Column(Integer, nullable=False)
    sexe = Column(Enum(Sexe), nullable=False)
    couleur_plumage = Column(String(100))
    statut = Column(Enum(Statut), default=Statut.actif)
    photo = Column(String(255))            # chemin vers le fichier
    colombier_case = Column(String(50))
    notes = Column(Text)
    titre_propriete = Column(Boolean, default=True)     # FCF : titre de propriété requis

    # Clés étrangères
    lignee_id = Column(String, ForeignKey("lignees.id"), nullable=True)
    pere_id = Column(String, ForeignKey("pigeons.id"), nullable=True)
    mere_id = Column(String, ForeignKey("pigeons.id"), nullable=True)

    # Relations
    lignee = relationship("Lignee", back_populates="pigeons")
    pere = relationship("Pigeon", foreign_keys=[pere_id], remote_side="Pigeon.id")
    mere = relationship("Pigeon", foreign_keys=[mere_id], remote_side="Pigeon.id")
    performances = relationship("Performance", back_populates="pigeon")
    sante = relationship("Sante", back_populates="pigeon")

    def __repr__(self):
        return f"<Pigeon {self.matricule}>"