"""
check_structure.py — Audit de la structure PostgreSQL
Usage : python check_structure.py
"""
import asyncio
import asyncpg
from database import settings


DSN = (
    f"postgresql://{settings.postgres_user}"
    f":{settings.postgres_password}"
    f"@{settings.postgres_host}"
    f":{settings.postgres_port}"
    f"/{settings.postgres_db}"
)

REQUIRED_ENUMS = {
    "sexe_enum":       {"male", "femelle"},
    "statut_enum":     {"actif", "reproducteur", "concours", "retraite", "perdu", "decede"},
    "sante_type_enum": {"vaccination", "traitement", "visite_veterinaire", "observation"},
}


async def main():
    conn = await asyncpg.connect(DSN)

    # ── 1. Liste des tables ────────────────────────────────────────────────────
    tables = await conn.fetch("""
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY tablename
    """)
    table_names = [r["tablename"] for r in tables]

    print("\n" + "═" * 60)
    print("  STRUCTURE DE LA BASE DE DONNÉES")
    print("═" * 60)

    for tname in table_names:
        print(f"\n┌─ TABLE : {tname}")

        # Colonnes + types + nullable
        cols = await conn.fetch("""
            SELECT
                c.column_name,
                c.data_type,
                c.udt_name,
                c.is_nullable,
                c.column_default
            FROM information_schema.columns c
            WHERE c.table_schema = 'public'
              AND c.table_name   = $1
            ORDER BY c.ordinal_position
        """, tname)

        for col in cols:
            dtype = col["udt_name"] if col["data_type"] == "USER-DEFINED" else col["data_type"]
            nullable = "" if col["is_nullable"] == "YES" else " NOT NULL"
            default  = f"  DEFAULT {col['column_default']}" if col["column_default"] else ""
            print(f"│   {col['column_name']:<28} {dtype}{nullable}{default}")

        # Contraintes (PK, FK, UNIQUE, CHECK)
        constraints = await conn.fetch("""
            SELECT
                tc.constraint_type,
                tc.constraint_name,
                kcu.column_name,
                ccu.table_name  AS foreign_table,
                ccu.column_name AS foreign_column
            FROM information_schema.table_constraints  tc
            JOIN information_schema.key_column_usage   kcu
              ON tc.constraint_name = kcu.constraint_name
             AND tc.table_schema    = kcu.table_schema
            LEFT JOIN information_schema.constraint_column_usage ccu
              ON tc.constraint_name = ccu.constraint_name
             AND tc.table_schema    = ccu.table_schema
            WHERE tc.table_schema = 'public'
              AND tc.table_name   = $1
              AND tc.constraint_type IN ('PRIMARY KEY','FOREIGN KEY','UNIQUE')
            ORDER BY tc.constraint_type, kcu.column_name
        """, tname)

        if constraints:
            print("│   · Contraintes :")
            for c in constraints:
                if c["constraint_type"] == "FOREIGN KEY":
                    print(f"│     FK  {c['column_name']} → {c['foreign_table']}.{c['foreign_column']}")
                elif c["constraint_type"] == "PRIMARY KEY":
                    print(f"│     PK  {c['column_name']}")
                elif c["constraint_type"] == "UNIQUE":
                    print(f"│     UNIQUE  {c['column_name']}")

        print("└" + "─" * 50)

    # ── 2. ENUMs PostgreSQL ────────────────────────────────────────────────────
    print("\n" + "═" * 60)
    print("  ENUMS POSTGRESQL")
    print("═" * 60)

    enums = await conn.fetch("""
        SELECT
            t.typname                          AS enum_name,
            array_agg(e.enumlabel ORDER BY e.enumsortorder) AS values
        FROM pg_type t
        JOIN pg_enum e ON e.enumtypid = t.oid
        JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public'
        GROUP BY t.typname
        ORDER BY t.typname
    """)

    found_enums = {}
    for row in enums:
        vals = list(row["values"])
        found_enums[row["enum_name"]] = set(vals)
        print(f"\n  {row['enum_name']}")
        print(f"    valeurs : {', '.join(vals)}")

    # ── 3. Vérification des ENUMs requis ──────────────────────────────────────
    print("\n" + "═" * 60)
    print("  VÉRIFICATION DES ENUMS REQUIS")
    print("═" * 60)

    enum_problems = []
    enum_ok = []

    for ename, expected in REQUIRED_ENUMS.items():
        if ename not in found_enums:
            enum_problems.append(f"MANQUANT : {ename}")
            print(f"  ❌ {ename} : INTROUVABLE")
        else:
            actual = found_enums[ename]
            missing = expected - actual
            extra   = actual - expected
            if missing or extra:
                msg = f"{ename} — manque: {missing or '∅'}, extra: {extra or '∅'}"
                enum_problems.append(msg)
                print(f"  ⚠️  {msg}")
            else:
                enum_ok.append(ename)
                print(f"  ✅ {ename} : OK  ({', '.join(sorted(actual))})")

    # ── 4. Résumé final ───────────────────────────────────────────────────────
    print("\n" + "═" * 60)
    print("  RÉSUMÉ FINAL")
    print("═" * 60)
    print(f"\n  ✅ Tables trouvées ({len(table_names)}) :")
    for t in table_names:
        print(f"       • {t}")

    if enum_ok:
        print(f"\n  ✅ ENUMs valides : {', '.join(enum_ok)}")

    if enum_problems:
        print(f"\n  ⚠️  Problèmes détectés :")
        for p in enum_problems:
            print(f"       • {p}")
    else:
        print("\n  ✅ Aucun problème détecté")

    await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
