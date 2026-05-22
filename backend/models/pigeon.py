from sqlalchemy import Column, String, Integer, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
import uuid
import enum
from database import Base


class Sexe(enum.Enum):
    male = "mâle"
    femelle = "femelle"


class Statut(enum.Enum):
    actif = "actif"
    reproducteur = "reproducteur"
    concours = "concours"
    retraite = "retraité"
    perdu = "perdu"
    decede = "décédé"


class Pigeon(Base):
    __tablename__ = "pigeons"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    matricule = Column(String(50), nullable=False, unique=True)
    annee_naissance = Column(Integer, nullable=False)
    sexe = Column(Enum(Sexe), nullable=False)
    couleur_plumage = Column(String(100))
    statut = Column(Enum(Statut), default=Statut.actif)
    photo = Column(String(255))            # chemin vers le fichier
    colombier_case = Column(String(50))
    notes = Column(Text)

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