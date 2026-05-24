from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import Optional
from datetime import date as date_type
import uuid

from database import get_db
from models.couple import Couple
from models.nichee import Nichee
from models.pigeon import Pigeon, Sexe, Statut

router = APIRouter(tags=["Couples"])


# ── Schémas ───────────────────────────────────────────────────────────────────

class CoupleCreate(BaseModel):
    male_id: str
    femelle_id: str
    case_numero: Optional[str] = None
    annee: int
    notes: Optional[str] = None


class CoupleUpdate(BaseModel):
    case_numero: Optional[str] = None
    annee: Optional[int] = None
    notes: Optional[str] = None
    actif: Optional[bool] = None


class NicheeCreate(BaseModel):
    date_ponte: Optional[str] = None
    date_eclosion: Optional[str] = None
    nombre_oeufs: Optional[int] = 2
    notes: Optional[str] = None


# ── Sérialiseurs ──────────────────────────────────────────────────────────────

def _pigeon_dict(p):
    if not p:
        return None
    return {
        "id": p.id,
        "matricule": p.matricule,
        "couleur_plumage": p.couleur_plumage,
        "lignee_id": p.lignee_id,
        "statut": p.statut.value if p.statut else None,
        "sexe": p.sexe.value if p.sexe else None,
    }


def _nichee_dict(n):
    return {
        "id": n.id,
        "couple_id": n.couple_id,
        "date_ponte": n.date_ponte.isoformat() if n.date_ponte else None,
        "date_eclosion": n.date_eclosion.isoformat() if n.date_eclosion else None,
        "nombre_oeufs": n.nombre_oeufs,
        "notes": n.notes,
    }


def _couple_dict(c):
    return {
        "id": c.id,
        "male_id": c.male_id,
        "femelle_id": c.femelle_id,
        "case_numero": c.case_numero,
        "annee": c.annee,
        "actif": c.actif,
        "notes": c.notes,
        "male": _pigeon_dict(c.male),
        "femelle": _pigeon_dict(c.femelle),
        "nichees": [_nichee_dict(n) for n in sorted(c.nichees, key=lambda n: n.date_ponte or date_type.min)],
        "nb_nichees": len(c.nichees),
    }


async def _load_couple(couple_id: str, db: AsyncSession):
    result = await db.execute(
        select(Couple)
        .options(
            selectinload(Couple.male),
            selectinload(Couple.femelle),
            selectinload(Couple.nichees),
        )
        .where(Couple.id == couple_id)
    )
    return result.scalar_one_or_none()


# ── Routes couples ────────────────────────────────────────────────────────────

@router.get("/couples/")
async def get_couples(
    actif: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Couple)
        .options(
            selectinload(Couple.male),
            selectinload(Couple.femelle),
            selectinload(Couple.nichees),
        )
        .order_by(Couple.annee.desc())
    )
    if actif is not None:
        query = query.where(Couple.actif == actif)
    result = await db.execute(query)
    return [_couple_dict(c) for c in result.scalars().all()]


@router.get("/couples/{couple_id}")
async def get_couple(couple_id: str, db: AsyncSession = Depends(get_db)):
    couple = await _load_couple(couple_id, db)
    if not couple:
        raise HTTPException(status_code=404, detail="Couple non trouvé")
    return _couple_dict(couple)


@router.post("/couples/", status_code=201)
async def create_couple(body: CoupleCreate, db: AsyncSession = Depends(get_db)):
    # Validation mâle
    r = await db.execute(select(Pigeon).where(Pigeon.id == body.male_id))
    male = r.scalar_one_or_none()
    if not male:
        raise HTTPException(status_code=400, detail="Mâle introuvable")
    if male.sexe != Sexe.male:
        raise HTTPException(status_code=400, detail="Le mâle doit être un pigeon mâle")

    # Validation femelle
    r = await db.execute(select(Pigeon).where(Pigeon.id == body.femelle_id))
    femelle = r.scalar_one_or_none()
    if not femelle:
        raise HTTPException(status_code=400, detail="Femelle introuvable")
    if femelle.sexe != Sexe.femelle:
        raise HTTPException(status_code=400, detail="La femelle doit être un pigeon femelle")

    # Anti-doublon
    r = await db.execute(
        select(Couple).where(
            and_(
                Couple.male_id == body.male_id,
                Couple.femelle_id == body.femelle_id,
                Couple.annee == body.annee,
            )
        )
    )
    if r.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Ce couple existe déjà pour cette année")

    couple = Couple(
        id=str(uuid.uuid4()),
        male_id=body.male_id,
        femelle_id=body.femelle_id,
        case_numero=body.case_numero,
        annee=body.annee,
        notes=body.notes,
        actif=True,
    )
    db.add(couple)
    await db.commit()
    couple = await _load_couple(couple.id, db)
    return _couple_dict(couple)


