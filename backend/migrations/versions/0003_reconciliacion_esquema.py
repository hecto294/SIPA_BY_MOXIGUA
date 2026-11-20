"""reconciliación: corrige el drift entre 0001/0002 y el esquema real de sipa_db

Revision ID: 0003_reconciliacion_esquema
Revises: 0002_sync_modelos
Create Date: 2026-11-07

Contexto
--------
La base de datos ``sipa_db`` tenía ``alembic_version = 0002_sync_modelos``
pero el esquema real NO coincidía con lo que 0001+0002 representaban. El
diagnóstico de Fase 1 (todas las consultas quedaron documentadas en el chat)
reveló las siguientes diferencias verificadas:

ENUMs que faltaban por completo (4):
  - tipo_documento_t          ('TI', 'CC', 'CE', 'PTE')
  - estado_documento_t        ('ENTREGADO', 'PENDIENTE', 'NO_APLICA')
  - estado_medida_formativa_t ('SI', 'NO', 'PENDIENTE')
  - estado_correo_desercion_t ('ENVIADO', 'PENDIENTE', 'NO_APLICA')

ENUM incompleto (1):
  - estado_proceso_t: faltaba 'RETIRADO'. La BD tenía 'CANCELADO' extra
    (heredado). El modelo ya declara ambos para mantener simetría.

Columnas faltantes en ``usuarios`` (4):
  - tipo_documento        (etapa_productiva.tipo_documento_t)
  - preferencias_ui       (JSONB NOT NULL DEFAULT '{}')
  - reset_code            (VARCHAR(6))
  - reset_code_expires_at (TIMESTAMPTZ)

Tablas que no existían (3):
  - novedades_proceso
  - checklist_documentos_proceso
  - medidas_formativas_proceso

Triggers faltantes (4):
  - trg_roles_updated_at
  - trg_novedades_updated_at
  - trg_checklist_updated_at
  - trg_medidas_updated_at

Datos de referencia faltantes:
  - roles: ids 3 (Instructor), 5 (Apoyo Administrativo), 6 (Consulta)
  - modalidades_ep: 'Economía popular'

Estrategia
----------
* Todo se hace con ``IF NOT EXISTS`` / ``DO $$ ... EXCEPTION duplicate_object``
  / chequeos con ``sa.inspect``. No se borra nada.
* No se renombran datos existentes (las 5 modalidades actuales conservan
  su nombre; unificarlas es una decisión de negocio separada).
* Esta migración es IRREVERSIBLE. El downgrade está bloqueado con una
  variable de entorno explícita (ALEMBIC_ALLOW_DESTRUCTIVE_DOWNGRADE=1).

Estado de verificación
----------------------
Escrita contra el estado real de ``sipa_db`` documentado en el chat. NO
ejecutada por el autor. Aplicar con ``alembic upgrade head`` después de un
respaldo (``pg_dump -Fc``) y verificar con ``alembic current`` + ``alembic check``.
"""
import os
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import context, op

revision: str = "0003_reconciliacion_esquema"
down_revision: Union[str, None] = "0002_sync_modelos"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

S = "etapa_productiva"


# ---------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------
def _tiene_tabla(nombre: str) -> bool:
    # Inspector nuevo en cada llamada (Inspector cachea resultados).
    return sa.inspect(op.get_bind()).has_table(nombre, schema=S)


def _tiene_columna(tabla: str, columna: str) -> bool:
    cols = sa.inspect(op.get_bind()).get_columns(tabla, schema=S)
    return any(c["name"] == columna for c in cols)


