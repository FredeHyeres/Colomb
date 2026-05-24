from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models import Lignee
from schemas import LigneeCreate, LigneeUpdate, LigneeResponse
from typing import List

router = APIRouter(prefix="/lignees", tags=["Lignées"])


@router.get("/", response_model=List[LigneeResponse])
async def get_lignees(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Lignee))
    return result.scalars().all()


@router.get("/{lignee_id}", response_model=LigneeResponse)
async def get_lignee(lignee_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Lignee).where(Lignee.id == lignee_id))
    lignee = result.scalar_one_or_none()
    if not lignee:
        raise HTTPException(status_code=404, detail="Lignée non trouvée")
    return lignee


@router.post("/", response_model=LigneeResponse, status_code=201)
async def create_lignee(lignee: LigneeCreate, db: AsyncSession = Depends(get_db)):
    db_lignee = Lignee(**lignee.model_dump())
    db.add(db_lignee)
    await db.commit()
    await db.refresh(db_lignee)
    return db_lignee


@router.put("/{lignee_id}", response_model=LigneeResponse)
async def update_lignee(lignee_id: str, lignee: LigneeUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Lignee).where(Lignee.id == lignee_id))
    db_lignee = result.scalar_one_or_none()
    if not db_lignee:
        raise HTTPException(status_code=404, detail="Lignée non trouvée")
    for key, value in lignee.model_dump(exclude_unset=True).items():
        setattr(db_lignee, key, value)
    await db.commit()
    await db.refresh(db_lignee)
    return db_lignee


@router.delete("/{lignee_id}", status_code=204)
async def delete_lignee(lignee_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Lignee).where(Lignee.id == lignee_id))
    db_lignee = result.scalar_one_or_none()
    if not db_lignee:
        raise HTTPException(status_code=404, detail="Lignée non trouvée")
    await db.delete(db_lignee)
    await db.commit()