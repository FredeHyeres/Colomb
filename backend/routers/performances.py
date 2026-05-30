from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from database import get_db
from models import Performance
from models.pigeon import Pigeon
from schemas import PerformanceCreate, PerformanceUpdate, PerformanceResponse
from typing import List, Optional
import csv
import io

router = APIRouter(prefix="/performances", tags=["Performances"])


@router.get("/", response_model=List[PerformanceResponse])
async def get_performances(pigeon_id: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    q = select(Performance)
    if pigeon_id:
        q = q.where(Performance.pigeon_id == pigeon_id)
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/pigeon/{pigeon_id}", response_model=List[PerformanceResponse])
async def get_performances_pigeon(pigeon_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Performance).where(Performance.pigeon_id == pigeon_id)
    )
    return result.scalars().all()


@router.post("/import/csv")
async def import_performances_csv(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    content = await file.read()
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = content.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text), delimiter=";")
    importes, erreurs = 0, []

    for i, row in enumerate(reader, start=2):
        matricule = (row.get("pigeon_matricule") or "").strip()
        date_str = (row.get("date") or "").strip()
        nom = (row.get("nom_concours") or "").strip()

        if not matricule or not date_str or not nom:
            erreurs.append(f"Ligne {i} : champs obligatoires manquants (date, pigeon_matricule, nom_concours)")
            continue

        pigeon_r = await db.execute(select(Pigeon).where(Pigeon.matricule == matricule))
        pigeon = pigeon_r.scalar_one_or_none()
        if not pigeon:
            erreurs.append(f"Ligne {i} : pigeon '{matricule}' introuvable")
            continue

        from datetime import date as DateType
        try:
            date_obj = DateType.fromisoformat(date_str)
        except ValueError:
            erreurs.append(f"Ligne {i} : date invalide '{date_str}' (format attendu YYYY-MM-DD)")
            continue

        def to_int(v):
            try: return int(v) if v else None
            except: return None
        def to_float(v):
            try: return float(v.replace(",", ".")) if v else None
            except: return None

        db.add(Performance(
            pigeon_id=pigeon.id,
            date=date_obj,
            nom_concours=nom,
            distance_km=to_int(row.get("distance_km")),
            classement=to_int(row.get("classement")),
            nb_pigeons_engages=to_int(row.get("nb_pigeons_engages")),
            vitesse_m_min=to_float(row.get("vitesse_m_min")),
            notes=(row.get("notes") or "").strip() or None,
        ))
        importes += 1

    await db.commit()
    return {"importes": importes, "erreurs": erreurs}


@router.get("/export/csv")
async def export_performances_csv(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Performance)
        .options(selectinload(Performance.pigeon))
        .order_by(Performance.date.desc())
    )
    performances = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output, delimiter=";")
    writer.writerow(["date", "pigeon_matricule", "nom_concours", "distance_km",
                     "classement", "nb_pigeons_engages", "vitesse_m_min", "notes"])
    for p in performances:
        writer.writerow([
            str(p.date),
            p.pigeon.matricule if p.pigeon else "",
            p.nom_concours,
            p.distance_km or "",
            p.classement or "",
            p.nb_pigeons_engages or "",
            round(p.vitesse_m_min, 2) if p.vitesse_m_min else "",
            (p.notes or "").replace("\n", " "),
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8-sig",
        headers={"Content-Disposition": "attachment; filename=performances.csv"},
    )


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