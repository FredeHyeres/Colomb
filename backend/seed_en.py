"""seed_en.py — Base nutrition catalogue (EN)
Ingredients, supplements, feed mixes and nutrition plans.
Loaded automatically on first launch (EN language).
For a complete demo flock (pigeons, races, etc.), see seed_demo_en.py.
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
    # NUTRITION — Ingredients, supplements, feed mixes, plans
    # ══════════════════════════════════════════════════════
    ING_DATA = [
        # (name, category, protein%, fat%, carbs%, energy kcal/100g, breeder notes)
        ("Corn",                   "energie",   9.0,  4.5, 72.0, 356.0, "Top source of carbohydrates. Very popular with pigeons. Fast energy."),
        ("Wheat",                  "energie",  12.0,  1.8, 70.0, 339.0, "Good source of complex carbohydrates. Very digestible."),
        ("Barley",                 "depuratif",11.5,  2.2, 63.0, 316.0, "Essential in the resting/purifying mix. Calms and 'dries out' the pigeon."),
        ("White dari (sorghum)",   "energie",  10.5,  3.2, 70.0, 339.0, "White sorghum. Very well accepted. Good carbohydrate profile."),
        ("Peas",                   "proteine", 23.0,  1.5, 52.0, 314.0, "Main protein source. Rebuilds muscle mass."),
        ("Vetch",                  "proteine", 25.0,  1.8, 53.0, 316.0, "Legume close to peas. Rich in fibre. Good protein substitute."),
        ("Lentils",                "proteine", 25.0,  1.0, 60.0, 352.0, "Protein-rich legume, good supplement during training periods."),
        ("Safflower seed",         "energie",  15.0, 32.0, 14.0, 498.0, "Key oilseed for the widowhood method. Rich in omega-6."),
        ("Hulled sunflower seeds", "graisse",  21.0, 52.0,  4.5, 580.0, "Very rich in fat. Good for plumage, long-lasting energy. Hulled version, more digestible."),
        ("Hemp seed",              "graisse",  22.7, 33.5,  5.0, 400.0, "Very oily. Stimulating, boosts instinct. Give before basketing."),
        ("Peanuts",                "graisse",  26.0, 46.0, 16.0, 567.0, "Very calorific legume. Reserved for the end of the week / before basketing."),
        ("Sainfoin",               "depuratif",18.0,  3.0, 50.0, 330.0, "Digestible forage legume, moderate contribution of protein and fibre."),
        ("Paddy rice",             "energie",   7.5,  2.5, 75.0, 349.0, "Very digestible. Good for digestive recovery after racing."),
        ("Rapeseed / Linseed",     "graisse",  20.0, 42.0,  5.5, 490.0, "Linseed: promotes moulting, silky plumage. Dose carefully (toxic in excess). Rapeseed: good fat profile."),
    ]
    ING = {}
    for name, cat, prot, lip, gluc, energ, notes in ING_DATA:
        row = await conn.fetchrow("""
            INSERT INTO feed_ingredients
              (name, category, proteines_pct, lipides_pct, glucides_pct, energie_kcal, notes_eleveurs, created_at)
            VALUES ($1,$2::ingredientcategory,$3,$4,$5,$6,$7, now())
            ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id
        """, name, cat, prot, lip, gluc, energ, notes)
        ING[name] = row["id"]

    SUP_DATA = [
        ("Electrolytes",    "electrolyte","5 ml/l"),
        ("Probiotics",      "probiotique","2 g/kg"),
        ("Amino acids",     "autre",     "5 ml/kg"),
        ("Brewer's yeast",  "autre",     "3 g/kg"),
        ("Salmon oil",      "autre",     "3 ml/kg"),
        ("Cider vinegar",   "autre",     "5–10 ml/L of water, 2x/week"),
        ("Vitamin D3",      "vitamine",  "As per manufacturer's instructions, in water 2-3x/week"),
        ("Vitamin E",       "vitamine",  "2-3 drops/pigeon/day, 3x/week"),
        ("Oyster shells",   "autre",     "Free access, permanently available"),
    ]
    SUP = {}
    for name, stype, dosage in SUP_DATA:
        row = await conn.fetchrow("""
            INSERT INTO supplements (name, type, dosage, created_at)
            VALUES ($1,$2::supplementtype,$3, now())
            ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id
        """, name, stype, dosage)
        SUP[name] = row["id"]

    print(f"✅ {len(ING)} ingredients, {len(SUP)} supplements inserted")

    def make_comp(ings, sups):
        items = []
        for n, pct in ings:
            items.append({"id": f"ing_{ING[n]}", "type": "ingredient", "name": n, "pct": pct})
        for n, qty, unit in sups:
            items.append({"id": f"sup_{SUP[n]}", "type": "supplement", "name": n,
                          "quantity": qty, "unit": unit})
        return json.dumps(items)

    MIXES_DEF = [
        ("Resting mix",     "recuperation",
         [("Barley",40),("Wheat",30),("Vetch",20),("Sainfoin",10)],
         [("Probiotics","2","g/kg")]),
        ("Light sport mix", "entrainement",
         [("Corn",25),("Wheat",25),("White dari (sorghum)",25),("Peas",25)],
         [("Electrolytes","5","ml/l")]),
        ("Energy mix",      "entrainement",
         [("Corn",35),("White dari (sorghum)",25),("Safflower seed",20),("Hemp seed",10),("Peas",10)],
         [("Salmon oil","3","ml/kg")]),
        ("Pre-race mix",    "pre_panier",
         [("Corn",30),("White dari (sorghum)",25),("Peanuts",20),("Hulled sunflower seeds",15),("Hemp seed",10)],
         [("Amino acids","5","ml/kg"),("Brewer's yeast","3","g/kg")]),
        ("Recovery mix",    "recuperation",
         [("Barley",35),("Wheat",30),("Lentils",20),("Sainfoin",15)],
         [("Electrolytes","8","ml/l"),("Probiotics","3","g/kg")]),
        ("Rich breeding mix", "entrainement",
         [("Peas",30),("Corn",20),("Vetch",15),("White dari (sorghum)",15),("Wheat",10),("Hulled sunflower seeds",5),("Hemp seed",5)],
         []),
        ("Moulting mix",      "recuperation",
         [("Barley",35),("Wheat",25),("Paddy rice",15),("Rapeseed / Linseed",15),("Hemp seed",10)],
         []),
    ]
    MIX = {}
    for mname, usage, ings, sups in MIXES_DEF:
        row = await conn.fetchrow("""
            INSERT INTO feed_mixes (name, usage, composition, created_at)
            VALUES ($1,$2::mixusage,$3, now())
            ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id
        """, mname, usage, make_comp(ings, sups))
        MIX[mname] = row["id"]
    print(f"✅ {len(MIX)} feed mixes inserted")

    def day_json(*names):
        return json.dumps([MIX[n] for n in names])

    def day_pct_json(*pairs):
        return json.dumps([{"id": MIX[n], "pct": p} for n, p in pairs])

    def week_same(*pairs):
        return [day_pct_json(*pairs)] * 7

    def week(days_list):
        return [day_pct_json(*pairs) for pairs in days_list]

    PLANS_DEF = [
        ("Middle-distance season","racing",None,
         day_json("Light sport mix"),day_json("Light sport mix"),day_json("Energy mix"),
         day_json("Energy mix"),day_json("Pre-race mix"),day_json("Recovery mix"),
         day_json("Resting mix")),
        ("Off-season","resting",None,
         day_json("Resting mix"),day_json("Light sport mix"),day_json("Light sport mix"),
         day_json("Energy mix"),day_json("Energy mix"),day_json("Recovery mix"),
         day_json("Resting mix")),

        # ── OFF-SEASON PROGRAMME ─────────────────────────────────────────────
        ("Off-Season — Active Moult (August)","Promote complete moulting",
         "The most critical phase of the off-season. Linseed and hemp seed (in the Moulting mix) "
         "stimulate feather regrowth. The dominant barley 'dries out' and purifies. "
         "Complete rest: no training. "
         "Supplements: brewer's yeast, vitamin B-complex. "
         "Frequent baths (2-3x/week). Cider vinegar 2x/week. "
         "Ration: 30 g/pigeon/day.",
         *week_same(("Resting mix",60),("Moulting mix",40))),

        ("Off-Season — End of Moult (September)","Finish moulting, gradually reintroduce the Sport mix",
         "Moulting is coming to an end. Gradually reintroduce the Sport mix early in the week, "
         "increasing its share towards the end of the week. Observe the quality of the new plumage: "
         "tight and glossy = good moult. "
         "Supplements: brewer's yeast, linseed or rapeseed, minerals + grit. "
         "Short free flights around the loft. "
         "Water + chopped garlic 1x/week. Bath 2x/week. "
         "Ration: 30-32 g/pigeon/day.",
         *week([
             [("Resting mix",55),("Moulting mix",25),("Light sport mix",20)],
             [("Resting mix",55),("Moulting mix",25),("Light sport mix",20)],
             [("Resting mix",50),("Light sport mix",30),("Moulting mix",20)],
             [("Resting mix",45),("Light sport mix",35),("Moulting mix",20)],
             [("Resting mix",45),("Light sport mix",35),("Moulting mix",20)],
             [("Resting mix",50),("Light sport mix",30),("Moulting mix",20)],
             [("Resting mix",55),("Moulting mix",25),("Light sport mix",20)],
         ])),

        ("Off-Season — Winter Rest (Oct-Dec)","Winter physiological rest, prevent overweight",
         "Pigeons are not very active, temperatures are dropping. Reduced ration. "
         "Watch for overweight: no visible fat on the breastbone. "
         "October: optional flying in mild weather. November-December: complete rest. "
         "In December, add 5-10% oily seeds (rapeseed/linseed) if T° < 0 °C. "
         "Supplements: grit + minerals, vitamin D3, oyster shells. "
         "Water + garlic 2x/week (winter immunity). "
         "Ration: 28-32 g/pigeon/day.",
         *week_same(("Resting mix",70),("Light sport mix",20),("Moulting mix",10))),

        ("Off-Season — Getting Back into Shape (January)","Prepare breeding pairs for February pairing",
         "Gradually build up protein. Introduce legumes (peas, vetch) "
         "via the Rich breeding mix. Vitamin E for fertility. Probiotics 2x/week. "
         "Short flights of 20-30 min, 2-3x/week to restore physical condition. "
         "Water + probiotics. Bath 2x/week. "
         "Ration: 33-36 g/pigeon/day.",
         *week([
             [("Resting mix",40),("Light sport mix",40),("Rich breeding mix",20)],
             [("Resting mix",35),("Light sport mix",45),("Rich breeding mix",20)],
             [("Resting mix",35),("Light sport mix",45),("Rich breeding mix",20)],
             [("Resting mix",30),("Light sport mix",50),("Rich breeding mix",20)],
             [("Resting mix",30),("Light sport mix",50),("Rich breeding mix",20)],
             [("Resting mix",35),("Light sport mix",45),("Rich breeding mix",20)],
             [("Resting mix",40),("Light sport mix",40),("Rich breeding mix",20)],
         ])),

        # ── BREEDING PROGRAMME ────────────────────────────────────────────────
        ("Breeding — Pre-Pairing (Feb. W1-W2)","Build up protein, stimulate fertility",
         "Gradually build up protein via the Rich breeding mix (peas, vetch). "
         "Vitamin E + B-complex for fertility. Grit + minerals freely available. "
         "Watch for the first signs of spontaneous pairing. "
         "Cider vinegar 2x/week. Bath 2x/week. Clean water. "
         "Adult ration: 35-38 g/pigeon/day.",
         *week([
             [("Resting mix",30),("Light sport mix",40),("Rich breeding mix",30)],
             [("Resting mix",30),("Light sport mix",40),("Rich breeding mix",30)],
             [("Resting mix",25),("Light sport mix",45),("Rich breeding mix",30)],
             [("Resting mix",25),("Light sport mix",45),("Rich breeding mix",30)],
             [("Resting mix",25),("Light sport mix",45),("Rich breeding mix",30)],
             [("Resting mix",30),("Light sport mix",40),("Rich breeding mix",30)],
             [("Resting mix",30),("Light sport mix",40),("Rich breeding mix",30)],
         ])),

        ("Breeding — Pairing (Feb. W3-W4)","Stimulate the breeding instinct",
         "Hemp seed (in the Rich breeding mix) and legumes (peas, vetch) stimulate "
         "the breeding instinct. Don't overfeed: a pigeon that is too fat broods poorly. "
         "Watch for courtship displays and possible fights. "
         "Vitamin E. Grit freely available. "
         "Clean water mandatory. Regular bathing. "
         "Adult ration: 38-42 g/pigeon/day.",
         *week_same(("Light sport mix",50),("Rich breeding mix",30),("Energy mix",20))),

        ("Breeding — Brooding (Mar. W1-W2)","Support brooding pairs, calcium essential",
         "CALCIUM ESSENTIAL during brooding (eggshell formation, bone growth). "
         "Grit and oyster shells PERMANENTLY freely available. No stress. "
         "Avoid unnecessary handling of the nests. Absolute calm. "
         "Supplements: grit + oyster shells, vitamin D3. "
         "Clean water changed 2x/day. "
         "Adult ration: 38-42 g/pigeon/day.",
         *week_same(("Light sport mix",40),("Rich breeding mix",35),("Resting mix",25))),

        ("Breeding — Hatching & Youngsters (Mar. W3-Apr. W2)","Support crop milk production and squab growth",
         "The parents produce 'crop milk' for the first 72 hours. "
         "SIGNIFICANTLY INCREASE rations: parents consume up to 50 g/day to feed their young. "
         "Protein and oily seeds essential for the rapid growth of the squabs. "
         "Grit essential — risk of decalcification. "
         "Supplements: vitamins A, D3, B-complex, grit freely available, brewer's yeast. "
         "Clean water 2x/day. Bath 2x/week (adults). "
         "Adult ration: 45-55 g/pigeon/day.",
         *week_same(("Rich breeding mix",50),("Light sport mix",30),("Energy mix",20))),

        ("Breeding — Weaning (Apr. W3-May)","Support the weaning of young pigeons",
         "Gradual weaning at 21-28 days. Squabs learn to eat on their own. "
         "Youngster/breeding mix freely available for the first 2 weeks after weaning. "
         "After weaning: measured ration of 30-35 g for the youngsters. Check that all are eating well. "
         "Probiotics to protect the still-immature gut flora. "
         "Supplements: grit ad libitum, vitamins B + E, probiotics. "
         "Water changed 2x/day. Cider vinegar 2x/week. "
         "Adult ration: 38-42 g/pigeon/day.",
         *week_same(("Light sport mix",50),("Rich breeding mix",30),("Resting mix",20))),

        # ── RETIRED PIGEONS PROGRAMME ─────────────────────────────────────────
        ("Retired — Spring (March-May)","Maintain condition, prevent obesity",
         "Moderate ration — no oily seeds. "
         "Watch for overweight: breastbone covered without excess. "
         "Daily free flight around the loft if possible. "
         "Vitamin E beneficial for the joints of older birds. "
         "Grit + minerals. Cider vinegar 2x/week. "
         "Water changed daily. "
         "Ration: 25-28 g/pigeon/day.",
         *week_same(("Resting mix",55),("Light sport mix",30),("Rich breeding mix",15))),

        ("Retired — Summer (June-August)","Light feeding, increased hydration",
         "HEAT: reduce the ration — reduced appetite. "
         "Fresh water changed at least 2x per day. "
         "Electrolytes in the water 1x/week during heatwaves. "
         "Baths much appreciated: 3x/week. "
         "Fresh vegetables (lettuce, cabbage): fibre and vitamins. "
         "Natural vitamin C (greens). Grit ad libitum. "
         "Ration: 22-25 g/pigeon/day.",
         *week_same(("Resting mix",60),("Light sport mix",30),("Moulting mix",10))),

        ("Retired — Autumn / Moult (Sept-Oct)","Support moulting, plumage quality",
         "Linseed essential (in the Moulting mix) for moult quality: silky, tight plumage. "
         "Slightly increase the ration during moulting (increased energy expenditure). "
         "Regular baths: help old feathers fall out. "
         "Observe the growth of new flight feathers: a sign of good health. "
         "Supplements: linseed or rapeseed, brewer's yeast, vitamin B-complex. "
         "Ration: 27-30 g/pigeon/day.",
         *week_same(("Resting mix",45),("Moulting mix",30),("Light sport mix",25))),

        ("Retired — Winter (Nov-Feb)","Cold resistance, immune support",
         "Harsh winter: slightly increase oily seeds (via the Moulting mix) "
         "to help maintain body heat — but in moderation. "
         "Garlic in the water 2x/week: natural antibiotic, immune support. "
         "Vitamin D3 crucial in winter (lack of sunlight = risk of deficiency). "
         "Water never ice-cold: warm slightly if necessary. "
         "Grit + oyster shells. "
         "Ration: 26-30 g/pigeon/day (+5% oily seeds if T° < 0 °C).",
         *week_same(("Resting mix",60),("Moulting mix",25),("Light sport mix",15))),
    ]
    PLAN = {}
    for name,goal,description,lun,mar,mer,jeu,ven,sam,dim in PLANS_DEF:
        row = await conn.fetchrow("""
            INSERT INTO nutrition_plans
              (name, goal, description, lundi, mardi, mercredi, jeudi, vendredi, samedi, dimanche, created_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, now())
            ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id
        """, name, goal, description, lun, mar, mer, jeu, ven, sam, dim)
        PLAN[name] = row["id"]
    print(f"✅ {len(PLAN)} nutrition plans inserted")

    await conn.close()
    print("\n🎉 Seed completed successfully!")


if __name__ == "__main__":
    asyncio.run(main())
