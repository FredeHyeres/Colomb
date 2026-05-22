from sqlalchemy import Column, String, Integer, Text, ForeignKey, Boolean
from sqlalchemy.orm import relationship
import uuid
from database import Base


class Couple(Base):
    __tablename__ = "couples"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    case_numero = Column(String(50))
    annee = Column(Integer, nullable=False)
    actif = Column(Boolean, default=True)
    notes = Column(Text)

    # Clés étrangères
    male_id = Column(String, ForeignKey("pigeons.id"), nullable=False)
    femelle_id = Column(String, ForeignKey("pigeons.id"), nullable=False)

    # Relations
    male = relationship("Pigeon", foreign_keys=[male_id])
    femelle = relationship("Pigeon", foreign_keys=[femelle_id])
    nichees = relationship("Nichee", back_populates="couple")

    def __repr__(self):
        return f"<Couple case={self.case_numero} annee={self.annee}>"