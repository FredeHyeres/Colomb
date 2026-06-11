"""seed_fr.py — Catalogue nutrition de base (FR)
Ingrédients, suppléments, mélanges et plans alimentaires.
Chargé automatiquement au premier lancement (langue FR).
Pour un élevage de démonstration complet (pigeons, concours, etc.),
voir seed_demo_fr.py.
"""
import asyncio
import asyncpg
import json
from database import settings

DSN = (
    f"postgresql://{settings.postgres_user}:{settings.postgres_password}"
    f"@{settings.postgres_host}:{settings.postgres_port}/{settings.postgres_db}"
)


async def main():
    conn = await asyncpg.connect(DSN)

    # ══════════════════════════════════════════════════════
    # NUTRITION — Ingrédients, suppléments, mélanges, plans
    # ══════════════════════════════════════════════════════
    ING_DATA = [
        # (nom, catégorie, protéines%, lipides%, glucides%, énergie kcal/100g, notes éleveurs)
        ("Maïs",                 "energie",   9.0,  4.5, 72.0, 356.0, "Star des glucides. Très apprécié des pigeons. Énergie rapide."),
        ("Blé",                  "energie",  12.0,  1.8, 70.0, 339.0, "Bonne source de glucides complexes. Très digestible."),
        ("Orge",                 "depuratif",11.5,  2.2, 63.0, 316.0, "Essentielle au mélange dépuratif. Calme et « assèche » le pigeon."),
        ("Dari",                 "energie",  10.5,  3.2, 70.0, 339.0, "Sorgho blanc. Très bien accepté. Bon profil glucidique."),
        ("Pois",                 "proteine", 23.0,  1.5, 52.0, 314.0, "Source protéique principale. Reconstruit la masse musculaire."),
        ("Vesce",                "proteine", 25.0,  1.8, 53.0, 316.0, "Légumineuse proche des pois. Riche en fibres. Bon substitut protéique."),
        ("Lentilles",            "proteine", 25.0,  1.0, 60.0, 352.0, "Légumineuse riche en protéines, bon complément en phase d'entraînement."),
        ("Cardi",                "energie",  15.0, 32.0, 14.0, 498.0, "Graine oléagineuse clé du veuvage. Riche en oméga-6."),
        ("Tournesol décortiqué", "graisse",  21.0, 52.0,  4.5, 580.0, "Très riche en lipides. Plumage, énergie longue durée. Version pelée, plus digestible."),
        ("Chanvre",              "graisse",  22.7, 33.5,  5.0, 400.0, "Très oléagineux. Excitant, stimule l'instinct. Donner avant enlogement."),
        ("Cacahuètes",           "graisse",  26.0, 46.0, 16.0, 567.0, "Légumineuse très calorique. Réservée fin de semaine / avant enlogement."),
        ("Sainfoin",             "depuratif",18.0,  3.0, 50.0, 330.0, "Légumineuse fourragère digestible, apport modéré en protéines et fibres."),
        ("Riz paddy",            "energie",   7.5,  2.5, 75.0, 349.0, "Très digeste. Bon pour la récupération digestive post-concours."),
        ("Colza / Lin",          "graisse",  20.0, 42.0,  5.5, 490.0, "Lin : active la mue, plumage soyeux. À doser (toxique en excès). Colza : bon profil lipidique."),
    ]
    ING = {}
    for name, cat, prot, lip, gluc, energ, notes in ING_DATA:
        row = await conn.fetchrow("""
            INSERT INTO feed_ingredients
              (name, category, proteines_pct, lipides_pct, glucides_pct, energie_kcal, notes_eleveurs, created_at)
            VALUES ($1,$2::ingredientcategory,$3,$4,$5,$6,$7, now()) RETURNING id
        """, name, cat, prot, lip, gluc, energ, notes)
        ING[name] = row["id"]

    SUP_DATA = [
        ("Électrolytes",      "electrolyte","5 ml/litre"),
        ("Probiotiques",      "probiotique","2 g/kg"),
        ("Acides aminés",     "autre",     "5 ml/kg"),
        ("Levure de bière",   "autre",     "3 g/kg"),
        ("Huile de saumon",   "autre",     "3 ml/kg"),
        ("Vinaigre de cidre", "autre",     "5–10 ml/litre, 2×/semaine"),
        ("Vitamine D3",       "vitamine",  "Selon notice fabricant, dans l'eau 2–3×/semaine"),
        ("Vitamine E",        "vitamine",  "2–3 gouttes/pigeon/jour, 3×/semaine"),
        ("Coquilles d'huîtres","autre",    "À volonté en libre-service permanent"),
    ]
    SUP = {}
    for name, stype, dosage in SUP_DATA:
        row = await conn.fetchrow("""
            INSERT INTO supplements (name, type, dosage, created_at)
            VALUES ($1,$2::supplementtype,$3, now()) RETURNING id
        """, name, stype, dosage)
        SUP[name] = row["id"]

    print(f"✅ {len(ING)} ingrédients, {len(SUP)} suppléments insérés")

    def make_comp(ings, sups):
        items = []
        for n, pct in ings:
            items.append({"id": f"ing_{ING[n]}", "type": "ingredient", "name": n, "pct": pct})
        for n, qty, unit in sups:
            items.append({"id": f"sup_{SUP[n]}", "type": "supplement", "name": n,
                          "quantity": qty, "unit": unit})
        return json.dumps(items)

    MIXES_DEF = [
        ("Dépuratif",   "recuperation",
         [("Orge",40),("Blé",30),("Vesce",20),("Sainfoin",10)],
         [("Probiotiques","2","g/kg")]),
        ("Sport léger", "entrainement",
         [("Maïs",25),("Blé",25),("Dari",25),("Pois",25)],
         [("Électrolytes","5","ml/litre")]),
        ("Énergie",     "entrainement",
         [("Maïs",35),("Dari",25),("Cardi",20),("Chanvre",10),("Pois",10)],
         [("Huile de saumon","3","ml/kg")]),
        ("Pré-concours","pre_panier",
         [("Maïs",30),("Dari",25),("Cacahuètes",20),("Tournesol décortiqué",15),("Chanvre",10)],
         [("Acides aminés","5","ml/kg"),("Levure de bière","3","g/kg")]),
        ("Récupération","recuperation",
         [("Orge",35),("Blé",30),("Lentilles",20),("Sainfoin",15)],
         [("Électrolytes","8","ml/litre"),("Probiotiques","3","g/kg")]),
        ("Élevage Riche", "entrainement",
         [("Pois",30),("Maïs",20),("Vesce",15),("Dari",15),("Blé",10),("Tournesol décortiqué",5),("Chanvre",5)],
         []),
        ("Mue & Plumage", "recuperation",
         [("Orge",35),("Blé",25),("Riz paddy",15),("Colza / Lin",15),("Chanvre",10)],
         []),
    ]
    MIX = {}
    for mname, usage, ings, sups in MIXES_DEF:
        row = await conn.fetchrow("""
            INSERT INTO feed_mixes (name, usage, composition, created_at)
            VALUES ($1,$2::mixusage,$3, now()) RETURNING id
        """, mname, usage, make_comp(ings, sups))
        MIX[mname] = row["id"]
    print(f"✅ {len(MIX)} mélanges insérés")

    def day_json(*names):
        return json.dumps([MIX[n] for n in names])

    def day_pct_json(*pairs):
        return json.dumps([{"id": MIX[n], "pct": p} for n, p in pairs])

    def week_same(*pairs):
        return [day_pct_json(*pairs)] * 7

    def week(days_list):
        return [day_pct_json(*pairs) for pairs in days_list]

    PLANS_DEF = [
        ("Demi-fond Saison","pré-concours",None,
         day_json("Sport léger"),day_json("Sport léger"),day_json("Énergie"),
         day_json("Énergie"),day_json("Pré-concours"),day_json("Récupération"),
         day_json("Dépuratif")),
        ("Intersaison","récupération",None,
         day_json("Dépuratif"),day_json("Sport léger"),day_json("Sport léger"),
         day_json("Énergie"),day_json("Énergie"),day_json("Récupération"),
         day_json("Dépuratif")),

        # ── PROGRAMME INTER-SAISON ──────────────────────────────────────────
        ("Inter-Saison — Mue Active (Août)","Favoriser la mue complète",
         "Phase la plus critique de l'inter-saison. Le lin et le chanvre (dans Mue & Plumage) "
         "activent la repousse des plumes. L'orge dominant 'assèche' et purifie. "
         "Repos complet : pas d'entraînement. "
         "Compléments : levure de bière, Vit. B-complexe. "
         "Bains fréquents (2–3×/sem). Vinaigre de cidre 2×/sem. "
         "Ration : 30 g/pigeon/jour.",
         *week_same(("Dépuratif",60),("Mue & Plumage",40))),

        ("Inter-Saison — Fin de Mue (Septembre)","Terminer la mue, réintroduire progressivement le Sport",
         "La mue se termine. Réintroduire progressivement le mélange Sport en début de semaine, "
         "augmenter sa part en fin de semaine. Observer la qualité du nouveau plumage : "
         "serré, brillant = bonne mue. "
         "Compléments : levure de bière, lin ou colza, minéraux + grit. "
         "Vols libres courts autour du colombier. "
         "Eau + ail haché 1×/sem. Bain 2×/sem. "
         "Ration : 30–32 g/pigeon/jour.",
         *week([
             [("Dépuratif",55),("Mue & Plumage",25),("Sport léger",20)],
             [("Dépuratif",55),("Mue & Plumage",25),("Sport léger",20)],
             [("Dépuratif",50),("Sport léger",30),("Mue & Plumage",20)],
             [("Dépuratif",45),("Sport léger",35),("Mue & Plumage",20)],
             [("Dépuratif",45),("Sport léger",35),("Mue & Plumage",20)],
             [("Dépuratif",50),("Sport léger",30),("Mue & Plumage",20)],
             [("Dépuratif",55),("Mue & Plumage",25),("Sport léger",20)],
         ])),

        ("Inter-Saison — Repos Hivernal (Oct-Déc)","Repos physiologique hivernal, prévenir l'embonpoint",
         "Pigeons peu actifs, températures en baisse. Ration réduite. "
         "Surveiller l'embonpoint : pas de gras visible sur le bréchet. "
         "Octobre : vol facultatif si temps doux. Novembre–décembre : repos complet. "
         "En décembre, ajouter 5–10 % de graines grasses (colza/lin) si T° < 0 °C. "
         "Compléments : grit + minéraux, Vit. D3, coquilles d'huîtres. "
         "Eau + ail 2×/sem (immunité hivernale). "
         "Ration : 28–32 g/pigeon/jour.",
         *week_same(("Dépuratif",70),("Sport léger",20),("Mue & Plumage",10))),

        ("Inter-Saison — Remise en Forme (Janvier)","Préparer les reproducteurs à l'accouplement de février",
         "Monter les protéines progressivement. Introduire les légumineuses (pois, vesces) "
         "via l'Élevage Riche. Vitamine E pour la fertilité. Probiotiques 2×/sem. "
         "Petits vols de 20–30 min, 2–3×/sem pour relancer la condition physique. "
         "Eau + probiotiques. Bain 2×/sem. "
         "Ration : 33–36 g/pigeon/jour.",
         *week([
             [("Dépuratif",40),("Sport léger",40),("Élevage Riche",20)],
             [("Dépuratif",35),("Sport léger",45),("Élevage Riche",20)],
             [("Dépuratif",35),("Sport léger",45),("Élevage Riche",20)],
             [("Dépuratif",30),("Sport léger",50),("Élevage Riche",20)],
             [("Dépuratif",30),("Sport léger",50),("Élevage Riche",20)],
             [("Dépuratif",35),("Sport léger",45),("Élevage Riche",20)],
             [("Dépuratif",40),("Sport léger",40),("Élevage Riche",20)],
         ])),

        # ── PROGRAMME ÉLEVAGE ────────────────────────────────────────────────
        ("Élevage — Pré-Accouplement (Fév. S1-S2)","Monter les protéines, stimuler la fertilité",
         "Monter les protéines progressivement via l'Élevage Riche (pois, vesces). "
         "Vitamine E + B-complexe pour la fertilité. Grit + minéraux en libre-service. "
         "Observer les premiers signes d'accouplement spontané. "
         "Vinaigre de cidre 2×/sem. Bain 2×/sem. Eau propre. "
         "Ration adulte : 35–38 g/pigeon/jour.",
         *week([
             [("Dépuratif",30),("Sport léger",40),("Élevage Riche",30)],
             [("Dépuratif",30),("Sport léger",40),("Élevage Riche",30)],
             [("Dépuratif",25),("Sport léger",45),("Élevage Riche",30)],
             [("Dépuratif",25),("Sport léger",45),("Élevage Riche",30)],
             [("Dépuratif",25),("Sport léger",45),("Élevage Riche",30)],
             [("Dépuratif",30),("Sport léger",40),("Élevage Riche",30)],
             [("Dépuratif",30),("Sport léger",40),("Élevage Riche",30)],
         ])),

        ("Élevage — Accouplement (Fév. S3-S4)","Stimuler l'instinct de reproduction",
         "Le chanvre (dans Élevage Riche) et les légumineuses (pois, vesces) stimulent "
         "l'instinct de reproduction. Ne pas surcharger : un pigeon trop gras couve mal. "
         "Surveiller les parades et combats éventuels. "
         "Vitamine E. Grit en libre-service. "
         "Eau propre obligatoire. Bain régulier. "
         "Ration adulte : 38–42 g/pigeon/jour.",
         *week_same(("Sport léger",50),("Élevage Riche",30),("Énergie",20))),

        ("Élevage — Couvage (Mars S1-S2)","Maintenir les couveurs, calcium indispensable",
         "CALCIUM INDISPENSABLE pendant le couvage (formation des coquilles, croissance osseuse). "
         "Grit et coquilles d'huîtres en libre-service PERMANENT. Pas de stress. "
         "Éviter manipulation inutile des nids. Calme absolu. "
         "Compléments : grit + coquilles d'huîtres, Vit. D3. "
         "Eau propre changée 2×/jour. "
         "Ration adulte : 38–42 g/pigeon/jour.",
         *week_same(("Sport léger",40),("Élevage Riche",35),("Dépuratif",25))),

        ("Élevage — Éclosion & Jeunes (Mars S3-Avr. S2)","Soutenir la production du lait de jabot et la croissance des pigeonneaux",
         "Les parents produisent le 'lait de pigeon' (jabot) pour les 72 premières heures. "
         "AUGMENTER FORTEMENT les rations : les parents consomment jusqu'à 50 g/j pour gaver. "
         "Protéines et graines grasses essentielles pour la croissance rapide des jeunes. "
         "Grit indispensable — risque de décalcification. "
         "Compléments : Vit. A, D3, B-complexe, grit en libre-service, levure de bière. "
         "Eau propre 2×/jour. Bain 2×/sem (adultes). "
         "Ration adulte : 45–55 g/pigeon/jour.",
         *week_same(("Élevage Riche",50),("Sport léger",30),("Énergie",20))),

        ("Élevage — Sevrage (Avr. S3-Mai)","Accompagner le sevrage des pigeonneaux",
         "Sevrage progressif à 21–28 jours. Pigeonneaux apprennent à manger seuls. "
         "Mélange jeunes/élevage accessible à volonté les 2 premières semaines post-sevrage. "
         "Après sevrage : ration mesurée 30–35 g pour les jeunes. Observer que tous mangent bien. "
         "Probiotiques pour protéger la flore intestinale immature. "
         "Compléments : grit à volonté, Vit. B + E, probiotiques. "
         "Eau changée 2×/jour. Vinaigre de cidre 2×/sem. "
         "Ration adulte : 38–42 g/pigeon/jour.",
         *week_same(("Sport léger",50),("Élevage Riche",30),("Dépuratif",20))),

        # ── PROGRAMME RETRAITÉS ──────────────────────────────────────────────
        ("Retraités — Printemps (Mars-Mai)","Maintien en forme, prévention de l'obésité",
         "Ration modérée — pas de graines grasses. "
         "Surveiller l'embonpoint : bréchet recouvert sans excès. "
         "Vol libre quotidien autour du colombier si possible. "
         "Vitamine E bénéfique pour les articulations des vieux sujets. "
         "Grit + minéraux. Vinaigre de cidre 2×/sem. "
         "Eau changée quotidiennement. "
         "Ration : 25–28 g/pigeon/jour.",
         *week_same(("Dépuratif",55),("Sport léger",30),("Élevage Riche",15))),

        ("Retraités — Été (Juin-Août)","Alimentation légère, hydratation renforcée",
         "CHALEUR : réduire la ration — appétit diminué. "
         "Eau fraîche changée 2× par jour minimum. "
         "Électrolytes dans l'eau 1×/sem par forte chaleur. "
         "Bains très appréciés : 3×/sem. "
         "Légumes frais (salade, chou) : fibres et vitamines. "
         "Vitamine C naturelle (verdure). Grit à volonté. "
         "Ration : 22–25 g/pigeon/jour.",
         *week_same(("Dépuratif",60),("Sport léger",30),("Mue & Plumage",10))),

        ("Retraités — Automne / Mue (Sept-Oct)","Soutenir la mue, qualité du plumage",
         "Lin indispensable (dans Mue & Plumage) pour la qualité de la mue : plumage soyeux et serré. "
         "Augmenter légèrement la ration pendant la mue (dépense énergétique accrue). "
         "Bains réguliers : facilitent la chute des anciennes plumes. "
         "Observer la croissance des nouvelles rémiges : signe de bonne santé. "
         "Compléments : lin ou colza, levure de bière, Vit. B-complexe. "
         "Ration : 27–30 g/pigeon/jour.",
         *week_same(("Dépuratif",45),("Mue & Plumage",30),("Sport léger",25))),

        ("Retraités — Hiver (Nov-Fév)","Résistance au froid, soutien immunitaire",
         "Hiver rigoureux : augmenter légèrement les graines grasses (via Mue & Plumage) "
         "pour aider à maintenir la chaleur corporelle — mais avec modération. "
         "Ail dans l'eau 2×/sem : antibiotique naturel, soutien immunitaire. "
         "Vitamine D3 cruciale en hiver (manque de soleil = risque de carence). "
         "Eau jamais glacée : tempérée si nécessaire. "
         "Grit + coquilles d'huîtres. "
         "Ration : 26–30 g/pigeon/jour (+ 5 % graines grasses si T° < 0 °C).",
         *week_same(("Dépuratif",60),("Mue & Plumage",25),("Sport léger",15))),
    ]
    PLAN = {}
    for name,goal,description,lun,mar,mer,jeu,ven,sam,dim in PLANS_DEF:
        row = await conn.fetchrow("""
            INSERT INTO nutrition_plans
              (name, goal, description, lundi, mardi, mercredi, jeudi, vendredi, samedi, dimanche, created_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, now()) RETURNING id
        """, name, goal, description, lun, mar, mer, jeu, ven, sam, dim)
        PLAN[name] = row["id"]
    print(f"✅ {len(PLAN)} plans alimentaires insérés")

    await conn.close()
    print("\n🎉 Seed terminé avec succès !")


if __name__ == "__main__":
    asyncio.run(main())
