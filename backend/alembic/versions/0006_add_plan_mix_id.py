"""add plan mix_id

Revision ID: 0006_add_plan_mix_id
Revises: 0005_add_mix_composition
Create Date: 2026-05-26
"""
from alembic import op

revision = '0006_add_plan_mix_id'
down_revision = '0005_add_mix_composition'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE nutrition_plans "
        "ADD COLUMN IF NOT EXISTS mix_id INTEGER REFERENCES feed_mixes(id) ON DELETE SET NULL"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE nutrition_plans DROP COLUMN IF EXISTS mix_id")
