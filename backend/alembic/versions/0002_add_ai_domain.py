"""add ai domain

Revision ID: 0002_add_ai_domain
Revises: 0001_add_sport_domain
Create Date: 2026-05-25

Crée les tables du domaine IA :
  ai_recommendations, ai_training_snapshots, sport_events
"""

from alembic import op
import sqlalchemy as sa

# Identifiants de migration
revision = "0002_add_ai_domain"
down_revision = "0001_add_sport_domain"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Recommandations IA ────────────────────────────────────────────────────
    op.create_table(
        "ai_recommendations",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("pigeon_id", sa.String(), sa.ForeignKey("pigeons.id"), nullable=False),
        sa.Column("recommendation_type", sa.String(50), nullable=False),
        sa.Column("severity", sa.String(20), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("source", sa.String(50), nullable=False, server_default="expert_rules"),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("resolved", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.create_index("ix_ai_rec_pigeon_id", "ai_recommendations", ["pigeon_id"])
    op.create_index("ix_ai_rec_pigeon_resolved", "ai_recommendations", ["pigeon_id", "resolved"])

    # ── Snapshots sportifs ────────────────────────────────────────────────────
    op.create_table(
        "ai_training_snapshots",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("pigeon_id", sa.String(), sa.ForeignKey("pigeons.id"), nullable=False),
        sa.Column("snapshot_date", sa.Date(), nullable=False),
        sa.Column("age_days", sa.Integer(), nullable=True),
        sa.Column("training_load_7d", sa.Float(), nullable=True),
        sa.Column("training_load_30d", sa.Float(), nullable=True),
        sa.Column("recovery_avg_7d", sa.Float(), nullable=True),
        sa.Column("condition_avg_7d", sa.Float(), nullable=True),
        sa.Column("hydration_avg_7d", sa.Float(), nullable=True),
        sa.Column("nutrition_energy_avg", sa.Float(), nullable=True),
        sa.Column("nutrition_protein_avg", sa.Float(), nullable=True),
        sa.Column("nutrition_fat_avg", sa.Float(), nullable=True),
        sa.Column("average_temperature", sa.Float(), nullable=True),
        sa.Column("average_humidity", sa.Float(), nullable=True),
        sa.Column("wind_exposure_index", sa.Float(), nullable=True),
        sa.Column("upcoming_race_distance", sa.Float(), nullable=True),
        sa.Column("regularity_index", sa.Float(), nullable=True),
        sa.Column("recovery_index", sa.Float(), nullable=True),
        sa.Column("condition_index", sa.Float(), nullable=True),
        sa.Column("performance_label", sa.String(20), nullable=True),
    )
    op.create_index("ix_ai_snapshot_pigeon_id", "ai_training_snapshots", ["pigeon_id"])
    op.create_index("ix_ai_snapshot_date", "ai_training_snapshots", ["snapshot_date"])
    op.create_index("ix_ai_snapshot_pigeon_date", "ai_training_snapshots", ["pigeon_id", "snapshot_date"])

    # ── Événements sportifs ───────────────────────────────────────────────────
    op.create_table(
        "sport_events",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("pigeon_id", sa.String(), sa.ForeignKey("pigeons.id"), nullable=False),
        sa.Column("event_type", sa.String(50), nullable=False),
        sa.Column("event_date", sa.Date(), nullable=False),
        sa.Column("payload_json", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_sport_event_pigeon_id", "sport_events", ["pigeon_id"])
    op.create_index("ix_sport_event_date", "sport_events", ["event_date"])
    op.create_index(
        "ix_sport_event_pigeon_type_date",
        "sport_events",
        ["pigeon_id", "event_type", "event_date"],
    )


def downgrade() -> None:
    op.drop_index("ix_sport_event_pigeon_type_date", table_name="sport_events")
    op.drop_index("ix_sport_event_date", table_name="sport_events")
    op.drop_index("ix_sport_event_pigeon_id", table_name="sport_events")
    op.drop_table("sport_events")

    op.drop_index("ix_ai_snapshot_pigeon_date", table_name="ai_training_snapshots")
    op.drop_index("ix_ai_snapshot_date", table_name="ai_training_snapshots")
    op.drop_index("ix_ai_snapshot_pigeon_id", table_name="ai_training_snapshots")
    op.drop_table("ai_training_snapshots")

    op.drop_index("ix_ai_rec_pigeon_resolved", table_name="ai_recommendations")
    op.drop_index("ix_ai_rec_pigeon_id", table_name="ai_recommendations")
    op.drop_table("ai_recommendations")
