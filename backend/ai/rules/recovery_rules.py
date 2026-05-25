"""
Moteur de règles récupération pour les pigeons voyageurs.
Fonctions pures — aucun import SQLAlchemy, aucune dépendance async.
"""

from dataclasses import dataclass
from typing import Optional


@dataclass
class RecoveryContext:
    """Contexte de récupération pour l'évaluation des règles."""
    hydration_score: Optional[float] = None          # score d'hydratation 0-100
    recovery_score_last: Optional[float] = None      # dernier score de récupération
    recovery_avg_7d: Optional[float] = None          # moyenne récupération 7 jours
    days_since_last_session: Optional[int] = None    # jours depuis la dernière séance
    condition_score_last: Optional[float] = None     # dernier score de condition physique


@dataclass
class RecoveryRecommendation:
    """Recommandation générée par une règle de récupération."""
    recommendation_type: str
    severity: str   # info / warning / critical
    title: str
    message: str


def evaluate_recovery_rules(ctx: RecoveryContext) -> list[RecoveryRecommendation]:
    """
    Évalue toutes les règles de récupération et retourne les recommandations déclenchées.
    Retourne une liste vide si aucune règle n'est déclenchée.
    """
    recs: list[RecoveryRecommendation] = []

    # ── Règle 1 : hydratation faible → alerte hydratation ────────────────────
    if ctx.hydration_score is not None and ctx.hydration_score < 50:
        severity = "critical" if ctx.hydration_score < 30 else "warning"
        recs.append(RecoveryRecommendation(
            recommendation_type="hydration_warning",
            severity=severity,
            title="Hydratation insuffisante en phase de récupération",
            message=(
                f"Le score d'hydratation ({ctx.hydration_score:.0f}/100) est insuffisant. "
                "Une bonne hydratation est essentielle à la récupération musculaire. "
                "Vérifiez l'accès à l'eau propre, ajoutez éventuellement des "
                "électrolytes et surveillez la consommation quotidienne."
            ),
        ))

    # ── Règle 2 : score de récupération très bas → alerte critique ───────────
    if ctx.recovery_score_last is not None and ctx.recovery_score_last < 30:
        recs.append(RecoveryRecommendation(
            recommendation_type="recovery_alert",
            severity="critical",
            title="Récupération critique — intervention requise",
            message=(
                f"Le score de récupération ({ctx.recovery_score_last:.0f}/100) est "
                "dangereusement bas. Le pigeon présente des signes de fatigue sévère. "
                "Suspendez tout entraînement pendant 2 à 3 jours, améliorez les conditions "
                "de logement et consultez un vétérinaire si le score ne remonte pas."
            ),
        ))

    # ── Règle 3 : tendance récupération en baisse → tendance négative ─────────
    if (
        ctx.recovery_score_last is not None
        and ctx.recovery_avg_7d is not None
        and ctx.recovery_score_last < ctx.recovery_avg_7d * 0.85
    ):
        recs.append(RecoveryRecommendation(
            recommendation_type="recovery_alert",
            severity="warning",
            title="Tendance de récupération négative",
            message=(
                f"Le dernier score de récupération ({ctx.recovery_score_last:.0f}/100) "
                f"est significativement inférieur à la moyenne des 7 derniers jours "
                f"({ctx.recovery_avg_7d:.0f}/100). "
                "Cette tendance baissière suggère une accumulation de fatigue. "
                "Réduisez la charge d'entraînement et enrichissez la ration en "
                "vitamines du groupe B pour soutenir la récupération."
            ),
        ))

    # ── Règle 4 : inactivité prolongée → alerte déconditionnement ─────────────
    if ctx.days_since_last_session is not None and ctx.days_since_last_session >= 14:
        recs.append(RecoveryRecommendation(
            recommendation_type="conditioning_advice",
            severity="info",
            title="Inactivité prolongée détectée",
            message=(
                f"Aucune séance d'entraînement depuis {ctx.days_since_last_session} jours. "
                "Une inactivité prolongée entraîne une perte de condition physique et "
                "de motivation. Reprenez progressivement avec des vols de loft courts "
                "avant de passer aux séances de distance."
            ),
        ))

    return recs
