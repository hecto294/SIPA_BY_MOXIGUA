# Migraciones de base de datos con Alembic — Guía del equipo SIPA

> **Regla de oro:** desde ahora, el esquema de la base de datos **solo cambia mediante migraciones de Alembic**.
> Nada de `ALTER TABLE` a mano, nada de `create_all()` sobre la BD de desarrollo, nada de volver a ejecutar `script_completo.sql`.

---

## 1. Lo esencial (sin teoría de más)

| Concepto | Qué es | En SIPA |
|---|---|---|
| **SQLAlchemy (ORM)** | Traduce clases Python a SQL y consulta datos. | `backend/app/models.py` |
| **Alembic** | Versiona los **cambios de estructura** de la BD (como Git, pero para tablas). | `backend/alembic/` |
| **Migración / revisión** | Un archivo Python con una versión del esquema: `upgrade()` la aplica, `downgrade()` la revierte. | `backend/alembic/versions/` |
| **`alembic_version`** | Tabla de la BD que guarda en qué revisión está. | `etapa_productiva.alembic_version` |
| **autogenerate** | Compara `models.py` con la BD real y *propone* una migración. **Es un borrador: siempre se revisa.** | `alembic revision --autogenerate` |

**Un ORM no es una herramienta de migraciones.** Cambiar `models.py` no cambia las tablas que ya existen.

**Ejemplo real de este mismo repositorio:** `models.py` declara `Usuario.avatar_url`, pero `script_completo.sql` nunca creó esa columna.
Una BD hecha solo con el script falla al consultar usuarios (`column usuarios.avatar_url does not exist`), porque SQLAlchemy pide todas las columnas del modelo.
Alembic evita esto: la columna se añade en una migración, y **todos** los compañeros la aplican con el mismo comando.

```
 models.py ──(autogenerate)──► archivo de migración ──(upgrade)──► tablas reales
   (lo que QUEREMOS)             (revisado por un humano)           (lo que HAY)
                                         ▲
                                 alembic_version registra hasta dónde llegó cada BD
```

---

## 2. Qué se encontró en el proyecto (hechos verificados en el código)

- **Base de datos:** PostgreSQL 16 (`postgres:16-alpine`), esquema propio **`etapa_productiva`**, fijado con `?options=-c%20search_path=etapa_productiva` en `DATABASE_URL`.
- **SQLAlchemy:** `sqlalchemy>=2.0.36`. `Base` en `backend/app/core/database.py` (`declarative_base()`); todos los modelos en `backend/app/models.py` (23 tablas, todas con `schema="etapa_productiva"`).
- **Cómo se crean las tablas hoy:** a mano, con `backend/script_completo.sql` (20 tablas). `main.py` **no** llama a `create_all()`. Ningún mecanismo de Docker lo ejecuta.
- **Peligro:** ese script empieza con `DROP SCHEMA etapa_productiva CASCADE` → **borra todos los datos**. Quedó marcado como LEGADO.
- **Deriva (drift) modelos ↔ script:** `models.py` tiene 4 tablas que el script no crea (`centros_formacion`, `auditoria`, `alertas`, `cartas_presentacion`), 2 columnas más (`usuarios.avatar_url`, `programas_formacion.centro_formacion_id`) y el valor `CONDICIONADO` del enum `estado_proceso_t`. El script tiene `usuario_roles`, que no tiene modelo.
- **Único `create_all()`:** `backend/tests/conftest.py`, apuntando por defecto a la BD de desarrollo `sipa_db` (ver riesgos).
- **Docker:** `docker-compose.yml` con `db`, `backend`, `frontend`. El backend solo arranca `uvicorn`; la BD tiene `healthcheck`.

---

## 3. Qué se implementó

