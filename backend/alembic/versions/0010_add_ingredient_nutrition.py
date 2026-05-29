"""add nutritional values to feed_ingredients

Revision ID: 0010_add_ingredient_nutrition
Revises: 0009_add_outcome_and_concours_feedback
Create Date: 2026-05-29
"""
from alembic import op

revision = '0010_add_ingredient_nutrition'
down_revision = '0009_add_outcome_and_concours_feedback'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE feed_ingredients ADD COLUMN IF NOT EXISTS proteines_pct  FLOAT")
    op.execute("ALTER TABLE feed_ingredients ADD COLUMN IF NOT EXISTS lipides_pct     FLOAT")
    op.execute("ALTER TABLE feed_ingredients ADD COLUMN IF NOT EXISTS glucides_pct    FLOAT")
    op.execute("ALTER TABLE feed_ingredients ADD COLUMN IF NOT EXISTS energie_kcal    FLOAT")
    op.execute("ALTER TABLE feed_ingredients ADD COLUMN IF NOT EXISTS notes_eleveurs  TEXT")


def downgrade() -> None:
    op.execute("ALTER TABLE feed_ingredients DROP COLUMN IF EXISTS proteines_pct")
    op.execute("ALTER TABLE feed_ingredients DROP COLUMN IF EXISTS lipides_pct")
    op.execute("ALTER TABLE feed_ingredients DROP COLUMN IF EXISTS glucides_pct")
    op.execute("ALTER TABLE feed_ingredients DROP COLUMN IF EXISTS energie_kcal")
    op.execute("ALTER TABLE feed_ingredients DROP COLUMN IF EXISTS notes_eleveurs")
