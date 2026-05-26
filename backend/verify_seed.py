"""verify_seed.py — Vérification complète du seed"""
import asyncio
import asyncpg
from database import settings

DSN = (
    f"postgresql://{settings.postgres_user}:{settings.postgres_password}"
    f"@{settings.postgres_host}:{settings.postgres_port}/{settings.postgres_db}"
)


async def main():
    conn = await asyncpg.connect(DSN)
    errors = []

    def ok(label, val=None):
        suffix = f" : {val}" if val is not None else ""
        print(f"  ✅ {label}{suffix}")

    def fail(label, detail=""):
        msg = f"{label} — {detail}" if detail else label
        errors.append(msg)
        print(f"  ❌ {msg}")

    print("\n" + "═"*60)
    print("  VÉRIFICATION DU SEED")
    print("═"*60 + "\n")

    # ── Éleveur ──────────────────────────────────────────────
    n = await conn.fetchval("SELECT COUNT(*) FROM eleveur")
    (ok if n == 1 else fail)("Eleveur", f"{n} enregistrement(s)")

    # ── Lignées ──────────────────────────────────────────────
    n = await conn.fetchval("SELECT COUNT(*) FROM lignees")
    (ok if n == 6 else fail)("Lignées", f"{n} (attendu 6)")

    # ── Pigeons ──────────────────────────────────────────────
    n = await conn.fetchval("SELECT COUNT(*) FROM pigeons")
    (ok if n == 30 else fail)("Pigeons", f"{n} (attendu 30)")

    rows = await conn.fetch("""
        SELECT statut, COUNT(*) AS n FROM pigeons GROUP BY statut ORDER BY statut
    """)
    statuts = {r["statut"]: r["n"] for r in rows}
    print(f"       → par statut : {dict(statuts)}")

    rows = await conn.fetch("""
        SELECT sexe, COUNT(*) AS n FROM pigeons GROUP BY sexe ORDER BY sexe
    """)
    sexes = {r["sexe"]: r["n"] for r in rows}
    print(f"       → par sexe   : {dict(sexes)}")

    # ── Couples ──────────────────────────────────────────────
    n = await conn.fetchval("SELECT COUNT(*) FROM couples")
    (ok if n == 5 else fail)("Couples", f"{n} (attendu 5)")

    # ── Nichées ──────────────────────────────────────────────
    n = await conn.fetchval("SELECT COUNT(*) FROM nichees")
    (ok if n == 8 else fail)("Nichées", f"{n} (attendu 8)")

    # ── Pedigrees : père=mâle, mère=femelle ──────────────────
    bad_pere = await conn.fetchval("""
        SELECT COUNT(*) FROM pigeons p
        JOIN pigeons pere ON pere.id = p.pere_id
        WHERE pere.sexe != 'male'
    """)
    bad_mere = await conn.fetchval("""
        SELECT COUNT(*) FROM pigeons p
        JOIN pigeons mere ON mere.id = p.mere_id
        WHERE mere.sexe != 'femelle'
    """)
    if bad_pere == 0 and bad_mere == 0:
        ok("Pedigrees sexe cohérent (père=mâle, mère=femelle)")
    else:
        fail("Pedigrees", f"{bad_pere} père(s) non-mâle, {bad_mere} mère(s) non-femelle")

    # ── Santé ────────────────────────────────────────────────
    n = await conn.fetchval("SELECT COUNT(*) FROM sante")
    ok("Santé total", f"{n} enregistrements")
    rows = await conn.fetch("""
        SELECT type, COUNT(*) AS n FROM sante GROUP BY type ORDER BY type
    """)
    for r in rows:
        print(f"       → {r['type']:<25} {r['n']}")

    # ── Performances ─────────────────────────────────────────
    nb_perf = await conn.fetchval("SELECT COUNT(*) FROM performances")
    ok("Performances total", f"{nb_perf} lignes")

    nb_concours = await conn.fetchval(
        "SELECT COUNT(DISTINCT nom_concours) FROM performances"
    )
    (ok if nb_concours == 30 else fail)(
        "Concours distincts", f"{nb_concours} (attendu 30)"
    )

    # G3-06 (Niké, perdue) ne doit avoir aucune perf au concours C28
    niké_id = await conn.fetchval(
        "SELECT id FROM pigeons WHERE matricule='FR-2023-006006'"
    )
    if niké_id:
        c28_perf = await conn.fetchval("""
            SELECT COUNT(*) FROM performances
            WHERE pigeon_id=$1 AND nom_concours LIKE '%C28%'
        """, niké_id)
        if c28_perf == 0:
            ok("G3-06 Niké absente de C28 (perdue)")
        else:
            fail("G3-06 Niké a des perfs à C28", f"{c28_perf} trouvée(s)")

    # G3-11 (Tramontano, décédé) ne doit avoir aucune perf
    tram_id = await conn.fetchval(
        "SELECT id FROM pigeons WHERE matricule='FR-2024-011011'"
    )
    if tram_id:
        tram_perf = await conn.fetchval(
            "SELECT COUNT(*) FROM performances WHERE pigeon_id=$1", tram_id
        )
        (ok if tram_perf == 0 else fail)(
            "G3-11 Tramontano (décédé) sans performances", f"{tram_perf} perf(s)"
        )

    # ── Entraînements ────────────────────────────────────────
    nb_sess = await conn.fetchval("SELECT COUNT(*) FROM training_sessions")
    ok("Séances entraînement", f"{nb_sess}")

    rows = await conn.fetch("""
        SELECT p.notes AS nom, COUNT(r.id) AS n
        FROM pigeon_training_results r
        JOIN pigeons p ON p.id = r.pigeon_id
        GROUP BY p.notes ORDER BY p.notes
    """)
    print("       → résultats par pigeon :")
    for r in rows:
        print(f"          {r['nom']:<15} {r['n']} séance(s)")

    # ── Nutrition ────────────────────────────────────────────
    nb_ing = await conn.fetchval("SELECT COUNT(*) FROM feed_ingredients")
    (ok if nb_ing == 12 else fail)("Ingrédients", f"{nb_ing} (attendu 12)")

    nb_sup = await conn.fetchval("SELECT COUNT(*) FROM supplements")
    (ok if nb_sup == 5 else fail)("Suppléments", f"{nb_sup} (attendu 5)")

    nb_mix = await conn.fetchval("SELECT COUNT(*) FROM feed_mixes")
    (ok if nb_mix == 5 else fail)("Mélanges", f"{nb_mix} (attendu 5)")

    # Vérification total % = 100 pour chaque mélange
    import json
    mixes = await conn.fetch("SELECT name, composition FROM feed_mixes")
    for m in mixes:
        try:
            comp = json.loads(m["composition"] or "[]")
            ings = [c for c in comp if c.get("type") == "ingredient"]
            total = sum(c.get("pct", 0) for c in ings)
            if abs(total - 100) < 0.1:
                ok(f"Mélange '{m['name']}' total ingrédients", f"{total:.1f}%")
            else:
                fail(f"Mélange '{m['name']}' total", f"{total:.1f}% (attendu 100%)")
        except Exception as e:
            fail(f"Mélange '{m['name']}' composition JSON", str(e))

    nb_plan = await conn.fetchval("SELECT COUNT(*) FROM nutrition_plans")
    (ok if nb_plan == 2 else fail)("Plans alimentaires", f"{nb_plan} (attendu 2)")

    nb_aff = await conn.fetchval("SELECT COUNT(*) FROM nutrition_assignments")
    (ok if nb_aff == 14 else fail)("Affectations", f"{nb_aff} (attendu 14)")

    # ── Résumé final ─────────────────────────────────────────
    print("\n" + "═"*60)
    print("  RÉSUMÉ FINAL")
    print("═"*60)
    if errors:
        print(f"\n  ⚠️  {len(errors)} ERREUR(S) DÉTECTÉE(S) :")
        for e in errors:
            print(f"       • {e}")
    else:
        print("\n  ✅ Aucune erreur — seed cohérent et complet !")

    await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
