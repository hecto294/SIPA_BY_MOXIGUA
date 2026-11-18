"""
Ajustes automáticos de la base de datos al iniciar el backend.

Hace que una base de datos ya existente (creada con una versión anterior)
funcione con el código actual, sin tener que ejecutar nada a mano:
  - agrega las columnas nuevas de procesos_etapa_productiva
  - quita el NOT NULL de columnas antiguas ("password", "rol") que ya no se usan
Es idempotente: se puede ejecutar en cada arranque.
"""
import logging
from sqlalchemy import text
from app.core.database import engine

logger = logging.getLogger(__name__)

SCHEMA = "etapa_productiva"

COLUMNAS_NUEVAS = [
    "ALTER TABLE {s}.procesos_etapa_productiva ADD COLUMN IF NOT EXISTS raps_pendientes INTEGER",
    "ALTER TABLE {s}.procesos_etapa_productiva ADD COLUMN IF NOT EXISTS porcentaje_raps NUMERIC(5,2)",
    "ALTER TABLE {s}.procesos_etapa_productiva ADD COLUMN IF NOT EXISTS fecha_inicio_contrato DATE",
    "ALTER TABLE {s}.procesos_etapa_productiva ADD COLUMN IF NOT EXISTS fecha_fin_contrato DATE",
]


def run_auto_migrate() -> None:
    for sql in COLUMNAS_NUEVAS:
        try:
            with engine.begin() as c:
                c.execute(text(sql.format(s=SCHEMA)))
        except Exception as exc:  # la tabla puede no existir aún
            logger.warning("auto_migrate: %s", exc)

    # Columnas antiguas de usuarios que ya no usa el modelo
    try:
        with engine.begin() as c:
            antiguas = c.execute(text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_schema=:s AND table_name='usuarios' "
                "AND column_name IN ('password','rol') AND is_nullable='NO'"
            ), {"s": SCHEMA}).fetchall()
            for (col,) in antiguas:
                c.execute(text(f'ALTER TABLE {SCHEMA}.usuarios ALTER COLUMN "{col}" DROP NOT NULL'))
    except Exception as exc:
        logger.warning("auto_migrate usuarios: %s", exc)


    # Datos vacíos que hacen fallar listados o dejan celdas en blanco
    arreglos = [
        "ALTER TABLE {s}.usuarios ALTER COLUMN preferencias_ui SET DEFAULT '{{}}'",
        "UPDATE {s}.usuarios SET preferencias_ui='{{}}' WHERE preferencias_ui IS NULL",
        "UPDATE {s}.usuarios SET created_at=now() WHERE created_at IS NULL",
        "UPDATE {s}.usuarios SET updated_at=now() WHERE updated_at IS NULL",
        "UPDATE {s}.fichas SET nivel='Tecnólogo' WHERE nivel IS NULL OR nivel=''",
        "UPDATE {s}.fichas SET jornada='Mañana' WHERE jornada IS NULL OR jornada=''",
        "UPDATE {s}.fichas SET aprendices_esperados=0 WHERE aprendices_esperados IS NULL",
    ]
    for sql in arreglos:
        try:
            with engine.begin() as c:
                c.execute(text(sql.format(s=SCHEMA)))
        except Exception as exc:
            logger.warning("auto_migrate datos: %s", exc)
