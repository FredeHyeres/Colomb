"""
Fonctions d'agrégation des indices sportifs.
Calcule un score global à partir des indices de récupération, condition et régularité.
Fonctions pures — aucun import SQLAlchemy, aucune dépendance async.
"""

from typing import Optional


def aggregate_sport_score(
    recovery_index: Optional[float],
    condition_index: Optional[float],
    regularity_index: Optional[float],
) -> float:
    """
    Agrège les trois indices principaux en un score global 0-100.

    Pondération :
      - recovery_index   : 40 % (importance de la récupération)
      - condition_index  : 35 % (état physique général)
      - regularity_index : 25 % (régularité de l'entraînement)

    Si un indice est None, il est exclu et les autres sont renormalisés.
    Retourne 0.0 si tous les indices sont None.
    """
    poids = {
        "recovery": (recovery_index, 0.40),
        "condition": (condition_index, 0.35),
        "regularity": (regularity_index, 0.25),
    }

    total_poids = 0.0
    total_score = 0.0

    for _, (valeur, poids_val) in poids.items():
        if valeur is not None:
            # Normaliser sur 0-100 si nécessaire
            valeur_normalisee = max(0.0, min(100.0, float(valeur)))
            total_score += valeur_normalisee * poids_val
            total_poids += poids_val

    if total_poids == 0.0:
        return 0.0

    # Renormaliser si certains indices manquent
    return round(total_score / total_poids, 2)


def score_to_label(score: float) -> str:
    """
    Convertit un score global en étiquette qualitative.
      >= 75 → excellent
      >= 55 → bon
      >= 35 → moyen
       < 35 → faible
    """
    if score >= 75:
        return "excellent"
    elif score >= 55:
        return "bon"
    elif score >= 35:
        return "moyen"
    else:
        return "faible"


def calculate_regularity_index(sessions_count_7d: float, sessions_count_30d: float) -> float:
    """
    Calcule l'indice de régularité de l'entraînement (0-100).
    Basé sur la comparaison entre le rythme récent et le rythme mensuel habituel.
    Un rythme de 1 séance/jour = 100.

    Formule : moyenne des deux ratios (7j et 30j) par rapport à 7 séances/7j.
    """
    # Rythme idéal : une séance tous les 2 jours → 3.5 séances/7j
    rythme_ideal_7j = 3.5
    rythme_ideal_30j = 15.0

    ratio_7j = min(sessions_count_7d / rythme_ideal_7j, 1.0) if rythme_ideal_7j > 0 else 0.0
    ratio_30j = min(sessions_count_30d / rythme_ideal_30j, 1.0) if rythme_ideal_30j > 0 else 0.0

    return round((ratio_7j * 0.6 + ratio_30j * 0.4) * 100.0, 2)


def calculate_recovery_index(recovery_avg_7d: Optional[float]) -> float:
    """
    Transforme la moyenne de récupération 7j en indice 0-100.
    Les scores de récupération bruts sont déjà sur 0-100,
    cet indice applique une légère pondération exponentielle
    pour accentuer les extrêmes.
    """
    if recovery_avg_7d is None:
        return 0.0
    # Normalisation directe avec accentuation des extrêmes via puissance
    normalized = max(0.0, min(100.0, recovery_avg_7d))
    # Courbe légèrement convexe : pénalise davantage les faibles scores
    return round((normalized / 100.0) ** 0.9 * 100.0, 2)


def calculate_condition_index(condition_avg_7d: Optional[float]) -> float:
    """
    Transforme la moyenne de condition physique 7j en indice 0-100.
    """
    if condition_avg_7d is None:
        return 0.0
    normalized = max(0.0, min(100.0, condition_avg_7d))
    return round((normalized / 100.0) ** 0.9 * 100.0, 2)
