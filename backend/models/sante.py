from sqlalchemy import Column, String, Text, ForeignKey, Date, Enum
from sqlalchemy.orm import relationship
import uuid
import enum
from database import Base


class TypeEvenement(enum.Enum):
    vaccination = "vaccination"
    traitement = "traitement"
    visite_veterinaire = "visite vétérinaire"
    observation = "observation"


class Sante(Base):
    __tablename__ = "sante"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    date = Column(Date, nullable=False)
    type = Column(Enum(TypeEvenement), nullable=False)
    description = Column(Text)
    produit = Column(String(200))

    # Clé étrangère
    pigeon_id = Column(String, ForeignKey("pigeons.id"), nullable=False)

    # Relation
    pigeon = relationship("Pigeon", back_populates="sante")

    def __repr__(self):
        return f"<Sante {self.type} {self.date}>"