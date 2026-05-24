from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models import Performance
from schemas import PerformanceCreate, PerformanceUpdate, PerformanceResponse
from typing import List

router = APIRouter(prefix="/performances", tags=["Performances"])


@router.get("/", response_model=List[PerformanceResponse])
async def get_performances(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Performance))
    return result.scalars().all()


@router.get("/pigeon/{pigeon_id}", response_model=List[PerformanceResponse])
async def get_performances_pigeon(pigeon_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Performance).where(Performance.pigeon_id == pigeon_id)
    )
    return result.scalars().all()


@router.get("/{performance_id}", response_model=PerformanceResponse)
async def get_performance(performance_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Performance).where(Performance.id == performance_id)
    )
    performance = result.scalar_one_or_none()
    if not performance:
        raise HTTPException(status_code=404, detail="Performance non trouvée")
    return performance


@router.post("/", response_model=PerformanceResponse, status_code=201)
async def create_performance(performance: PerformanceCreate, db: AsyncSession = Depends(get_db)):
    db_performance = Performance(**performance.model_dump())
    db.add(db_performance)
    await db.commit()
    await db.refresh(db_performance)
    return db_performance


@router.put("/{performance_id}", response_model=PerformanceResponse)
async def update_performance(
    performance_id: str,
    performance: PerformanceUpdate,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Performance).where(Performance.id == performance_id)
    )
    db_performance = result.scalar_one_or_none()
    if not db_performance:
        raise HTTPException(status_code=404, detail="Performance non trouvée")
    for key, value in performance.model_dump(exclude_unset=True).items():
        setattr(db_performance, key, value)
    await db.commit()
    await db.refresh(db_performance)
    return db_performance


@router.delete("/{performance_id}", status_code=204)
async def delete_performance(performance_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Performance).where(Performance.id == performance_id)
    )
    db_performance = result.scalar_one_or_none()
    if not db_performance:
        raise HTTPException(status_code=404, detail="Performance non trouvée")
    await db.delete(db_performance)
    await db.commit()