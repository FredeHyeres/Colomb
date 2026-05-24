from sqlalchemy import Column, String, Integer, Text
from database import Base
import uuid


class Eleveur(Base):
    __tablename__ = "eleveur"

    id              = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    nom             = Column(String(100))
    prenom          = Column(String(100))
    nom_colombier   = Column(String(200))
    adresse         = Column(String(200))
    code_postal     = Column(String(10))
    ville           = Column(String(100))
    telephone       = Column(String(20))
    email           = Column(String(100))
    association     = Column(String(200))
    numero_licence  = Column(String(50))
    annee_debut     = Column(Integer)
    specialite      = Column(String(200))
    site_web        = Column(String(200))
    notes           = Column(Text)
    photo_colombier = Column(String(255))
