"""
Seed complet Nutrition — Colomb Sport
Alimente : feed_ingredients, feed_mix_ingredients, feed_mixes,
           nutrition_plans, supplements
Sources   : Ex-ration-veuvage-partiel, planning_et_melanges,
            Prog-veuvage, Ration-journalière

Exécuter : docker exec colombo_backend python seed_nutrition.py
"""
import asyncio
import json
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, text
from database import AsyncSessionLocal
from models.sport import (
    FeedIngredient, FeedMix, NutritionPlan, NutritionAssignment, Supplement,
    IngredientCategory, MixUsage, SupplementType,
    feed_mix_ingredients,
)


# ------------------------------------------------------------------
# Données ingrédients
# ------------------------------------------------------------------
INGREDIENTS = [
    # Graines énergie de base
    {
        "name": "Maïs", "category": IngredientCategory.energie,
        "description": "Principale source d'énergie rapide. Base de tous les mélanges sport et énergétiques.",
        "proteines_pct": 9.0, "lipides_pct": 4.5, "glucides_pct": 72.0, "energie_kcal": 356.0,
        "notes_eleveurs": "Star des glucides. Très apprécié des pigeons. Énergie rapide.",
    },
    {
        "name": "Petit maïs", "category": IngredientCategory.energie,
        "description": "Plus digestible que le maïs standard. Idéal pour les mélanges vitesse.",
        "proteines_pct": 9.0, "lipides_pct": 4.0, "glucides_pct": 73.0, "energie_kcal": 350.0,
        "notes_eleveurs": "Profil quasi identique au maïs standard, plus petit et digeste.",
    },
    {
        "name": "Blé", "category": IngredientCategory.energie,
        "description": "Bon équilibre énergie/protéines. Présent dans tous les mélanges.",
        "proteines_pct": 12.0, "lipides_pct": 1.8, "glucides_pct": 70.0, "energie_kcal": 339.0,
        "notes_eleveurs": "Bonne source de glucides complexes. Très digestible.",
    },
    {
        "name": "Dari blanc", "category": IngredientCategory.sport,
        "description": "Sorgho blanc, très digeste, riche en amidon. Pilier du mélange sport et vitesse.",
        "proteines_pct": 10.5, "lipides_pct": 3.2, "glucides_pct": 70.0, "energie_kcal": 339.0,
        "notes_eleveurs": "Sorgho blanc. Très bien accepté. Bon profil glucidique.",
    },
    {
        "name": "Sorgo", "category": IngredientCategory.sport,
        "description": "Synonyme dari. Grain léger et nerveux, favorise la réactivité.",
        "proteines_pct": 10.5, "lipides_pct": 3.2, "glucides_pct": 70.0, "energie_kcal": 339.0,
        "notes_eleveurs": "Identique au dari. Apport énergie + protéines équilibré.",
    },
    {
        "name": "Orge", "category": IngredientCategory.depuratif,
        "description": "Essentiel dans le dépuratif : calme et assèche le pigeon après le concours.",
        "proteines_pct": 11.5, "lipides_pct": 2.2, "glucides_pct": 63.0, "energie_kcal": 316.0,
        "notes_eleveurs": "Essentielle au mélange dépuratif. Calme et « assèche » le pigeon.",
    },
    {
        "name": "Riz paddy", "category": IngredientCategory.depuratif,
        "description": "Très digeste. Utilisé en dépuratif et dans le mélange demi-fond.",
        "proteines_pct": 7.5, "lipides_pct": 2.5, "glucides_pct": 75.0, "energie_kcal": 349.0,
        "notes_eleveurs": "Très digeste. Bon pour la récupération digestive post-concours.",
    },
    {
        "name": "Avoine décortiquée", "category": IngredientCategory.depuratif,
        "description": "Dépuratif doux, soutient la récupération musculaire.",
        "proteines_pct": 13.0, "lipides_pct": 6.5, "glucides_pct": 62.0, "energie_kcal": 356.0,
        "notes_eleveurs": "Riche en fibres, potassium, phosphore, zinc. Calme la digestion.",
    },
    # Protéines
    {
        "name": "Pois verts", "category": IngredientCategory.proteine,
        "description": "Légumineuse riche en protéines. Maintien musculaire en phase de travail.",
        "proteines_pct": 23.0, "lipides_pct": 1.5, "glucides_pct": 52.0, "energie_kcal": 314.0,
        "notes_eleveurs": "Source protéique principale. Reconstruit la masse musculaire.",
    },
    {
        "name": "Vesces", "category": IngredientCategory.proteine,
        "description": "Protéines élevées. Complément sport pour les demi-fondeurs.",
        "proteines_pct": 25.0, "lipides_pct": 1.8, "glucides_pct": 53.0, "energie_kcal": 316.0,
        "notes_eleveurs": "Légumineuse proche des pois. Riche en fibres. Bon substitut protéique.",
    },
    # Graines grasses
    {
        "name": "Cardy (carthame)", "category": IngredientCategory.graisse,
        "description": "Graine grasse digestible. Présente dans tous les mélanges, bonne énergie lipidique.",
        "proteines_pct": 15.0, "lipides_pct": 32.0, "glucides_pct": 14.0, "energie_kcal": 498.0,
        "notes_eleveurs": "Graine oléagineuse clé du veuvage. Riche en oméga-6.",
    },
    {
        "name": "Tournesol petit noir", "category": IngredientCategory.graisse,
        "description": "Énergie de réserve, bénéfique pour le plumage. Ajouté progressivement en milieu de semaine.",
        "proteines_pct": 15.0, "lipides_pct": 29.8, "glucides_pct": 9.0, "energie_kcal": 430.0,
        "notes_eleveurs": "Version non pelée : plus de fibres, moins digestible que décortiqué.",
    },
    {
        "name": "Tournesol décortiqué", "category": IngredientCategory.graisse,
        "description": "Concentration lipidique élevée. Utilisé en mélange énergétique et demi-fond.",
        "proteines_pct": 21.0, "lipides_pct": 52.0, "glucides_pct": 4.5, "energie_kcal": 580.0,
        "notes_eleveurs": "Très riche en lipides. Plumage, énergie longue durée. Version pelée, plus digestible.",
    },
    {
        "name": "Chanvre", "category": IngredientCategory.graisse,
        "description": "Oméga-3, endurance et résistance au vent. Charge finale jeudi-vendredi.",
        "proteines_pct": 22.7, "lipides_pct": 33.5, "glucides_pct": 5.0, "energie_kcal": 400.0,
        "notes_eleveurs": "Très oléagineux. Excitant, stimule l'instinct. Donner avant enlogement.",
    },
    {
        "name": "Cacahuètes concassées", "category": IngredientCategory.pre_concours,
        "description": "Réserves énergie fin de semaine. Quelques grains jeudi soir et avant enlogement.",
        "proteines_pct": 26.0, "lipides_pct": 46.0, "glucides_pct": 16.0, "energie_kcal": 567.0,
        "notes_eleveurs": "Légumineuse très calorique. Réservée fin de semaine / avant enlogement.",
    },
    {
        "name": "Colza / Lin", "category": IngredientCategory.graisse,
        "description": "Acides gras essentiels. Soutient l'état du plumage et l'endurance.",
        "proteines_pct": 20.0, "lipides_pct": 42.0, "glucides_pct": 5.5, "energie_kcal": 490.0,
        "notes_eleveurs": "Lin : active la mue, plumage soyeux. À doser (toxique en excès). Colza : bon profil lipidique.",
    },
]


