from pydantic import BaseModel
from typing import Optional
from enum import Enum


class SexeEnum(str, Enum):
    male = "male"
    femelle = "femelle"


class StatutEnum(str, Enum):
    actif = "actif"
    reproducteur = "reproducteur"
    concours = "concours"
    retraite = "retraite"
    perdu = "perdu"
    decede = "decede"


class LigneeResponse(BaseModel):
    id: str
    nom: str
    origine: Optional[str] = None
    couleur_label: Optional[str] = None

    class Config:
        from_attributes = True


class PigeonBase(BaseModel):
    matricule: str
    annee_naissance: int
    sexe: SexeEnum
    couleur_plumage: Optional[str] = None
    statut: StatutEnum = StatutEnum.actif
    colombier_case: Optional[str] = None
    notes: Optional[str] = None
    lignee_id: Optional[str] = None
    pere_id: Optional[str] = None
    mere_id: Optional[str] = None


class PigeonCreate(PigeonBase):
    pass


class PigeonUpdate(PigeonBase):
    matricule: Optional[str] = None
    annee_naissance: Optional[int] = None
    sexe: Optional[SexeEnum] = None


class PigeonResponse(PigeonBase):
    id: str
    photo: Optional[str] = None

    class Config:
        from_attributes = True


class PigeonDetail(PigeonResponse):
    lignee: Optional[LigneeResponse] = None
    pere: Optional[PigeonResponse] = None
    mere: Optional[PigeonResponse] = None

    class Config:
        from_attributes = True