"""
Entorno de Alembic para SIPA.

Decisiones de diseño (ver docs/ALEMBIC.md):

* La URL de conexión sale de ``app.core.config.settings.DATABASE_URL``, el
  mismo mecanismo que usa la aplicación. No se lee desde alembic.ini para no
  duplicar configuración ni dejar credenciales en archivos versionados.
  (Además, DATABASE_URL contiene "%20" y ConfigParser lo interpretaría como
  una interpolación inválida si pasara por ``set_main_option``.)

* Los metadatos son ``Base.metadata`` de ``app.core.database``; todos los
  modelos viven en ``app/models.py`` y se importan aquí para registrarlos.

* Todo el esquema de la app vive en PostgreSQL bajo ``etapa_productiva``
  (los modelos usan ``schema="etapa_productiva"``). La tabla
  ``alembic_version`` también se guarda allí.

* Este archivo NUNCA borra nada. Solo crea el esquema si no existe.
"""
from logging.config import fileConfig

from alembic import context
from alembic.operations import ops
from sqlalchemy import create_engine, pool, text

from app.core.config import settings
from app.core.database import Base
import app.models  # noqa: F401  -> registra todos los modelos en Base.metadata

config = context.config

if config.config_file_name is not None:
    # disable_existing_loggers=False: no silencia los loggers de la app
    fileConfig(config.config_file_name, disable_existing_loggers=False)

target_metadata = Base.metadata

# Esquema PostgreSQL que gestiona Alembic (coincide con app/models.py)
TARGET_SCHEMA = "etapa_productiva"

# Clave arbitraria del candado consultivo de PostgreSQL que impide que dos
# ejecuciones de Alembic migren la misma base de datos a la vez.
ADVISORY_LOCK_ID = 727_000_001


# ------------------------------------------------------------------
# Filtros de autogenerate
# ------------------------------------------------------------------
def include_name(name, type_, parent_names):
    """Con include_schemas=True, limita la comparación al esquema de la app.

    Evita que Alembic revise (y proponga borrar) tablas de otros esquemas,
    por ejemplo ``public``. ``name`` es None para el esquema por defecto.
    """
    if type_ == "schema":
        return name in (None, TARGET_SCHEMA)
    return True


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
    # En "alembic check" (y otros comandos) no existe el atributo
    # "autogenerate": no se debe tocar "directives" en ese caso.
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
        version_table_schema=TARGET_SCHEMA,
        compare_type=True,
        process_revision_directives=process_revision_directives,
    )


# ------------------------------------------------------------------
# Modo offline (genera SQL sin conectarse: alembic upgrade head --sql)
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
# Modo online (el habitual)
# ------------------------------------------------------------------
def _preparar_esquema(connection) -> None:
    """Garantiza que el esquema exista y que sea el search_path de la sesión.

    * Se crea SOLO si no existe (idempotente, no destructivo). Es necesario
      porque ``alembic_version`` se crea dentro del esquema antes de ejecutar
      la primera migración.
    * Se consulta antes de crear para no exigir el privilegio CREATE sobre
      la base de datos cuando el esquema ya existe.
    * SET search_path garantiza que el baseline (que usa nombres sin
      calificar) cree los objetos en ``etapa_productiva`` aunque el
      DATABASE_URL de algún integrante no incluya ``options=-c search_path``.
    * Toma un candado consultivo para evitar migraciones simultáneas.
    * El commit evita que Alembic crea que ya hay una transacción externa
      abierta (SQLAlchemy 2.0 inicia transacciones automáticamente), lo que
      dejaría las migraciones sin confirmar.
    """
    existe = connection.execute(
        text("SELECT 1 FROM information_schema.schemata WHERE schema_name = :s"),
        {"s": TARGET_SCHEMA},
    ).scalar()
    if not existe:
        connection.execute(text(f'CREATE SCHEMA "{TARGET_SCHEMA}"'))
    connection.execute(text(f'SET search_path TO "{TARGET_SCHEMA}"'))

    # Candado de sesión: se libera solo al cerrar la conexión. Si otra
    # ejecución de Alembic está en curso, se falla de inmediato (sin colgarse).
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
    # NullPool: Alembic abre una sola conexión y la cierra al terminar.
    connectable = create_engine(settings.DATABASE_URL, poolclass=pool.NullPool)

    with connectable.connect() as connection:
        _preparar_esquema(connection)

        context.configure(
            connection=connection,
            # Cada revisión se confirma por separado: si la 0002 falla, la
            # 0001 ya aplicada se conserva y no hay que empezar de cero.
            transaction_per_migration=True,
            **_opciones_comunes(),
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