| Archivo | Acción | Motivo |
|---|---|---|
| `backend/requirements.txt` | Modificar | Añadir `alembic==1.14.0` (compatible con SQLAlchemy 2.x) |
| `backend/alembic.ini` | Crear | Configuración; **sin credenciales** |
| `backend/alembic/env.py` | Crear | Conecta Alembic con `settings.DATABASE_URL`, `Base.metadata` y el esquema `etapa_productiva`; candado anti-ejecución simultánea; aviso de operaciones destructivas |
| `backend/alembic/script.py.mako` | Crear | Plantilla de nuevas migraciones |
| `backend/alembic/sql/0001_baseline.sql` | Crear | DDL del script legado (sin `DROP SCHEMA` ni datos de prueba) + roles y modalidades |
| `backend/alembic/versions/0001_baseline.py` | Crear | Aplica el baseline en una BD vacía |
| `backend/alembic/versions/0002_sync_modelos.py` | Crear | Migración **idempotente** que lleva el esquema a lo que declara `models.py` |
| `backend/scripts/verificar_esquema.sql` | Crear | Diagnóstico de **solo lectura** previo a adoptar una BD existente |
| `backend/scripts/seed_desarrollo.sql` | Crear | Datos de prueba (extraídos del script legado), solo desarrollo |
| `backend/.env.example` | Crear | Plantilla sin secretos para ejecutar fuera de Docker |
| `docker-compose.yml` | Modificar | Servicio `migrate` (puntual, `profiles: ["tools"]`); los demás servicios **no cambian** |
| `backend/script_completo.sql` | Modificar | Solo se añadió una advertencia en comentarios |
| `Dockerfile`, `main.py`, `conftest.py`, modelos | Conservar | No requieren cambios para esta fase |

### Por qué migraciones manuales y no automáticas al arrancar

Ejecutar `alembic upgrade head` en cada arranque **no es seguro todavía**: en una BD que ya tiene tablas pero no tiene `alembic_version`, intentaría crear el baseline y fallaría (`type ... already exists`), dejando el backend sin arrancar.
Además, con varios contenedores o compañeros compartiendo una BD, dos migraciones simultáneas podrían chocar (el candado de `env.py` lo previene, pero aun así conviene que alguien decida cuándo migrar).
Por eso el servicio `migrate` es **manual**. Cuando todas las BD estén adoptadas (sección 5-B), se puede automatizar quitando `profiles` y añadiendo al servicio `backend`:
`depends_on: { migrate: { condition: service_completed_successfully } }`.

### Por qué el baseline ejecuta SQL y no `op.create_table`

El DDL del script ya lo probó el equipo; retranscribir 20 tablas a mano introduce errores, y `autogenerate` no sabe representar la función y los 20 triggers `set_updated_at`. El baseline usa el cursor DBAPI directamente porque el `CHECK` del email contiene un `%`, que rompería la interpolación de parámetros de SQLAlchemy/psycopg2.

---

## 4. Comandos

**Todos se ejecutan en la terminal del sistema (PowerShell, CMD, bash o la terminal de VS Code), en la raíz del repositorio** (la carpeta donde está `docker-compose.yml`). No hay que entrar a ningún contenedor: `docker compose run --rm migrate ...` crea uno temporal y lo borra.

| Comando | Qué hace | Resultado esperado | Cómo reconocer un error |
|---|---|---|---|
| `docker compose up -d db` | Levanta solo PostgreSQL | `Container sipa_db Healthy` | `unhealthy` o puerto 5432 ocupado |
| `docker compose build migrate` | Construye la imagen (necesario la 1.ª vez y si cambia `requirements.txt`) | `Successfully` / `Built` | Error de `pip install` |
| `docker compose run --rm migrate alembic current` | Muestra la revisión de la BD | Vacío (sin adoptar) o `0002_sync_modelos (head)` | `could not translate host name "db"`, `password authentication failed` |
| `docker compose run --rm migrate alembic heads` | Lista las revisiones más recientes del código | **Una sola** línea `0002_sync_modelos (head)` | Dos líneas = ramas paralelas (ver 7) |
| `docker compose run --rm migrate` | `alembic upgrade head`: aplica todo lo pendiente | `Running upgrade -> 0001_baseline` y `Running upgrade 0001_baseline -> 0002_sync_modelos` | `Traceback`, `type "..." already exists` (la BD no estaba vacía: ir a 5-B) |
| `docker compose run --rm migrate alembic stamp 0001_baseline` | **Solo registra** la revisión, sin tocar tablas. Ver 5-B antes de usarlo | `Running stamp_revision -> 0001_baseline` | — |
| `docker compose run --rm migrate alembic check` | ¿Modelos y BD coinciden? | `No new upgrade operations detected.` | `New upgrade operations detected` + lista (ver 6) |
| `docker compose run --rm migrate alembic revision --autogenerate -m "descripcion corta"` | Genera una migración **borrador** en `backend/alembic/versions/` | `Generating ...py ... done` | Aviso `!!!! ATENCIÓN ... DESTRUCTIVAS` (revisar a fondo) |
| `docker compose run --rm migrate alembic history --verbose` | Historial de revisiones | Lista ordenada | — |
| `docker compose run --rm migrate alembic upgrade head --sql` | — | **No soportado** por las revisiones 0001/0002 (inspeccionan la BD) | `RuntimeError ... offline` |

