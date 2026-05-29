from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from database import get_db
from models import Pigeon
from models.pigeon import Sexe
from models.sport import NutritionAssignment
from schemas import PigeonCreate, PigeonUpdate, PigeonResponse, PigeonDetail
from typing import List
import uuid
import os
import shutil

router = APIRouter(prefix="/pigeons", tags=["Pigeons"])

UPLOAD_DIR = "/app/uploads"


async def _validate_parents(pere_id: str | None, mere_id: str | None, db: AsyncSession) -> None:
    if pere_id:
        r = await db.execute(select(Pigeon).where(Pigeon.id == pere_id))
        pere = r.scalar_one_or_none()
        if not pere:
            raise HTTPException(status_code=400, detail="Père introuvable")
        if pere.sexe != Sexe.male:
            raise HTTPException(status_code=400, detail="Le père doit être un mâle")
    if mere_id:
        r = await db.execute(select(Pigeon).where(Pigeon.id == mere_id))
        mere = r.scalar_one_or_none()
        if not mere:
            raise HTTPException(status_code=400, detail="Mère introuvable")
        if mere.sexe != Sexe.femelle:
            raise HTTPException(status_code=400, detail="La mère doit être une femelle")


@router.get("/", response_model=List[PigeonResponse])
async def get_pigeons(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Pigeon)
        .options(selectinload(Pigeon.lignee))
        .order_by(Pigeon.date_creation.asc())
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
    data = pigeon.model_dump()
    await _validate_parents(data.get("pere_id"), data.get("mere_id"), db)
    db_pigeon = Pigeon(**data)
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
    data = pigeon.model_dump(exclude_unset=True)
    await _validate_parents(data.get("pere_id"), data.get("mere_id"), db)
    for key, value in data.items():
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

    aff_count = await db.execute(
        select(func.count()).where(NutritionAssignment.pigeon_id == pigeon_id)
    )
    if aff_count.scalar() > 0:
        raise HTTPException(
            status_code=409,
            detail="Ce pigeon possède des affectations nutritionnelles actives. Marquez-le comme « Perdu » pour le retirer du suivi tout en conservant l'historique.",
        )

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
    return db_pigeon

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