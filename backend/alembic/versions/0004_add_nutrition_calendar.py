"""add nutrition calendar

Revision ID: 0004_add_nutrition_calendar
Revises: 0003_refactor_sport_ai_models
Create Date: 2026-05-26

Modifications :
  - ALTER nutrition_plans : ajoute goal, composition
  - CREATE TABLE nutrition_assignments (calendrier hebdomadaire)
"""

from alembic import op
import sqlalchemy as sa

revision = "0004_add_nutrition_calendar"
down_revision = "0003_refactor_sport_ai_models"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── nutrition_plans : nouvelles colonnes ──────────────────────────────────
    op.execute("ALTER TABLE nutrition_plans ADD COLUMN IF NOT EXISTS goal VARCHAR(100)")
    op.execute("ALTER TABLE nutrition_plans ADD COLUMN IF NOT EXISTS composition TEXT")

    # ── nutrition_assignments : nouvelle table ────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS nutrition_assignments (
            id SERIAL PRIMARY KEY,
            plan_id INTEGER NOT NULL REFERENCES nutrition_plans(id) ON DELETE CASCADE,
            pigeon_id VARCHAR REFERENCES pigeons(id) ON DELETE CASCADE,
            group_name VARCHAR(50),
            day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
            week_start DATE NOT NULL,
            created_at TIMESTAMPTZ DEFAULT now()
        )
    """)
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_nutr_assign_pigeon ON nutrition_assignments (pigeon_id, week_start)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_nutr_assign_group ON nutrition_assignments (group_name, week_start)"
    )
    # Contraintes unicité : 1 plan par pigeon+jour+semaine et 1 plan par groupe+jour+semaine
    op.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS uq_nutr_assign_pigeon
        ON nutrition_assignments (pigeon_id, day_of_week, week_start)
        WHERE pigeon_id IS NOT NULL
    """)
    op.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS uq_nutr_assign_group
        ON nutrition_assignments (group_name, day_of_week, week_start)
        WHERE group_name IS NOT NULL AND pigeon_id IS NULL
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS nutrition_assignments")
    try:
        op.execute("ALTER TABLE nutrition_plans DROP COLUMN IF EXISTS goal")
        op.execute("ALTER TABLE nutrition_plans DROP COLUMN IF EXISTS composition")
    except Exception:
        pass
