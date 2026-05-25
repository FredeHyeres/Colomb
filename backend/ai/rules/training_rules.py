"""
Moteur de règles entraînement pour les pigeons voyageurs.
Fonctions pures — aucun import SQLAlchemy, aucune dépendance async.
"""

from dataclasses import dataclass
from typing import Optional


@dataclass
class TrainingContext:
    """Contexte d'entraînement pour l'évaluation des règles."""
    recovery_score_last: Optional[float] = None   # dernier score de récupération observé
    recovery_avg_7d: Optional[float] = None        # moyenne récupération sur 7 jours
    training_load_7d: Optional[float] = None       # nombre de séances sur 7 derniers jours
    training_load_3d: Optional[float] = None       # nombre de séances sur 3 derniers jours
    condition_avg_7d: Optional[float] = None       # moyenne condition physique sur 7 jours
    days_since_last_rest: Optional[int] = None     # jours depuis le dernier jour de repos


@dataclass
class TrainingRecommendation:
    """Recommandation générée par une règle d'entraînement."""
    recommendation_type: str
    severity: str   # info / warning / critical
    title: str
    message: str


def evaluate_training_rules(ctx: TrainingContext) -> list[TrainingRecommendation]:
    """
    Évalue toutes les règles d'entraînement et retourne les recommandations déclenchées.
    Retourne une liste vide si aucune règle n'est déclenchée.
    """
    recs: list[TrainingRecommendation] = []

    # ── Règle 1 : score de récupération faible → réduire la charge ───────────
    if ctx.recovery_score_last is not None and ctx.recovery_score_last < 40:
        severity = "critical" if ctx.recovery_score_last < 25 else "warning"
        recs.append(TrainingRecommendation(
            recommendation_type="recovery_alert",
            severity=severity,
            title="Score de récupération insuffisant",
            message=(
                f"Le dernier score de récupération ({ctx.recovery_score_last:.0f}/100) "
                "est trop bas pour maintenir la charge actuelle. "
                "Réduisez l'intensité des prochaines séances et privilégiez les vols de "
                "loft courts. Accordez au moins un jour de repos complet."
            ),
        ))

    # ── Règle 2 : 3 séances en 3 jours → suggérer un repos ───────────────────
    if ctx.training_load_3d is not None and ctx.training_load_3d >= 3:
        recs.append(TrainingRecommendation(
            recommendation_type="overload_warning",
            severity="warning",
            title="Intensité trop élevée sur les 3 derniers jours",
            message=(
                f"{int(ctx.training_load_3d)} séances ont été effectuées sur les 3 derniers jours. "
                "Ce rythme peut provoquer une fatigue accumulée. "
                "Insérez une journée de repos ou de récupération active avant la prochaine séance."
            ),
        ))

    # ── Règle 3 : condition moyenne faible → alerte surcharge ────────────────
    if ctx.condition_avg_7d is not None and ctx.condition_avg_7d < 50:
        severity = "critical" if ctx.condition_avg_7d < 30 else "warning"
        recs.append(TrainingRecommendation(
            recommendation_type="conditioning_advice",
            severity=severity,
            title="Condition physique moyenne insuffisante",
            message=(
                f"La condition physique moyenne sur 7 jours ({ctx.condition_avg_7d:.0f}/100) "
                "indique un état de forme préoccupant. "
                "Réduisez la charge d'entraînement, vérifiez l'alimentation et consultez "
                "un vétérinaire si la situation persiste plus de 3 jours."
            ),
        ))

    # ── Règle 4 : 7 jours sans repos → repos obligatoire ─────────────────────
    if ctx.days_since_last_rest is not None and ctx.days_since_last_rest >= 7:
        recs.append(TrainingRecommendation(
            recommendation_type="recovery_alert",
            severity="critical",
            title="Absence de repos depuis 7 jours ou plus",
            message=(
                f"Aucun jour de repos depuis {ctx.days_since_last_rest} jours. "
                "Un repos complet est indispensable pour la récupération musculaire "
                "et la prévention des blessures. "
                "Accordez immédiatement 1 à 2 jours de repos sans séance d'entraînement."
            ),
        ))

    return recs
