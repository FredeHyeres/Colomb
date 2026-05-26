"""refactor nutrition_assignments — nouveau modèle période

Revision ID: 0007_refactor_nutrition_assignments
Revises: 0006_add_plan_mix_id
Create Date: 2026-05-26

Remplace la table nutrition_assignments (structure par jour/semaine)
par un modèle basé sur des périodes (date_debut / date_fin) avec
priorité individuel > groupe.
"""

from alembic import op

revision = "0007_refactor_nutrition_assignments"
down_revision = "0006_add_plan_mix_id"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Supprimer l'ancienne table et ses index
    op.execute("DROP TABLE IF EXISTS nutrition_assignments CASCADE")

    # Créer la nouvelle table
    op.execute("""
        CREATE TABLE nutrition_assignments (
            id           SERIAL PRIMARY KEY,
            pigeon_id    VARCHAR NOT NULL REFERENCES pigeons(id) ON DELETE CASCADE,
            plan_id      INTEGER NOT NULL REFERENCES nutrition_plans(id) ON DELETE CASCADE,
            date_debut   DATE NOT NULL,
            date_fin     DATE,
            is_individual BOOLEAN NOT NULL DEFAULT FALSE,
            groupe       VARCHAR(50),
            created_at   TIMESTAMPTZ DEFAULT now()
        )
    """)

    op.execute(
        "CREATE INDEX ix_nutr_aff_pigeon ON nutrition_assignments (pigeon_id)"
    )
    op.execute(
        "CREATE INDEX ix_nutr_aff_dates ON nutrition_assignments (date_debut, date_fin)"
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS nutrition_assignments CASCADE")

    op.execute("""
        CREATE TABLE nutrition_assignments (
            id           SERIAL PRIMARY KEY,
            plan_id      INTEGER NOT NULL REFERENCES nutrition_plans(id) ON DELETE CASCADE,
            pigeon_id    VARCHAR REFERENCES pigeons(id) ON DELETE CASCADE,
            group_name   VARCHAR(50),
            day_of_week  INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
            week_start   DATE NOT NULL,
            created_at   TIMESTAMPTZ DEFAULT now()
        )
    """)
