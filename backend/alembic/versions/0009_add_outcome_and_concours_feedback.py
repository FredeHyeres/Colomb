"""Add outcome fields to ai_recommendations and create concours_feedback table

Revision ID: 0009_add_outcome_and_concours_feedback
Revises: 0008_add_recommendation_comment_fields
Create Date: 2026-05-26
"""
from alembic import op
import sqlalchemy as sa

revision = "0009_add_outcome_and_concours_feedback"
down_revision = "0008_add_recommendation_comment_fields"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("ai_recommendations", sa.Column("resolved_at",    sa.DateTime(timezone=True), nullable=True))
    op.add_column("ai_recommendations", sa.Column("outcome",        sa.String(30),               nullable=True))
    op.add_column("ai_recommendations", sa.Column("outcome_notes",  sa.Text(),                   nullable=True))
    op.add_column("ai_recommendations", sa.Column("outcome_date",   sa.Date(),                   nullable=True))

    op.create_table(
        "concours_feedback",
        sa.Column("id",               sa.Integer(),               primary_key=True, autoincrement=True),
        sa.Column("pigeon_id",        sa.String(),                sa.ForeignKey("pigeons.id"),           nullable=False),
        sa.Column("snapshot_id",      sa.Integer(),               sa.ForeignKey("ai_snapshots.id"),      nullable=True),
        sa.Column("recommendation_id",sa.Integer(),               sa.ForeignKey("ai_recommendations.id"),nullable=True),
        sa.Column("concours_date",    sa.Date(),                  nullable=False),
        sa.Column("distance_km",      sa.Float(),                 nullable=True),
        sa.Column("conditions_meteo", sa.String(50),              nullable=True),
        sa.Column("outcome",          sa.String(30),              nullable=False),
        sa.Column("classement",       sa.Integer(),               nullable=True),
        sa.Column("vitesse_mpm",      sa.Float(),                 nullable=True),
        sa.Column("nb_engages",       sa.Integer(),               nullable=True),
        sa.Column("notes",            sa.Text(),                  nullable=True),
        sa.Column("share_anonymized", sa.Boolean(),               nullable=False, server_default="false"),
        sa.Column("created_at",       sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_concours_feedback_pigeon_id",    "concours_feedback", ["pigeon_id"])
    op.create_index("ix_concours_feedback_concours_date","concours_feedback", ["concours_date"])


def downgrade():
    op.drop_index("ix_concours_feedback_concours_date", table_name="concours_feedback")
    op.drop_index("ix_concours_feedback_pigeon_id",     table_name="concours_feedback")
    op.drop_table("concours_feedback")
    op.drop_column("ai_recommendations", "outcome_date")
    op.drop_column("ai_recommendations", "outcome_notes")
    op.drop_column("ai_recommendations", "outcome")
    op.drop_column("ai_recommendations", "resolved_at")
