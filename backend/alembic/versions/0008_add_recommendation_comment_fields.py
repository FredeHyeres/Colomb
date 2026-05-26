"""Add title, message, action to ai_recommendations

Revision ID: 0008_add_recommendation_comment_fields
Revises: 0007_refactor_nutrition_assignments
Create Date: 2026-05-26
"""
from alembic import op
import sqlalchemy as sa

revision = "0008_add_recommendation_comment_fields"
down_revision = "0007_refactor_nutrition_assignments"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("ai_recommendations", sa.Column("title",   sa.String(120), nullable=True))
    op.add_column("ai_recommendations", sa.Column("message", sa.Text(),       nullable=True))
    op.add_column("ai_recommendations", sa.Column("action",  sa.Text(),       nullable=True))


def downgrade():
    op.drop_column("ai_recommendations", "action")
    op.drop_column("ai_recommendations", "message")
    op.drop_column("ai_recommendations", "title")
