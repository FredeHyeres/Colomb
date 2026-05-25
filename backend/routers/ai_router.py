import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from database import get_db
from models.ai_model import AIRecommendation, AISnapshot, SportEvent
from schemas.ai_schemas import (
    AIRecommendationResponse, AISnapshotResponse,
    SportEventCreate, SportEventResponse,
    AIDashboardResponse,
)
from services.xai_engine import generate_ai_recommendation, build_snapshot

router = APIRouter(prefix="/ai", tags=["AI"])


def _parse_json_field(value):
    """Parse un champ JSON stocké en Text."""
    if value is None:
        return None
    if isinstance(value, str):
        try:
            return json.loads(value)
        except (json.JSONDecodeError, ValueError):
            return value
    return value


def _rec_to_response(rec: AIRecommendation) -> dict:
    """Convertit un AIRecommendation en dict avec JSON parsé."""
    d = {
        "id": rec.id,
        "pigeon_id": rec.pigeon_id,
        "generated_at": rec.generated_at,
        "score_forme": rec.score_forme,
        "score_endurance": rec.score_endurance,
        "score_vitesse": rec.score_vitesse,
        "score_global": rec.score_global,
        "tendance": rec.tendance,
        "recommendation": rec.recommendation,
        "confiance": rec.confiance,
        "facteurs_explicatifs": _parse_json_field(rec.facteurs_explicatifs),
        "resolved": rec.resolved,
        "created_at": rec.created_at,
    }
    return d


def _snap_to_response(snap: AISnapshot) -> dict:
    """Convertit un AISnapshot en dict avec JSON parsé."""
    return {
        "id": snap.id,
        "pigeon_id": snap.pigeon_id,
        "snapshot_date": snap.snapshot_date,
        "snapshot_version": snap.snapshot_version,
        "feature_set_version": snap.feature_set_version,
        "features": _parse_json_field(snap.features),
        "created_at": snap.created_at,
    }


def _event_to_response(event: SportEvent) -> dict:
    """Convertit un SportEvent en dict avec JSON parsé."""
    return {
        "id": event.id,
        "pigeon_id": event.pigeon_id,
        "event_type": event.event_type,
        "event_date": event.event_date,
        "payload": _parse_json_field(event.payload),
        "created_at": event.created_at,
    }


# ── Recommandations ───────────────────────────────────────────────────────────

@router.get("/recommendations/{pigeon_id}", response_model=list[AIRecommendationResponse])
async def get_recommendations(pigeon_id: str, db: AsyncSession = Depends(get_db)):
    """Retourne toutes les recommandations non résolues pour un pigeon."""
    result = await db.execute(
        select(AIRecommendation)
        .where(
            AIRecommendation.pigeon_id == pigeon_id,
            AIRecommendation.resolved == False,
        )
        .order_by(AIRecommendation.generated_at.desc())
    )
    recs = result.scalars().all()
    return [_rec_to_response(r) for r in recs]


@router.post("/recommendations/{pigeon_id}/generate", response_model=AIRecommendationResponse)
async def generate_recommendation(pigeon_id: str, db: AsyncSession = Depends(get_db)):
    """Génère une recommandation XAI pour un pigeon et la persiste."""
    rec = await generate_ai_recommendation(pigeon_id, db)
    return _rec_to_response(rec)


@router.put("/recommendations/{rec_id}/resolve")
async def resolve_recommendation(rec_id: int, db: AsyncSession = Depends(get_db)):
    """Marque une recommandation comme résolue."""
    result = await db.execute(select(AIRecommendation).where(AIRecommendation.id == rec_id))
    rec = result.scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommandation introuvable")
    rec.resolved = True
    await db.commit()
    return {"success": True, "rec_id": rec_id}


@router.get("/recommendations/{pigeon_id}/all", response_model=list[AIRecommendationResponse])
async def get_all_recommendations(pigeon_id: str, limit: int = 20, db: AsyncSession = Depends(get_db)):
    """Retourne toutes les recommandations (résolues et non résolues) pour un pigeon."""
    result = await db.execute(
        select(AIRecommendation)
        .where(AIRecommendation.pigeon_id == pigeon_id)
        .order_by(AIRecommendation.generated_at.desc())
        .limit(limit)
    )
    recs = result.scalars().all()
    return [_rec_to_response(r) for r in recs]


