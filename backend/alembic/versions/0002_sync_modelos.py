"""sincroniza el esquema con app/models.py (migración puente idempotente)

Revision ID: 0002_sync_modelos
Revises: 0001_baseline
Create Date: 2026-10-24

Contexto
--------
``app/models.py`` declara objetos que NO están en ``script_completo.sql``.
Algunas bases de datos del equipo ya los tienen (creados a mano o por el
``create_all`` de tests/conftest.py) y otras no. Por eso esta migración es
IDEMPOTENTE: cada paso comprueba antes si el objeto existe.

Qué asegura
-----------
1. Valor 'CONDICIONADO' en el ENUM estado_proceso_t.
2. Columna usuarios.avatar_url.
3. Tabla centros_formacion y columna programas_formacion.centro_formacion_id (+ FK).
4. Tablas auditoria, alertas y cartas_presentacion (+ sus tipos ENUM).

Lo que NO hace (a propósito)
----------------------------
No toca índices, defaults ni tipos de las tablas del baseline; esas
diferencias menores las reportará ``alembic check`` para decidirlas en
revisiones posteriores, tras revisar el resultado.

ESTADO DE VERIFICACIÓN: escrita contra app/models.py (comparación estática
de columnas aprobada), pero NO ejecutada contra PostgreSQL por el autor.
Validar con la guía docs/ALEMBIC.md antes de usarla con datos reales.
"""
import os
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import context, op
from sqlalchemy.dialects import postgresql

revision: str = "0002_sync_modelos"
down_revision: Union[str, None] = "0001_baseline"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

S = "etapa_productiva"


# ---------------------------------------------------------------
# Utilidades de idempotencia (inspector nuevo en cada consulta,
# porque el Inspector cachea y quedaría desactualizado)
# ---------------------------------------------------------------
def _tiene_tabla(nombre: str) -> bool:
    return sa.inspect(op.get_bind()).has_table(nombre, schema=S)


def _tiene_columna(tabla: str, columna: str) -> bool:
    cols = sa.inspect(op.get_bind()).get_columns(tabla, schema=S)
    return any(c["name"] == columna for c in cols)


def _enum(nombre: str, *valores: str) -> postgresql.ENUM:
    """ENUM de PostgreSQL con create_type=False.

    El tipo se crea explícitamente con checkfirst=True (ver _crear_enums);
    así CREATE TABLE nunca intenta recrear un tipo ya existente.
    """
    return postgresql.ENUM(*valores, name=nombre, schema=S, create_type=False)


def _enums() -> dict:
    return {
        "tipo_alerta": _enum("tipo_alerta_t", "INFO", "ADVERTENCIA", "URGENTE", "EXITO"),
        "categoria_alerta": _enum(
            "categoria_alerta_t",
            "DOCUMENTOS", "SEGUIMIENTO", "PLAZOS", "EVALUACION",
            "BITACORAS", "REUNIONES", "CHARLAS", "SISTEMA",
        ),
        "estado_alerta": _enum("estado_alerta_t", "PENDIENTE", "RESUELTA", "ARCHIVADA"),
        "rol_destino_alerta": _enum(
            "rol_destino_alerta_t",
            "ADMIN", "COORDINADOR", "INSTRUCTOR", "APRENDIZ", "APOYO_ADMINISTRATIVO",
        ),
        "estado_carta": _enum(
            "estado_carta_presentacion_t", "CARGADA", "APROBADA", "RECHAZADA"
        ),
    }


def _ahora():
    return sa.text("now()")


