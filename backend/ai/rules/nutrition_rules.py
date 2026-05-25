"""
Moteur de règles nutrition pour les pigeons voyageurs.
Fonctions pures — aucun import SQLAlchemy, aucune dépendance async.
"""

from dataclasses import dataclass
from typing import Optional


@dataclass
class NutritionContext:
    """Contexte nutritionnel pour l'évaluation des règles."""
    race_distance_km: Optional[float] = None
    temperature_c: Optional[float] = None
    recovery_avg_7d: Optional[float] = None
    training_load_7d: Optional[float] = None
    hydration_score: Optional[float] = None
    nutrition_energy_avg: Optional[float] = None
    nutrition_protein_avg: Optional[float] = None


@dataclass
class NutritionRecommendation:
    """Recommandation générée par une règle nutrition."""
    recommendation_type: str
    severity: str   # info / warning / critical
    title: str
    message: str


def evaluate_nutrition_rules(ctx: NutritionContext) -> list[NutritionRecommendation]:
    """
    Évalue toutes les règles nutrition et retourne les recommandations déclenchées.
    Retourne une liste vide si aucune règle n'est déclenchée.
    """
    recs: list[NutritionRecommendation] = []

    # ── Règle 1 : grande distance → augmenter le mélange énergétique ─────────
    if ctx.race_distance_km is not None and ctx.race_distance_km > 350:
        recs.append(NutritionRecommendation(
            recommendation_type="nutrition_adjustment",
            severity="info",
            title="Course longue distance détectée",
            message=(
                f"La distance prévue ({ctx.race_distance_km:.0f} km) dépasse 350 km. "
                "Augmentez la proportion de grains énergétiques (maïs, sorgho) dans "
                "le mélange des 3 jours précédant la course afin de constituer des "
                "réserves glycogéniques suffisantes."
            ),
        ))

    # ── Règle 2 : forte chaleur → réduire les protéines + électrolytes ───────
    if ctx.temperature_c is not None and ctx.temperature_c > 30:
        recs.append(NutritionRecommendation(
            recommendation_type="nutrition_adjustment",
            severity="warning",
            title="Chaleur élevée — adapter la ration",
            message=(
                f"La température ({ctx.temperature_c:.1f} °C) dépasse 30 °C. "
                "Réduisez la teneur en protéines du mélange (éviter légumineuses en excès) "
                "pour limiter la production de chaleur métabolique. "
                "Ajoutez des électrolytes (sodium, potassium) dans l'eau de boisson."
            ),
        ))

    # ── Règle 3 : hydratation faible → alerte hydratation ────────────────────
    if ctx.hydration_score is not None and ctx.hydration_score < 50:
        severity = "critical" if ctx.hydration_score < 30 else "warning"
        recs.append(NutritionRecommendation(
            recommendation_type="hydration_warning",
            severity=severity,
            title="Score d'hydratation insuffisant",
            message=(
                f"Le score d'hydratation moyen ({ctx.hydration_score:.0f}/100) est trop bas. "
                "Vérifiez la qualité et la disponibilité de l'eau. "
                "Envisagez d'ajouter du vinaigre de cidre ou des électrolytes pour "
                "stimuler la consommation d'eau."
            ),
        ))

    # ── Règle 4 : charge élevée + énergie faible → ajustement ─────────────────
    if (
        ctx.training_load_7d is not None
        and ctx.nutrition_energy_avg is not None
        and ctx.training_load_7d >= 4
        and ctx.nutrition_energy_avg < 60
    ):
        recs.append(NutritionRecommendation(
            recommendation_type="nutrition_adjustment",
            severity="warning",
            title="Déficit énergétique en période d'entraînement intensif",
            message=(
                f"La charge d'entraînement est élevée ({ctx.training_load_7d:.0f} séances/7j) "
                f"mais l'indice énergétique moyen est faible ({ctx.nutrition_energy_avg:.0f}/100). "
                "Augmentez la ration calorique et privilégiez les grains à haute densité "
                "énergétique (maïs, blé, avoine décortiquée) pour éviter un état catabolique."
            ),
        ))

    return recs