# ------------------------------------------------------------------
# Données mélanges : code, métadonnées, composition
# ------------------------------------------------------------------
MELANGES = [
    {
        "name": "Dépuratif",
        "usage": MixUsage.recuperation,
        "description": (
            "Mélange léger post-concours. Utilisé du samedi (retour) "
            "au lundi. L'orge est essentielle : elle calme et assèche le pigeon."
        ),
        "ingredients": [
            ("Orge",               35.0),
            ("Blé",                20.0),
            ("Dari blanc",         15.0),
            ("Riz paddy",          10.0),
            ("Avoine décortiquée", 10.0),
            ("Petit maïs",          5.0),
            ("Cardy (carthame)",    5.0),
        ],
    },
    {
        "name": "Sport",
        "usage": MixUsage.entrainement,
        "description": (
            "Mélange de base de la semaine. Distribué du lundi au vendredi. "
            "Maintient le muscle, fournit une énergie régulière, soutient l'entraînement."
        ),
        "ingredients": [
            ("Maïs",                 30.0),
            ("Blé",                  15.0),
            ("Dari blanc",           15.0),
            ("Pois verts",           10.0),
            ("Sorgo",                10.0),
            ("Riz paddy",             5.0),
            ("Vesces",                5.0),
            ("Cardy (carthame)",      5.0),
            ("Tournesol petit noir",  5.0),
        ],
    },
    {
        "name": "Énergétique",
        "usage": MixUsage.pre_panier,
        "description": (
            "Distribué du mercredi soir au vendredi. Crée les réserves : "
            "graisse de qualité, endurance, résistance au vent et à la chaleur."
        ),
        "ingredients": [
            ("Maïs",                  35.0),
            ("Tournesol décortiqué",  15.0),
            ("Cacahuètes concassées", 10.0),
            ("Cardy (carthame)",      10.0),
            ("Chanvre",               10.0),
            ("Dari blanc",            10.0),
            ("Riz paddy",              5.0),
            ("Colza / Lin",            5.0),
        ],
    },
    {
        "name": "Vitesse",
        "usage": MixUsage.entrainement,
        "description": (
            "Mélange léger et nerveux pour concours courte distance (100–250 km). "
            "Favorise la réactivité et l'énergie rapide."
        ),
        "ingredients": [
            ("Petit maïs",           25.0),
            ("Dari blanc",           25.0),
            ("Blé",                  20.0),
            ("Sorgo",                15.0),
            ("Cardy (carthame)",      5.0),
            ("Tournesol petit noir",  5.0),
            ("Pois verts",            5.0),
        ],
    },
    {
        "name": "Demi-fond",
        "usage": MixUsage.entrainement,
        "description": (
            "Mélange équilibré pour concours moyenne/longue distance (300–600 km). "
            "Énergie soutenue, endurance, bonne digestibilité."
        ),
        "ingredients": [
            ("Maïs",                  35.0),
            ("Dari blanc",            15.0),
            ("Cardy (carthame)",      10.0),
            ("Pois verts",            10.0),
            ("Blé",                   10.0),
            ("Tournesol décortiqué",   5.0),
            ("Chanvre",                5.0),
            ("Vesces",                 5.0),
            ("Riz paddy",              5.0),
        ],
    },
]


