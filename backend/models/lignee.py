from sqlalchemy import Column, String, Text
from sqlalchemy.orm import relationship
import uuid
from database import Base


class Lignee(Base):
    __tablename__ = "lignees"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    nom = Column(String(100), nullable=False, unique=True)
    origine = Column(String(100))          # ex: Belgique, Pays-Bas
    description = Column(Text, blank=True)
    couleur_label = Column(String(7))      # couleur hex ex: #C4963A

    # Relations
    pigeons = relationship("Pigeon", back_populates="lignee")

    def __repr__(self):
        return f"<Lignee {self.nom}>"