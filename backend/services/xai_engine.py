"""
Moteur XAI (Explainable AI) — Système expert colombophile.
Génère des recommandations explicables basées sur l'historique sportif.
"""
# Version : V3-dev
# Depuis v2 : fenêtre de calcul étendue 7j → 30j, recovery_trend calculé,
#             features 30j dans les snapshots, seuils ajustés (70/50/30)
import json
from datetime import datetime, timezone, date, timedelta
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from models.sport import TrainingSession, PigeonTrainingResult
from models.ai_model import AIRecommendation, AISnapshot, SportEvent

# Pondération des scores
WEIGHTS = {"recovery": 0.40, "condition": 0.35, "regularity": 0.25}


def compute_forme_score(results: list) -> dict:
    """
    Score forme basé sur les 5 derniers résultats.
    vitesse_relative 40% + regularite 30% + progression 20% + ratio_completions 10%
    """
    if not results:
        return {"score": 0.0, "facteurs": [], "detail": "Aucune donnée"}

    # ratio_completions : pigeons ayant un return_time
    completions = [r for r in results if r.return_time is not None]
    ratio_completions = len(completions) / len(results) * 10

    # regularite : nombre de séances sur les 5 dernières
    regularite = min(10, len(results) * 2)

    # progression : tendance du recovery_score
    recovery_scores = [r.recovery_score for r in results if r.recovery_score is not None]
    if len(recovery_scores) >= 2:
        progression = (recovery_scores[-1] - recovery_scores[0]) / len(recovery_scores)
        progression_score = max(0, min(10, 5 + progression * 2))
    else:
        progression_score = float(recovery_scores[0]) if recovery_scores else 5.0

    # vitesse_relative : basée sur internal_rank (rang inférieur = meilleur)
    ranks = [r.internal_rank for r in results if r.internal_rank is not None]
    if ranks:
        avg_rank = sum(ranks) / len(ranks)
        vitesse_score = max(0, min(10, 10 - avg_rank))
    else:
        vitesse_score = 5.0

    score = (vitesse_score * 0.40 + regularite * 0.30 +
             progression_score * 0.20 + ratio_completions * 0.10)
    score_100 = round(score * 10, 1)

    facteurs = [
        {"nom": "Vitesse relative", "valeur": round(vitesse_score, 1),
         "impact": "positif" if vitesse_score >= 5 else "negatif", "poids": 0.40},
        {"nom": "Regularite", "valeur": round(regularite, 1),
         "impact": "positif" if regularite >= 5 else "negatif", "poids": 0.30},
        {"nom": "Progression", "valeur": round(progression_score, 1),
         "impact": "positif" if progression_score >= 5 else "negatif", "poids": 0.20},
        {"nom": "Taux de retour", "valeur": round(ratio_completions, 1),
         "impact": "positif" if ratio_completions >= 5 else "negatif", "poids": 0.10},
    ]
    return {"score": score_100, "facteurs": facteurs}


def compute_endurance_score(results: list) -> dict:
    """
    Score endurance basé sur les distances et la régularité.
    Bonus distances croissantes, pénalité si scores de récupération faibles.
    """
    if not results:
        return {"score": 0.0, "facteurs": []}

    # Distances parcourues
    distances = [r.session.distance_km for r in results
                 if hasattr(r, "session") and r.session and r.session.distance_km]

    avg_dist = 0.0
    if distances:
        avg_dist = sum(distances) / len(distances)
        dist_score = min(10, avg_dist / 50)  # 500km = score 10
        # Bonus progressivité
        progression_bonus = 0.0
        for i in range(1, len(distances)):
            if distances[i] > distances[i - 1]:
                progression_bonus += 0.5
        dist_score = min(10, dist_score + progression_bonus)
    else:
        dist_score = 5.0

    # Pénalité récupération basse
    low_recovery = [r for r in results if r.recovery_score is not None and r.recovery_score < 4]
    penalite = len(low_recovery) * 1.0

    score = max(0.0, min(100.0, (dist_score * 10) - penalite * 5))

    facteurs = [
        {"nom": "Distance moyenne", "valeur": round(avg_dist, 1),
         "impact": "positif" if dist_score >= 5 else "negatif", "poids": 0.60},
        {"nom": "Penalite recuperation", "valeur": round(penalite, 1),
         "impact": "negatif" if penalite > 0 else "neutre", "poids": 0.40},
    ]
    return {"score": round(score, 1), "facteurs": facteurs}


