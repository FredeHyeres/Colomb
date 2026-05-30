"""
Seed additionnel — Programmes alimentaires Inter-Saison, Élevage, Retraités
Source : programmes_alimentaires_pigeon.xlsx

N'efface PAS les données existantes.
Exécuter : docker exec colombo_backend python seed_nutrition_v2.py
"""
import asyncio
import json
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import AsyncSessionLocal
from models.sport import (
    FeedIngredient, FeedMix, NutritionPlan, Supplement,
    IngredientCategory, MixUsage, SupplementType,
    feed_mix_ingredients,
)


# ──────────────────────────────────────────────────────────────────────────────
# Nouveaux mélanges
# ──────────────────────────────────────────────────────────────────────────────
NOUVEAUX_MELANGES = [
    {
        "name": "Élevage Riche",
        "usage": MixUsage.entrainement,
        "description": (
            "Mélange riche en protéines pour la phase de reproduction et d'élevage des jeunes. "
            "Soutient la production du lait de jabot et la croissance rapide des pigeonneaux. "
            "Utilisé pendant l'accouplement, le couvage et l'élevage (fév.–mai)."
        ),
        "ingredients": [
            ("Pois verts",             30.0),
            ("Maïs",                   20.0),
            ("Vesces",                 15.0),
            ("Dari blanc",             15.0),
            ("Blé",                    10.0),
            ("Tournesol décortiqué",    5.0),
            ("Chanvre",                 5.0),
        ],
    },
    {
        "name": "Mue & Plumage",
        "usage": MixUsage.recuperation,
        "description": (
            "Mélange conçu pour la période de mue (août–octobre). "
            "L'orge assèche et calme le pigeon ; le lin et le colza favorisent la repousse "
            "et la qualité du nouveau plumage (soyeux, serré, brillant). "
            "Le chanvre apporte des acides gras essentiels et stimule la kératine."
        ),
        "ingredients": [
            ("Orge",          35.0),
            ("Blé",           25.0),
            ("Riz paddy",     15.0),
            ("Colza / Lin",   15.0),
            ("Chanvre",       10.0),
        ],
    },
]

# ──────────────────────────────────────────────────────────────────────────────
# Nouveaux suppléments
# ──────────────────────────────────────────────────────────────────────────────
NOUVEAUX_SUPPLEMENTS = [
    {
        "name": "Vinaigre de cidre",
        "type": SupplementType.autre,
        "description": (
            "Antiseptique naturel, soutien de la santé digestive et immunitaire. "
            "Acidifie légèrement l'eau de boisson, limite la prolifération bactérienne. "
            "Utilisé tout au long de l'année, en particulier pendant la mue et l'hiver."
        ),
        "dosage": "5–10 ml/L d'eau, 2×/semaine",
    },
    {
        "name": "Vitamine D3",
        "type": SupplementType.vitamine,
        "description": (
            "Indispensable en période hivernale (manque de lumière solaire). "
            "Essentielle à l'absorption du calcium : formation des coquilles d'œufs, "
            "solidité osseuse des jeunes, prévention de la décalcification. "
            "Cruciale pendant le couvage et l'hiver des retraités."
        ),
        "dosage": "Selon notice fabricant, dans l'eau 2–3×/semaine",
    },
    {
        "name": "Vitamine E",
        "type": SupplementType.vitamine,
        "description": (
            "Vitamine de la fertilité et des articulations. "
            "Améliore la qualité du sperme et des ovocytes en pré-accouplement. "
            "Soulage les articulations des sujets âgés (retraités). "
            "À ne pas confondre avec le complexe B+E : ici vitamine E pure ou concentrée."
        ),
        "dosage": "2–3 gouttes/pigeon/jour, 3×/semaine",
    },
    {
        "name": "Coquilles d'huîtres",
        "type": SupplementType.autre,
        "description": (
            "Source de calcium hautement biodisponible. "
            "Indispensable pendant le couvage (formation des coquilles d'œufs) "
            "et pour la croissance osseuse des pigeonneaux. "
            "Complémentaire du grit minéral : à mettre en libre-service permanent au colombier."
        ),
        "dosage": "À volonté en libre-service permanent",
    },
]

