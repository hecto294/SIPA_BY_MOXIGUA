"""agrega columnas de RAPs y fechas de contrato a procesos_etapa_productiva

Revision ID: 0006_columnas_procesos_raps
Revises: 0005_add_cancelado
Create Date: 2026-11-19

Estas columnas las creaba app/core/auto_migrate.py al arrancar el backend.
Ahora las gestiona Alembic. Es idempotente: en bases donde auto_migrate ya
las creó, no hace nada.
"""
import os
from typing import Sequence, Union

from alembic import context, op

revision: str = "0006_columnas_procesos_raps"
down_revision: Union[str, None] = "0005_add_cancelado"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

S = "etapa_productiva"
T = f"{S}.procesos_etapa_productiva"


def upgrade() -> None:
    if context.is_offline_mode():
        raise RuntimeError("0006_columnas_procesos_raps no admite el modo --sql (offline).")
    op.execute(f"ALTER TABLE {T} ADD COLUMN IF NOT EXISTS raps_pendientes INTEGER")
    op.execute(f"ALTER TABLE {T} ADD COLUMN IF NOT EXISTS porcentaje_raps NUMERIC(5,2)")
    op.execute(f"ALTER TABLE {T} ADD COLUMN IF NOT EXISTS fecha_inicio_contrato DATE")
    op.execute(f"ALTER TABLE {T} ADD COLUMN IF NOT EXISTS fecha_fin_contrato DATE")


def downgrade() -> None:
    if os.getenv("ALEMBIC_ALLOW_DESTRUCTIVE_DOWNGRADE") != "1":
        raise RuntimeError(
            "El downgrade de 0006_columnas_procesos_raps ELIMINA 4 columnas con sus "
            "datos. Haga un respaldo y, si está seguro, repita con "
            "ALEMBIC_ALLOW_DESTRUCTIVE_DOWNGRADE=1."
        )
    op.execute(f"ALTER TABLE {T} DROP COLUMN IF EXISTS fecha_fin_contrato")
    op.execute(f"ALTER TABLE {T} DROP COLUMN IF EXISTS fecha_inicio_contrato")
    op.execute(f"ALTER TABLE {T} DROP COLUMN IF EXISTS porcentaje_raps")
    op.execute(f"ALTER TABLE {T} DROP COLUMN IF EXISTS raps_pendientes")
