from pydantic import BaseModel
from typing import Optional


class EleveurBase(BaseModel):
    nom:            Optional[str] = None
    prenom:         Optional[str] = None
    nom_colombier:  Optional[str] = None
    adresse:        Optional[str] = None
    code_postal:    Optional[str] = None
    ville:          Optional[str] = None
    telephone:      Optional[str] = None
    email:          Optional[str] = None
    association:    Optional[str] = None
    numero_licence: Optional[str] = None
    annee_debut:    Optional[int] = None
    specialite:     Optional[str] = None
    site_web:       Optional[str] = None
    notes:          Optional[str] = None


class EleveurUpdate(EleveurBase):
    pass


class EleveurResponse(EleveurBase):
    id:               str
    photo_colombier:  Optional[str] = None

    class Config:
        from_attributes = True