# ---------------------------------------------------------------
# upgrade
# ---------------------------------------------------------------
def upgrade() -> None:
    if context.is_offline_mode():
        raise RuntimeError(
            "0002_sync_modelos inspecciona la base de datos y no admite --sql (offline)."
        )

    bind = op.get_bind()
    enums = _enums()

    # 1) Nuevo valor del ENUM estado_proceso_t (PostgreSQL >= 12 permite
    #    ADD VALUE dentro de una transacción; el valor no se usa aquí).
    op.execute(
        "ALTER TYPE etapa_productiva.estado_proceso_t "
        "ADD VALUE IF NOT EXISTS 'CONDICIONADO' BEFORE 'FINALIZADO'"
    )

    # 2) usuarios.avatar_url
    if not _tiene_columna("usuarios", "avatar_url"):
        op.add_column(
            "usuarios",
            sa.Column("avatar_url", sa.String(length=500), nullable=True),
            schema=S,
        )

    # 3) centros_formacion + programas_formacion.centro_formacion_id
    if not _tiene_tabla("centros_formacion"):
        op.create_table(
            "centros_formacion",
            sa.Column("id", sa.BigInteger(), nullable=False),
            sa.Column("codigo", sa.String(length=20), nullable=False),
            sa.Column("nombre", sa.String(length=200), nullable=False),
            sa.Column("direccion", sa.String(length=200), nullable=True),
            sa.Column("telefono", sa.String(length=20), nullable=True),
            sa.Column("correo_contacto", sa.String(length=150), nullable=True),
            sa.Column("is_active", sa.Boolean(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=_ahora(), nullable=True),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=_ahora(), nullable=True),
            sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
            sa.PrimaryKeyConstraint("id"),
            schema=S,
        )
        op.create_index("ix_etapa_productiva_centros_formacion_codigo",
                        "centros_formacion", ["codigo"], unique=True, schema=S)
        op.create_index("ix_etapa_productiva_centros_formacion_id",
                        "centros_formacion", ["id"], unique=False, schema=S)

    if not _tiene_columna("programas_formacion", "centro_formacion_id"):
        op.add_column(
            "programas_formacion",
            sa.Column("centro_formacion_id", sa.BigInteger(), nullable=True),
            schema=S,
        )
        op.create_foreign_key(
            "programas_formacion_centro_formacion_id_fkey",
            "programas_formacion", "centros_formacion",
            ["centro_formacion_id"], ["id"],
            source_schema=S, referent_schema=S,
        )

    # 4) auditoria
    if not _tiene_tabla("auditoria"):
        op.create_table(
            "auditoria",
            sa.Column("id", sa.BigInteger(), nullable=False),
            sa.Column("tabla", sa.String(length=100), nullable=False),
            sa.Column("registro_id", sa.BigInteger(), nullable=False),
            sa.Column("usuario_id", sa.BigInteger(), nullable=True),
            sa.Column("accion", sa.String(length=20), nullable=False),
            sa.Column("datos_anteriores", sa.JSON(), nullable=True),
            sa.Column("datos_nuevos", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=_ahora(), nullable=True),
            sa.ForeignKeyConstraint(["usuario_id"], [f"{S}.usuarios.id"]),
            sa.PrimaryKeyConstraint("id"),
            schema=S,
        )

    # 5) alertas (+ 4 tipos ENUM)
    if not _tiene_tabla("alertas"):
        for clave in ("tipo_alerta", "categoria_alerta", "estado_alerta", "rol_destino_alerta"):
            enums[clave].create(bind, checkfirst=True)
        op.create_table(
            "alertas",
            sa.Column("id", sa.BigInteger(), nullable=False),
            sa.Column("titulo", sa.String(length=200), nullable=False),
            sa.Column("mensaje", sa.Text(), nullable=False),
            sa.Column("tipo", enums["tipo_alerta"], nullable=False),
            sa.Column("categoria", enums["categoria_alerta"], nullable=False),
            sa.Column("estado", enums["estado_alerta"], nullable=False),
            sa.Column("rol_destino", enums["rol_destino_alerta"], nullable=False),
            sa.Column("usuario_id", sa.BigInteger(), nullable=True),
            sa.Column("aprendiz_id", sa.BigInteger(), nullable=True),
            sa.Column("proceso_id", sa.BigInteger(), nullable=True),
            sa.Column("entidad_relacionada", sa.String(length=50), nullable=True),
            sa.Column("entidad_id", sa.BigInteger(), nullable=True),
            sa.Column("fecha_resolucion", sa.DateTime(timezone=True), nullable=True),
            sa.Column("resuelta_por_id", sa.BigInteger(), nullable=True),
            sa.Column("nota_resolucion", sa.Text(), nullable=True),
            sa.Column("clave_unica", sa.String(length=255), nullable=True),
            sa.Column("fecha_expiracion", sa.DateTime(timezone=True), nullable=True),
            sa.Column("is_active", sa.Boolean(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=_ahora(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=_ahora(), nullable=True),
            sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(["usuario_id"], [f"{S}.usuarios.id"]),
            sa.ForeignKeyConstraint(["aprendiz_id"], [f"{S}.usuarios.id"]),
            sa.ForeignKeyConstraint(["proceso_id"], [f"{S}.procesos_etapa_productiva.id"]),
            sa.ForeignKeyConstraint(["resuelta_por_id"], [f"{S}.usuarios.id"]),
            sa.PrimaryKeyConstraint("id"),
            schema=S,
        )
        op.create_index("ix_etapa_productiva_alertas_clave_unica",
                        "alertas", ["clave_unica"], unique=True, schema=S)
        op.create_index("ix_etapa_productiva_alertas_id",
                        "alertas", ["id"], unique=False, schema=S)

    # 6) cartas_presentacion (+ 1 tipo ENUM)
    if not _tiene_tabla("cartas_presentacion"):
        enums["estado_carta"].create(bind, checkfirst=True)
        op.create_table(
            "cartas_presentacion",
            sa.Column("id", sa.BigInteger(), nullable=False),
            sa.Column("proceso_id", sa.BigInteger(), nullable=False),
            sa.Column("coordinador_id", sa.BigInteger(), nullable=False),
            sa.Column("archivo_url", sa.String(length=500), nullable=False),
            sa.Column("nombre_archivo", sa.String(length=255), nullable=True),
            sa.Column("tamano_bytes", sa.BigInteger(), nullable=True),
            sa.Column("estado", enums["estado_carta"], nullable=False),
            sa.Column("observaciones", sa.Text(), nullable=True),
            sa.Column("fecha_carga", sa.DateTime(timezone=True), server_default=_ahora(), nullable=True),
            sa.Column("fecha_aprobacion", sa.DateTime(timezone=True), nullable=True),
            sa.Column("is_active", sa.Boolean(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=_ahora(), nullable=True),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=_ahora(), nullable=True),
            sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(["proceso_id"], [f"{S}.procesos_etapa_productiva.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["coordinador_id"], [f"{S}.usuarios.id"]),
            sa.PrimaryKeyConstraint("id"),
            schema=S,
        )
        op.create_index("ix_etapa_productiva_cartas_presentacion_coordinador_id",
                        "cartas_presentacion", ["coordinador_id"], unique=False, schema=S)
        op.create_index("ix_etapa_productiva_cartas_presentacion_id",
                        "cartas_presentacion", ["id"], unique=False, schema=S)
        op.create_index("ix_etapa_productiva_cartas_presentacion_proceso_id",
                        "cartas_presentacion", ["proceso_id"], unique=False, schema=S)


# ---------------------------------------------------------------
# downgrade (DESTRUCTIVO: exige confirmación explícita)
# ---------------------------------------------------------------
def downgrade() -> None:
    # En bases adoptadas con "stamp", estas tablas existían ANTES de Alembic
    # y contienen datos reales: bajar de 0002 las eliminaría.
    if os.getenv("ALEMBIC_ALLOW_DESTRUCTIVE_DOWNGRADE") != "1":
        raise RuntimeError(
            "El downgrade de 0002_sync_modelos ELIMINA las tablas cartas_presentacion, "
            "alertas, auditoria y centros_formacion con todos sus datos, y la columna "
            "usuarios.avatar_url. Haga un respaldo y, si está seguro, repita con "
            "ALEMBIC_ALLOW_DESTRUCTIVE_DOWNGRADE=1."
        )

    op.execute("DROP TABLE IF EXISTS etapa_productiva.cartas_presentacion")
    op.execute("DROP TABLE IF EXISTS etapa_productiva.alertas")
    op.execute("DROP TABLE IF EXISTS etapa_productiva.auditoria")
    op.execute("ALTER TABLE etapa_productiva.programas_formacion DROP COLUMN IF EXISTS centro_formacion_id")
    op.execute("DROP TABLE IF EXISTS etapa_productiva.centros_formacion")
    op.execute("ALTER TABLE etapa_productiva.usuarios DROP COLUMN IF EXISTS avatar_url")
    for tipo in ("estado_carta_presentacion_t", "rol_destino_alerta_t",
                 "estado_alerta_t", "categoria_alerta_t", "tipo_alerta_t"):
        op.execute(f"DROP TYPE IF EXISTS etapa_productiva.{tipo}")
    # PostgreSQL no permite eliminar un valor de un ENUM: 'CONDICIONADO'
    # permanece en estado_proceso_t (es inocuo).