# ---------------------------------------------------------------
# upgrade
# ---------------------------------------------------------------
def upgrade() -> None:
    if context.is_offline_mode():
        raise RuntimeError(
            "0003_reconciliacion_esquema inspecciona la base de datos y no "
            "admite el modo --sql (offline)."
        )

    # ========================================================
    # 1. ENUMs faltantes (idempotentes con EXCEPTION WHEN duplicate_object)
    # ========================================================
    op.execute(
        f"DO $$ BEGIN "
        f"CREATE TYPE {S}.tipo_documento_t AS ENUM ('TI', 'CC', 'CE', 'PTE'); "
        f"EXCEPTION WHEN duplicate_object THEN NULL; END $$;"
    )
    op.execute(
        f"DO $$ BEGIN "
        f"CREATE TYPE {S}.estado_documento_t AS ENUM ('ENTREGADO', 'PENDIENTE', 'NO_APLICA'); "
        f"EXCEPTION WHEN duplicate_object THEN NULL; END $$;"
    )
    op.execute(
        f"DO $$ BEGIN "
        f"CREATE TYPE {S}.estado_medida_formativa_t AS ENUM ('SI', 'NO', 'PENDIENTE'); "
        f"EXCEPTION WHEN duplicate_object THEN NULL; END $$;"
    )
    op.execute(
        f"DO $$ BEGIN "
        f"CREATE TYPE {S}.estado_correo_desercion_t AS ENUM ('ENVIADO', 'PENDIENTE', 'NO_APLICA'); "
        f"EXCEPTION WHEN duplicate_object THEN NULL; END $$;"
    )

    # ========================================================
    # 2. ENUM estado_proceso_t: añadir 'RETIRADO'
    #    (PostgreSQL 12+ permite ADD VALUE dentro de una transacción; PG 16 OK)
    # ========================================================
    op.execute(
        f"ALTER TYPE {S}.estado_proceso_t ADD VALUE IF NOT EXISTS 'RETIRADO'"
    )

    # ========================================================
    # 3. Columnas faltantes en usuarios
    # ========================================================
    if not _tiene_columna("usuarios", "tipo_documento"):
        op.execute(
            f"ALTER TABLE {S}.usuarios "
            f"ADD COLUMN tipo_documento {S}.tipo_documento_t"
        )
    if not _tiene_columna("usuarios", "preferencias_ui"):
        op.execute(
            f"ALTER TABLE {S}.usuarios "
            f"ADD COLUMN preferencias_ui JSONB NOT NULL DEFAULT '{{}}'::jsonb"
        )
    if not _tiene_columna("usuarios", "reset_code"):
        op.execute(
            f"ALTER TABLE {S}.usuarios ADD COLUMN reset_code VARCHAR(6)"
        )
    if not _tiene_columna("usuarios", "reset_code_expires_at"):
        op.execute(
            f"ALTER TABLE {S}.usuarios "
            f"ADD COLUMN reset_code_expires_at TIMESTAMPTZ"
        )

    # ========================================================
    # 4. Tablas faltantes (DDL idéntico al baseline 0001)
    # ========================================================

    # 4.1 novedades_proceso
    if not _tiene_tabla("novedades_proceso"):
        op.execute(
            f"""
            CREATE TABLE {S}.novedades_proceso (
                id BIGSERIAL PRIMARY KEY,
                proceso_id BIGINT NOT NULL,
                tipo_novedad {S}.tipo_novedad_t NOT NULL,
                fecha_novedad DATE NOT NULL,
                descripcion TEXT NOT NULL,
                documento_soporte_url VARCHAR(500),
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                deleted_at TIMESTAMPTZ,
                CONSTRAINT fk_novedad_proceso
                    FOREIGN KEY (proceso_id)
                    REFERENCES {S}.procesos_etapa_productiva(id)
                    ON DELETE CASCADE
            )
            """
        )
        op.execute(
            f"CREATE INDEX idx_novedades_proceso "
            f"ON {S}.novedades_proceso (proceso_id)"
        )

    # 4.2 checklist_documentos_proceso
    if not _tiene_tabla("checklist_documentos_proceso"):
        op.execute(
            f"""
            CREATE TABLE {S}.checklist_documentos_proceso (
                id BIGSERIAL PRIMARY KEY,
                proceso_id BIGINT NOT NULL
                    REFERENCES {S}.procesos_etapa_productiva(id) ON DELETE CASCADE,
                tipo_documento VARCHAR(50) NOT NULL,
                estado {S}.estado_documento_t NOT NULL DEFAULT 'PENDIENTE',
                evidencia_archivo_id BIGINT
                    REFERENCES {S}.evidencias_archivos(id) ON DELETE SET NULL,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                deleted_at TIMESTAMPTZ,
                CONSTRAINT uq_checklist_proceso_tipo
                    UNIQUE (proceso_id, tipo_documento)
            )
            """
        )
        op.execute(
            f"CREATE INDEX idx_checklist_proceso "
            f"ON {S}.checklist_documentos_proceso (proceso_id)"
        )

    # 4.3 medidas_formativas_proceso
    if not _tiene_tabla("medidas_formativas_proceso"):
        op.execute(
            f"""
            CREATE TABLE {S}.medidas_formativas_proceso (
                id BIGSERIAL PRIMARY KEY,
                proceso_id BIGINT NOT NULL
                    REFERENCES {S}.procesos_etapa_productiva(id) ON DELETE CASCADE,
                llamado_atencion_estado {S}.estado_medida_formativa_t
                    NOT NULL DEFAULT 'PENDIENTE',
                plan_mejoramiento_estado {S}.estado_medida_formativa_t
                    NOT NULL DEFAULT 'PENDIENTE',
                correo_desercion_1_estado {S}.estado_correo_desercion_t
                    NOT NULL DEFAULT 'NO_APLICA',
                correo_desercion_2_estado {S}.estado_correo_desercion_t
                    NOT NULL DEFAULT 'NO_APLICA',
                fecha_llamado_atencion DATE,
                fecha_plan_mejoramiento DATE,
                fecha_correo_desercion_1 DATE,
                fecha_correo_desercion_2 DATE,
                observaciones TEXT,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                deleted_at TIMESTAMPTZ,
                CONSTRAINT uq_medidas_proceso UNIQUE (proceso_id)
            )
            """
        )
        op.execute(
            f"CREATE INDEX idx_medidas_proceso "
            f"ON {S}.medidas_formativas_proceso (proceso_id)"
        )

    # ========================================================
    # 5. Triggers (idempotentes con DROP IF EXISTS + CREATE)
    # ========================================================
    # 5.1 trg_roles_updated_at (roles existe; solo faltaba el trigger)
    op.execute(
        f"DROP TRIGGER IF EXISTS trg_roles_updated_at ON {S}.roles"
    )
    op.execute(
        f"CREATE TRIGGER trg_roles_updated_at "
        f"BEFORE UPDATE ON {S}.roles FOR EACH ROW "
        f"EXECUTE FUNCTION {S}.set_updated_at()"
    )

    # 5.2 triggers de las 3 tablas recién creadas
    for tabla, trigger in (
        ("novedades_proceso", "trg_novedades_updated_at"),
        ("checklist_documentos_proceso", "trg_checklist_updated_at"),
        ("medidas_formativas_proceso", "trg_medidas_updated_at"),
    ):
        op.execute(f"DROP TRIGGER IF EXISTS {trigger} ON {S}.{tabla}")
        op.execute(
            f"CREATE TRIGGER {trigger} "
            f"BEFORE UPDATE ON {S}.{tabla} FOR EACH ROW "
            f"EXECUTE FUNCTION {S}.set_updated_at()"
        )

    # ========================================================
    # 6. Datos de referencia faltantes
    # ========================================================
    # 6.1 Roles con IDs fijos (la app espera ids 3, 5, 6 en constants.py)
    op.execute(
        f"""
        INSERT INTO {S}.roles (id, nombre, descripcion) VALUES
            (3, 'Instructor', 'Realiza seguimiento y evalúa bitácoras'),
            (5, 'Apoyo Administrativo', 'Soporte operativo sin permisos de aprobación'),
            (6, 'Consulta', 'Acceso de solo lectura')
        ON CONFLICT (id) DO NOTHING
        """
    )
    # Reajustar la secuencia para que un próximo INSERT no colisione con ids fijos
    op.execute(
        f"""
        SELECT setval(
            pg_get_serial_sequence('{S}.roles', 'id'),
            GREATEST((SELECT MAX(id) FROM {S}.roles), 1)
        )
        """
    )

    # 6.2 Modalidad faltante ('Economía popular')
    op.execute(
        f"""
        INSERT INTO {S}.modalidades_ep (nombre) VALUES ('Economía popular')
        ON CONFLICT (nombre) DO NOTHING
        """
    )


