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
