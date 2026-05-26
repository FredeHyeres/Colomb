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


def compute_forme_score(results: list, results_7d: list = None) -> dict:
    """
    Score forme basé sur les résultats 30j.
    vitesse_relative 40% + regularite 30% + progression 20% + ratio_completions 10%
    """
    if not results:
        return {"score": 0.0, "facteurs": [], "detail": "Aucune donnée"}

    # ratio_completions : pigeons ayant un return_time
    completions = [r for r in results if r.return_time is not None]
    ratio_completions = len(completions) / len(results) * 10

    # Régularité basée sur volume 30j (max 10 séances = score 10)
    regularite = min(10, len(results) * 1.0)

    # Progression : récupération récente (7j) vs ancienne (8j-30j)
    recent = results_7d if results_7d else results[:3]
    older = [r for r in results if r not in recent]

    rec_recent = [r.recovery_score for r in recent if r.recovery_score is not None]
    rec_older = [r.recovery_score for r in older if r.recovery_score is not None]

    avg_recent = sum(rec_recent) / len(rec_recent) if rec_recent else None
    avg_older = sum(rec_older) / len(rec_older) if rec_older else None

    if avg_recent is not None and avg_older is not None:
        delta = avg_recent - avg_older
        progression_score = max(0, min(10, 5 + delta))
    elif avg_recent is not None:
        progression_score = max(0, min(10, avg_recent))
    else:
        progression_score = 5.0

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

    if score_global >= 70:
        rec, tendance = "concours", "progression"
        contre_indications = []
    elif score_global >= 50:
        rec, tendance = "entrainement_leger", "stable"
        contre_indications = ["Surveiller hydratation"]
    elif score_global >= 30:
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


def generate_comment(
    recommendation: str,
    score_global: float,
    avg_recovery: float,
    results: list,
    results_7d: list,
    recovery_trend: str = "stable",
    confiance: float = 0.5,
) -> dict:
    """Génère un commentaire contextuel et une action recommandée — pur Python, sans LLM."""
    n_30d = len(results)
    n_7d  = len(results_7d)

    rec_recent = [r.recovery_score for r in results_7d if r.recovery_score is not None]
    rec_older  = [r.recovery_score for r in results
                  if r not in results_7d and r.recovery_score is not None]
    avg_rec_7d  = round(sum(rec_recent) / len(rec_recent), 1) if rec_recent else None
    avg_rec_old = round(sum(rec_older)  / len(rec_older),  1) if rec_older  else None

    if recovery_trend == "progression":
        trend_txt = "récupération en hausse"
    elif recovery_trend == "declin":
        trend_txt = "récupération en baisse"
    else:
        trend_txt = "récupération stable"

    delta_txt = ""
    if avg_rec_7d is not None and avg_rec_old is not None:
        delta = round(avg_rec_7d - avg_rec_old, 1)
        if delta > 0:
            delta_txt = f" (+{delta} pts vs semaines précédentes)"
        elif delta < 0:
            delta_txt = f" ({delta} pts vs semaines précédentes)"

    seances_txt = f"{n_30d} séance{'s' if n_30d > 1 else ''} sur 30 jours"
    if n_7d > 0:
        seances_txt += f", dont {n_7d} cette semaine"

    if confiance >= 0.8:
        confiance_txt = "Analyse fiable"
    elif confiance >= 0.5:
        confiance_txt = "Données partielles"
    else:
        confiance_txt = "Peu de données disponibles"

    if recommendation == "concours":
        if recovery_trend == "progression":
            message = (
                f"Forme excellente — {trend_txt}{delta_txt}. "
                f"{seances_txt.capitalize()}. "
                f"Score global {score_global}/100. {confiance_txt}."
            )
        else:
            message = (
                f"Condition suffisante pour la compétition — {trend_txt}. "
                f"{seances_txt.capitalize()}. "
                f"Score global {score_global}/100. {confiance_txt}."
            )
        title  = "Prêt pour le concours"
        action = "Engager sur le prochain concours. Surveiller hydratation au retour."

    elif recommendation == "entrainement_leger":
        if recovery_trend == "declin":
            message = (
                f"Forme correcte mais {trend_txt}{delta_txt}. "
                f"Maintenir le rythme sans surcharger. "
                f"{seances_txt.capitalize()}. Score global {score_global}/100."
            )
        else:
            message = (
                f"Bonne base — {trend_txt}. "
                f"Le pigeon peut progresser avec un travail régulier. "
                f"{seances_txt.capitalize()}. Score global {score_global}/100."
            )
        title  = "Entraînement léger conseillé"
        action = "Privilégier des lancers courts. Pas de concours cette semaine."

    elif recommendation == "repos":
        if n_7d == 0:
            message = (
                f"Aucune séance cette semaine — activité insuffisante pour évaluer la forme. "
                f"{seances_txt.capitalize()}. Score global {score_global}/100."
            )
            action = "Reprendre progressivement avec des vols de loft."
        else:
            message = (
                f"Récupération insuffisante — {trend_txt}{delta_txt}. "
                f"Récupération moyenne 7j : {avg_rec_7d}/10. "
                f"{seances_txt.capitalize()}. Score global {score_global}/100."
            )
            action = "Repos minimum 5 à 7 jours. Électrolytes et dépuratif recommandés."
        title = "Repos recommandé"

    else:  # reforme
        message = (
            f"Indices sportifs très bas — {trend_txt}{delta_txt}. "
            f"Récupération moyenne 7j : {avg_rec_7d if avg_rec_7d else '—'}/10. "
            f"Score global {score_global}/100. {confiance_txt}."
        )
        title  = "Bilan vétérinaire conseillé"
        action = "Consultation vétérinaire recommandée avant toute reprise."

    return {"title": title, "message": message, "action": action}