**Respaldo previo (obligatorio antes de tocar una BD con datos).** Funciona igual en PowerShell, CMD y bash:

```
docker compose exec db pg_dump -U sipa_user -d sipa_db -Fc -f /tmp/respaldo.dump
docker compose cp db:/tmp/respaldo.dump ./respaldo_antes_de_alembic.dump
```

**Ejecutar los scripts SQL de `backend/scripts/`** (también multiplataforma; el operador `<` no existe en PowerShell):

```
docker compose cp backend/scripts/verificar_esquema.sql db:/tmp/verificar_esquema.sql
docker compose exec db psql -U sipa_user -d sipa_db -f /tmp/verificar_esquema.sql
```

---

## 5. Los cuatro escenarios

### 5-A. Desarrollador nuevo / volumen vacío

```
docker compose up -d db
docker compose run --rm migrate
docker compose cp backend/scripts/seed_desarrollo.sql db:/tmp/seed_desarrollo.sql   # opcional: datos de prueba
docker compose exec db psql -U sipa_user -d sipa_db -f /tmp/seed_desarrollo.sql      # opcional
docker compose up -d --build
```

### 5-B. BD existente con datos (la situación más probable hoy)

1. **Respaldo** (sección 4).
2. **Verificar** con `verificar_esquema.sql` (sección 4). Las secciones **1 a 4** deben mostrar todo `ok`.
3. **Si todo es `ok`:**
   ```
   docker compose run --rm migrate alembic stamp 0001_baseline
   docker compose run --rm migrate
   docker compose run --rm migrate alembic current      # debe decir 0002_sync_modelos (head)
   ```
   `stamp` solo escribe la revisión en `alembic_version`; `0002` es idempotente y únicamente crea lo que falte.
4. **Si alguna fila dice `FALTA` en las secciones 1–4: NO hacer `stamp`.** Declararía que la BD coincide con el baseline cuando no es cierto, y futuras migraciones fallarían o dañarían datos. Avise al equipo para corregir esa BD primero.
5. Mire la **sección 6** del verificador: lista objetos que existen en la BD pero **no están en el repositorio** (p. ej. triggers de auditoría). Hay que documentarlos o llevarlos a una migración (ver riesgo R1).

### 5-C. BD compartida entre varios integrantes

Una sola persona ejecuta las migraciones y avisa al grupo. Los demás **no** ejecutan nada: solo actualizan su código con `git pull`. (El candado de `env.py` impide ejecuciones simultáneas: la segunda falla con un mensaje claro en vez de corromper.)

### 5-D. BD que ya tiene Alembic

`git pull` → `docker compose build migrate backend` → `docker compose run --rm migrate`. Nada más.

---

## 6. Flujo diario: cambiar el esquema

1. Edite `backend/app/models.py` (p. ej. añada una columna).
2. Genere el borrador: `docker compose run --rm migrate alembic revision --autogenerate -m "agregar telefono_alterno a usuarios"`
   (el servicio monta `backend/app` y `backend/alembic`, de modo que ve sus modelos actuales y el archivo nuevo aparece en su carpeta).
