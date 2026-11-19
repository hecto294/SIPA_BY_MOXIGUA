"""
Entorno de Alembic para SIPA.

Decisiones de diseño (ver docs/ALEMBIC.md):

* La URL de conexión sale de ``app.core.config.settings.DATABASE_URL``, el
  mismo mecanismo que usa la aplicación.

* Los metadatos son ``Base.metadata`` de ``app.core.database``; todos los
  modelos viven en ``app/models.py`` y se importan aquí para registrarlos.

* Todo el esquema de la app vive en PostgreSQL bajo ``etapa_productiva``.
  La tabla ``alembic_version`` también se guarda allí.

* Este archivo NUNCA borra nada. Solo crea el esquema si no existe.

Filtros aplicados para evitar falsos positivos de autogenerate/check:

* ``include_object`` filtra ``alembic_version`` (Alembic la gestiona, no es
  un modelo de la app; sin este filtro, check propone DROP TABLE y es
  catastrófico).

* ``_compare_type`` trata como iguales los ENUMs cuyo nombre y valores
  coinciden. Reflection de PostgreSQL pierde el schema del ENUM; sin este
  filtro, check propone DROP TYPE + CREATE TYPE por cada ENUM (destructivo
  y bloqueante por FKs). Este es el comportamiento recomendado por el
  propio mantenedor de Alembic (ver discusión en GitHub issue #278).

Los FKs (remove_fk + add_fk) siguen apareciendo en ``alembic check`` como
falso positivo conocido. Se documenta en ALEMBIC.md y NO se aplican.
"""
from logging.config import fileConfig

from alembic import context
from alembic.operations import ops
from sqlalchemy import create_engine, pool, text
from sqlalchemy.dialects.postgresql import ENUM as PG_ENUM

from app.core.config import settings
from app.core.database import Base
import app.models  # noqa: F401  -> registra todos los modelos en Base.metadata

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name, disable_existing_loggers=False)

target_metadata = Base.metadata

TARGET_SCHEMA = "etapa_productiva"
ADVISORY_LOCK_ID = 727_000_001


# ------------------------------------------------------------------
# Filtros de autogenerate
# ------------------------------------------------------------------
def include_name(name, type_, parent_names):
    """Con include_schemas=True, limita la comparación al esquema de la app."""
    if type_ == "schema":
        return name == TARGET_SCHEMA
    return True


def include_object(object, name, type_, reflected, compare_to):
    """Filtra objetos que Alembic gestiona internamente.

    - ``alembic_version``: tabla de control de Alembic, no es un modelo de
      la app. Sin este filtro, ``alembic check`` propone ``DROP TABLE
      alembic_version`` (destruiría el historial de migraciones).
    """
    if type_ == "table" and name == "alembic_version":
        return False
    return True


def _compare_type(context_, inspected_column, metadata_column,
                  inspected_type, metadata_type):
    """Comparador custom de tipos.

    Los ENUM de PostgreSQL se reflejan sin ``schema`` (``name='x'``) aunque
    estén cualificados en la BD (``etapa_productiva.x``). Sin este filtro,
    ``alembic check`` propondría un ``modify_type`` (DROP TYPE + CREATE
    TYPE) por cada uno. Eso es destructivo y además falla con FKs activas.

    Tratamos como iguales dos ENUMs si tienen el mismo nombre y los mismos
    valores en el mismo orden. Es el comportamiento que espera el mantenedor
    de Alembic (GitHub issue #278).
    """
    if isinstance(inspected_type, PG_ENUM) and isinstance(metadata_type, PG_ENUM):
        if (inspected_type.name == metadata_type.name
                and list(inspected_type.enums) == list(metadata_type.enums)):
            return False  # no son diferentes
    return None  # default: usa el comparador estándar


