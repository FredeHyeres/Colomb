from pydantic import BaseModel
from typing import Optional
from datetime import date


class NicheeBase(BaseModel):
    date_ponte: Optional[date] = None
    date_eclosion: Optional[date] = None
    nombre_oeufs: Optional[int] = 2
    notes: Optional[str] = None


class NicheeCreate(NicheeBase):
    pass


class NicheeUpdate(NicheeBase):
    pass


class NicheeResponse(NicheeBase):
    id: str
    couple_id: str

    class Config:
        from_attributes = True
