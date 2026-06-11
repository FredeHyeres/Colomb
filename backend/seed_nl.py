"""seed_nl.py — Basis voedingscatalogus (NL)
Grondstoffen, supplementen, mengsels en voedingsschema's.
Wordt automatisch geladen bij de eerste opstart (taal NL).
Voor een volledige demoduivenmelkerij (duiven, wedvluchten, enz.),
zie seed_demo_nl.py.
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
    # VOEDING — Grondstoffen, supplementen, mengsels, schema's
    # ══════════════════════════════════════════════════════
    ING_DATA = [
        # (naam, categorie, eiwit%, vet%, koolhydraten%, energie kcal/100g, kweker-notities)
        ("Maïs",                       "energie",   9.0,  4.5, 72.0, 356.0, "Topbron van koolhydraten. Erg gewaardeerd door duiven. Snelle energie."),
        ("Tarwe",                      "energie",  12.0,  1.8, 70.0, 339.0, "Goede bron van complexe koolhydraten. Zeer verteerbaar."),
        ("Gerst",                      "depuratif",11.5,  2.2, 63.0, 316.0, "Essentieel in het reinigingsmengsel. Kalmeert en 'droogt' de duif."),
        ("Witte dari",                 "energie",  10.5,  3.2, 70.0, 339.0, "Witte sorghum. Wordt goed geaccepteerd. Goed koolhydratenprofiel."),
        ("Erwten",                     "proteine", 23.0,  1.5, 52.0, 314.0, "Belangrijkste eiwitbron. Herstelt spiermassa."),
        ("Voederwikke",                "proteine", 25.0,  1.8, 53.0, 316.0, "Peulvrucht verwant aan erwten. Rijk aan vezels. Goede eiwitvervanger."),
        ("Linzen",                     "proteine", 25.0,  1.0, 60.0, 352.0, "Eiwitrijke peulvrucht, goede aanvulling tijdens trainingsperiode."),
        ("Kardizaad",                  "energie",  15.0, 32.0, 14.0, 498.0, "Sleutelolie­zaad voor weduwschap. Rijk aan omega-6."),
        ("Gepelde zonnebloempitten",   "graisse",  21.0, 52.0,  4.5, 580.0, "Zeer vetrijk. Goed voor verenkleed, langdurige energie. Gepelde versie, beter verteerbaar."),
        ("Hennepzaad",                 "graisse",  22.7, 33.5,  5.0, 400.0, "Zeer olierijk. Stimulerend, wekt het instinct op. Geven vóór inkorving."),
        ("Pinda's",                    "graisse",  26.0, 46.0, 16.0, 567.0, "Zeer calorierijke peulvrucht. Voorbehouden aan einde van de week / vóór inkorving."),
        ("Esparcette",                 "depuratif",18.0,  3.0, 50.0, 330.0, "Verteerbare voederpeulvrucht, gematigde bijdrage aan eiwitten en vezels."),
        ("Padierijst",                 "energie",   7.5,  2.5, 75.0, 349.0, "Zeer verteerbaar. Goed voor spijsverteringsherstel na wedvlucht."),
        ("Koolzaad / Lijnzaad",        "graisse",  20.0, 42.0,  5.5, 490.0, "Lijnzaad: bevordert de rui, zijdezacht verenkleed. Doseren (giftig in overmaat). Koolzaad: goed vetprofiel."),
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
        ("Elektrolyten",     "electrolyte","5 ml/l"),
        ("Probiotica",       "probiotique","2 g/kg"),
        ("Aminozuren",       "autre",     "5 ml/kg"),
        ("Biergist",         "autre",     "3 g/kg"),
        ("Zalmolie",         "autre",     "3 ml/kg"),
        ("Appelazijn",       "autre",     "5–10 ml/l water, 2×/week"),
        ("Vitamine D3",      "vitamine",  "Volgens bijsluiter, in het water 2–3×/week"),
        ("Vitamine E",       "vitamine",  "2–3 druppels/duif/dag, 3×/week"),
        ("Oesterschelpen",   "autre",     "Naar believen, permanent vrij beschikbaar"),
    ]
    SUP = {}
    for name, stype, dosage in SUP_DATA:
        row = await conn.fetchrow("""
            INSERT INTO supplements (name, type, dosage, created_at)
            VALUES ($1,$2::supplementtype,$3, now()) RETURNING id
        """, name, stype, dosage)
        SUP[name] = row["id"]

    print(f"✅ {len(ING)} grondstoffen, {len(SUP)} supplementen ingevoegd")

    def make_comp(ings, sups):
        items = []
        for n, pct in ings:
            items.append({"id": f"ing_{ING[n]}", "type": "ingredient", "name": n, "pct": pct})
        for n, qty, unit in sups:
            items.append({"id": f"sup_{SUP[n]}", "type": "supplement", "name": n,
                          "quantity": qty, "unit": unit})
        return json.dumps(items)

    MIXES_DEF = [
        ("Rustmengsel",       "recuperation",
         [("Gerst",40),("Tarwe",30),("Voederwikke",20),("Esparcette",10)],
         [("Probiotica","2","g/kg")]),
        ("Licht sportmengsel","entrainement",
         [("Maïs",25),("Tarwe",25),("Witte dari",25),("Erwten",25)],
         [("Elektrolyten","5","ml/l")]),
        ("Energiemengsel",    "entrainement",
         [("Maïs",35),("Witte dari",25),("Kardizaad",20),("Hennepzaad",10),("Erwten",10)],
         [("Zalmolie","3","ml/kg")]),
        ("Wedvluchtmengsel",  "pre_panier",
         [("Maïs",30),("Witte dari",25),("Pinda's",20),("Gepelde zonnebloempitten",15),("Hennepzaad",10)],
         [("Aminozuren","5","ml/kg"),("Biergist","3","g/kg")]),
        ("Herstelmengsel",    "recuperation",
         [("Gerst",35),("Tarwe",30),("Linzen",20),("Esparcette",15)],
         [("Elektrolyten","8","ml/l"),("Probiotica","3","g/kg")]),
        ("Rijk kweekmengsel", "entrainement",
         [("Erwten",30),("Maïs",20),("Voederwikke",15),("Witte dari",15),("Tarwe",10),("Gepelde zonnebloempitten",5),("Hennepzaad",5)],
         []),
        ("Ruimengsel",        "recuperation",
         [("Gerst",35),("Tarwe",25),("Padierijst",15),("Koolzaad / Lijnzaad",15),("Hennepzaad",10)],
         []),
    ]
    MIX = {}
    for mname, usage, ings, sups in MIXES_DEF:
        row = await conn.fetchrow("""
            INSERT INTO feed_mixes (name, usage, composition, created_at)
            VALUES ($1,$2::mixusage,$3, now()) RETURNING id
        """, mname, usage, make_comp(ings, sups))
        MIX[mname] = row["id"]
    print(f"✅ {len(MIX)} mengsels ingevoegd")

    def day_json(*names):
        return json.dumps([MIX[n] for n in names])

    def day_pct_json(*pairs):
        return json.dumps([{"id": MIX[n], "pct": p} for n, p in pairs])

    def week_same(*pairs):
        return [day_pct_json(*pairs)] * 7

    def week(days_list):
        return [day_pct_json(*pairs) for pairs in days_list]

    PLANS_DEF = [
        ("Halve fond seizoen","wedvlucht",None,
         day_json("Licht sportmengsel"),day_json("Licht sportmengsel"),day_json("Energiemengsel"),
         day_json("Energiemengsel"),day_json("Wedvluchtmengsel"),day_json("Herstelmengsel"),
         day_json("Rustmengsel")),
        ("Rustperiode","rust",None,
         day_json("Rustmengsel"),day_json("Licht sportmengsel"),day_json("Licht sportmengsel"),
         day_json("Energiemengsel"),day_json("Energiemengsel"),day_json("Herstelmengsel"),
         day_json("Rustmengsel")),

        # ── PROGRAMMA TUSSENSEIZOEN ──────────────────────────────────────────
        ("Tussenseizoen — Actieve Rui (Augustus)","De volledige rui bevorderen",
         "Meest kritieke fase van het tussenseizoen. Lijnzaad en hennepzaad (in het Ruimengsel) "
         "stimuleren de aanmaak van nieuwe veren. De overheersende gerst 'droogt' en zuivert. "
         "Volledige rust: geen training. "
         "Supplementen: biergist, vitamine B-complex. "
         "Frequente baden (2–3×/week). Appelazijn 2×/week. "
         "Rantsoen: 30 g/duif/dag.",
         *week_same(("Rustmengsel",60),("Ruimengsel",40))),

        ("Tussenseizoen — Einde Rui (September)","De rui afronden, geleidelijk het sportmengsel herintroduceren",
         "De rui loopt af. Het sportmengsel geleidelijk herintroduceren aan het begin van de week, "
         "het aandeel verhogen naar het einde van de week toe. De kwaliteit van het nieuwe verenkleed "
         "observeren: strak en glanzend = goede rui. "
         "Supplementen: biergist, lijnzaad of koolzaad, mineralen + grit. "
         "Korte vrije vluchten rond de duiventil. "
         "Water + gehakte knoflook 1×/week. Bad 2×/week. "
         "Rantsoen: 30–32 g/duif/dag.",
         *week([
             [("Rustmengsel",55),("Ruimengsel",25),("Licht sportmengsel",20)],
             [("Rustmengsel",55),("Ruimengsel",25),("Licht sportmengsel",20)],
             [("Rustmengsel",50),("Licht sportmengsel",30),("Ruimengsel",20)],
             [("Rustmengsel",45),("Licht sportmengsel",35),("Ruimengsel",20)],
             [("Rustmengsel",45),("Licht sportmengsel",35),("Ruimengsel",20)],
             [("Rustmengsel",50),("Licht sportmengsel",30),("Ruimengsel",20)],
             [("Rustmengsel",55),("Ruimengsel",25),("Licht sportmengsel",20)],
         ])),

        ("Tussenseizoen — Winterrust (Okt-Dec)","Fysiologische winterrust, zwaarlijvigheid voorkomen",
         "Weinig actieve duiven, dalende temperaturen. Verminderd rantsoen. "
         "Let op overgewicht: geen zichtbaar vet op het borstbeen. "
         "Oktober: vlucht facultatief bij zacht weer. November–december: volledige rust. "
         "In december 5–10 % vette zaden (koolzaad/lijnzaad) toevoegen bij T° < 0 °C. "
         "Supplementen: grit + mineralen, vitamine D3, oesterschelpen. "
         "Water + knoflook 2×/week (winterimmuniteit). "
         "Rantsoen: 28–32 g/duif/dag.",
         *week_same(("Rustmengsel",70),("Licht sportmengsel",20),("Ruimengsel",10))),

        ("Tussenseizoen — Conditieopbouw (Januari)","De kweekkoppels voorbereiden op de paring in februari",
         "Eiwitten geleidelijk opbouwen. Peulvruchten (erwten, voederwikke) introduceren "
         "via het Rijke kweekmengsel. Vitamine E voor de vruchtbaarheid. Probiotica 2×/week. "
         "Korte vluchten van 20–30 min, 2–3×/week om de conditie weer op te bouwen. "
         "Water + probiotica. Bad 2×/week. "
         "Rantsoen: 33–36 g/duif/dag.",
         *week([
             [("Rustmengsel",40),("Licht sportmengsel",40),("Rijk kweekmengsel",20)],
             [("Rustmengsel",35),("Licht sportmengsel",45),("Rijk kweekmengsel",20)],
             [("Rustmengsel",35),("Licht sportmengsel",45),("Rijk kweekmengsel",20)],
             [("Rustmengsel",30),("Licht sportmengsel",50),("Rijk kweekmengsel",20)],
             [("Rustmengsel",30),("Licht sportmengsel",50),("Rijk kweekmengsel",20)],
             [("Rustmengsel",35),("Licht sportmengsel",45),("Rijk kweekmengsel",20)],
             [("Rustmengsel",40),("Licht sportmengsel",40),("Rijk kweekmengsel",20)],
         ])),

        # ── PROGRAMMA KWEEK ───────────────────────────────────────────────────
        ("Kweek — Pre-Paring (Feb. W1-W2)","Eiwitten opbouwen, vruchtbaarheid stimuleren",
         "Eiwitten geleidelijk opbouwen via het Rijke kweekmengsel (erwten, voederwikke). "
         "Vitamine E + B-complex voor de vruchtbaarheid. Grit + mineralen vrij beschikbaar. "
         "De eerste tekenen van spontane paring observeren. "
         "Appelazijn 2×/week. Bad 2×/week. Schoon water. "
         "Volwassen rantsoen: 35–38 g/duif/dag.",
         *week([
             [("Rustmengsel",30),("Licht sportmengsel",40),("Rijk kweekmengsel",30)],
             [("Rustmengsel",30),("Licht sportmengsel",40),("Rijk kweekmengsel",30)],
             [("Rustmengsel",25),("Licht sportmengsel",45),("Rijk kweekmengsel",30)],
             [("Rustmengsel",25),("Licht sportmengsel",45),("Rijk kweekmengsel",30)],
             [("Rustmengsel",25),("Licht sportmengsel",45),("Rijk kweekmengsel",30)],
             [("Rustmengsel",30),("Licht sportmengsel",40),("Rijk kweekmengsel",30)],
             [("Rustmengsel",30),("Licht sportmengsel",40),("Rijk kweekmengsel",30)],
         ])),

        ("Kweek — Paring (Feb. W3-W4)","Het voortplantingsinstinct stimuleren",
         "Hennepzaad (in het Rijke kweekmengsel) en peulvruchten (erwten, voederwikke) stimuleren "
         "het voortplantingsinstinct. Niet overdrijven: een te dikke duif broedt slecht. "
         "Let op baltsgedrag en eventuele gevechten. "
         "Vitamine E. Grit vrij beschikbaar. "
         "Schoon water verplicht. Regelmatig bad. "
         "Volwassen rantsoen: 38–42 g/duif/dag.",
         *week_same(("Licht sportmengsel",50),("Rijk kweekmengsel",30),("Energiemengsel",20))),

        ("Kweek — Broeden (Maart W1-W2)","De broeders onderhouden, calcium onmisbaar",
         "CALCIUM ONMISBAAR tijdens het broeden (vorming van de eierschalen, botgroei). "
         "Grit en oesterschelpen PERMANENT vrij beschikbaar. Geen stress. "
         "Onnodig hanteren van de nesten vermijden. Absolute rust. "
         "Supplementen: grit + oesterschelpen, vitamine D3. "
         "Schoon water 2×/dag ververst. "
         "Volwassen rantsoen: 38–42 g/duif/dag.",
         *week_same(("Licht sportmengsel",40),("Rijk kweekmengsel",35),("Rustmengsel",25))),

        ("Kweek — Uitkomst & Jongen (Maart W3-Apr. W2)","De productie van kropmelk en de groei van de jonge duiven ondersteunen",
         "De ouders produceren 'kropmelk' gedurende de eerste 72 uur. "
         "Rantsoenen STERK VERHOGEN: de ouders verbruiken tot 50 g/dag om te voeren. "
         "Eiwitten en vette zaden essentieel voor de snelle groei van de jongen. "
         "Grit onmisbaar — risico op decalcificatie. "
         "Supplementen: vitamine A, D3, B-complex, grit vrij beschikbaar, biergist. "
         "Schoon water 2×/dag. Bad 2×/week (volwassenen). "
         "Volwassen rantsoen: 45–55 g/duif/dag.",
         *week_same(("Rijk kweekmengsel",50),("Licht sportmengsel",30),("Energiemengsel",20))),

        ("Kweek — Spenen (Apr. W3-Mei)","Het spenen van de jonge duiven begeleiden",
         "Geleidelijk spenen op 21–28 dagen. Jonge duiven leren zelfstandig eten. "
         "Jongen-/kweekmengsel vrij beschikbaar gedurende de eerste 2 weken na het spenen. "
         "Na het spenen: gemeten rantsoen van 30–35 g voor de jongen. Controleren of iedereen goed eet. "
         "Probiotica om de nog onrijpe darmflora te beschermen. "
         "Supplementen: grit naar believen, vitamine B + E, probiotica. "
         "Water 2×/dag ververst. Appelazijn 2×/week. "
         "Volwassen rantsoen: 38–42 g/duif/dag.",
         *week_same(("Licht sportmengsel",50),("Rijk kweekmengsel",30),("Rustmengsel",20))),

        # ── PROGRAMMA GEPENSIONEERDEN ─────────────────────────────────────────
        ("Gepensioneerden — Lente (Maart-Mei)","Conditie behouden, obesitas voorkomen",
         "Matig rantsoen — geen vette zaden. "
         "Let op overgewicht: borstbeen bedekt zonder overdaad. "
         "Dagelijkse vrije vlucht rond de duiventil indien mogelijk. "
         "Vitamine E gunstig voor de gewrichten van oudere dieren. "
         "Grit + mineralen. Appelazijn 2×/week. "
         "Water dagelijks ververst. "
         "Rantsoen: 25–28 g/duif/dag.",
         *week_same(("Rustmengsel",55),("Licht sportmengsel",30),("Rijk kweekmengsel",15))),

        ("Gepensioneerden — Zomer (Juni-Augustus)","Lichte voeding, extra hydratatie",
         "WARMTE: rantsoen verminderen — verminderde eetlust. "
         "Vers water minstens 2× per dag ververst. "
         "Elektrolyten in het water 1×/week bij grote hitte. "
         "Baden zeer gewaardeerd: 3×/week. "
         "Verse groenten (sla, kool): vezels en vitaminen. "
         "Natuurlijke vitamine C (groenvoer). Grit naar believen. "
         "Rantsoen: 22–25 g/duif/dag.",
         *week_same(("Rustmengsel",60),("Licht sportmengsel",30),("Ruimengsel",10))),

        ("Gepensioneerden — Herfst / Rui (Sept-Okt)","De rui ondersteunen, kwaliteit van het verenkleed",
         "Lijnzaad onmisbaar (in het Ruimengsel) voor de kwaliteit van de rui: zijdeachtig en strak verenkleed. "
         "Het rantsoen tijdens de rui licht verhogen (verhoogd energieverbruik). "
         "Regelmatige baden: vergemakkelijken het uitvallen van de oude veren. "
         "De groei van de nieuwe slagpennen observeren: teken van goede gezondheid. "
         "Supplementen: lijnzaad of koolzaad, biergist, vitamine B-complex. "
         "Rantsoen: 27–30 g/duif/dag.",
         *week_same(("Rustmengsel",45),("Ruimengsel",30),("Licht sportmengsel",25))),

        ("Gepensioneerden — Winter (Nov-Feb)","Weerstand tegen kou, ondersteuning van het immuunsysteem",
         "Strenge winter: de vette zaden (via het Ruimengsel) licht verhogen "
         "om de lichaamswarmte te helpen behouden — maar met mate. "
         "Knoflook in het water 2×/week: natuurlijk antibioticum, immuunondersteuning. "
         "Vitamine D3 cruciaal in de winter (gebrek aan zonlicht = tekortrisico). "
         "Water nooit ijskoud: indien nodig op temperatuur brengen. "
         "Grit + oesterschelpen. "
         "Rantsoen: 26–30 g/duif/dag (+ 5 % vette zaden bij T° < 0 °C).",
         *week_same(("Rustmengsel",60),("Ruimengsel",25),("Licht sportmengsel",15))),
    ]
    PLAN = {}
    for name,goal,description,lun,mar,mer,jeu,ven,sam,dim in PLANS_DEF:
        row = await conn.fetchrow("""
            INSERT INTO nutrition_plans
              (name, goal, description, lundi, mardi, mercredi, jeudi, vendredi, samedi, dimanche, created_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, now()) RETURNING id
        """, name, goal, description, lun, mar, mer, jeu, ven, sam, dim)
        PLAN[name] = row["id"]
    print(f"✅ {len(PLAN)} voedingsschema's ingevoegd")

    await conn.close()
    print("\n🎉 Seed succesvol voltooid !")


if __name__ == "__main__":
    asyncio.run(main())
