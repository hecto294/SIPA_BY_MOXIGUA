"""baseline: esquema etapa_productiva equivalente a script_completo.sql

Revision ID: 0001_baseline
Revises:
Create Date: 2026-10-24

Qué hace
--------   
Crea desde cero el esquema documentado en ``backend/script_completo.sql``
(12 tipos ENUM, función set_updated_at, 20 tablas, índices y triggers) más
los datos de referencia de ``roles`` y ``modalidades_ep``.

Por qué se ejecuta SQL en lugar de ``op.create_table``
------------------------------------------------------
* El DDL ya fue escrito y probado por el equipo; copiarlo evita errores de
  retranscripción en 20 tablas.
* ``autogenerate`` no sabe representar funciones ni triggers PL/pgSQL.
* El CHECK del email contiene un ``%``; por eso se usa el cursor DBAPI
  directo (sin interpolación de parámetros) y no ``op.execute``.

Bases de datos que YA tienen estas tablas
-----------------------------------------
NO ejecutar ``upgrade`` sobre ellas: fallaría con "type already exists".
Se adoptan con ``alembic stamp 0001_baseline`` DESPUÉS de verificar el
esquema con ``backend/scripts/verificar_esquema.sql`` (ver docs/ALEMBIC.md).
"""
import os
from pathlib import Path
from typing import Sequence, Union

from alembic import context, op

revision: str = "0001_baseline"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_SQL_BASELINE = Path(__file__).resolve().parent.parent / "sql" / "0001_baseline.sql"


def upgrade() -> None:
    if context.is_offline_mode():
        raise RuntimeError(
            "0001_baseline no admite el modo --sql (offline). "
            "Aplíquela con 'alembic upgrade head' contra una base de datos."
        )

    sql = _SQL_BASELINE.read_text(encoding="utf-8")

    # Cursor DBAPI sobre la MISMA conexión/transacción de Alembic:
    # sin parámetros, psycopg2 no interpreta los '%' del script y acepta
    # varias sentencias (incluido el cuerpo $$...$$ de la función).
    cursor = op.get_bind().connection.cursor()
    try:
        cursor.execute(sql)
    finally:
        cursor.close()


def downgrade() -> None:
    # Revertir el baseline equivale a borrar TODO el esquema y sus datos.
    # Se bloquea a propósito. Para volver atrás: restaurar un respaldo.
    raise RuntimeError(
        "0001_baseline es irreversible: su downgrade borraría todo el esquema "
        "etapa_productiva con sus datos. Restaure un respaldo de la base de datos."
    )
