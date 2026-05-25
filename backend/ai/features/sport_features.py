"""
Feature engineering pour le domaine sportif colombophile.
Fonctions pures — aucun import SQLAlchemy, aucune dépendance async.
"""

from typing import Optional


def calculate_training_load_ratio(load_7d: float, load_30d: float) -> float:
    """
    Ratio charge récente sur charge habituelle.
    > 1.3 indique une surcharge potentielle (augmentation trop rapide).
    Retourne 1.0 si la charge de 30j est nulle (pas d'historique).
    """
    if load_30d <= 0:
        return 1.0
    # Charge habituelle hebdomadaire = charge 30j / 4 semaines
    habitual_weekly = load_30d / 4.0
    if habitual_weekly <= 0:
        return 1.0
    return load_7d / habitual_weekly


def calculate_recovery_trend(scores: list[float]) -> float:
    """
    Calcule la pente de régression linéaire simple sur les scores de récupération.
    Retourne une valeur positive si la tendance est à l'amélioration,
    négative si elle est à la dégradation.
    Retourne 0.0 si la liste contient moins de 2 valeurs.
    """
    n = len(scores)
    if n < 2:
        return 0.0

    # Régression linéaire manuelle : y = a*x + b, on cherche la pente a
    x_vals = list(range(n))
    x_mean = sum(x_vals) / n
    y_mean = sum(scores) / n

    numerateur = sum((x_vals[i] - x_mean) * (scores[i] - y_mean) for i in range(n))
    denominateur = sum((x_vals[i] - x_mean) ** 2 for i in range(n))

    if denominateur == 0:
        return 0.0
    return numerateur / denominateur


def calculate_condition_trend(scores: list[float]) -> float:
    """
    Calcule la tendance de la condition physique sur N dernières séances.
    Retourne la pente de régression linéaire (positif = amélioration).
    Retourne 0.0 si moins de 2 valeurs disponibles.
    """
    # Même logique que la tendance de récupération
    return calculate_recovery_trend(scores)


def calculate_heat_stress_index(temperature_c: float, humidity_pct: Optional[float] = None) -> float:
    """
    Calcule l'indice de stress thermique (THI — Temperature Humidity Index adapté aux pigeons).
    > 70 indique un stress thermique élevé.
    > 80 indique un stress critique pouvant affecter les performances.

    Formule THI simplifiée :
        THI = temperature_c * 1.8 + 32 - (0.55 - 0.0055 * humidity_pct) * (temperature_c * 1.8 + 32 - 58)
    Si humidity_pct non disponible, on utilise une humidité par défaut de 60 %.
    """
    if humidity_pct is None:
        humidity_pct = 60.0

    # Conversion en Fahrenheit
    temp_f = temperature_c * 1.8 + 32.0

    # Formule THI standard
    thi = temp_f - (0.55 - 0.0055 * humidity_pct) * (temp_f - 58.0)
    return round(thi, 2)


def calculate_fatigue_risk(
    load_ratio: float,
    recovery_avg: float,
    condition_avg: float,
) -> float:
    """
    Calcule un score de risque de fatigue entre 0 et 100.
    > 70 indique un risque élevé de fatigue ou de blessure.

    Pondération :
      - load_ratio  : 40 % (ratio charge récente / habituelle)
      - recovery    : 35 % (score de récupération inversé)
      - condition   : 25 % (score de condition inversé)
    """
    # Contribution du ratio de charge (normalisé sur 0-1 avec seuil de 2.0)
    # ratio=1.0 → neutre (0.5), ratio=0.0 → repos total (0), ratio=2.0+ → max
    load_score = min(load_ratio / 2.0, 1.0)  # 0 à 1

    # Contribution de la récupération (inversée : faible récupération = risque élevé)
    # recovery_avg sur 0-100, on inverse et normalise
    recovery_score = max(0.0, min(1.0, 1.0 - (recovery_avg / 100.0)))

    # Contribution de la condition physique (inversée)
    condition_score = max(0.0, min(1.0, 1.0 - (condition_avg / 100.0)))

    # Score pondéré
    fatigue_risk = (load_score * 0.40 + recovery_score * 0.35 + condition_score * 0.25) * 100.0
    return round(fatigue_risk, 2)