# ------------------------------------------------------------------
# Plans nutritionnels hebdomadaires
# Chaque jour = liste de noms de mélanges (résolus en IDs après insertion)
# ------------------------------------------------------------------
PLANS = [
    {
        "name": "Veuvage partiel — Vitesse / Demi-fond",
        "goal": "Cycle complet retour concours → enlogement",
        "description": (
            "Programme 7 jours en veuvage partiel. "
            "Samedi retour du concours → vendredi enlogement. "
            "Quantités : 30–40 g/pigeon/jour (15–20 g au 1er repas du retour)."
        ),
        "days": {
            # (nom_mélange, pourcentage)
            "samedi":   [("Dépuratif", 80), ("Sport", 20)],
            "dimanche": [("Dépuratif", 60), ("Sport", 40)],
            "lundi":    [("Dépuratif", 40), ("Sport", 60)],
            "mardi":    [("Dépuratif", 20), ("Sport", 80)],
            "mercredi": [("Sport", 80),     ("Énergétique", 20)],
            "jeudi":    [("Sport", 60),     ("Énergétique", 40)],
            "vendredi": [("Sport", 70),     ("Énergétique", 30)],
        },
    },
    {
        "name": "Demi-fond longue distance (400–700 km)",
        "goal": "Endurance et réserves maximales",
        "description": (
            "Variante demi-fond / fond. Plus la distance augmente, "
            "plus on allège l'entraînement en milieu de semaine et "
            "plus on travaille la récupération et la motivation psychologique."
        ),
        "days": {
            "samedi":   [("Dépuratif", 70), ("Sport", 30)],
            "dimanche": [("Dépuratif", 100)],
            "lundi":    [("Dépuratif", 50), ("Sport", 50)],
            "mardi":    [("Dépuratif", 30), ("Demi-fond", 70)],
            "mercredi": [("Demi-fond", 80), ("Énergétique", 20)],
            "jeudi":    [("Demi-fond", 60), ("Énergétique", 40)],
            "vendredi": [("Demi-fond", 70), ("Énergétique", 30)],
        },
    },
    {
        "name": "Concours Vitesse (100–250 km)",
        "goal": "Légèreté et réactivité",
        "description": (
            "Plan court distance. Priorité à la légèreté et l'énergie rapide. "
            "Moins de graines grasses, plus de grains nerveux."
        ),
        "days": {
            "samedi":   [("Dépuratif", 100)],
            "dimanche": [("Dépuratif", 70), ("Sport", 30)],
            "lundi":    [("Sport", 100)],
            "mardi":    [("Sport", 60),   ("Vitesse", 40)],
            "mercredi": [("Vitesse", 100)],
            "jeudi":    [("Vitesse", 70), ("Énergétique", 30)],
            "vendredi": [("Vitesse", 100)],
        },
    },
]