# ──────────────────────────────────────────────────────────────────────────────
# Nouveaux plans nutritionnels
# Chaque jour = liste de (nom_mélange, pourcentage)
# ──────────────────────────────────────────────────────────────────────────────
NOUVEAUX_PLANS = [

    # ── PROGRAMME INTER-SAISON ──────────────────────────────────────────────

    {
        "name": "Inter-Saison — Mue Active (Août)",
        "goal": "Favoriser la mue complète",
        "description": (
            "Phase la plus critique de l'inter-saison. Le lin et le chanvre (dans Mue & Plumage) "
            "activent la repousse des plumes. L'orge dominant 'assèche' et purifie. "
            "Repos complet : pas d'entraînement. "
            "Compléments : levure de bière, Vit. B-complexe. "
            "Bains fréquents (2–3×/sem). Vinaigre de cidre 2×/sem. "
            "Ration : 30 g/pigeon/jour."
        ),
        "days": {
            "lundi":    [("Dépuratif", 60), ("Mue & Plumage", 40)],
            "mardi":    [("Dépuratif", 60), ("Mue & Plumage", 40)],
            "mercredi": [("Dépuratif", 60), ("Mue & Plumage", 40)],
            "jeudi":    [("Dépuratif", 60), ("Mue & Plumage", 40)],
            "vendredi": [("Dépuratif", 60), ("Mue & Plumage", 40)],
            "samedi":   [("Dépuratif", 60), ("Mue & Plumage", 40)],
            "dimanche": [("Dépuratif", 60), ("Mue & Plumage", 40)],
        },
    },
    {
        "name": "Inter-Saison — Fin de Mue (Septembre)",
        "goal": "Terminer la mue, réintroduire progressivement le Sport",
        "description": (
            "La mue se termine. Réintroduire progressivement le mélange Sport en début de semaine, "
            "augmenter sa part en fin de semaine. Observer la qualité du nouveau plumage : "
            "serré, brillant = bonne mue. "
            "Compléments : levure de bière, lin ou colza, minéraux + grit. "
            "Vols libres courts autour du colombier. "
            "Eau + ail haché 1×/sem. Bain 2×/sem. "
            "Ration : 30–32 g/pigeon/jour."
        ),
        "days": {
            "lundi":    [("Dépuratif", 55), ("Mue & Plumage", 25), ("Sport", 20)],
            "mardi":    [("Dépuratif", 55), ("Mue & Plumage", 25), ("Sport", 20)],
            "mercredi": [("Dépuratif", 50), ("Sport", 30), ("Mue & Plumage", 20)],
            "jeudi":    [("Dépuratif", 45), ("Sport", 35), ("Mue & Plumage", 20)],
            "vendredi": [("Dépuratif", 45), ("Sport", 35), ("Mue & Plumage", 20)],
            "samedi":   [("Dépuratif", 50), ("Sport", 30), ("Mue & Plumage", 20)],
            "dimanche": [("Dépuratif", 55), ("Mue & Plumage", 25), ("Sport", 20)],
        },
    },
    {
        "name": "Inter-Saison — Repos Hivernal (Oct-Déc)",
        "goal": "Repos physiologique hivernal, prévenir l'embonpoint",
        "description": (
            "Pigeons peu actifs, températures en baisse. Ration réduite. "
            "Surveiller l'embonpoint : pas de gras visible sur le bréchet. "
            "Octobre : vol facultatif si temps doux. Novembre–décembre : repos complet. "
            "En décembre, ajouter 5–10 % de graines grasses (colza/lin) si T° < 0 °C. "
            "Compléments : grit + minéraux, Vit. D3, coquilles d'huîtres. "
            "Eau + ail 2×/sem (immunité hivernale). "
            "Ration : 28–32 g/pigeon/jour."
        ),
        "days": {
            "lundi":    [("Dépuratif", 70), ("Sport", 20), ("Mue & Plumage", 10)],
            "mardi":    [("Dépuratif", 70), ("Sport", 20), ("Mue & Plumage", 10)],
            "mercredi": [("Dépuratif", 70), ("Sport", 20), ("Mue & Plumage", 10)],
            "jeudi":    [("Dépuratif", 70), ("Sport", 20), ("Mue & Plumage", 10)],
            "vendredi": [("Dépuratif", 70), ("Sport", 20), ("Mue & Plumage", 10)],
            "samedi":   [("Dépuratif", 70), ("Sport", 20), ("Mue & Plumage", 10)],
            "dimanche": [("Dépuratif", 70), ("Sport", 20), ("Mue & Plumage", 10)],
        },
    },
    {
        "name": "Inter-Saison — Remise en Forme (Janvier)",
        "goal": "Préparer les reproducteurs à l'accouplement de février",
        "description": (
            "Monter les protéines progressivement. Introduire les légumineuses (pois, vesces) "
            "via l'Élevage Riche. Vitamine E pour la fertilité. Probiotiques 2×/sem. "
            "Petits vols de 20–30 min, 2–3×/sem pour relancer la condition physique. "
            "Eau + probiotiques. Bain 2×/sem. "
            "Ration : 33–36 g/pigeon/jour."
        ),
        "days": {
            "lundi":    [("Dépuratif", 40), ("Sport", 40), ("Élevage Riche", 20)],
            "mardi":    [("Dépuratif", 35), ("Sport", 45), ("Élevage Riche", 20)],
            "mercredi": [("Dépuratif", 35), ("Sport", 45), ("Élevage Riche", 20)],
            "jeudi":    [("Dépuratif", 30), ("Sport", 50), ("Élevage Riche", 20)],
            "vendredi": [("Dépuratif", 30), ("Sport", 50), ("Élevage Riche", 20)],
            "samedi":   [("Dépuratif", 35), ("Sport", 45), ("Élevage Riche", 20)],
            "dimanche": [("Dépuratif", 40), ("Sport", 40), ("Élevage Riche", 20)],
        },
    },

    # ── PROGRAMME ÉLEVAGE ───────────────────────────────────────────────────

    {
        "name": "Élevage — Pré-Accouplement (Fév. S1-S2)",
        "goal": "Monter les protéines, stimuler la fertilité",
        "description": (
            "Monter les protéines progressivement via l'Élevage Riche (pois, vesces). "
            "Vitamine E + B-complexe pour la fertilité. Grit + minéraux en libre-service. "
            "Observer les premiers signes d'accouplement spontané. "
            "Vinaigre de cidre 2×/sem. Bain 2×/sem. Eau propre. "
            "Ration adulte : 35–38 g/pigeon/jour."
        ),
        "days": {
            "lundi":    [("Dépuratif", 30), ("Sport", 40), ("Élevage Riche", 30)],
            "mardi":    [("Dépuratif", 30), ("Sport", 40), ("Élevage Riche", 30)],
            "mercredi": [("Dépuratif", 25), ("Sport", 45), ("Élevage Riche", 30)],
            "jeudi":    [("Dépuratif", 25), ("Sport", 45), ("Élevage Riche", 30)],
            "vendredi": [("Dépuratif", 25), ("Sport", 45), ("Élevage Riche", 30)],
            "samedi":   [("Dépuratif", 30), ("Sport", 40), ("Élevage Riche", 30)],
            "dimanche": [("Dépuratif", 30), ("Sport", 40), ("Élevage Riche", 30)],
        },
    },
    {
        "name": "Élevage — Accouplement (Fév. S3-S4)",
        "goal": "Stimuler l'instinct de reproduction",
        "description": (
            "Le chanvre (dans Élevage Riche) et les légumineuses (pois, vesces) stimulent "
            "l'instinct de reproduction. Ne pas surcharger : un pigeon trop gras couve mal. "
            "Surveiller les parades et combats éventuels. "
            "Vitamine E. Grit en libre-service. "
            "Eau propre obligatoire. Bain régulier. "
            "Ration adulte : 38–42 g/pigeon/jour."
        ),
        "days": {
            "lundi":    [("Sport", 50), ("Élevage Riche", 30), ("Énergétique", 20)],
            "mardi":    [("Sport", 50), ("Élevage Riche", 30), ("Énergétique", 20)],
            "mercredi": [("Sport", 50), ("Élevage Riche", 30), ("Énergétique", 20)],
            "jeudi":    [("Sport", 50), ("Élevage Riche", 30), ("Énergétique", 20)],
            "vendredi": [("Sport", 50), ("Élevage Riche", 30), ("Énergétique", 20)],
            "samedi":   [("Sport", 50), ("Élevage Riche", 30), ("Énergétique", 20)],
            "dimanche": [("Sport", 50), ("Élevage Riche", 30), ("Énergétique", 20)],
        },
    },
    {
        "name": "Élevage — Couvage (Mars S1-S2)",
        "goal": "Maintenir les couveurs, calcium indispensable",
        "description": (
            "CALCIUM INDISPENSABLE pendant le couvage (formation des coquilles, croissance osseuse). "
            "Grit et coquilles d'huîtres en libre-service PERMANENT. Pas de stress. "
            "Éviter manipulation inutile des nids. Calme absolu. "
            "Compléments : grit + coquilles d'huîtres, Vit. D3. "
            "Eau propre changée 2×/jour. "
            "Ration adulte : 38–42 g/pigeon/jour."
        ),
        "days": {
            "lundi":    [("Sport", 40), ("Élevage Riche", 35), ("Dépuratif", 25)],
            "mardi":    [("Sport", 40), ("Élevage Riche", 35), ("Dépuratif", 25)],
            "mercredi": [("Sport", 40), ("Élevage Riche", 35), ("Dépuratif", 25)],
            "jeudi":    [("Sport", 40), ("Élevage Riche", 35), ("Dépuratif", 25)],
            "vendredi": [("Sport", 40), ("Élevage Riche", 35), ("Dépuratif", 25)],
            "samedi":   [("Sport", 40), ("Élevage Riche", 35), ("Dépuratif", 25)],
            "dimanche": [("Sport", 40), ("Élevage Riche", 35), ("Dépuratif", 25)],
        },
    },
    {
        "name": "Élevage — Éclosion & Jeunes (Mars S3-Avr. S2)",
        "goal": "Soutenir la production du lait de jabot et la croissance des pigeonneaux",
        "description": (
            "Les parents produisent le 'lait de pigeon' (jabot) pour les 72 premières heures. "
            "AUGMENTER FORTEMENT les rations : les parents consomment jusqu'à 50 g/j pour gaver. "
            "Protéines et graines grasses essentielles pour la croissance rapide des jeunes. "
            "Grit indispensable — risque de décalcification. "
            "Compléments : Vit. A, D3, B-complexe, grit en libre-service, levure de bière. "
            "Eau propre 2×/jour. Bain 2×/sem (adultes). "
            "Ration adulte : 45–55 g/pigeon/jour."
        ),
        "days": {
            "lundi":    [("Élevage Riche", 50), ("Sport", 30), ("Énergétique", 20)],
            "mardi":    [("Élevage Riche", 50), ("Sport", 30), ("Énergétique", 20)],
            "mercredi": [("Élevage Riche", 50), ("Sport", 30), ("Énergétique", 20)],
            "jeudi":    [("Élevage Riche", 50), ("Sport", 30), ("Énergétique", 20)],
            "vendredi": [("Élevage Riche", 50), ("Sport", 30), ("Énergétique", 20)],
            "samedi":   [("Élevage Riche", 50), ("Sport", 30), ("Énergétique", 20)],
            "dimanche": [("Élevage Riche", 50), ("Sport", 30), ("Énergétique", 20)],
        },
    },
    {
        "name": "Élevage — Sevrage (Avr. S3-Mai)",
        "goal": "Accompagner le sevrage des pigeonneaux",
        "description": (
            "Sevrage progressif à 21–28 jours. Pigeonneaux apprennent à manger seuls. "
            "Mélange jeunes/élevage accessible à volonté les 2 premières semaines post-sevrage. "
            "Après sevrage : ration mesurée 30–35 g pour les jeunes. Observer que tous mangent bien. "
            "Probiotiques pour protéger la flore intestinale immature. "
            "Compléments : grit à volonté, Vit. B + E, probiotiques. "
            "Eau changée 2×/jour. Vinaigre de cidre 2×/sem. "
            "Ration adulte : 38–42 g/pigeon/jour."
        ),
        "days": {
            "lundi":    [("Sport", 50), ("Élevage Riche", 30), ("Dépuratif", 20)],
            "mardi":    [("Sport", 50), ("Élevage Riche", 30), ("Dépuratif", 20)],
            "mercredi": [("Sport", 50), ("Élevage Riche", 30), ("Dépuratif", 20)],
            "jeudi":    [("Sport", 50), ("Élevage Riche", 30), ("Dépuratif", 20)],
            "vendredi": [("Sport", 50), ("Élevage Riche", 30), ("Dépuratif", 20)],
            "samedi":   [("Sport", 50), ("Élevage Riche", 30), ("Dépuratif", 20)],
            "dimanche": [("Sport", 50), ("Élevage Riche", 30), ("Dépuratif", 20)],
        },
    },

    # ── PROGRAMME RETRAITÉS ─────────────────────────────────────────────────

    {
        "name": "Retraités — Printemps (Mars-Mai)",
        "goal": "Maintien en forme, prévention de l'obésité",
        "description": (
            "Ration modérée — pas de graines grasses. "
            "Surveiller l'embonpoint : bréchet recouvert sans excès. "
            "Vol libre quotidien autour du colombier si possible. "
            "Vitamine E bénéfique pour les articulations des vieux sujets. "
            "Grit + minéraux. Vinaigre de cidre 2×/sem. "
            "Eau changée quotidiennement. "
            "Ration : 25–28 g/pigeon/jour."
        ),
        "days": {
            "lundi":    [("Dépuratif", 55), ("Sport", 30), ("Élevage Riche", 15)],
            "mardi":    [("Dépuratif", 55), ("Sport", 30), ("Élevage Riche", 15)],
            "mercredi": [("Dépuratif", 55), ("Sport", 30), ("Élevage Riche", 15)],
            "jeudi":    [("Dépuratif", 55), ("Sport", 30), ("Élevage Riche", 15)],
            "vendredi": [("Dépuratif", 55), ("Sport", 30), ("Élevage Riche", 15)],
            "samedi":   [("Dépuratif", 55), ("Sport", 30), ("Élevage Riche", 15)],
            "dimanche": [("Dépuratif", 55), ("Sport", 30), ("Élevage Riche", 15)],
        },
    },
    {
        "name": "Retraités — Été (Juin-Août)",
        "goal": "Alimentation légère, hydratation renforcée",
        "description": (
            "CHALEUR : réduire la ration — appétit diminué. "
            "Eau fraîche changée 2× par jour minimum. "
            "Électrolytes dans l'eau 1×/sem par forte chaleur. "
            "Bains très appréciés : 3×/sem. "
            "Légumes frais (salade, chou) : fibres et vitamines. "
            "Vitamine C naturelle (verdure). Grit à volonté. "
            "Ration : 22–25 g/pigeon/jour."
        ),
        "days": {
            "lundi":    [("Dépuratif", 60), ("Sport", 30), ("Mue & Plumage", 10)],
            "mardi":    [("Dépuratif", 60), ("Sport", 30), ("Mue & Plumage", 10)],
            "mercredi": [("Dépuratif", 60), ("Sport", 30), ("Mue & Plumage", 10)],
            "jeudi":    [("Dépuratif", 60), ("Sport", 30), ("Mue & Plumage", 10)],
            "vendredi": [("Dépuratif", 60), ("Sport", 30), ("Mue & Plumage", 10)],
            "samedi":   [("Dépuratif", 60), ("Sport", 30), ("Mue & Plumage", 10)],
            "dimanche": [("Dépuratif", 60), ("Sport", 30), ("Mue & Plumage", 10)],
        },
    },
    {
        "name": "Retraités — Automne / Mue (Sept-Oct)",
        "goal": "Soutenir la mue, qualité du plumage",
        "description": (
            "Lin indispensable (dans Mue & Plumage) pour la qualité de la mue : plumage soyeux et serré. "
            "Augmenter légèrement la ration pendant la mue (dépense énergétique accrue). "
            "Bains réguliers : facilitent la chute des anciennes plumes. "
            "Observer la croissance des nouvelles rémiges : signe de bonne santé. "
            "Compléments : lin ou colza, levure de bière, Vit. B-complexe. "
            "Ration : 27–30 g/pigeon/jour."
        ),
        "days": {
            "lundi":    [("Dépuratif", 45), ("Mue & Plumage", 30), ("Sport", 25)],
            "mardi":    [("Dépuratif", 45), ("Mue & Plumage", 30), ("Sport", 25)],
            "mercredi": [("Dépuratif", 45), ("Mue & Plumage", 30), ("Sport", 25)],
            "jeudi":    [("Dépuratif", 45), ("Mue & Plumage", 30), ("Sport", 25)],
            "vendredi": [("Dépuratif", 45), ("Mue & Plumage", 30), ("Sport", 25)],
            "samedi":   [("Dépuratif", 45), ("Mue & Plumage", 30), ("Sport", 25)],
            "dimanche": [("Dépuratif", 45), ("Mue & Plumage", 30), ("Sport", 25)],
        },
    },
    {
        "name": "Retraités — Hiver (Nov-Fév)",
        "goal": "Résistance au froid, soutien immunitaire",
        "description": (
            "Hiver rigoureux : augmenter légèrement les graines grasses (via Mue & Plumage) "
            "pour aider à maintenir la chaleur corporelle — mais avec modération. "
            "Ail dans l'eau 2×/sem : antibiotique naturel, soutien immunitaire. "
            "Vitamine D3 cruciale en hiver (manque de soleil = risque de carence). "
            "Eau jamais glacée : tempérée si nécessaire. "
            "Grit + coquilles d'huîtres. "
            "Ration : 26–30 g/pigeon/jour (+ 5 % graines grasses si T° < 0 °C)."
        ),
        "days": {
            "lundi":    [("Dépuratif", 60), ("Mue & Plumage", 25), ("Sport", 15)],
            "mardi":    [("Dépuratif", 60), ("Mue & Plumage", 25), ("Sport", 15)],
            "mercredi": [("Dépuratif", 60), ("Mue & Plumage", 25), ("Sport", 15)],
            "jeudi":    [("Dépuratif", 60), ("Mue & Plumage", 25), ("Sport", 15)],
            "vendredi": [("Dépuratif", 60), ("Mue & Plumage", 25), ("Sport", 15)],
            "samedi":   [("Dépuratif", 60), ("Mue & Plumage", 25), ("Sport", 15)],
            "dimanche": [("Dépuratif", 60), ("Mue & Plumage", 25), ("Sport", 15)],
        },
    },
]


