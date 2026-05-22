from sqlalchemy import Column, String, Integer, Text, ForeignKey, Date
from sqlalchemy.orm import relationship
import uuid
from database import Base


class Nichee(Base):
    __tablename__ = "nichees"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    date_ponte = Column(Date)
    date_eclosion = Column(Date)
    nombre_oeufs = Column(Integer, default=2)
    notes = Column(Text)

    # Clé étrangère
    couple_id = Column(String, ForeignKey("couples.id"), nullable=False)

    # Relations
    couple = relationship("Couple", back_populates="nichees")

    def __repr__(self):
        return f"<Nichee {self.date_ponte}>"