@router.put("/couples/{couple_id}")
async def update_couple(couple_id: str, body: CoupleUpdate, db: AsyncSession = Depends(get_db)):
    couple = await _load_couple(couple_id, db)
    if not couple:
        raise HTTPException(status_code=404, detail="Couple non trouvé")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(couple, field, value)
    await db.commit()
    couple = await _load_couple(couple_id, db)
    return _couple_dict(couple)


@router.delete("/couples/{couple_id}", status_code=204)
async def delete_couple(couple_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Couple).where(Couple.id == couple_id))
    couple = result.scalar_one_or_none()
    if not couple:
        raise HTTPException(status_code=404, detail="Couple non trouvé")
    await db.delete(couple)
    await db.commit()


@router.patch("/couples/{couple_id}/dissoudre")
async def dissoudre_couple(couple_id: str, db: AsyncSession = Depends(get_db)):
    couple = await _load_couple(couple_id, db)
    if not couple:
        raise HTTPException(status_code=404, detail="Couple non trouvé")
    couple.actif = False
    if couple.male:
        couple.male.statut = Statut.actif
    if couple.femelle:
        couple.femelle.statut = Statut.actif
    await db.commit()
    return {"message": "Couple dissous"}


# ── Routes nichées ────────────────────────────────────────────────────────────

@router.get("/couples/{couple_id}/nichees")
async def get_nichees(couple_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Nichee)
        .where(Nichee.couple_id == couple_id)
        .order_by(Nichee.date_ponte)
    )
    return [_nichee_dict(n) for n in result.scalars().all()]


@router.post("/couples/{couple_id}/nichees", status_code=201)
async def create_nichee(couple_id: str, body: NicheeCreate, db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(Couple).where(Couple.id == couple_id))
    if not r.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Couple non trouvé")

    def parse(s):
        return date_type.fromisoformat(s) if s else None

    nichee = Nichee(
        id=str(uuid.uuid4()),
        couple_id=couple_id,
        date_ponte=parse(body.date_ponte),
        date_eclosion=parse(body.date_eclosion),
        nombre_oeufs=body.nombre_oeufs,
        notes=body.notes,
    )
    db.add(nichee)
    await db.commit()
    await db.refresh(nichee)
    return _nichee_dict(nichee)


@router.get("/nichees/{nichee_id}")
async def get_nichee(nichee_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Nichee).where(Nichee.id == nichee_id))
    nichee = result.scalar_one_or_none()
    if not nichee:
        raise HTTPException(status_code=404, detail="Nichée non trouvée")
    return _nichee_dict(nichee)


@router.put("/nichees/{nichee_id}")
async def update_nichee(nichee_id: str, body: NicheeCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Nichee).where(Nichee.id == nichee_id))
    nichee = result.scalar_one_or_none()
    if not nichee:
        raise HTTPException(status_code=404, detail="Nichée non trouvée")

    def parse(s):
        return date_type.fromisoformat(s) if s else None

    for field, value in body.model_dump(exclude_unset=True).items():
        if field in ('date_ponte', 'date_eclosion'):
            setattr(nichee, field, parse(value))
        else:
            setattr(nichee, field, value)

    await db.commit()
    await db.refresh(nichee)
    return _nichee_dict(nichee)


@router.delete("/nichees/{nichee_id}", status_code=204)
async def delete_nichee(nichee_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Nichee).where(Nichee.id == nichee_id))
    nichee = result.scalar_one_or_none()
    if not nichee:
        raise HTTPException(status_code=404, detail="Nichée non trouvée")
    await db.delete(nichee)
    await db.commit()
