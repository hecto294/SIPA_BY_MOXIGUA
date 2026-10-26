-- ============================================================
-- VERIFICACIÓN DE ESQUEMA ANTES DE ADOPTAR ALEMBIC   (SOLO LECTURA)
-- ------------------------------------------------------------
-- Este script NO modifica nada: solo contiene SELECT.
-- Úselo ANTES de "alembic stamp 0001_baseline" en una BD que ya
-- tiene tablas y datos. Si alguna fila dice FALTA en las secciones
-- 1 a 4, NO haga stamp: el esquema no coincide con el baseline.
--
-- Uso (terminal del sistema, en la raíz del repo):
--   docker compose cp backend/scripts/verificar_esquema.sql db:/tmp/verificar_esquema.sql
--   docker compose exec db psql -U sipa_user -d sipa_db -f /tmp/verificar_esquema.sql
-- ============================================================

\echo
\echo '=== 0) Estado de Alembic en esta BD ==='
SELECT CASE WHEN to_regclass('etapa_productiva.alembic_version') IS NULL
            THEN 'alembic_version NO existe (BD sin adoptar)'
            ELSE 'alembic_version existe: use "alembic current" para ver la revisión'
       END AS estado;

\echo
\echo '=== 1) Tablas del baseline (20 esperadas) ==='
WITH esperadas(nombre) AS (VALUES
    ('roles'),
    ('usuarios'),
    ('usuario_roles'),
    ('programas_formacion'),
    ('fichas'),
    ('asignaciones_instructor_ficha'),
    ('modalidades_ep'),
    ('empresas'),
    ('coordinadores_empresa'),
    ('evidencias_archivos'),
    ('procesos_etapa_productiva'),
    ('reuniones_seguimiento'),
    ('bitacoras'),
    ('bitacora_evidencias'),
    ('novedades_proceso'),
    ('checklist_documentos_proceso'),
    ('medidas_formativas_proceso'),
    ('charlas'),
    ('asistencias_charlas'),
    ('notificaciones_mensajes')
)
SELECT e.nombre AS tabla,
       CASE WHEN t.tablename IS NULL THEN 'FALTA' ELSE 'ok' END AS estado
FROM esperadas e
LEFT JOIN pg_tables t ON t.schemaname = 'etapa_productiva' AND t.tablename = e.nombre
ORDER BY (t.tablename IS NULL) DESC, e.nombre;

\echo
\echo '=== 2) Tipos ENUM del baseline (12 esperados) ==='
WITH esperados(nombre) AS (VALUES
    ('estado_bitacora_t'),
    ('momento_reunion_t'),
    ('tipo_charla_t'),
    ('estado_proceso_t'),
    ('estado_sofia_t'),
    ('tipo_novedad_t'),
    ('estado_envio_email_t'),
    ('estado_asignacion_t'),
    ('tipo_documento_t'),
    ('estado_documento_t'),
    ('estado_medida_formativa_t'),
    ('estado_correo_desercion_t')
),
existentes AS (
    SELECT ty.typname
    FROM pg_type ty JOIN pg_namespace n ON n.oid = ty.typnamespace
    WHERE n.nspname = 'etapa_productiva' AND ty.typtype = 'e'
)
SELECT e.nombre AS tipo_enum,
       CASE WHEN x.typname IS NULL THEN 'FALTA' ELSE 'ok' END AS estado
FROM esperados e LEFT JOIN existentes x ON x.typname = e.nombre
ORDER BY (x.typname IS NULL) DESC, e.nombre;

\echo
\echo '=== 3) Función set_updated_at ==='
SELECT CASE WHEN EXISTS (
         SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'etapa_productiva' AND p.proname = 'set_updated_at')
       THEN 'ok' ELSE 'FALTA' END AS set_updated_at;

\echo
\echo '=== 4) Triggers *_updated_at del baseline (20 esperados) ==='
WITH esperados(trigger_nombre, tabla) AS (VALUES
    ('trg_roles_updated_at','roles'),
    ('trg_usuarios_updated_at','usuarios'),
    ('trg_usuario_roles_updated_at','usuario_roles'),
    ('trg_programas_updated_at','programas_formacion'),
    ('trg_fichas_updated_at','fichas'),
    ('trg_asig_updated_at','asignaciones_instructor_ficha'),
    ('trg_modalidades_updated_at','modalidades_ep'),
    ('trg_empresas_updated_at','empresas'),
    ('trg_coordinadores_updated_at','coordinadores_empresa'),
    ('trg_evidencias_updated_at','evidencias_archivos'),
    ('trg_procesos_updated_at','procesos_etapa_productiva'),
    ('trg_charlas_updated_at','charlas'),
    ('trg_asistencias_updated_at','asistencias_charlas'),
    ('trg_reuniones_updated_at','reuniones_seguimiento'),
    ('trg_bitacoras_updated_at','bitacoras'),
    ('trg_bitacora_evid_updated_at','bitacora_evidencias'),
    ('trg_novedades_updated_at','novedades_proceso'),
    ('trg_notificaciones_updated_at','notificaciones_mensajes'),
    ('trg_checklist_updated_at','checklist_documentos_proceso'),
    ('trg_medidas_updated_at','medidas_formativas_proceso')
),
existentes AS (
    SELECT tg.tgname, c.relname
    FROM pg_trigger tg
    JOIN pg_class c ON c.oid = tg.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'etapa_productiva' AND NOT tg.tgisinternal
)
SELECT e.trigger_nombre, e.tabla,
       CASE WHEN x.tgname IS NULL THEN 'FALTA' ELSE 'ok' END AS estado
