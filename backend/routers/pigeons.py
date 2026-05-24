from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from database import get_db
from models import Pigeon
from schemas import PigeonCreate, PigeonUpdate, PigeonResponse, PigeonDetail
from typing import List
import uuid
import os
import shutil

router = APIRouter(prefix="/pigeons", tags=["Pigeons"])

UPLOAD_DIR = "/app/uploads"


@router.get("/", response_model=List[PigeonResponse])
async def get_pigeons(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Pigeon).options(selectinload(Pigeon.lignee))
    )
    return result.scalars().all()


@router.get("/{pigeon_id}", response_model=PigeonDetail)
async def get_pigeon(pigeon_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Pigeon)
        .options(
            selectinload(Pigeon.lignee),
            selectinload(Pigeon.pere),
            selectinload(Pigeon.mere),
            selectinload(Pigeon.performances),
            selectinload(Pigeon.sante)
        )
        .where(Pigeon.id == pigeon_id)
    )
    pigeon = result.scalar_one_or_none()
    if not pigeon:
        raise HTTPException(status_code=404, detail="Pigeon non trouvé")
    return pigeon


@router.post("/", response_model=PigeonResponse, status_code=201)
async def create_pigeon(pigeon: PigeonCreate, db: AsyncSession = Depends(get_db)):
    db_pigeon = Pigeon(**pigeon.model_dump())
    db.add(db_pigeon)
    await db.commit()
    await db.refresh(db_pigeon)
    return db_pigeon


@router.put("/{pigeon_id}", response_model=PigeonResponse)
async def update_pigeon(pigeon_id: str, pigeon: PigeonUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Pigeon).where(Pigeon.id == pigeon_id))
    db_pigeon = result.scalar_one_or_none()
    if not db_pigeon:
        raise HTTPException(status_code=404, detail="Pigeon non trouvé")
    for key, value in pigeon.model_dump(exclude_unset=True).items():
        setattr(db_pigeon, key, value)
    await db.commit()
    await db.refresh(db_pigeon)
    return db_pigeon


@router.delete("/{pigeon_id}", status_code=204)
async def delete_pigeon(pigeon_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Pigeon).where(Pigeon.id == pigeon_id))
    db_pigeon = result.scalar_one_or_none()
    if not db_pigeon:
        raise HTTPException(status_code=404, detail="Pigeon non trouvé")
    await db.delete(db_pigeon)
    await db.commit()


@router.post("/{pigeon_id}/photo", response_model=PigeonResponse)
async def upload_photo(
    pigeon_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Pigeon).where(Pigeon.id == pigeon_id))
    db_pigeon = result.scalar_one_or_none()
    if not db_pigeon:
        raise HTTPException(status_code=404, detail="Pigeon non trouvé")

    # Vérifier l'extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp"]:
        raise HTTPException(status_code=400, detail="Format image non supporté")

    # Sauvegarder la photo
    filename = f"{pigeon_id}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Mettre à jour le chemin en base
    db_pigeon.photo = f"/uploads/{filename}"
    await db.commit()
    await db.refresh(db_pigeon)
    return db_pigeonen

@router.get("/{pigeon_id}/pedigree")
async def get_pedigree(pigeon_id: str, db: AsyncSession = Depends(get_db)):
    async def get_ancetre(pid: str, generation: int):
        if not pid or generation > 4:
            return None
        result = await db.execute(
            select(Pigeon).where(Pigeon.id == pid)
        )
        p = result.scalar_one_or_none()
        if not p:
            return None
        return {
            "id": p.id,
            "matricule": p.matricule,
            "sexe": p.sexe.value if p.sexe else None,
            "annee_naissance": p.annee_naissance,
            "couleur_plumage": p.couleur_plumage,
            "statut": p.statut.value if p.statut else None,
            "photo": p.photo,
            "lignee_id": p.lignee_id,
            "pere": await get_ancetre(p.pere_id, generation + 1),
            "mere": await get_ancetre(p.mere_id, generation + 1),
        }

    data = await get_ancetre(pigeon_id, 1)
    if not data:
        raise HTTPException(status_code=404, detail="Pigeon non trouvé")
    return data