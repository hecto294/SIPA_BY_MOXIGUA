"""agrega el valor CANCELADO a estado_proceso_t en bases nuevas

Revision ID: 0005_add_cancelado
Revises: 0004_missing_baseline_columns
Create Date: 2026-11-19
"""
from typing import Sequence, Union

from alembic import context, op

revision: str = "0005_add_cancelado"
down_revision: Union[str, None] = "0004_missing_baseline_columns"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    if context.is_offline_mode():
        raise RuntimeError("0005_add_cancelado no admite el modo --sql (offline).")
    op.execute(
        "ALTER TYPE etapa_productiva.estado_proceso_t "
        "ADD VALUE IF NOT EXISTS 'CANCELADO'"
    )


def downgrade() -> None:
    # PostgreSQL no permite quitar un valor de un ENUM: no hay nada que revertir.
    pass
