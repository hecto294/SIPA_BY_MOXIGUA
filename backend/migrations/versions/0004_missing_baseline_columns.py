"""añade columnas del 0001_baseline.sql que faltaban en el esquema real

Revision ID: 0004_missing_baseline_columns
Revises: 0003_reconciliacion_esquema
Create Date: 2026-11-07

Contexto
--------
El diagnóstico de Fase 4 (``alembic check``) reveló que 6 columnas que
``0001_baseline.sql`` declara NO existen en la base de datos real:

  - procesos_etapa_productiva.nota_empresa       NUMERIC(3,1)
  - procesos_etapa_productiva.nota_instructor    NUMERIC(3,1)
  - empresas.arl                                  VARCHAR(100)
  - fichas.nivel                                  VARCHAR(50) DEFAULT 'Tecnólogo'
  - fichas.jornada                                VARCHAR(50) DEFAULT 'Mañana'
  - fichas.aprendices_esperados                   INTEGER DEFAULT 0

Motivo probable: la ``sipa_db`` original se creó con una versión ANTERIOR
del ``script_completo.sql`` que no las tenía, y el ``stamp 0002_sync_modelos``
heredado las dio por aplicadas sin serlo.

Impacto funcional
-----------------
Sin estas columnas, fallan:
  - POST /empresas (envía ``arl``)
  - POST /fichas (envía ``nivel``, ``jornada``, ``aprendices_esperados``)
  - PATCH /procesos/{id}/evaluacion (envía ``nota_empresa``, ``nota_instructor``)
  - GET /fichas, /empresas, /procesos (SELECT * incluye estas columnas)

Estrategia
----------
* Idempotente: comprueba con ``sa.inspect`` antes de cada ``ALTER TABLE``.
* No destructiva: solo ``ADD COLUMN``. No hay downgrade automático.
* ``created_at``/``updated_at`` NO se tocan aquí (el drift de nullability
  es cosmético y se resolverá en una migración separada si hace falta).
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import context, op

revision: str = "0004_missing_baseline_columns"
down_revision: Union[str, None] = "0003_reconciliacion_esquema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

S = "etapa_productiva"


def _tiene_columna(tabla: str, columna: str) -> bool:
    cols = sa.inspect(op.get_bind()).get_columns(tabla, schema=S)
    return any(c["name"] == columna for c in cols)


def upgrade() -> None:
    if context.is_offline_mode():
        raise RuntimeError(
            "0004_missing_baseline_columns inspecciona la base de datos y no "
            "admite el modo --sql (offline)."
        )

    # --- procesos_etapa_productiva.nota_empresa / nota_instructor ---
    if not _tiene_columna("procesos_etapa_productiva", "nota_empresa"):
        op.execute(
            f"ALTER TABLE {S}.procesos_etapa_productiva "
            f"ADD COLUMN nota_empresa NUMERIC(3,1) "
            f"CHECK (nota_empresa BETWEEN 0 AND 10)"
        )
    if not _tiene_columna("procesos_etapa_productiva", "nota_instructor"):
        op.execute(
            f"ALTER TABLE {S}.procesos_etapa_productiva "
            f"ADD COLUMN nota_instructor NUMERIC(3,1) "
            f"CHECK (nota_instructor BETWEEN 0 AND 10)"
        )

    # --- empresas.arl ---
    if not _tiene_columna("empresas", "arl"):
        op.execute(f"ALTER TABLE {S}.empresas ADD COLUMN arl VARCHAR(100)")

    # --- fichas.nivel / jornada / aprendices_esperados ---
    if not _tiene_columna("fichas", "nivel"):
        op.execute(
            f"ALTER TABLE {S}.fichas "
            f"ADD COLUMN nivel VARCHAR(50) DEFAULT 'Tecnólogo'"
        )
    if not _tiene_columna("fichas", "jornada"):
        op.execute(
            f"ALTER TABLE {S}.fichas "
            f"ADD COLUMN jornada VARCHAR(50) DEFAULT 'Mañana'"
        )
    if not _tiene_columna("fichas", "aprendices_esperados"):
        op.execute(
            f"ALTER TABLE {S}.fichas "
            f"ADD COLUMN aprendices_esperados INTEGER DEFAULT 0"
        )


def downgrade() -> None:
    # DESTRUCTIVO: eliminar columnas borra datos.
    import os
    if os.getenv("ALEMBIC_ALLOW_DESTRUCTIVE_DOWNGRADE") != "1":
        raise RuntimeError(
            "El downgrade de 0004_missing_baseline_columns ELIMINA 6 columnas "
            "con todos sus datos (notas de evaluación, ARL de empresas, "
            "metadatos de fichas). Restaure un respaldo. Si está seguro, "
            "repita con ALEMBIC_ALLOW_DESTRUCTIVE_DOWNGRADE=1."
        )
    op.execute(f"ALTER TABLE {S}.fichas DROP COLUMN IF EXISTS aprendices_esperados")
    op.execute(f"ALTER TABLE {S}.fichas DROP COLUMN IF EXISTS jornada")
    op.execute(f"ALTER TABLE {S}.fichas DROP COLUMN IF EXISTS nivel")
    op.execute(f"ALTER TABLE {S}.empresas DROP COLUMN IF EXISTS arl")
    op.execute(f"ALTER TABLE {S}.procesos_etapa_productiva DROP COLUMN IF EXISTS nota_instructor")
    op.execute(f"ALTER TABLE {S}.procesos_etapa_productiva DROP COLUMN IF EXISTS nota_empresa")