3. **Revise el archivo generado** en `backend/alembic/versions/`:
   - ¿Hace **solo** lo que usted quería? ¿Hay `drop_table` o `drop_column`? Si una tabla existe en la BD pero no en `models.py` (como `usuario_roles`), autogenerate propone **borrarla**: casi siempre significa "falta el modelo", no "elimine la tabla".
   - Añadir una columna `NOT NULL` a una tabla con datos requiere un `server_default` o rellenar antes.
   - Los **triggers y funciones SQL** no se autodetectan: se escriben a mano con `op.execute()`.
   - Los **cambios de ENUM** en PostgreSQL no se autodetectan: usar `ALTER TYPE ... ADD VALUE`.
4. Aplique: `docker compose run --rm migrate`.
5. Verifique: `alembic current` y `alembic check`.
6. Haga commit del archivo de migración **junto con** el cambio de `models.py`.

**Revertir.** `docker compose run --rm migrate alembic downgrade -1` baja una revisión. Los downgrades de `0001` y `0002` están **bloqueados** a propósito porque borrarían datos. Para `0002`, con respaldo hecho y sabiendo lo que hace:
`docker compose run --rm -e ALEMBIC_ALLOW_DESTRUCTIVE_DOWNGRADE=1 migrate alembic downgrade -1`.
Una migración puede ser irreversible en la práctica (borrar una columna pierde sus datos aunque `downgrade()` la recree vacía): **el respaldo es la reversión real.**

**Diferencias que `alembic check` reportará al principio (esperadas, no verificadas).** `models.py` y el script legado difieren en detalles que `0002` no toca deliberadamente: tipo `JSON` (modelo) vs `JSONB` (BD) en `usuarios.preferencias_ui`; índices `ix_*` de `index=True` que el script no creó y viceversa (p. ej. `idx_usuarios_email_active` es parcial en el script y total en el modelo); acciones `ON DELETE` de las claves foráneas. Trátelas en migraciones propias, tras revisarlas, no a ciegas.

---

## 7. Reglas del equipo

1. **Nunca edite una migración ya aplicada** o enviada a `develop`; cree otra nueva.
2. **Una migración por cambio**, con mensaje descriptivo.
3. Las migraciones **sí se versionan en Git** (`backend/alembic/versions/*.py`). Es lo que permite que todos tengan el mismo esquema.
4. Si dos personas crean migraciones a la vez habrá **dos "heads"** (`alembic heads` muestra dos líneas): quien llegue segundo ejecuta `alembic merge heads -m "unir ramas"`, lo revisa y lo sube.
5. No ejecute `Base.metadata.create_all()` contra una BD gestionada por Alembic.
6. Nunca elimine el volumen `postgres_data` ni haga `docker compose down -v` para "arreglar" una migración sin respaldo.
7. Los cambios de esquema ya no se hacen con SQL manual.

---

## 8. Entrega al equipo

**Archivos a recibir** (todos están en el zip/parche entregado): los de la tabla de la sección 3.
**No contiene** secretos, `.env`, `node_modules` ni dependencias descargadas. Las credenciales de `docker-compose.yml` son las de desarrollo que ya existían.

**Incorporar los cambios sin perder trabajo local:**
1. Guarde su trabajo: `git add -A && git commit -m "wip"` (o `git stash`).
2. Aplique el parche (`git apply --check alembic-cambios.patch` y luego `git apply alembic-cambios.patch`) o fusione la rama con los cambios.
3. Si `git` reporta conflicto en `docker-compose.yml` o `requirements.txt`, conserve **ambos** cambios: el servicio `migrate` y la línea `alembic==1.14.0`.
4. `docker compose build migrate backend` y siga el escenario 5-A, 5-B, 5-C o 5-D que le corresponda.

**Archivos de ignorado:** `backend/.gitignore` ya ignora `.env` y `__pycache__/` (incluye `alembic/versions/__pycache__`); `backend/.dockerignore` no excluye `alembic/`, así que entra en la imagen. No requieren cambios.

