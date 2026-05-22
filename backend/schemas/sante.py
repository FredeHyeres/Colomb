from pydantic import BaseModel
from typing import Optional
from datetime import date
from enum import Enum


class TypeEvenementEnum(str, Enum):
    vaccination = "vaccination"
    traitement = "traitement"
    visite_veterinaire = "visite vétérinaire"
    observation = "observation"


class SanteBase(BaseModel):
    date: date
    type: TypeEvenementEnum
    description: Optional[str] = None
    produit: Optional[str] = None
    pigeon_id: str


class SanteCreate(SanteBase):
    pass


class SanteUpdate(SanteBase):
    date: Optional[date] = None
    type: Optional[TypeEvenementEnum] = None
    pigeon_id: Optional[str] = None


class SanteResponse(SanteBase):
    id: str

    class Config:
        from_attributes = True