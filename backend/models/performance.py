from sqlalchemy import Column, String, Integer, Float, Text, ForeignKey, Date
from sqlalchemy.orm import relationship
import uuid
from database import Base


class Performance(Base):
    __tablename__ = "performances"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    date = Column(Date, nullable=False)
    nom_concours = Column(String(200), nullable=False)
    distance_km = Column(Integer)
    classement = Column(Integer)
    vitesse_m_min = Column(Float)
    nb_pigeons_engages = Column(Integer)
    notes = Column(Text)

    # Clé étrangère
    pigeon_id = Column(String, ForeignKey("pigeons.id"), nullable=False)

    # Relation
    pigeon = relationship("Pigeon", back_populates="performances")

    def __repr__(self):
        return f"<Performance {self.nom_concours} {self.date}>"