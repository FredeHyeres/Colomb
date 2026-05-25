"""add sport domain

Revision ID: 0001_add_sport_domain
Revises:
Create Date: 2026-05-25

Crée toutes les tables du domaine SPORT :
  training_sessions, pigeon_training_results,
  feed_ingredients, feed_mixes, feed_mix_ingredients,
  nutrition_plans, nutrition_plan_days, supplements
"""

from alembic import op
import sqlalchemy as sa

# Identifiants de migration
revision = "0001_add_sport_domain"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Séances d'entraînement ────────────────────────────────────────────────
    op.create_table(
        "training_sessions",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column(
            "session_type",
            sa.Enum("loft", "toss", "race", name="sessiontype"),
            nullable=False,
        ),
        sa.Column("distance_km", sa.Float(), nullable=True),
        sa.Column("weather", sa.String(100), nullable=True),
        sa.Column("temperature_c", sa.Float(), nullable=True),
        sa.Column("wind", sa.String(100), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_training_sessions_date", "training_sessions", ["date"])

    # ── Résultats par pigeon ──────────────────────────────────────────────────
    op.create_table(
        "pigeon_training_results",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("pigeon_id", sa.String(), sa.ForeignKey("pigeons.id"), nullable=False),
        sa.Column(
            "session_id",
            sa.Integer(),
            sa.ForeignKey("training_sessions.id"),
            nullable=False,
        ),
        sa.Column("return_time_minutes", sa.Float(), nullable=True),
        sa.Column("internal_rank", sa.Integer(), nullable=True),
        sa.Column("recovery_score", sa.Integer(), nullable=True),
        sa.Column("motivation_score", sa.Integer(), nullable=True),
        sa.Column("condition_score", sa.Integer(), nullable=True),
        sa.Column("hydration_score", sa.Integer(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
    )
    op.create_index("ix_ptr_pigeon_id", "pigeon_training_results", ["pigeon_id"])
    op.create_index("ix_ptr_session_id", "pigeon_training_results", ["session_id"])

    # ── Ingrédients alimentaires ──────────────────────────────────────────────
    op.create_table(
        "feed_ingredients",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("name", sa.String(100), nullable=False, unique=True),
        sa.Column("category", sa.String(50), nullable=True),
        sa.Column("protein_pct", sa.Float(), nullable=True),
        sa.Column("fat_pct", sa.Float(), nullable=True),
        sa.Column("carbs_pct", sa.Float(), nullable=True),
        sa.Column("energy_index", sa.Float(), nullable=True),
        sa.Column("digestion_speed", sa.String(20), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
    )

    # ── Mélanges alimentaires ─────────────────────────────────────────────────
    op.create_table(
        "feed_mixes",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("name", sa.String(100), nullable=False, unique=True),
        sa.Column("category", sa.String(50), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
    )

    # ── Composition des mélanges ──────────────────────────────────────────────
    op.create_table(
        "feed_mix_ingredients",
        sa.Column(
            "mix_id",
            sa.Integer(),
            sa.ForeignKey("feed_mixes.id"),
            primary_key=True,
        ),
        sa.Column(
            "ingredient_id",
            sa.Integer(),
            sa.ForeignKey("feed_ingredients.id"),
            primary_key=True,
        ),
        sa.Column("percentage", sa.Float(), nullable=False),
    )

    # ── Plans nutritionnels ───────────────────────────────────────────────────
    op.create_table(
        "nutrition_plans",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("name", sa.String(100), nullable=False, unique=True),
        sa.Column("category", sa.String(50), nullable=True),
        sa.Column("target_type", sa.String(20), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
    )

    # ── Jours des plans nutritionnels ─────────────────────────────────────────
    op.create_table(
        "nutrition_plan_days",
        sa.Column(
            "plan_id",
            sa.Integer(),
            sa.ForeignKey("nutrition_plans.id"),
            primary_key=True,
        ),
        sa.Column("day_of_week", sa.Integer(), primary_key=True),
        sa.Column(
            "mix_id",
            sa.Integer(),
            sa.ForeignKey("feed_mixes.id"),
            nullable=True,
        ),
        sa.Column("quantity_grams", sa.Float(), nullable=True),
        sa.Column("supplements", sa.Text(), nullable=True),
    )

    # ── Suppléments ───────────────────────────────────────────────────────────
    op.create_table(
        "supplements",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("name", sa.String(100), nullable=False, unique=True),
        sa.Column("category", sa.String(50), nullable=True),
        sa.Column("usage_notes", sa.Text(), nullable=True),
        sa.Column("dosage", sa.String(100), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("nutrition_plan_days")
    op.drop_table("nutrition_plans")
    op.drop_table("feed_mix_ingredients")
    op.drop_table("feed_mixes")
    op.drop_table("feed_ingredients")
    op.drop_index("ix_ptr_session_id", table_name="pigeon_training_results")
    op.drop_index("ix_ptr_pigeon_id", table_name="pigeon_training_results")
    op.drop_table("pigeon_training_results")
    op.drop_index("ix_training_sessions_date", table_name="training_sessions")
    op.drop_table("training_sessions")
    op.drop_table("supplements")
    # Supprimer l'enum PostgreSQL
    sa.Enum(name="sessiontype").drop(op.get_bind(), checkfirst=True)