# ------------------------------------------------------------------
# Suppléments
# ------------------------------------------------------------------
SUPPLEMENTS = [
    {
        "name": "Électrolytes Sport+",
        "type": SupplementType.electrolyte,
        "description": "Réhydratation post-concours. Eau du samedi retour et dimanche matin.",
        "dosage": "5 g/L d'eau",
    },
    {
        "name": "Vitamines légères B+E",
        "type": SupplementType.vitamine,
        "description": "Complexe multivitamines. Récupération samedi soir et dimanche.",
        "dosage": "3 gouttes/pigeon/jour",
    },
    {
        "name": "Levure de bière",
        "type": SupplementType.probiotique,
        "description": "Vitamines B, soutien récupération musculaire. Ajout dans la nourriture dimanche.",
        "dosage": "1 pincée dans la ration du dimanche",
    },
    {
        "name": "Probiotiques flore",
        "type": SupplementType.probiotique,
        "description": "Rétablissement de la flore intestinale après l'effort. Dimanche matin.",
        "dosage": "Selon dosage fabricant, dans l'eau",
    },
    {
        "name": "Ail en poudre",
        "type": SupplementType.autre,
        "description": "Antiseptique naturel léger. Utilisé en début de semaine de récupération.",
        "dosage": "Petite pincée dans la ration",
    },
    {
        "name": "Grit minéral",
        "type": SupplementType.autre,
        "description": "Minéraux + gravier. Toujours à disposition dans le pigeonnier. Aide la digestion.",
        "dosage": "À volonté en permanence",
    },
]


# ------------------------------------------------------------------
# Seed principal
# ------------------------------------------------------------------
async def seed():
    async with AsyncSessionLocal() as db:

        # -- Nettoyage (ordre FK : enfants avant parents) --
        await db.execute(delete(NutritionAssignment))
        await db.execute(delete(feed_mix_ingredients))
        await db.execute(delete(NutritionPlan))
        await db.execute(delete(FeedMix))
        await db.execute(delete(FeedIngredient))
        await db.execute(delete(Supplement))
        await db.commit()
        print("Tables nutrition vidées.")

        # -- Ingrédients --
        ing_map: dict[str, FeedIngredient] = {}
        for data in INGREDIENTS:
            ing = FeedIngredient(**data)
            db.add(ing)
            ing_map[data["name"]] = ing
        await db.flush()
        print(f"  {len(INGREDIENTS)} ingrédients insérés.")

        # -- Mélanges + composition JSON + association table --
        mix_name_to_id: dict[str, int] = {}
        for mdata in MELANGES:
            composition_json = json.dumps(
                [{"name": name, "pct": pct} for name, pct in mdata["ingredients"]],
                ensure_ascii=False,
            )
            mix = FeedMix(
                name=mdata["name"],
                usage=mdata["usage"],
                description=mdata["description"],
                composition=composition_json,
            )
            db.add(mix)
            await db.flush()
            mix_name_to_id[mdata["name"]] = mix.id

            for ing_name, pct in mdata["ingredients"]:
                ing = ing_map[ing_name]
                await db.execute(
                    feed_mix_ingredients.insert().values(
                        mix_id=mix.id,
                        ingredient_id=ing.id,
                        percentage=pct,
                    )
                )
        await db.flush()
        print(f"  {len(MELANGES)} mélanges insérés avec leur composition.")

        # -- Plans nutritionnels (jours = JSON [{id, pct}, ...]) --
        for pdata in PLANS:
            plan = NutritionPlan(
                name=pdata["name"],
                goal=pdata["goal"],
                description=pdata["description"],
            )
            for day, mix_entries in pdata["days"].items():
                items = [
                    {"id": mix_name_to_id[name], "pct": pct}
                    for name, pct in mix_entries
                    if name in mix_name_to_id
                ]
                setattr(plan, day, json.dumps(items) if items else None)
            db.add(plan)
        await db.flush()
        print(f"  {len(PLANS)} plans nutritionnels insérés.")

        # -- Suppléments --
        for sdata in SUPPLEMENTS:
            db.add(Supplement(**sdata))
        await db.flush()
        print(f"  {len(SUPPLEMENTS)} suppléments insérés.")

        await db.commit()
        print("\nSeed nutrition terminé.")
        print(f"  feed_ingredients     : {len(INGREDIENTS)}")
        print(f"  feed_mixes           : {len(MELANGES)}")
        print(f"  nutrition_plans      : {len(PLANS)}")
        print(f"  supplements          : {len(SUPPLEMENTS)}")


if __name__ == "__main__":
    asyncio.run(seed())