async def generate_ai_recommendation(pigeon_id: str, db: AsyncSession) -> AIRecommendation:
    """
    Génère une recommandation XAI complète pour un pigeon.
    1. Récupère les résultats sur 30 jours glissants
    2. Calcule tous les scores
    3. Construit les facteurs explicatifs
    4. Sauvegarde en DB
    5. Crée un SportEvent
    """
    # 1. Récupérer les résultats des 30 derniers jours avec la session
    cutoff_30d = date.today() - timedelta(days=30)
    result = await db.execute(
        select(PigeonTrainingResult)
        .options(selectinload(PigeonTrainingResult.session))
        .join(TrainingSession)
        .where(
            PigeonTrainingResult.pigeon_id == pigeon_id,
            TrainingSession.date >= cutoff_30d
        )
        .order_by(TrainingSession.date.desc())
    )
    results = result.scalars().all()

    cutoff_7d = date.today() - timedelta(days=7)
    results_7d = [r for r in results if r.session and r.session.date >= cutoff_7d]

    # 2. Calculer scores
    forme_data = compute_forme_score(results, results_7d=results_7d)
    endurance_data = compute_endurance_score(results)

    rec_scores = [r.recovery_score for r in results if r.recovery_score is not None]
    avg_recovery = sum(rec_scores) / len(rec_scores) if rec_scores else 0.0

    scores = {
        "forme": forme_data["score"],
        "endurance": endurance_data["score"],
        "forme_facteurs": forme_data.get("facteurs", []),
    }

    rec_data = compute_recommendation(scores, avg_recovery)

    # Recovery trend à la volée pour le commentaire
    rec_recent_vals = [r.recovery_score for r in results_7d if r.recovery_score is not None]
    rec_older_vals  = [r.recovery_score for r in results
                       if r not in results_7d and r.recovery_score is not None]
    avg_r = sum(rec_recent_vals) / len(rec_recent_vals) if rec_recent_vals else None
    avg_o = sum(rec_older_vals)  / len(rec_older_vals)  if rec_older_vals  else None
    if avg_r is not None and avg_o is not None:
        delta_trend = avg_r - avg_o
        recovery_trend = "progression" if delta_trend > 0.5 else ("declin" if delta_trend < -0.5 else "stable")
    else:
        recovery_trend = "stable"

    comment = generate_comment(
        recommendation = rec_data["recommendation"],
        score_global   = rec_data["score_global"],
        avg_recovery   = avg_recovery,
        results        = results,
        results_7d     = results_7d,
        recovery_trend = recovery_trend,
        confiance      = rec_data["confiance"],
    )

    # 3. Facteurs explicatifs
    facteurs = build_facteurs_explicatifs(results, scores)

    # 4. Sauvegarder
    rec = AIRecommendation(
        pigeon_id            = pigeon_id,
        generated_at         = datetime.now(timezone.utc),
        score_forme          = forme_data["score"],
        score_endurance      = endurance_data["score"],
        score_vitesse        = None,
        score_global         = rec_data["score_global"],
        tendance             = rec_data["tendance"],
        recommendation       = rec_data["recommendation"],
        confiance            = rec_data["confiance"],
        facteurs_explicatifs = json.dumps(facteurs, ensure_ascii=False),
        title                = comment["title"],
        message              = comment["message"],
        action               = comment["action"],
        resolved             = False,
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
        .options(selectinload(PigeonTrainingResult.session))
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

    # Recovery trend : comparer 7j vs 14j-30j
    cutoff_14d = today - timedelta(days=14)
    results_14d_30d = [r for r in results_30d
                       if r.session and cutoff_14d > r.session.date >= cutoff_30d]
    rec_14d_30d = [r.recovery_score for r in results_14d_30d if r.recovery_score is not None]
    avg_rec_14d_30d = avg(rec_14d_30d)

    if avg_rec_7d is not None and avg_rec_14d_30d is not None:
        delta = avg_rec_7d - avg_rec_14d_30d
        recovery_trend = "progression" if delta > 0.5 else ("declin" if delta < -0.5 else "stable")
    else:
        recovery_trend = "stable"

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
        "recovery_avg_30d": avg([r.recovery_score for r in results_30d if r.recovery_score is not None]),
        "condition_avg_30d": avg([r.condition_score for r in results_30d if r.condition_score is not None]),
        "hydration_avg_30d": avg([r.hydration_score for r in results_30d if r.hydration_score is not None]),
        "completion_rate_7d": round(
            len([r for r in results_7d if r.return_time]) / len(results_7d), 2
        ) if results_7d else None,
        "avg_rank_7d": avg([r.internal_rank for r in results_7d if r.internal_rank is not None]),
        "load_ratio": round(len(results_7d) / (len(results_30d) / 4.3), 2) if results_30d else None,
        "regularity_index": round(len(results_30d) / 30 * 10, 2),
        "recovery_trend": recovery_trend,
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
