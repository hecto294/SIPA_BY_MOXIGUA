# Alembic en SIPA

Este proyecto usa Alembic con un entorno customizado para trabajar sobre PostgreSQL y el esquema `etapa_productiva`.

## Qué hace la configuración custom

- Lee la URL de conexión desde `app.core.config.settings.DATABASE_URL`.
- Crea el esquema `etapa_productiva` si no existe.
- Fuerza `SET search_path TO "etapa_productiva"` antes de ejecutar migraciones.
- Usa `Base.metadata` para comparar modelos SQLAlchemy con la base de datos real.
- Filtra objetos internos de Alembic como `alembic_version` para evitar falsos positivos destructivos.
- Detecta migraciones generadas con `DROP TABLE` / `DROP COLUMN` y avisar antes de aplicarlas.

## Comandos útiles

Desde la carpeta `backend`:

```bash
pip install -r requirements.txt
alembic upgrade head
alembic revision --autogenerate -m "descripcion"
alembic current
alembic check
```

## Reglas importantes

- SIEMPRE revisar `alembic check` antes de aplicar una migración sobre una base de datos con datos reales.
- No usar `ALEMBIC_ALLOW_DESTRUCTIVE_DOWNGRADE=1` salvo que se haya hecho backup y la operación sea intencional.
- Si una revisión autogenerada propone `DROP TABLE` o `DROP COLUMN`, revisar el modelo `app/models.py` antes de aplicarla.
- El esquema objetivo de la aplicación es `etapa_productiva`; no migrar fuera de ese esquema.

## Cómo aplicar las migraciones

Alembic es la única fuente de cambios de esquema. El backend ya no modifica la base al arrancar (se retiró `auto_migrate`).

### Base de datos nueva (vacía)

    alembic upgrade head

Con Docker, desde la raíz del repo:

    docker compose run --rm --no-deps backend alembic upgrade head

### Base de datos que ya existe (creada antes de Alembic)

NO ejecutar `upgrade head` directamente: `0001_baseline` fallaría con "type already exists".

1. Hacer un respaldo (`pg_dump -Fc`) o probar primero sobre una copia (`CREATE DATABASE copia TEMPLATE original;`).
2. Marcar la base como adoptada, sin ejecutar nada del baseline:

       alembic stamp 0001_baseline

3. Aplicar el resto de migraciones (son idempotentes: se saltan lo que ya existe):

       alembic upgrade head

4. Verificar con `alembic current` que quedó en la última revisión.

Para apuntar Alembic a otra base sin tocar la configuración, definir la variable de entorno `DATABASE_URL` al ejecutar el comando.

## Limitaciones conocidas

- La alerta de operaciones destructivas (`DROP TABLE` / `DROP COLUMN`) solo se imprime al GENERAR una migración con `alembic revision --autogenerate`. No se ejecuta al aplicar con `upgrade`.
- `alembic check` todavía reporta diferencias entre `app/models.py` y la base (nullabilidad de `created_at`/`updated_at`/`estado`, índices `idx_*` del baseline, y claves foráneas). Las claves foráneas de la base tienen `ON DELETE CASCADE/RESTRICT/SET NULL` y los modelos aún no las declaran.
- Por eso NUNCA se debe aplicar a ciegas una migración autogenerada que toque claves foráneas: se recrearían sin su `ON DELETE`. Revisar siempre el archivo generado antes de aplicarlo.
- Pendiente: declarar `ondelete` y nullabilidad en `app/models.py` para dejar `alembic check` limpio.
