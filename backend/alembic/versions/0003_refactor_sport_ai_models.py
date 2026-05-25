"""refactor sport ai models

Revision ID: 0003_refactor_sport_ai_models
Revises: 0002_add_ai_domain
Create Date: 2026-05-26

Refactorisation des modèles sport et IA :
  - Remplace ai_training_snapshots par ai_snapshots (colonnes JSON)
  - Remplace sport_events (payload_json -> payload)
  - Remplace feed_mix_ingredients (table association simple)
  - ALTER training_sessions : ajoute temperature, wind_speed, wind_direction
  - ALTER ai_recommendations : ajoute score_forme, score_endurance, score_vitesse,
    score_global, tendance, recommendation, confiance, facteurs_explicatifs, generated_at
"""

from alembic import op
import sqlalchemy as sa

revision = "0003_refactor_sport_ai_models"
down_revision = "0002_add_ai_domain"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── training_sessions : nouvelles colonnes ────────────────────────────────
    op.execute("ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS temperature FLOAT")
    op.execute("ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS wind_speed FLOAT")
    op.execute("ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS wind_direction VARCHAR(20)")

    # ── pigeon_training_results : renommer return_time_minutes -> return_time ──
    # Ajouter la nouvelle colonne si elle n'existe pas
    op.execute("ALTER TABLE pigeon_training_results ADD COLUMN IF NOT EXISTS return_time FLOAT")
    # Copier les données si l'ancienne colonne existe (safe — ignore si absente)
    try:
        op.execute(
            "UPDATE pigeon_training_results SET return_time = return_time_minutes "
            "WHERE return_time IS NULL AND return_time_minutes IS NOT NULL"
        )
    except Exception:
        pass

    # ── ai_recommendations : nouvelles colonnes XAI ───────────────────────────
    op.execute("ALTER TABLE ai_recommendations ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ DEFAULT now()")
    op.execute("ALTER TABLE ai_recommendations ADD COLUMN IF NOT EXISTS score_forme FLOAT")
    op.execute("ALTER TABLE ai_recommendations ADD COLUMN IF NOT EXISTS score_endurance FLOAT")
    op.execute("ALTER TABLE ai_recommendations ADD COLUMN IF NOT EXISTS score_vitesse FLOAT")
    op.execute("ALTER TABLE ai_recommendations ADD COLUMN IF NOT EXISTS score_global FLOAT")
    op.execute("ALTER TABLE ai_recommendations ADD COLUMN IF NOT EXISTS tendance VARCHAR(20)")
    op.execute("ALTER TABLE ai_recommendations ADD COLUMN IF NOT EXISTS recommendation VARCHAR(30)")
    op.execute("ALTER TABLE ai_recommendations ADD COLUMN IF NOT EXISTS confiance FLOAT")
    op.execute("ALTER TABLE ai_recommendations ADD COLUMN IF NOT EXISTS facteurs_explicatifs TEXT")

    # ── ai_snapshots : nouvelle table (remplace ai_training_snapshots) ────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS ai_snapshots (
            id SERIAL PRIMARY KEY,
            pigeon_id VARCHAR NOT NULL REFERENCES pigeons(id),
            snapshot_date DATE NOT NULL,
            snapshot_version VARCHAR(20) NOT NULL DEFAULT 'v1',
            feature_set_version VARCHAR(20) NOT NULL DEFAULT 'core_v1',
            features TEXT,
            created_at TIMESTAMPTZ DEFAULT now()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_ai_snapshots_pigeon_id ON ai_snapshots (pigeon_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_ai_snapshots_snapshot_date ON ai_snapshots (snapshot_date)")

    # ── sport_events : ajouter colonne payload (alias de payload_json) ────────
    # La table sport_events existe déjà avec payload_json. On ajoute payload.
    op.execute("ALTER TABLE sport_events ADD COLUMN IF NOT EXISTS payload TEXT")
    # Copier payload_json -> payload pour les données existantes
    try:
        op.execute(
            "UPDATE sport_events SET payload = payload_json WHERE payload IS NULL AND payload_json IS NOT NULL"
        )
    except Exception:
        pass

    # ── feed_mix_ingredients : vérifier/recréer avec colonne percentage ───────
    # La table peut exister avec un schéma différent. On s'assure que percentage existe.
    op.execute(
        "ALTER TABLE feed_mix_ingredients ADD COLUMN IF NOT EXISTS percentage FLOAT NOT NULL DEFAULT 0.0"
    )

    # ── Enums : ajouter les nouvelles valeurs si elles n'existent pas ─────────
    # PostgreSQL : ALTER TYPE ... ADD VALUE IF NOT EXISTS
    for val in ["energie", "depuratif", "sport", "proteine", "graisse", "motivation", "pre_concours"]:
        try:
            op.execute(f"ALTER TYPE ingredientcategory ADD VALUE IF NOT EXISTS '{val}'")
        except Exception:
            pass

    for val in ["recuperation", "entrainement", "pre_panier", "enlogement"]:
        try:
            op.execute(f"ALTER TYPE mixusage ADD VALUE IF NOT EXISTS '{val}'")
        except Exception:
            pass

    for val in ["electrolyte", "vitamine", "probiotique", "autre"]:
        try:
            op.execute(f"ALTER TYPE supplementtype ADD VALUE IF NOT EXISTS '{val}'")
        except Exception:
            pass

    # Créer les types Enum s'ils n'existent pas encore
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ingredientcategory') THEN
                CREATE TYPE ingredientcategory AS ENUM (
                    'energie', 'depuratif', 'sport', 'proteine', 'graisse', 'motivation', 'pre_concours'
                );
            END IF;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'mixusage') THEN
                CREATE TYPE mixusage AS ENUM (
                    'recuperation', 'entrainement', 'pre_panier', 'enlogement'
                );
            END IF;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'supplementtype') THEN
                CREATE TYPE supplementtype AS ENUM (
                    'electrolyte', 'vitamine', 'probiotique', 'autre'
                );
            END IF;
        END $$;
    """)

    # Ajouter colonne category sur feed_ingredients si elle utilise l'enum
    op.execute(
        "ALTER TABLE feed_ingredients ADD COLUMN IF NOT EXISTS description TEXT"
    )

    # Ajouter colonnes usage et description sur feed_mixes
    op.execute("ALTER TABLE feed_mixes ADD COLUMN IF NOT EXISTS usage VARCHAR(30)")
    op.execute("ALTER TABLE feed_mixes ADD COLUMN IF NOT EXISTS description TEXT")

    # Colonnes sur supplements
    op.execute("ALTER TABLE supplements ADD COLUMN IF NOT EXISTS type VARCHAR(30)")
    op.execute("ALTER TABLE supplements ADD COLUMN IF NOT EXISTS description TEXT")
    op.execute("ALTER TABLE supplements ADD COLUMN IF NOT EXISTS dosage VARCHAR(100)")

    # Colonnes sur nutrition_plans
    op.execute("ALTER TABLE nutrition_plans ADD COLUMN IF NOT EXISTS description TEXT")
    op.execute("ALTER TABLE nutrition_plans ADD COLUMN IF NOT EXISTS lundi VARCHAR(200)")
    op.execute("ALTER TABLE nutrition_plans ADD COLUMN IF NOT EXISTS mardi VARCHAR(200)")
    op.execute("ALTER TABLE nutrition_plans ADD COLUMN IF NOT EXISTS mercredi VARCHAR(200)")
    op.execute("ALTER TABLE nutrition_plans ADD COLUMN IF NOT EXISTS jeudi VARCHAR(200)")
    op.execute("ALTER TABLE nutrition_plans ADD COLUMN IF NOT EXISTS vendredi VARCHAR(200)")
    op.execute("ALTER TABLE nutrition_plans ADD COLUMN IF NOT EXISTS samedi VARCHAR(200)")
    op.execute("ALTER TABLE nutrition_plans ADD COLUMN IF NOT EXISTS dimanche VARCHAR(200)")

    # created_at sur toutes les tables sport si absent
    for table in ["training_sessions", "pigeon_training_results", "feed_ingredients",
                  "feed_mixes", "nutrition_plans", "supplements"]:
        op.execute(
            f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now()"
        )


def downgrade() -> None:
    # Supprimer ai_snapshots
    op.execute("DROP TABLE IF EXISTS ai_snapshots")

    # Retirer les colonnes ajoutées sur ai_recommendations
    for col in ["generated_at", "score_forme", "score_endurance", "score_vitesse",
                "score_global", "tendance", "recommendation", "confiance", "facteurs_explicatifs"]:
        try:
            op.execute(f"ALTER TABLE ai_recommendations DROP COLUMN IF EXISTS {col}")
        except Exception:
            pass

    # Retirer colonnes training_sessions
    for col in ["temperature", "wind_speed", "wind_direction"]:
        try:
            op.execute(f"ALTER TABLE training_sessions DROP COLUMN IF EXISTS {col}")
        except Exception:
            pass

    # Retirer colonne return_time
    try:
        op.execute("ALTER TABLE pigeon_training_results DROP COLUMN IF EXISTS return_time")
    except Exception:
        pass

    # Retirer colonne payload de sport_events
    try:
        op.execute("ALTER TABLE sport_events DROP COLUMN IF EXISTS payload")
    except Exception:
        pass
