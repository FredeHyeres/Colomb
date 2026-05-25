"""
Moteur d'orchestration des recommandations IA.
Évalue toutes les règles métier pour un pigeon et persiste les résultats.
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.ai_models import AIRecommendation
from ai.rules.nutrition_rules import NutritionContext, evaluate_nutrition_rules
from ai.rules.training_rules import TrainingContext, evaluate_training_rules
from ai.rules.recovery_rules import RecoveryContext, evaluate_recovery_rules


async def generate_recommendations_for_pigeon(
    db: AsyncSession,
    pigeon_id: str,
    context_data: dict,
) -> list[AIRecommendation]:
    """
    Évalue toutes les règles métier pour un pigeon et persiste les nouvelles recommandations.

    context_data doit contenir les métriques récentes du pigeon :
      - race_distance_km, temperature_c, hydration_score
      - training_load_7d, training_load_3d, recovery_score_last
      - recovery_avg_7d, condition_avg_7d, days_since_last_rest
      - nutrition_energy_avg, nutrition_protein_avg
      - days_since_last_session, condition_score_last
    """
    nouvelles_recs: list[AIRecommendation] = []

    # ── Règles nutrition ──────────────────────────────────────────────────────
    ctx_nutrition = NutritionContext(
        race_distance_km=context_data.get("race_distance_km"),
        temperature_c=context_data.get("temperature_c"),
        recovery_avg_7d=context_data.get("recovery_avg_7d"),
        training_load_7d=context_data.get("training_load_7d"),
        hydration_score=context_data.get("hydration_score"),
        nutrition_energy_avg=context_data.get("nutrition_energy_avg"),
        nutrition_protein_avg=context_data.get("nutrition_protein_avg"),
    )
    for rec in evaluate_nutrition_rules(ctx_nutrition):
        nouvelles_recs.append(AIRecommendation(
            pigeon_id=pigeon_id,
            recommendation_type=rec.recommendation_type,
            severity=rec.severity,
            title=rec.title,
            message=rec.message,
            source="expert_rules",
            resolved=False,
        ))

    # ── Règles entraînement ───────────────────────────────────────────────────
    ctx_training = TrainingContext(
        recovery_score_last=context_data.get("recovery_score_last"),
        recovery_avg_7d=context_data.get("recovery_avg_7d"),
        training_load_7d=context_data.get("training_load_7d"),
        training_load_3d=context_data.get("training_load_3d"),
        condition_avg_7d=context_data.get("condition_avg_7d"),
        days_since_last_rest=context_data.get("days_since_last_rest"),
    )
    for rec in evaluate_training_rules(ctx_training):
        nouvelles_recs.append(AIRecommendation(
            pigeon_id=pigeon_id,
            recommendation_type=rec.recommendation_type,
            severity=rec.severity,
            title=rec.title,
            message=rec.message,
            source="expert_rules",
            resolved=False,
        ))

    # ── Règles récupération ───────────────────────────────────────────────────
    ctx_recovery = RecoveryContext(
        hydration_score=context_data.get("hydration_score"),
        recovery_score_last=context_data.get("recovery_score_last"),
        recovery_avg_7d=context_data.get("recovery_avg_7d"),
        days_since_last_session=context_data.get("days_since_last_session"),
        condition_score_last=context_data.get("condition_score_last"),
    )
    for rec in evaluate_recovery_rules(ctx_recovery):
        nouvelles_recs.append(AIRecommendation(
            pigeon_id=pigeon_id,
            recommendation_type=rec.recommendation_type,
            severity=rec.severity,
            title=rec.title,
            message=rec.message,
            source="expert_rules",
            resolved=False,
        ))

    # ── Persistance ───────────────────────────────────────────────────────────
    for rec in nouvelles_recs:
        db.add(rec)
    await db.commit()

    # Rafraîchir les IDs générés
    for rec in nouvelles_recs:
        await db.refresh(rec)

    return nouvelles_recs


async def get_active_recommendations(
    db: AsyncSession,
    pigeon_id: str,
) -> list[AIRecommendation]:
    """Retourne toutes les recommandations non résolues pour un pigeon."""
    result = await db.execute(
        select(AIRecommendation)
        .where(AIRecommendation.pigeon_id == pigeon_id)
        .where(AIRecommendation.resolved == False)  # noqa: E712
        .order_by(AIRecommendation.created_at.desc())
    )
    return list(result.scalars().all())


async def resolve_recommendation(db: AsyncSession, rec_id: int) -> bool:
    """
    Marque une recommandation comme résolue.
    Retourne True si la recommandation a été trouvée et mise à jour, False sinon.
    """
    result = await db.execute(
        select(AIRecommendation).where(AIRecommendation.id == rec_id)
    )
    rec = result.scalar_one_or_none()
    if rec is None:
        return False
    rec.resolved = True
    await db.commit()
    return True
