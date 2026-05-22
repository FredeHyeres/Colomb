from pydantic import BaseModel
from typing import Optional
from datetime import date


class PerformanceBase(BaseModel):
    date: date
    nom_concours: str
    distance_km: Optional[int] = None
    classement: Optional[int] = None
    vitesse_m_min: Optional[float] = None
    nb_pigeons_engages: Optional[int] = None
    notes: Optional[str] = None
    pigeon_id: str


class PerformanceCreate(PerformanceBase):
    pass


class PerformanceUpdate(PerformanceBase):
    date: Optional[date] = None
    nom_concours: Optional[str] = None
    pigeon_id: Optional[str] = None


class PerformanceResponse(PerformanceBase):
    id: str

    class Config:
        from_attributes = True