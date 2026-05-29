"""plan day columns String(200) -> Text

Revision ID: 0011_plan_day_columns_to_text
Revises: 0010_add_ingredient_nutrition
Create Date: 2026-05-29
"""
from alembic import op

revision = '0011_plan_day_columns_to_text'
down_revision = '0010_add_ingredient_nutrition'
branch_labels = None
depends_on = None

DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']


def upgrade() -> None:
    for day in DAYS:
        op.execute(f"ALTER TABLE nutrition_plans ALTER COLUMN {day} TYPE TEXT")


def downgrade() -> None:
    for day in DAYS:
        op.execute(f"ALTER TABLE nutrition_plans ALTER COLUMN {day} TYPE VARCHAR(200) USING {day}::VARCHAR(200)")