---

## 9. Riesgos detectados que afectan a las migraciones

| # | Riesgo | Gravedad | Qué hacer |
|---|---|---|---|
| **R1** | `database.py` fija `app.current_user_id` para **triggers de auditoría que no están en el repositorio**; la app solo *lee* `auditoria`. Las BD reales pueden tener funciones/triggers que una BD nueva creada con Alembic **no tendrá** (la auditoría quedaría vacía sin avisar). | Alta | Ejecutar la sección 6 del verificador en la BD "buena", exportar con `pg_dump --schema-only` y llevar esos objetos a una migración `0003`. |
| **R2** | `tests/conftest.py` ejecuta `create_all()` y siembra datos contra `sipa_db` (la BD de desarrollo) por defecto. Es la causa probable de la deriva (crea tablas fuera del historial). | Alta | Usar una BD distinta con `TEST_DATABASE_URL` (p. ej. `sipa_test`). Cambio no aplicado para no alterar el comportamiento de pruebas sin acuerdo del equipo. |
| **R3** | `script_completo.sql` borra el esquema entero. | Alta | Marcado como LEGADO. Considerar eliminarlo cuando todos hayan adoptado Alembic. |
| **R4** | `.github/workflows/tests.yml` está en `backend/.github/`; GitHub solo lee `.github/workflows/` **en la raíz** del repositorio, por lo que ese CI no se ejecuta. | Media | Mover a la raíz y añadir un servicio PostgreSQL. |
| **R5** | `docker-compose.yml` contiene credenciales y `SECRET_KEY` de desarrollo en texto plano; `CORS_ORIGINS: "*"`. | Media | Aceptable para desarrollo; usar un `.env` no versionado en otros entornos. |
| **R6** | `requirements.txt` incluye `pytest`, `pytest-cov` y `httpx` en la imagen de ejecución. | Baja | Separar `requirements-dev.txt` más adelante. |

---

## 10. Estado de validación (honestidad ante todo)

El entorno donde se preparó este cambio **no tenía SQLAlchemy, Alembic, PostgreSQL ni Docker, ni acceso a red**. Por tanto:

**Ejecutado y superado**
- Compilación de sintaxis de `env.py`, `0001_baseline.py` y `0002_sync_modelos.py`.
- Comparación estática (AST) de `0002` contra `models.py`: 4 tablas (53 columnas), tipos, nulabilidad, claves foráneas, 7 índices y 5 enums, **0 discrepancias**; verificador comprobado con 5 errores introducidos a propósito (los 5 detectados).
- Cobertura línea a línea: cada sentencia de `script_completo.sql` está en el baseline, en el seed de desarrollo o excluida a propósito; **0 sin explicar**.
- Baseline sin sentencias destructivas (`DROP`, `TRUNCATE`, `DELETE`); verificador de esquema sin sentencias que modifiquen.
- `docker-compose.yml`: YAML válido; `db`, `backend` y `frontend` **idénticos** al original tras resolver anclas.
- `alembic.ini` interpretado correctamente por `ConfigParser`.

**No ejecutado (hay que validar en su máquina, en este orden)**
1. `docker compose build migrate` — la imagen se construye con `alembic==1.14.0`.
2. En una BD **vacía y desechable** (p. ej. un compose aparte): `docker compose run --rm migrate` — termina sin error.
3. `docker compose run --rm migrate alembic current` — `0002_sync_modelos (head)`.
4. `docker compose run --rm migrate alembic check` — revisar la lista de diferencias (sección 6) y clasificarla.
5. `docker compose up -d` — el backend arranca y `/health` responde `ok`; iniciar sesión funciona.
6. Escenario 5-B con una **copia** de una BD con datos, nunca primero con la real.
7. `alembic revision --autogenerate` con un cambio trivial — genera algo coherente y no propone borrar `usuario_roles` sin avisar.
8. `pytest` en `backend/` (con una BD de pruebas separada).

Hasta que 1–3 pasen, trate esta entrega como **lista para revisión, no como verificada**.