# ---------------------------------------------------------------
# downgrade (BLOQUEADO: la migración es estructural + de datos)
# ---------------------------------------------------------------
def downgrade() -> None:
    # Bajar de 0003 implicaría:
    #   - Borrar las 3 tablas recién creadas con todos sus datos.
    #   - Borrar las 4 columnas nuevas de usuarios (perderían avatar/telefono
    #     de cualquier usuario creado después de esta migración).
    #   - Borrar los 3 roles y la modalidad insertados (rompería FKs de
    #     usuarios y procesos que los referencien).
    #   - En PostgreSQL, NO se puede quitar un valor de un ENUM: 'RETIRADO'
    #     permanecería para siempre.
    if os.getenv("ALEMBIC_ALLOW_DESTRUCTIVE_DOWNGRADE") != "1":
        raise RuntimeError(
            "El downgrade de 0003_reconciliacion_esquema ELIMINA tablas "
            "(novedades_proceso, checklist_documentos_proceso, "
            "medidas_formativas_proceso), columnas de usuarios y datos de "
            "referencia. Restaure un respaldo. Si está seguro, repita con "
            "ALEMBIC_ALLOW_DESTRUCTIVE_DOWNGRADE=1."
        )

    op.execute(f"DROP TRIGGER IF EXISTS trg_medidas_updated_at ON {S}.medidas_formativas_proceso")
    op.execute(f"DROP TRIGGER IF EXISTS trg_checklist_updated_at ON {S}.checklist_documentos_proceso")
    op.execute(f"DROP TRIGGER IF EXISTS trg_novedades_updated_at ON {S}.novedades_proceso")
    op.execute(f"DROP TRIGGER IF EXISTS trg_roles_updated_at ON {S}.roles")

    op.execute(f"DROP TABLE IF EXISTS {S}.medidas_formativas_proceso")
    op.execute(f"DROP TABLE IF EXISTS {S}.checklist_documentos_proceso")
    op.execute(f"DROP TABLE IF EXISTS {S}.novedades_proceso")

    op.execute(f"ALTER TABLE {S}.usuarios DROP COLUMN IF EXISTS reset_code_expires_at")
    op.execute(f"ALTER TABLE {S}.usuarios DROP COLUMN IF EXISTS reset_code")
    op.execute(f"ALTER TABLE {S}.usuarios DROP COLUMN IF EXISTS preferencias_ui")
    op.execute(f"ALTER TABLE {S}.usuarios DROP COLUMN IF EXISTS tipo_documento")

    op.execute(f"DELETE FROM {S}.modalidades_ep WHERE nombre = 'Economía popular'")
    op.execute(f"DELETE FROM {S}.roles WHERE id IN (3, 5, 6)")

    for tipo in (
        "estado_correo_desercion_t",
        "estado_medida_formativa_t",
        "estado_documento_t",
        "tipo_documento_t",
    ):
        op.execute(f"DROP TYPE IF EXISTS {S}.{tipo}")
    # Nota: 'RETIRADO' añadido a estado_proceso_t NO se puede quitar.