# ── Snapshots ─────────────────────────────────────────────────────────────────

@router.get("/snapshots/{pigeon_id}", response_model=list[AISnapshotResponse])
async def get_snapshots(pigeon_id: str, db: AsyncSession = Depends(get_db)):
    """Retourne tous les snapshots sportifs d'un pigeon, du plus récent au plus ancien."""
    result = await db.execute(
        select(AISnapshot)
        .where(AISnapshot.pigeon_id == pigeon_id)
        .order_by(AISnapshot.snapshot_date.desc())
    )
    snaps = result.scalars().all()
    return [_snap_to_response(s) for s in snaps]


@router.post("/snapshots/{pigeon_id}/build", response_model=AISnapshotResponse)
async def build_snapshot_endpoint(pigeon_id: str, db: AsyncSession = Depends(get_db)):
    """Calcule et persiste un snapshot sportif pour le pigeon à la date d'aujourd'hui."""
    snap = await build_snapshot(pigeon_id, db)
    return _snap_to_response(snap)


# ── Événements sportifs ───────────────────────────────────────────────────────

@router.get("/events/{pigeon_id}", response_model=list[SportEventResponse])
async def get_events(pigeon_id: str, limit: int = 50, db: AsyncSession = Depends(get_db)):
    """Retourne le journal des événements sportifs d'un pigeon."""
    result = await db.execute(
        select(SportEvent)
        .where(SportEvent.pigeon_id == pigeon_id)
        .order_by(SportEvent.event_date.desc())
        .limit(limit)
    )
    events = result.scalars().all()
    return [_event_to_response(e) for e in events]


@router.post("/events", response_model=SportEventResponse, status_code=201)
async def create_event(data: SportEventCreate, db: AsyncSession = Depends(get_db)):
    """Ajoute un événement sportif manuellement."""
    payload_raw = json.dumps(data.payload, ensure_ascii=False) if data.payload is not None else None
    event = SportEvent(
        pigeon_id=data.pigeon_id,
        event_type=data.event_type,
        event_date=data.event_date,
        payload=payload_raw,
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return _event_to_response(event)


# ── Tableau de bord IA ────────────────────────────────────────────────────────

@router.get("/dashboard/{pigeon_id}", response_model=AIDashboardResponse)
async def get_ai_dashboard(pigeon_id: str, db: AsyncSession = Depends(get_db)):
    """
    Retourne un résumé IA complet pour un pigeon :
    - Dernière recommandation non résolue
    - score_global et tendance
    - Nombre de snapshots
    - 5 événements récents
    """
    # Dernière recommandation non résolue
    rec_result = await db.execute(
        select(AIRecommendation)
        .where(
            AIRecommendation.pigeon_id == pigeon_id,
            AIRecommendation.resolved == False,
        )
        .order_by(AIRecommendation.generated_at.desc())
        .limit(1)
    )
    last_rec = rec_result.scalar_one_or_none()

    # Nombre de snapshots
    snap_count_result = await db.execute(
        select(func.count(AISnapshot.id)).where(AISnapshot.pigeon_id == pigeon_id)
    )
    snapshots_count = snap_count_result.scalar() or 0

    # 5 événements récents
    events_result = await db.execute(
        select(SportEvent)
        .where(SportEvent.pigeon_id == pigeon_id)
        .order_by(SportEvent.event_date.desc())
        .limit(5)
    )
    events = events_result.scalars().all()

    return AIDashboardResponse(
        pigeon_id=pigeon_id,
        last_recommendation=_rec_to_response(last_rec) if last_rec else None,
        score_global=last_rec.score_global if last_rec else None,
        tendance=last_rec.tendance if last_rec else None,
        snapshots_count=snapshots_count,
        events_recents=[_event_to_response(e) for e in events],
    )
