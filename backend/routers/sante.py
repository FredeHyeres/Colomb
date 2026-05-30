from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from database import get_db
from models import Sante
from models.pigeon import Pigeon
from schemas import SanteCreate, SanteUpdate, SanteResponse
from typing import List, Optional
import csv
import io

router = APIRouter(prefix="/sante", tags=["Santé"])


@router.get("/", response_model=List[SanteResponse])
async def get_evenements(pigeon_id: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    q = select(Sante)
    if pigeon_id:
        q = q.where(Sante.pigeon_id == pigeon_id)
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/pigeon/{pigeon_id}", response_model=List[SanteResponse])
async def get_evenements_pigeon(pigeon_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Sante).where(Sante.pigeon_id == pigeon_id)
    )
    return result.scalars().all()


@router.get("/export/csv")
async def export_sante_csv(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Sante)
        .options(selectinload(Sante.pigeon))
        .order_by(Sante.date.desc())
    )
    events = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output, delimiter=";")
    writer.writerow(["date", "pigeon_matricule", "type", "description", "produit"])
    for e in events:
        writer.writerow([
            str(e.date),
            e.pigeon.matricule if e.pigeon else "",
            e.type.value if e.type else "",
            (e.description or "").replace("\n", " "),
            e.produit or "",
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8-sig",
        headers={"Content-Disposition": "attachment; filename=sante.csv"},
    )


@router.get("/{sante_id}", response_model=SanteResponse)
async def get_evenement(sante_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Sante).where(Sante.id == sante_id)
    )
    sante = result.scalar_one_or_none()
    if not sante:
        raise HTTPException(status_code=404, detail="Événement non trouvé")
    return sante


@router.post("/", response_model=SanteResponse, status_code=201)
async def create_evenement(sante: SanteCreate, db: AsyncSession = Depends(get_db)):
    db_sante = Sante(**sante.model_dump())
    db.add(db_sante)
    await db.commit()
    await db.refresh(db_sante)
    return db_sante


@router.put("/{sante_id}", response_model=SanteResponse)
async def update_evenement(
    sante_id: str,
    sante: SanteUpdate,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Sante).where(Sante.id == sante_id)
    )
    db_sante = result.scalar_one_or_none()
    if not db_sante:
        raise HTTPException(status_code=404, detail="Événement non trouvé")
    for key, value in sante.model_dump(exclude_unset=True).items():
        setattr(db_sante, key, value)
    await db.commit()
    await db.refresh(db_sante)
    return db_sante


@router.delete("/{sante_id}", status_code=204)
async def delete_evenement(sante_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Sante).where(Sante.id == sante_id)
    )
    db_sante = result.scalar_one_or_none()
    if not db_sante:
        raise HTTPException(status_code=404, detail="Événement non trouvé")
    await db.delete(db_sante)
    await db.commit()