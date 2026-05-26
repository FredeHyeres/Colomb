"""seed.py — Données de démonstration complètes Colomb
30 pigeons 3 générations, 30 concours, nutrition, entraînements, santé, pedigrees
"""
import asyncio
import asyncpg
import uuid
import json
from datetime import date
from database import settings

DSN = (
    f"postgresql://{settings.postgres_user}:{settings.postgres_password}"
    f"@{settings.postgres_host}:{settings.postgres_port}/{settings.postgres_db}"
)


def uid():
    return str(uuid.uuid4())


async def main():
    conn = await asyncpg.connect(DSN)

    # ══════════════════════════════════════════════════════
    # ÉTAPE 3 — ÉLEVEUR
    # ══════════════════════════════════════════════════════
    eleveur_id = uid()
    await conn.execute("""
        INSERT INTO eleveur
          (id, nom, prenom, nom_colombier, adresse, telephone, email, association)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    """, eleveur_id, "Dupont", "Frédéric", "Colombier de Hyères",
        "Hyères, Var, PACA", "06 12 34 56 78",
        "frederic.dupont@colombo.fr", "Société Colombophile de Hyères")
    print("✅ Éleveur inséré")

    # ══════════════════════════════════════════════════════
    # ÉTAPE 4 — LIGNÉES
    # ══════════════════════════════════════════════════════
    lignees_data = [
        ("Janssen",       "Belgique",    "#1565C0"),
        ("Van Loon",      "Pays-Bas",    "#2E7D32"),
        ("Vandenabeele",  "Belgique",    "#6A1B9A"),
        ("Geerinckx",     "Belgique",    "#E65100"),
        ("Delbar",        "France",      "#AD1457"),
        ("Lokale PACA",   "France-PACA", "#00838F"),
    ]
    L = {}
    for nom, origine, couleur in lignees_data:
        lid = uid()
        await conn.execute("""
            INSERT INTO lignees (id, nom, origine, couleur_label)
            VALUES ($1,$2,$3,$4)
        """, lid, nom, origine, couleur)
        L[nom] = lid
    print(f"✅ {len(L)} lignées insérées")

    # ══════════════════════════════════════════════════════
    # ÉTAPE 5 — PIGEONS  (key, matricule, annee, sexe, statut, lignee, pere_key, mere_key, nom)
    # ══════════════════════════════════════════════════════
    G1 = [
        ("P_G101","BE-2018-101010",2018,"male","reproducteur","Janssen",     None,None,"Sultan"),
        ("P_G102","BE-2018-202020",2018,"femelle","reproducteur","Janssen",  None,None,"Perle"),
        ("P_G103","BE-2019-303030",2019,"male","reproducteur","Van Loon",    None,None,"Tornado"),
        ("P_G104","BE-2019-404040",2019,"femelle","reproducteur","Van Loon", None,None,"Luna"),
        ("P_G105","FR-2018-505050",2018,"male","reproducteur","Vandenabeele",None,None,"Zeus"),
        ("P_G106","FR-2018-606060",2018,"femelle","reproducteur","Vandenabeele",None,None,"Athena"),
        ("P_G107","BE-2020-707070",2020,"male","reproducteur","Geerinckx",   None,None,"Atlas"),
        ("P_G108","BE-2020-808080",2020,"femelle","reproducteur","Geerinckx",None,None,"Venus"),
    ]
    G2 = [
        ("P_G201","BE-2021-111111",2021,"male","reproducteur","Janssen",      "P_G101","P_G102","Champion"),
        ("P_G202","BE-2021-222222",2021,"femelle","concours","Janssen",       "P_G101","P_G102","Diamant"),
        ("P_G203","BE-2021-333333",2021,"male","concours","Van Loon",         "P_G103","P_G104","Mistral"),
        ("P_G204","BE-2022-444444",2022,"femelle","reproducteur","Van Loon",  "P_G103","P_G104","Tramontane"),
        ("P_G205","FR-2021-555555",2021,"male","concours","Vandenabeele",     "P_G105","P_G106","Apollon"),
        ("P_G206","FR-2022-666666",2022,"femelle","retraite","Vandenabeele",  "P_G105","P_G106","Artemis"),
        ("P_G207","BE-2021-777777",2021,"male","concours","Geerinckx",        "P_G107","P_G108","Titan"),
        ("P_G208","BE-2022-888888",2022,"femelle","reproducteur","Geerinckx", "P_G107","P_G108","Hera"),
        ("P_G209","FR-2022-999999",2022,"male","reproducteur","Delbar",       None,None,"Kronos"),
        ("P_G210","FR-2022-100100",2022,"femelle","retraite","Lokale PACA",   None,None,"Mistrale"),
    ]
    G3 = [
        ("P_G301","BE-2023-001001",2023,"male","concours","Janssen",       "P_G201","P_G202","Éclair"),
        ("P_G302","BE-2023-002002",2023,"femelle","concours","Janssen",    "P_G201","P_G202","Comète"),
        ("P_G303","BE-2023-003003",2023,"male","actif","Van Loon",         "P_G203","P_G204","Sirocco"),
        ("P_G304","BE-2024-004004",2024,"femelle","actif","Van Loon",      "P_G203","P_G204","Brise"),
        ("P_G305","FR-2023-005005",2023,"male","concours","Vandenabeele",  "P_G205","P_G206","Hermès"),
        ("P_G306","FR-2023-006006",2023,"femelle","perdu","Vandenabeele",  "P_G205","P_G206","Niké"),
        ("P_G307","BE-2023-007007",2023,"male","concours","Geerinckx",    "P_G207","P_G208","Borée"),
        ("P_G308","BE-2024-008008",2024,"femelle","actif","Geerinckx",    "P_G207","P_G208","Zéphyr"),
        ("P_G309","FR-2024-009009",2024,"male","actif","Delbar",          "P_G209","P_G210","Aquilon"),
        ("P_G310","FR-2024-010010",2024,"femelle","actif","Delbar",       "P_G209","P_G210","Aura"),
        ("P_G311","FR-2024-011011",2024,"male","decede","Lokale PACA",    None,None,"Tramontano"),
        ("P_G312","FR-2023-012012",2023,"femelle","actif","Lokale PACA",  None,None,"Levante"),
    ]

    P = {}
    for gen_data in (G1, G2, G3):
        for key, mat, annee, sexe, statut, lignee, pere_key, mere_key, nom in gen_data:
            pid = uid()
            P[key] = pid
            pere_id = P[pere_key] if pere_key else None
            mere_id = P[mere_key] if mere_key else None
            await conn.execute("""
                INSERT INTO pigeons
                  (id, date_creation, matricule, annee_naissance, sexe, statut,
                   lignee_id, pere_id, mere_id, notes)
                VALUES ($1, now(), $2,$3,$4::sexe,$5::statut,$6,$7,$8,$9)
            """, pid, mat, annee, sexe, statut, L[lignee], pere_id, mere_id, nom)

    print(f"✅ {len(P)} pigeons insérés")

    # ══════════════════════════════════════════════════════
    # ÉTAPE 6 — COUPLES & NICHÉES
    # ══════════════════════════════════════════════════════
    couples_def = [
        ("C1","P_G101","P_G102",2021,"A1",[
            (date(2021,2,10),date(2021,3,5),  2,"→ Champion, Diamant"),
            (date(2022,3,15),date(2022,4,8),  2,"→ 2 jeunes vendus"),
        ]),
        ("C2","P_G103","P_G104",2021,"A2",[
            (date(2021,3,1), date(2021,3,25), 2,"→ Mistral"),
            (date(2022,2,20),date(2022,3,15), 2,"→ Tramontane"),
        ]),
        ("C3","P_G201","P_G202",2023,"B1",[
            (date(2023,2,15),date(2023,3,10), 2,"→ Éclair, Comète"),
        ]),
        ("C4","P_G203","P_G204",2023,"B2",[
            (date(2023,3,20),date(2023,4,14), 2,"→ Sirocco"),
            (date(2024,2,10),date(2024,3,5),  2,"→ Brise"),
        ]),
        ("C5","P_G209","P_G210",2024,"C1",[
            (date(2024,3,1), date(2024,3,26), 2,"→ Aquilon, Aura"),
        ]),
    ]
    C = {}
    for ckey, mk, fk, annee, case, nichees in couples_def:
        cid = uid()
        C[ckey] = cid
        await conn.execute("""
            INSERT INTO couples (id, male_id, femelle_id, annee, actif, case_numero)
            VALUES ($1,$2,$3,$4,$5,$6)
        """, cid, P[mk], P[fk], annee, True, case)
        for ponte, eclosion, nb, notes in nichees:
            await conn.execute("""
                INSERT INTO nichees (id, couple_id, date_ponte, date_eclosion, nombre_oeufs, notes)
                VALUES ($1,$2,$3,$4,$5,$6)
            """, uid(), cid, ponte, eclosion, nb, notes)

    nb_n = await conn.fetchval("SELECT COUNT(*) FROM nichees")
    print(f"✅ 5 couples, {nb_n} nichées insérés")

    # ══════════════════════════════════════════════════════
    # ÉTAPE 7 — SANTÉ
    # ══════════════════════════════════════════════════════
    vaccin_targets = [
        "P_G201","P_G202","P_G203","P_G204","P_G205","P_G207","P_G208","P_G209",
        "P_G301","P_G302","P_G303","P_G304","P_G305","P_G307","P_G308",
        "P_G309","P_G310","P_G312",
    ]
    g2_repro = ["P_G201","P_G204","P_G208","P_G209"]

    sante_rows = []
    for pk in vaccin_targets:
        sante_rows.append((P[pk],date(2024,1,15),"vaccination","Paramyxovirus","Vaccin Colombovac PMV"))
        sante_rows.append((P[pk],date(2024,2,1), "vaccination","Salmonelle",   "Vaccin Salmonella"))
    for pk in g2_repro:
        sante_rows.append((P[pk],date(2024,1,10),"visite_veterinaire","Bilan annuel avant saison. RAS.",None))

    sante_rows += [
        (P["P_G305"],date(2024,3,8), "visite_veterinaire","Examen suite trichomonose. Traitement prescrit.",None),
        (P["P_G305"],date(2024,3,9), "observation","Bec légèrement souillé avant traitement",None),
        (P["P_G305"],date(2024,3,10),"traitement","Trichomonose — ronidazole 7 jours","Ronidazole"),
        (P["P_G311"],date(2024,5,1), "traitement","Coccidiose — toltrazuril 3 jours","Toltrazuril"),
        (P["P_G311"],date(2024,5,20),"traitement","Ornithose — doxycycline 10 jours","Doxycycline"),
        (P["P_G311"],date(2024,5,25),"visite_veterinaire","État critique. Pronostic réservé.",None),
        (P["P_G311"],date(2024,5,28),"observation","État général très dégradé — décédé le 02/06/2024",None),
        (P["P_G206"],date(2023,8,15),"traitement","Vers ronds — fenbendazole","Fenbendazole"),
        (P["P_G206"],date(2023,9,1), "observation","Mise en retraite suite à fatigue chronique",None),
        (P["P_G303"],date(2024,7,9), "observation","Légère respiration sifflante, traité préventivement",None),
        (P["P_G303"],date(2024,7,10),"traitement","Mycoplasme — tylosine 7 jours","Tylosine"),
    ]
    for pig_id, dt, ttype, desc, produit in sante_rows:
        await conn.execute("""
            INSERT INTO sante (id, pigeon_id, date, type, description, produit)
            VALUES ($1,$2,$3,$4::typeevenement,$5,$6)
        """, uid(), pig_id, dt, ttype, desc, produit)
    print(f"✅ {len(sante_rows)} enregistrements santé insérés")

    # ══════════════════════════════════════════════════════
    # ÉTAPE 8 — PERFORMANCES (30 concours)
    # ══════════════════════════════════════════════════════
    CONCOURS = [
        {"c":"C01","d":date(2024,3,9),  "l":"Marseille",    "km":150,"n":250,
         "r":[("P_G301",12,1423),("P_G302",45,1398),("P_G203",8,1445),("P_G307",89,1356)]},
        {"c":"C02","d":date(2024,3,23), "l":"Nîmes",        "km":200,"n":320,
         "r":[("P_G301",8,1456),("P_G205",34,1401),("P_G307",120,1334),("P_G203",15,1432)]},
        {"c":"C03","d":date(2024,4,6),  "l":"Montpellier",  "km":250,"n":280,
         "r":[("P_G301",5,1467),("P_G302",28,1412),("P_G207",42,1398),("P_G203",22,1421)]},
        {"c":"C04","d":date(2024,4,20), "l":"Béziers",      "km":300,"n":310,
         "r":[("P_G301",3,1489),("P_G203",31,1398),("P_G307",67,1367),("P_G205",18,1434)]},
        {"c":"C05","d":date(2024,5,4),  "l":"Carcassonne",  "km":350,"n":290,
         "r":[("P_G301",7,1478),("P_G302",22,1423),("P_G207",15,1445),("P_G305",38,1401),("P_G307",98,1345)]},
        {"c":"C06","d":date(2024,5,18), "l":"Toulouse",     "km":400,"n":340,
         "r":[("P_G301",4,1501),("P_G203",48,1378),("P_G205",11,1467),("P_G307",145,1312)]},
        {"c":"C07","d":date(2024,6,1),  "l":"Bordeaux",     "km":500,"n":280,
         "r":[("P_G301",9,1456),("P_G302",31,1412),("P_G207",22,1434),("P_G305",14,1448),("P_G203",67,1356)]},
        {"c":"C08","d":date(2024,6,15), "l":"Périgueux",    "km":450,"n":260,
         "r":[("P_G301",6,1478),("P_G205",28,1412),("P_G307",89,1345),("P_G203",72,1334)]},
        {"c":"C09","d":date(2024,6,29), "l":"Libourne",     "km":500,"n":245,
         "r":[("P_G301",11,1445),("P_G302",19,1432),("P_G207",8,1467),("P_G305",25,1423)]},
        {"c":"C10","d":date(2024,7,13), "l":"Angoulême",    "km":550,"n":230,
         "r":[("P_G301",14,1434),("P_G203",88,1312),("P_G205",33,1401),("P_G307",112,1323)]},
        {"c":"C11","d":date(2024,7,27), "l":"Poitiers",     "km":600,"n":210,
         "r":[("P_G301",18,1423),("P_G302",42,1389),("P_G207",29,1412),("P_G305",11,1456)]},
        {"c":"C12","d":date(2024,8,10), "l":"Châtellerault","km":600,"n":195,
         "r":[("P_G301",22,1412),("P_G203",102,1289),("P_G307",78,1345),("P_G205",41,1378)]},
        {"c":"C13","d":date(2024,8,24), "l":"Tours",        "km":550,"n":220,
         "r":[("P_G301",9,1456),("P_G302",27,1412),("P_G207",19,1434),("P_G305",8,1467)]},
        {"c":"C14","d":date(2024,9,7),  "l":"Blois",        "km":500,"n":240,
         "r":[("P_G301",5,1478),("P_G205",22,1423),("P_G307",54,1367),("P_G203",91,1301)]},
        {"c":"C15","d":date(2024,9,21), "l":"Orléans",      "km":450,"n":255,
         "r":[("P_G301",4,1489),("P_G302",15,1445),("P_G207",11,1456),("P_G305",19,1434)]},
        {"c":"C16","d":date(2024,10,5), "l":"Avignon",      "km":180,"n":180,
         "r":[("P_G301",2,1512),("P_G303",22,1423),("P_G308",45,1389),("P_G307",67,1356)]},
        {"c":"C17","d":date(2024,10,19),"l":"Arles",        "km":200,"n":165,
         "r":[("P_G301",3,1501),("P_G302",12,1456),("P_G303",31,1401),("P_G309",55,1367)]},
        {"c":"C18","d":date(2024,11,2), "l":"Aix",          "km":220,"n":170,
         "r":[("P_G301",1,1534),("P_G207",18,1434),("P_G307",88,1334),("P_G308",42,1389)]},
        {"c":"C19","d":date(2024,11,16),"l":"Salon",        "km":180,"n":155,
         "r":[("P_G302",8,1467),("P_G303",19,1423),("P_G305",5,1489),("P_G309",38,1389)]},
        {"c":"C20","d":date(2024,11,30),"l":"Istres",       "km":200,"n":160,
         "r":[("P_G301",2,1512),("P_G307",71,1345),("P_G308",28,1401),("P_G310",44,1378)]},
        {"c":"C21","d":date(2025,3,8),  "l":"Marseille",    "km":150,"n":270,
         "r":[("P_G301",3,1523),("P_G302",11,1467),("P_G303",28,1423),("P_G307",55,1367),("P_G309",41,1389)]},
        {"c":"C22","d":date(2025,3,22), "l":"Nîmes",        "km":200,"n":310,
         "r":[("P_G301",2,1534),("P_G305",9,1478),("P_G307",98,1334),("P_G310",51,1378)]},
        {"c":"C23","d":date(2025,4,5),  "l":"Montpellier",  "km":250,"n":295,
         "r":[("P_G301",4,1512),("P_G302",18,1456),("P_G303",35,1412),("P_G207",45,1389)]},
        {"c":"C24","d":date(2025,4,19), "l":"Béziers",      "km":300,"n":305,
         "r":[("P_G301",6,1501),("P_G305",12,1467),("P_G307",82,1345),("P_G309",48,1378)]},
        {"c":"C25","d":date(2025,5,3),  "l":"Carcassonne",  "km":350,"n":285,
         "r":[("P_G301",8,1489),("P_G302",24,1445),("P_G303",41,1401),("P_G310",58,1367)]},
        {"c":"C26","d":date(2025,5,10), "l":"Marseille",    "km":150,"n":260,
         "r":[("P_G301",1,1556),("P_G307",77,1345),("P_G308",33,1401),("P_G309",29,1412)]},
        {"c":"C27","d":date(2025,5,17), "l":"Avignon",      "km":180,"n":240,
         "r":[("P_G301",3,1523),("P_G302",14,1456),("P_G305",7,1489),("P_G310",45,1378)]},
        {"c":"C28","d":date(2025,5,18), "l":"Nîmes",        "km":220,"n":275,
         "r":[("P_G301",5,1501),("P_G303",33,1412),("P_G307",91,1334)]},  # P_G306 perdu — absent
        {"c":"C29","d":date(2025,5,24), "l":"Arles",        "km":200,"n":250,
         "r":[("P_G301",2,1534),("P_G302",9,1467),("P_G305",15,1456),("P_G309",37,1389)]},
        {"c":"C30","d":date(2025,5,25), "l":"Salon",        "km":180,"n":235,
         "r":[("P_G301",1,1545),("P_G307",88,1334),("P_G308",25,1412),("P_G310",41,1378)]},
    ]
    perf_count = 0
    for c in CONCOURS:
        nom = f"{c['c']} - {c['l']} {c['km']}km"
        for pk, rang, vit in c["r"]:
            await conn.execute("""
                INSERT INTO performances
                  (id, pigeon_id, date, nom_concours, distance_km,
                   classement, vitesse_m_min, nb_pigeons_engages)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
            """, uid(), P[pk], c["d"], nom, c["km"], rang, float(vit), c["n"])
            perf_count += 1
    print(f"✅ {len(CONCOURS)} concours, {perf_count} performances insérées")

    # ══════════════════════════════════════════════════════
    # ÉTAPE 9 — ENTRAÎNEMENTS
    # ══════════════════════════════════════════════════════
    SESSIONS = [
        (date(2025,3,1),  "toss",50, "beau",         16.0,10,None),
        (date(2025,3,8),  "toss",60, "vent modéré",  14.0,20,"N"),
        (date(2025,3,15), "toss",65, "beau",         15.0,15,None),
        (date(2025,3,22), "toss",70, "chaud",        18.0,5, "S"),
        (date(2025,4,5),  "toss",75, "beau",         17.0,8, None),
        (date(2025,4,12), "toss",80, "brumeux",      12.0,10,"W"),
        (date(2025,4,19), "toss",85, "beau",         16.0,12,None),
        (date(2025,4,26), "toss",90, "vent modéré",  15.0,25,"NW"),
        (date(2025,5,3),  "toss",95, "chaud",        19.0,3, None),
        (date(2025,5,10), "toss",85, "beau",         17.0,10,None),
    ]
    # Scores (recovery, motivation, condition, hydration) par session, 0-10
    SCORES = {
        "P_G301": [(10,10,10,9),(10,9,10,9),(10,10,9,10),(9,10,10,9),(10,10,10,10),
                   (10,9,10,9),(10,10,10,10),(9,10,9,10),(10,10,10,9),(10,10,10,10)],
        "P_G302": [(8,8,8,8),(7,8,8,7),(8,8,7,8),(8,7,8,8),(8,8,8,7),
                   (7,8,8,8),(8,7,8,8),(8,8,7,8),(8,8,8,8),(8,8,8,7)],
        "P_G303": [(7,7,6,7),(6,7,7,6),(7,6,7,7),(7,7,6,7),(6,7,7,6),
                   (7,7,6,6),(7,6,7,7),(6,7,7,7),(7,7,6,7),(7,6,7,6)],
        "P_G305": [(5,5,5,6),(5,6,5,5),(6,5,6,5),(6,6,6,6),(7,7,7,7),
                   (7,7,8,7),(8,8,8,7),(8,8,8,8),(9,8,9,8),(9,9,9,9)],
        "P_G307": [(6,4,5,6),(8,7,8,7),(4,5,4,5),(7,8,7,6),(5,4,6,5),
                   (8,8,7,8),(4,5,5,4),(7,6,7,7),(5,7,5,6),(8,7,8,7)],
        "P_G308": [(7,7,7,7),(7,6,7,7),(8,7,7,8),(7,7,8,7),(7,8,7,7),
                   (6,7,7,6),(8,7,8,7),(7,8,7,8),(7,7,8,7),(8,7,7,8)],
    }
    BASE_VIT = {"P_G301":1520,"P_G302":1450,"P_G303":1410,
                "P_G305":1400,"P_G307":1340,"P_G308":1400}

    sess_count = 0
    res_count  = 0
    for i, (dt, stype, dist, weather, temp, wind, wind_dir) in enumerate(SESSIONS):
        row = await conn.fetchrow("""
            INSERT INTO training_sessions
              (date, session_type, distance_km, weather, temperature, wind_speed,
               wind_direction, created_at)
            VALUES ($1,$2::sessiontype,$3,$4,$5,$6,$7, now())
            RETURNING id
        """, dt, stype, float(dist), weather, temp, float(wind), wind_dir)
        sess_id = row["id"]
        sess_count += 1
        for pk, score_list in SCORES.items():
            rec,mot,cond,hyd = score_list[i]
            rt = round(dist * 1000 / BASE_VIT[pk], 1)
            await conn.execute("""
                INSERT INTO pigeon_training_results
                  (session_id, pigeon_id, return_time, recovery_score,
                   motivation_score, condition_score, hydration_score, created_at)
                VALUES ($1,$2,$3,$4,$5,$6,$7, now())
            """, sess_id, P[pk], rt, rec, mot, cond, hyd)
            res_count += 1
    print(f"✅ {sess_count} séances, {res_count} résultats entraînement insérés")

    # ══════════════════════════════════════════════════════
    # ÉTAPE 10 — NUTRITION
    # ══════════════════════════════════════════════════════
    ING_DATA = [
        ("Maïs",                 "energie"),
        ("Blé",                  "energie"),
        ("Orge",                 "depuratif"),
        ("Dari",                 "energie"),
        ("Pois",                 "proteine"),
        ("Vesce",                "proteine"),
        ("Lentilles",            "proteine"),
        ("Cardi",                "energie"),
        ("Tournesol décortiqué", "graisse"),
        ("Chanvre",              "graisse"),
        ("Cacahuètes",           "graisse"),
        ("Sainfoin",             "depuratif"),
    ]
    ING = {}
    for name, cat in ING_DATA:
        row = await conn.fetchrow("""
            INSERT INTO feed_ingredients (name, category)
            VALUES ($1,$2::ingredientcategory) RETURNING id
        """, name, cat)
        ING[name] = row["id"]

    SUP_DATA = [
        ("Électrolytes",    "electrolyte","5 ml/litre"),
        ("Probiotiques",    "probiotique","2 g/kg"),
        ("Acides aminés",   "autre",     "5 ml/kg"),
        ("Levure de bière", "autre",     "3 g/kg"),
        ("Huile de saumon", "autre",     "3 ml/kg"),
    ]
    SUP = {}
    for name, stype, dosage in SUP_DATA:
        row = await conn.fetchrow("""
            INSERT INTO supplements (name, type, dosage)
            VALUES ($1,$2::supplementtype,$3) RETURNING id
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
    ]
    MIX = {}
    for mname, usage, ings, sups in MIXES_DEF:
        row = await conn.fetchrow("""
            INSERT INTO feed_mixes (name, usage, composition)
            VALUES ($1,$2::mixusage,$3) RETURNING id
        """, mname, usage, make_comp(ings, sups))
        MIX[mname] = row["id"]
    print(f"✅ {len(MIX)} mélanges insérés")

    def day_json(*names):
        return json.dumps([MIX[n] for n in names])

    PLANS_DEF = [
        ("Demi-fond Saison","pré-concours",
         day_json("Sport léger"),day_json("Sport léger"),day_json("Énergie"),
         day_json("Énergie"),day_json("Pré-concours"),day_json("Récupération"),
         day_json("Dépuratif")),
        ("Intersaison","récupération",
         day_json("Dépuratif"),day_json("Sport léger"),day_json("Sport léger"),
         day_json("Énergie"),day_json("Énergie"),day_json("Récupération"),
         day_json("Dépuratif")),
    ]
    PLAN = {}
    for name,goal,lun,mar,mer,jeu,ven,sam,dim in PLANS_DEF:
        row = await conn.fetchrow("""
            INSERT INTO nutrition_plans
              (name, goal, lundi, mardi, mercredi, jeudi, vendredi, samedi, dimanche)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id
        """, name, goal, lun, mar, mer, jeu, ven, sam, dim)
        PLAN[name] = row["id"]
    print(f"✅ {len(PLAN)} plans alimentaires insérés")

    concours_pigs = ["P_G202","P_G203","P_G205","P_G207","P_G301","P_G302","P_G305","P_G307"]
    actif_pigs    = ["P_G303","P_G304","P_G308","P_G309","P_G310","P_G312"]
    for pk in concours_pigs:
        await conn.execute("""
            INSERT INTO nutrition_assignments
              (pigeon_id, plan_id, date_debut, date_fin, is_individual, groupe)
            VALUES ($1,$2,$3,$4,$5,$6)
        """, P[pk], PLAN["Demi-fond Saison"], date(2025,3,1), date(2025,6,30), False, "concours")
    for pk in actif_pigs:
        await conn.execute("""
            INSERT INTO nutrition_assignments
              (pigeon_id, plan_id, date_debut, date_fin, is_individual, groupe)
            VALUES ($1,$2,$3,$4,$5,$6)
        """, P[pk], PLAN["Intersaison"], date(2025,1,1), date(2025,2,28), False, "actif")

    aff_n = await conn.fetchval("SELECT COUNT(*) FROM nutrition_assignments")
    print(f"✅ {aff_n} affectations nutrition insérées")

    await conn.close()
    print("\n🎉 Seed terminé avec succès !")


if __name__ == "__main__":
    asyncio.run(main())