FROM esperados e
LEFT JOIN existentes x ON x.tgname = e.trigger_nombre AND x.relname = e.tabla
ORDER BY (x.tgname IS NULL) DESC, e.tabla;

\echo
\echo '=== 5) Objetos de la revisión 0002 (informativo) ==='
\echo '    Si ya existen, 0002 los omite; si faltan, 0002 los crea.'
SELECT 'tabla ' || nombre AS objeto,
       CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='etapa_productiva' AND tablename=nombre)
            THEN 'existe' ELSE 'falta' END AS estado
FROM (VALUES ('centros_formacion'),('auditoria'),('alertas'),('cartas_presentacion')) v(nombre)
UNION ALL
SELECT 'columna ' || tabla || '.' || columna,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns
                         WHERE table_schema='etapa_productiva' AND table_name=tabla AND column_name=columna)
            THEN 'existe' ELSE 'falta' END
FROM (VALUES ('usuarios','avatar_url'),('programas_formacion','centro_formacion_id')) v(tabla,columna)
UNION ALL
SELECT 'valor ENUM estado_proceso_t.CONDICIONADO',
       CASE WHEN EXISTS (
            SELECT 1 FROM pg_enum en
            JOIN pg_type ty ON ty.oid = en.enumtypid
            JOIN pg_namespace n ON n.oid = ty.typnamespace
            WHERE n.nspname='etapa_productiva' AND ty.typname='estado_proceso_t' AND en.enumlabel='CONDICIONADO')
            THEN 'existe' ELSE 'falta' END;

\echo
\echo '=== 6) OBJETOS QUE EXISTEN EN LA BD PERO NO ESTÁN EN EL REPOSITORIO ==='
\echo '    (p. ej. triggers de auditoría que usan app.current_user_id).'
\echo '    Cada fila de aquí debe llevarse a una migración o documentarse.'
\echo '--- triggers no incluidos en el baseline ---'
SELECT c.relname AS tabla, tg.tgname AS trigger_nombre
FROM pg_trigger tg
JOIN pg_class c ON c.oid = tg.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'etapa_productiva' AND NOT tg.tgisinternal
  AND tg.tgname NOT IN (
    'trg_roles_updated_at', 'trg_usuarios_updated_at', 'trg_usuario_roles_updated_at', 'trg_programas_updated_at', 'trg_fichas_updated_at', 'trg_asig_updated_at', 'trg_modalidades_updated_at', 'trg_empresas_updated_at', 'trg_coordinadores_updated_at', 'trg_evidencias_updated_at', 'trg_procesos_updated_at', 'trg_charlas_updated_at', 'trg_asistencias_updated_at', 'trg_reuniones_updated_at', 'trg_bitacoras_updated_at', 'trg_bitacora_evid_updated_at', 'trg_novedades_updated_at', 'trg_notificaciones_updated_at', 'trg_checklist_updated_at', 'trg_medidas_updated_at'
  )
ORDER BY 1, 2;
\echo '--- funciones distintas de set_updated_at ---'
SELECT p.proname AS funcion
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'etapa_productiva' AND p.proname <> 'set_updated_at'
ORDER BY 1;
\echo '--- tablas fuera del baseline y de la revisión 0002 ---'
SELECT tablename AS tabla
FROM pg_tables
WHERE schemaname = 'etapa_productiva'
  AND tablename <> 'alembic_version'
  AND tablename NOT IN (
    'roles', 'usuarios', 'usuario_roles', 'programas_formacion', 'fichas', 'asignaciones_instructor_ficha', 'modalidades_ep', 'empresas', 'coordinadores_empresa', 'evidencias_archivos', 'procesos_etapa_productiva', 'reuniones_seguimiento', 'bitacoras', 'bitacora_evidencias', 'novedades_proceso', 'checklist_documentos_proceso', 'medidas_formativas_proceso', 'charlas', 'asistencias_charlas', 'notificaciones_mensajes',
    'centros_formacion','auditoria','alertas','cartas_presentacion'
  )
ORDER BY 1;