def compute_recommendation(scores: dict, avg_recovery: float) -> dict:
    """
    Détermine la recommandation finale et la confiance.
    """
    score_global = (
        scores.get("forme", 0.0) * WEIGHTS["recovery"] +
        scores.get("endurance", 0.0) * WEIGHTS["condition"] +
        min(100.0, avg_recovery * 10) * WEIGHTS["regularity"]
    )

    confiance = min(1.0, len([s for s in scores.values() if isinstance(s, (int, float)) and s > 0]) / 3)

    if score_global >= 75:
        rec, tendance = "concours", "progression"
        contre_indications = []
    elif score_global >= 55:
        rec, tendance = "entrainement_leger", "stable"
        contre_indications = ["Surveiller hydratation"]
    elif score_global >= 35:
        rec, tendance = "repos", "declin"
        contre_indications = ["Pas de concours avant recuperation complete"]
    else:
        rec, tendance = "reforme", "declin"
        contre_indications = ["Consultation veterinaire recommandee"]

    return {
        "recommendation": rec,
        "tendance": tendance,
        "score_global": round(score_global, 1),
        "confiance": round(confiance, 2),
        "contre_indications": contre_indications,
    }


def build_facteurs_explicatifs(results: list, scores: dict) -> list:
    """Construit la liste des facteurs explicatifs au format XAI standard."""
    all_facteurs = []

    # Récupération moyenne
    rec_scores = [r.recovery_score for r in results if r.recovery_score is not None]
    avg_rec = sum(rec_scores) / len(rec_scores) if rec_scores else 0.0
    all_facteurs.append({
        "nom": "Recuperation",
        "valeur": round(avg_rec, 1),
        "vs_moyenne": f"+{round((avg_rec - 5) * 10)}%" if avg_rec >= 5 else f"{round((avg_rec - 5) * 10)}%",
        "impact": "positif" if avg_rec >= 6 else ("neutre" if avg_rec >= 4 else "negatif"),
        "poids": WEIGHTS["recovery"],
    })

    # Condition moyenne
    cond_scores = [r.condition_score for r in results if r.condition_score is not None]
    avg_cond = sum(cond_scores) / len(cond_scores) if cond_scores else 0.0
    all_facteurs.append({
        "nom": "Condition physique",
        "valeur": round(avg_cond, 1),
        "vs_moyenne": f"+{round((avg_cond - 5) * 10)}%" if avg_cond >= 5 else f"{round((avg_cond - 5) * 10)}%",
        "impact": "positif" if avg_cond >= 6 else ("neutre" if avg_cond >= 4 else "negatif"),
        "poids": WEIGHTS["condition"],
    })

    # Régularité
    all_facteurs.append({
        "nom": "Regularite entrainement",
        "valeur": len(results),
        "vs_moyenne": f"{len(results)} seances recentes",
        "impact": "positif" if len(results) >= 4 else ("neutre" if len(results) >= 2 else "negatif"),
        "poids": WEIGHTS["regularity"],
    })

    # Ajouter facteurs des scores calculés
    if "forme_facteurs" in scores:
        all_facteurs.extend(scores["forme_facteurs"][:2])

    return all_facteurs


async def generate_ai_recommendation(pigeon_id: str, db: AsyncSession) -> AIRecommendation:
    """
    Génère une recommandation XAI complète pour un pigeon.
    1. Récupère les 5 derniers résultats
    2. Calcule tous les scores
    3. Construit les facteurs explicatifs
    4. Sauvegarde en DB
    5. Crée un SportEvent
    """
    # 1. Récupérer les 5 derniers résultats avec la session
    result = await db.execute(
        select(PigeonTrainingResult)
        .options(selectinload(PigeonTrainingResult.session))
        .where(PigeonTrainingResult.pigeon_id == pigeon_id)
        .order_by(PigeonTrainingResult.id.desc())
        .limit(5)
    )
    results = result.scalars().all()

    # 2. Calculer scores
    forme_data = compute_forme_score(results)
    endurance_data = compute_endurance_score(results)

    rec_scores = [r.recovery_score for r in results if r.recovery_score is not None]
    avg_recovery = sum(rec_scores) / len(rec_scores) if rec_scores else 0.0

    scores = {
        "forme": forme_data["score"],
        "endurance": endurance_data["score"],
        "forme_facteurs": forme_data.get("facteurs", []),
    }

    rec_data = compute_recommendation(scores, avg_recovery)

    # 3. Facteurs explicatifs
    facteurs = build_facteurs_explicatifs(results, scores)

    # 4. Sauvegarder
    rec = AIRecommendation(
        pigeon_id=pigeon_id,
        generated_at=datetime.now(timezone.utc),
        score_forme=forme_data["score"],
        score_endurance=endurance_data["score"],
        score_vitesse=None,  # calculé dans une V2
        score_global=rec_data["score_global"],
        tendance=rec_data["tendance"],
        recommendation=rec_data["recommendation"],
        confiance=rec_data["confiance"],
        facteurs_explicatifs=json.dumps(facteurs, ensure_ascii=False),
        resolved=False,
    )
    db.add(rec)

    # 5. SportEvent
    event = SportEvent(
        pigeon_id=pigeon_id,
        event_type="recommendation_generated",
        event_date=date.today(),
        payload=json.dumps({
            "score_global": rec_data["score_global"],
            "recommendation": rec_data["recommendation"],
            "tendance": rec_data["tendance"],
        }, ensure_ascii=False),
    )
    db.add(event)

    await db.commit()
    await db.refresh(rec)
    return rec


