-- ============================================================
-- DATOS DE PRUEBA -- SOLO PARA DESARROLLO LOCAL
-- ------------------------------------------------------------
-- Extraído sin cambios de backend/script_completo.sql (sección 10).
-- Contiene usuarios con contraseña conocida (Test1234).
-- NUNCA ejecutar en un entorno compartido o de producción.
-- Requiere que el esquema ya esté migrado:  alembic upgrade head
--
-- Uso (desde la raíz del repo, terminal del sistema):
--   docker compose cp backend/scripts/seed_desarrollo.sql db:/tmp/seed_desarrollo.sql
--   docker compose exec db psql -U sipa_user -d sipa_db -f /tmp/seed_desarrollo.sql
-- ============================================================

SET search_path TO etapa_productiva;

-- 🔹 Programas de formación
INSERT INTO programas_formacion (codigo, nombre, descripcion) VALUES
('228106', 'Análisis y Desarrollo de Software', 'Programa tecnólogo en desarrollo de software'),
('122112', 'Gestión Empresarial', 'Programa tecnólogo en gestión empresarial'),
('133100', 'Contabilidad y Finanzas', 'Programa técnico en contabilidad'),
('228118', 'Desarrollo Web', 'Programa tecnólogo en desarrollo web')
ON CONFLICT (codigo) DO NOTHING;

-- 🔹 Usuarios de prueba (contraseña: Test1234)
INSERT INTO usuarios (nombre, apellido, email, password_hash, rol_id, is_active)
VALUES
    ('Admin',   'Sistema',  'usuario1@test.com', '$2b$12$29YhmtZimHMsmWtc8oWtJeFgik/258Txyc8v6xytmSYXIC4Tudx0i', 1, TRUE),
    ('Carlos',  'Ramírez',  'usuario2@test.com', '$2b$12$29YhmtZimHMsmWtc8oWtJeFgik/258Txyc8v6xytmSYXIC4Tudx0i', 3, TRUE),
    ('Pedro',   'Gómez',    'usuario3@test.com', '$2b$12$29YhmtZimHMsmWtc8oWtJeFgik/258Txyc8v6xytmSYXIC4Tudx0i', 4, TRUE),
    ('Laura',   'Martínez', 'usuario4@test.com', '$2b$12$29YhmtZimHMsmWtc8oWtJeFgik/258Txyc8v6xytmSYXIC4Tudx0i', 2, TRUE),
    ('Andrés',  'Pérez',    'usuario5@test.com', '$2b$12$29YhmtZimHMsmWtc8oWtJeFgik/258Txyc8v6xytmSYXIC4Tudx0i', 6, TRUE)
ON CONFLICT (email) DO NOTHING;

-- 🔹 Fichas de prueba
INSERT INTO fichas (programa_id, numero_ficha, fecha_inicio, fecha_fin, nivel, jornada, aprendices_esperados)
VALUES
    (1, '2875901', '2025-01-15', '2025-12-15', 'Tecnólogo', 'Mañana', 28),
    (2, '2875902', '2025-01-20', '2025-12-20', 'Tecnólogo', 'Tarde', 24),
    (3, '2875903', '2025-02-10', '2025-11-10', 'Técnico', 'Noche', 32),
    (4, '2875904', '2025-03-01', '2025-12-01', 'Tecnólogo', 'Mañana', 20)
ON CONFLICT (numero_ficha) DO NOTHING;

-- 🔹 Empresas de prueba (con ARL)
INSERT INTO empresas (nit, razon_social, direccion, telefono, correo_contacto, arl) VALUES
    ('900123456-1', 'TechSoft S.A.S.', 'Calle 123 #45-67', '3001234567', 'contacto@techsoft.com', 'SURA'),
    ('900987654-2', 'Innovar Solutions', 'Carrera 89 #12-34', '3109876543', 'info@innovar.com', 'Positiva'),
    ('900555444-3', 'SENA - Centro de Formación', 'Calle 100 #20-30', '3153334444', 'sena@sena.edu.co', 'Colpatria')
ON CONFLICT (nit) DO NOTHING;

-- 🔹 Coordinadores de empresa
INSERT INTO coordinadores_empresa (empresa_id, nombre, cargo, correo, telefono)
SELECT e.id, 'Ana Coordinadora', 'Jefe de Talento Humano', 'ana@techsoft.com', '3001234567'
FROM empresas e WHERE e.nit = '900123456-1'
ON CONFLICT DO NOTHING;

INSERT INTO coordinadores_empresa (empresa_id, nombre, cargo, correo, telefono)
SELECT e.id, 'Luis Coordinador', 'Gerente de RRHH', 'luis@innovar.com', '3109876543'
FROM empresas e WHERE e.nit = '900987654-2'
ON CONFLICT DO NOTHING;

-- 🔹 Procesos de etapa productiva (asignan aprendices a la ficha 2875901)
INSERT INTO procesos_etapa_productiva 
    (aprendiz_id, ficha_id, modalidad_id, empresa_id, coordinador_empresa_id, instructor_id, 
     fecha_inicio, fecha_fin, estado, estado_sofia, nota_empresa, nota_instructor)
SELECT 
    u.id, f.id, 1,
    e.id, c.id, 2,
    '2025-01-15', '2025-12-15', 'ACTIVO', 'PENDIENTE', NULL, NULL
FROM usuarios u, fichas f, empresas e, coordinadores_empresa c
WHERE u.email = 'usuario3@test.com'
  AND f.numero_ficha = '2875901'
  AND e.nit = '900123456-1'
  AND c.nombre = 'Ana Coordinadora'
ON CONFLICT DO NOTHING;

INSERT INTO procesos_etapa_productiva 
    (aprendiz_id, ficha_id, modalidad_id, empresa_id, coordinador_empresa_id, instructor_id, 
     fecha_inicio, fecha_fin, estado, estado_sofia)
SELECT 
    u.id, f.id, 2,
    e.id, c.id, 2,
    '2025-01-15', '2025-12-15', 'ACTIVO', 'PENDIENTE'
FROM usuarios u, fichas f, empresas e, coordinadores_empresa c
WHERE u.email = 'usuario5@test.com'
  AND f.numero_ficha = '2875901'
  AND e.nit = '900987654-2'
  AND c.nombre = 'Luis Coordinador'
ON CONFLICT DO NOTHING;