def _operaciones_destructivas(lista_ops):
    """Recorre las operaciones autogeneradas y lista las que borran datos."""
    encontradas = []
    for operacion in lista_ops:
        if isinstance(operacion, ops.DropTableOp):
            encontradas.append(
                f"DROP TABLE  {operacion.schema or ''}.{operacion.table_name}"
            )
        elif isinstance(operacion, ops.DropColumnOp):
            encontradas.append(
                f"DROP COLUMN {operacion.table_name}.{operacion.column_name}"
            )
        elif isinstance(operacion, ops.ModifyTableOps):
            encontradas.extend(_operaciones_destructivas(operacion.ops))
    return encontradas


def process_revision_directives(context_, revision, directives):
    """Se ejecuta solo en ``alembic revision --autogenerate``.

    1. No genera archivos de migración vacíos.
    2. Avisa en voz alta si la migración propuesta borra tablas o columnas.
    """
    if not getattr(config.cmd_opts, "autogenerate", False):
        return

    script = directives[0]
    if script.upgrade_ops.is_empty():
        directives[:] = []
        print("[alembic] No hay diferencias entre los modelos y la BD: no se genera migración.")
        return

    destructivas = _operaciones_destructivas(script.upgrade_ops.ops)
    if destructivas:
        print("\n" + "!" * 72)
        print("[alembic] ATENCIÓN: la migración generada contiene operaciones DESTRUCTIVAS:")
        for linea in destructivas:
            print(f"   - {linea}")
        print("Revísala a mano antes de aplicarla. Si una tabla existe en la BD pero")
        print("falta en app/models.py (p. ej. usuario_roles), puede ser un modelo")
        print("pendiente de declarar y NO una tabla que deba eliminarse.")
        print("!" * 72 + "\n")


# ------------------------------------------------------------------
# Opciones comunes de configuración
# ------------------------------------------------------------------
def _opciones_comunes():
    return dict(
        target_metadata=target_metadata,
        include_schemas=True,
        include_name=include_name,
        include_object=include_object,
        version_table_schema=TARGET_SCHEMA,
        compare_type=_compare_type,
        process_revision_directives=process_revision_directives,
    )


# ------------------------------------------------------------------
# Modo offline
# ------------------------------------------------------------------
def run_migrations_offline() -> None:
    context.configure(
        url=settings.DATABASE_URL,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        **_opciones_comunes(),
    )
    with context.begin_transaction():
        context.run_migrations()


# ------------------------------------------------------------------
# Modo online
# ------------------------------------------------------------------
def _preparar_esquema(connection) -> None:
    """Garantiza que el esquema exista y fija el search_path.

    - Crea el esquema SOLO si no existe (idempotente, no destructivo).
    - SET search_path garantiza que el baseline (que usa nombres sin
      calificar) cree los objetos en ``etapa_productiva`` aunque el
      DATABASE_URL no incluya ``options=-c search_path``.
    - Toma un candado consultivo para evitar migraciones simultáneas.
    - El commit evita que Alembic crea que ya hay una transacción externa
      abierta.
    """
    existe = connection.execute(
        text("SELECT 1 FROM information_schema.schemata WHERE schema_name = :s"),
        {"s": TARGET_SCHEMA},
    ).scalar()
    if not existe:
        connection.execute(text(f'CREATE SCHEMA "{TARGET_SCHEMA}"'))
    connection.execute(text(f'SET search_path TO "{TARGET_SCHEMA}"'))

    candado = connection.execute(
        text("SELECT pg_try_advisory_lock(:k)"), {"k": ADVISORY_LOCK_ID}
    ).scalar()
    if not candado:
        raise RuntimeError(
            "Otra ejecución de Alembic está migrando esta base de datos. "
            "Espere a que termine e inténtelo de nuevo."
        )
    connection.commit()


def run_migrations_online() -> None:
    connectable = create_engine(settings.DATABASE_URL, poolclass=pool.NullPool)
    with connectable.connect() as connection:
        _preparar_esquema(connection)
        context.configure(
            connection=connection,
            transaction_per_migration=True,
            **_opciones_comunes(),
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()