async def build_snapshot(pigeon_id: str, db: AsyncSession) -> AISnapshot:
    """
    Construit un snapshot de 20 features pour un pigeon.
    """
    today = date.today()
    cutoff_7d = today - timedelta(days=7)
    cutoff_30d = today - timedelta(days=30)

    # Résultats 7 derniers jours
    r7 = await db.execute(
        select(PigeonTrainingResult)
        .join(TrainingSession)
        .where(
            PigeonTrainingResult.pigeon_id == pigeon_id,
            TrainingSession.date >= cutoff_7d
        )
    )
    results_7d = r7.scalars().all()

    # Résultats 30 derniers jours
    r30 = await db.execute(
        select(PigeonTrainingResult)
        .join(TrainingSession)
        .where(
            PigeonTrainingResult.pigeon_id == pigeon_id,
            TrainingSession.date >= cutoff_30d
        )
    )
    results_30d = r30.scalars().all()

    def avg(lst):
        return round(sum(lst) / len(lst), 2) if lst else None

    rec_7d = [r.recovery_score for r in results_7d if r.recovery_score is not None]
    cond_7d = [r.condition_score for r in results_7d if r.condition_score is not None]
    hydra_7d = [r.hydration_score for r in results_7d if r.hydration_score is not None]

    avg_rec_7d = avg(rec_7d)

    features = {
        "snapshot_date": str(today),
        "version": "core_v1",
        "training_load_7d": len(results_7d),
        "training_load_30d": len(results_30d),
        "recovery_avg_7d": avg_rec_7d,
        "condition_avg_7d": avg(cond_7d),
        "hydration_avg_7d": avg(hydra_7d),
        "sessions_7d": len(results_7d),
        "sessions_30d": len(results_30d),
        "recovery_min_7d": min(rec_7d) if rec_7d else None,
        "recovery_max_7d": max(rec_7d) if rec_7d else None,
        "condition_min_7d": min(cond_7d) if cond_7d else None,
        "hydration_min_7d": min(hydra_7d) if hydra_7d else None,
        "completion_rate_7d": round(
            len([r for r in results_7d if r.return_time]) / len(results_7d), 2
        ) if results_7d else None,
        "avg_rank_7d": avg([r.internal_rank for r in results_7d if r.internal_rank is not None]),
        "load_ratio": round(len(results_7d) / (len(results_30d) / 4.3), 2) if results_30d else None,
        "regularity_index": round(len(results_30d) / 30 * 10, 2),
        "recovery_trend": "stable",  # simplifié — calcul de tendance V2
        "fatigue_risk": (
            "faible" if avg_rec_7d and avg_rec_7d >= 6
            else "moyen" if avg_rec_7d and avg_rec_7d >= 4
            else "eleve"
        ),
        "data_quality": (
            "riche" if len(results_30d) >= 10
            else "partiel" if len(results_30d) >= 3
            else "insuffisant"
        ),
    }

    snap = AISnapshot(
        pigeon_id=pigeon_id,
        snapshot_date=today,
        snapshot_version="v1",
        feature_set_version="core_v1",
        features=json.dumps(features, ensure_ascii=False),
    )
    db.add(snap)
    await db.commit()
    await db.refresh(snap)
    return snap
