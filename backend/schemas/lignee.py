from pydantic import BaseModel
from typing import Optional


class LigneeBase(BaseModel):
    nom: str
    origine: Optional[str] = None
    description: Optional[str] = None
    couleur_label: Optional[str] = None


class LigneeCreate(LigneeBase):
    pass


class LigneeUpdate(LigneeBase):
    nom: Optional[str] = None


class LigneeResponse(LigneeBase):
    id: str

    class Config:
        from_attributes = True