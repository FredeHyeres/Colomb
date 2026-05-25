"""
Service nutritionnel : accès aux mélanges, plans et calcul des macronutriments.
"""

from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from models.sport import FeedMix, FeedMixIngredient, NutritionPlan, FeedIngredient


async def get_mix_with_ingredients(db: AsyncSession, mix_id: int) -> Optional[FeedMix]:
    """Retourne un mélange avec la liste complète de ses ingrédients."""
    result = await db.execute(
        select(FeedMix)
        .options(
            selectinload(FeedMix.ingredients).selectinload(FeedMixIngredient.ingredient)
        )
        .where(FeedMix.id == mix_id)
    )
    return result.scalar_one_or_none()


async def get_plan_with_days(db: AsyncSession, plan_id: int) -> Optional[NutritionPlan]:
    """Retourne un plan nutritionnel avec tous ses jours."""
    result = await db.execute(
        select(NutritionPlan)
        .options(selectinload(NutritionPlan.days))
        .where(NutritionPlan.id == plan_id)
    )
    return result.scalar_one_or_none()


async def compute_mix_nutrition(db: AsyncSession, mix_id: int) -> dict:
    """
    Calcule les macronutriments pondérés d'un mélange.
    Chaque valeur est la moyenne pondérée par le pourcentage de chaque ingrédient.
    Retourne un dict avec protein_pct, fat_pct, carbs_pct et energy_index.
    """
    result = await db.execute(
        select(FeedMixIngredient)
        .options(selectinload(FeedMixIngredient.ingredient))
        .where(FeedMixIngredient.mix_id == mix_id)
    )
    rows = result.scalars().all()

    if not rows:
        return {"protein_pct": 0.0, "fat_pct": 0.0, "carbs_pct": 0.0, "energy_index": 0.0}

    # Normaliser les pourcentages au cas où ils ne somment pas exactement à 100
    total_pct = sum(r.percentage for r in rows) or 100.0

    protein = fat = carbs = energy = 0.0
    for row in rows:
        ing = row.ingredient
        weight = row.percentage / total_pct
        protein += (ing.protein_pct or 0.0) * weight
        fat += (ing.fat_pct or 0.0) * weight
        carbs += (ing.carbs_pct or 0.0) * weight
        energy += (ing.energy_index or 0.0) * weight

    return {
        "protein_pct": round(protein, 2),
        "fat_pct": round(fat, 2),
        "carbs_pct": round(carbs, 2),
        "energy_index": round(energy, 2),
    }
