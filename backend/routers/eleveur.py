from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import shutil
import os
import uuid

from database import get_db
from models.eleveur import Eleveur
from schemas.eleveur import EleveurUpdate, EleveurResponse

router = APIRouter(tags=["Eleveur"])

COLOMBIER_DIR = "/app/uploads/colombier"


async def _get_or_create(db: AsyncSession) -> Eleveur:
    result = await db.execute(select(Eleveur))
    eleveur = result.scalar_one_or_none()
    if not eleveur:
        eleveur = Eleveur(id=str(uuid.uuid4()))
        db.add(eleveur)
        await db.commit()
        await db.refresh(eleveur)
    return eleveur


@router.get("/eleveur/", response_model=EleveurResponse)
async def get_eleveur(db: AsyncSession = Depends(get_db)):
    return await _get_or_create(db)


@router.put("/eleveur/", response_model=EleveurResponse)
async def update_eleveur(body: EleveurUpdate, db: AsyncSession = Depends(get_db)):
    eleveur = await _get_or_create(db)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(eleveur, field, value)
    await db.commit()
    await db.refresh(eleveur)
    return eleveur


@router.post("/eleveur/photo", response_model=EleveurResponse)
async def upload_photo_colombier(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp"]:
        raise HTTPException(status_code=400, detail="Format image non supporté")

    os.makedirs(COLOMBIER_DIR, exist_ok=True)
    filename = f"colombier{ext}"
    filepath = os.path.join(COLOMBIER_DIR, filename)
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    eleveur = await _get_or_create(db)
    eleveur.photo_colombier = f"/uploads/colombier/{filename}"
    await db.commit()
    await db.refresh(eleveur)
    return eleveur
