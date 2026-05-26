"""add mix composition

Revision ID: 0005_add_mix_composition
Revises: 0004_add_nutrition_calendar
Create Date: 2026-05-26
"""
from alembic import op

revision = '0005_add_mix_composition'
down_revision = '0004_add_nutrition_calendar'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE feed_mixes ADD COLUMN IF NOT EXISTS composition TEXT")


def downgrade() -> None:
    op.execute("ALTER TABLE feed_mixes DROP COLUMN IF EXISTS composition")