# ──────────────────────────────────────────────────────────────────────────────
async def seed():
    async with AsyncSessionLocal() as db:

        # ── Charger les ingrédients existants ──────────────────────────────
        ing_result = await db.execute(select(FeedIngredient))
        ing_map: dict[str, FeedIngredient] = {i.name: i for i in ing_result.scalars().all()}
        print(f"Ingrédients existants : {len(ing_map)}")

        # ── Charger les mélanges existants ─────────────────────────────────
        mix_result = await db.execute(select(FeedMix))
        mix_map: dict[str, FeedMix] = {m.name: m for m in mix_result.scalars().all()}
        print(f"Mélanges existants : {len(mix_map)}")

        # ── Nouveaux mélanges ──────────────────────────────────────────────
        nouveaux_mix = 0
        for mdata in NOUVEAUX_MELANGES:
            if mdata["name"] in mix_map:
                print(f"  [SKIP] Mélange déjà existant : {mdata['name']}")
                continue

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
            mix_map[mdata["name"]] = mix

            for ing_name, pct in mdata["ingredients"]:
                if ing_name not in ing_map:
                    print(f"  [WARN] Ingrédient introuvable : {ing_name} — ignoré")
                    continue
                await db.execute(
                    feed_mix_ingredients.insert().values(
                        mix_id=mix.id,
                        ingredient_id=ing_map[ing_name].id,
                        percentage=pct,
                    )
                )
            nouveaux_mix += 1

        await db.flush()
        print(f"  {nouveaux_mix} nouveaux mélanges insérés.")

        # ── Nouveaux suppléments ───────────────────────────────────────────
        supp_result = await db.execute(select(Supplement))
        supp_noms = {s.name for s in supp_result.scalars().all()}

        nouveaux_supps = 0
        for sdata in NOUVEAUX_SUPPLEMENTS:
            if sdata["name"] in supp_noms:
                print(f"  [SKIP] Supplément déjà existant : {sdata['name']}")
                continue
            db.add(Supplement(**sdata))
            nouveaux_supps += 1

        await db.flush()
        print(f"  {nouveaux_supps} nouveaux suppléments insérés.")

        # ── Nouveaux plans nutritionnels ───────────────────────────────────
        plan_result = await db.execute(select(NutritionPlan))
        plan_noms = {p.name for p in plan_result.scalars().all()}

        nouveaux_plans = 0
        for pdata in NOUVEAUX_PLANS:
            if pdata["name"] in plan_noms:
                print(f"  [SKIP] Plan déjà existant : {pdata['name']}")
                continue

            plan = NutritionPlan(
                name=pdata["name"],
                goal=pdata["goal"],
                description=pdata["description"],
            )
            for day, mix_entries in pdata["days"].items():
                items = []
                for mix_name, pct in mix_entries:
                    if mix_name not in mix_map:
                        print(f"  [WARN] Mélange '{mix_name}' introuvable pour le plan '{pdata['name']}' — ignoré")
                        continue
                    items.append({"id": mix_map[mix_name].id, "pct": pct})
                setattr(plan, day, json.dumps(items) if items else None)

            db.add(plan)
            nouveaux_plans += 1

        await db.commit()
        print(f"  {nouveaux_plans} nouveaux plans nutritionnels insérés.")
        print("\n✅ Seed v2 terminé.")


if __name__ == "__main__":
    asyncio.run(seed())
