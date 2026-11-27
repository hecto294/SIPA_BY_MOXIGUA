SET search_path TO etapa_productiva;

INSERT INTO programas_formacion (codigo, nombre, descripcion)
SELECT v.codigo, v.nombre, v.descripcion
FROM (VALUES
  ('228106', 'Análisis y Desarrollo de Software', 'Tecnólogo en desarrollo de software'),
  ('233104', 'Gestión Empresarial', 'Tecnólogo en gestión empresarial'),
  ('221120', 'Gestión Contable y de Información Financiera', 'Tecnólogo en contabilidad'),
  ('228172', 'Producción de Multimedia', 'Tecnólogo en producción multimedia'),
  ('223315', 'Gestión de Redes de Datos', 'Tecnólogo en redes de datos'),
  ('122111', 'Programación de Software', 'Técnico en programación'),
  ('134100', 'Mantenimiento de Equipos de Cómputo', 'Técnico en mantenimiento'),
  ('137102', 'Asistencia Administrativa', 'Técnico en asistencia administrativa')
) AS v(codigo, nombre, descripcion)
WHERE NOT EXISTS (SELECT 1 FROM programas_formacion p WHERE p.codigo = v.codigo);

INSERT INTO fichas (programa_id, numero_ficha, fecha_inicio, fecha_fin, nivel, jornada, aprendices_esperados)
SELECT p.id, v.numero, v.fi::date, v.ff::date, v.nivel, v.jornada, v.n
FROM (VALUES
  ('228106', '2758801', '2025-01-20', '2026-12-15', 'Tecnólogo', 'Diurna', 30),
  ('228106', '2758802', '2025-02-10', '2027-01-30', 'Tecnólogo', 'Nocturna', 28),
  ('233104', '2758903', '2025-03-03', '2027-02-26', 'Tecnólogo', 'Diurna', 32),
  ('221120', '2759004', '2025-01-27', '2026-12-18', 'Tecnólogo', 'Mixta', 25),
  ('228172', '2759105', '2025-04-07', '2027-03-26', 'Tecnólogo', 'Diurna', 27),
  ('223315', '2759206', '2025-05-12', '2027-04-30', 'Tecnólogo', 'Nocturna', 30),
  ('122111', '2759307', '2025-06-02', '2026-06-26', 'Técnico', 'Diurna', 35),
  ('134100', '2759408', '2025-07-14', '2026-07-31', 'Técnico', 'Mixta', 24),
  ('137102', '2759509', '2025-08-04', '2026-08-28', 'Técnico', 'Nocturna', 26)
) AS v(pcod, numero, fi, ff, nivel, jornada, n)
JOIN programas_formacion p ON p.codigo = v.pcod
WHERE NOT EXISTS (SELECT 1 FROM fichas f WHERE f.numero_ficha = v.numero);

INSERT INTO modalidades_ep (nombre, descripcion)
SELECT v.nombre, v.descripcion
FROM (VALUES
  ('Contrato de aprendizaje', 'Vinculación laboral con empresa patrocinadora'),
  ('Pasantía', 'Práctica en una empresa u organización'),
  ('Vínculo laboral', 'Aprendiz con contrato laboral vigente'),
  ('Proyecto productivo', 'Desarrollo de un proyecto productivo propio'),
  ('Unidad productiva familiar', 'Práctica en unidad productiva familiar'),
  ('Monitoría', 'Apoyo en actividades de formación del centro')
) AS v(nombre, descripcion)
WHERE NOT EXISTS (SELECT 1 FROM modalidades_ep m WHERE m.nombre = v.nombre);

INSERT INTO empresas (nit, razon_social, direccion, telefono, correo_contacto, arl)
SELECT v.nit, v.razon, v.dir, v.tel, v.correo, v.arl
FROM (VALUES
  ('900123456-1', 'Tecnosoft S.A.S.', 'Cra 15 # 93-40, Bogotá', '6012345678', 'contacto@tecnosoft.example.com', 'Sura'),
  ('900234567-2', 'Soluciones Digitales Ltda.', 'Calle 72 # 10-34, Bogotá', '6012345679', 'rrhh@soluciones.example.com', 'Positiva'),
  ('900345678-3', 'Grupo Andino S.A.', 'Av. El Dorado # 68-50, Bogotá', '6012345680', 'talento@andino.example.com', 'Colmena'),
  ('900456789-4', 'Constructora Horizonte', 'Calle 100 # 19-20, Bogotá', '6012345681', 'personal@horizonte.example.com', 'Bolívar'),
  ('900567890-5', 'Alimentos del Valle S.A.S.', 'Km 3 Vía Mosquera', '6012345682', 'gestionh@alimentos.example.com', 'Sura'),
  ('900678901-6', 'Logística Express S.A.S.', 'Zona Industrial Montevideo', '6012345683', 'empleo@logistica.example.com', 'Axa Colpatria'),
  ('900789012-7', 'Clínica San Rafael', 'Cra 7 # 45-10, Bogotá', '6012345684', 'rrhh@sanrafael.example.com', 'Positiva'),
  ('900890123-8', 'Comercial Moxigua S.A.S.', 'Calle 13 # 32-18, Bogotá', '6012345685', 'info@moxigua.example.com', 'Sura')
) AS v(nit, razon, dir, tel, correo, arl)
WHERE NOT EXISTS (SELECT 1 FROM empresas e WHERE e.nit = v.nit);

INSERT INTO coordinadores_empresa (empresa_id, nombre, cargo, correo, telefono)
SELECT e.id, n.nombre, n.cargo,
       'coord' || n.k || '.emp' || e.id || '@example.com',
       '310' || lpad((e.id * 10 + n.k)::text, 7, '0')
FROM empresas e
CROSS JOIN (VALUES
  (1, 'Carlos Andrés Ramírez', 'Jefe de Talento Humano'),
  (2, 'Diana Marcela Torres', 'Coordinadora de Gestión Humana'),
  (3, 'Jorge Iván Castillo', 'Gerente de Operaciones'),
  (4, 'Paola Andrea Gómez', 'Analista de Selección'),
  (5, 'Luis Fernando Rojas', 'Director Administrativo'),
  (6, 'Natalia Cárdenas', 'Coordinadora de Formación'),
  (7, 'Andrés Felipe Mejía', 'Jefe de Área'),
  (8, 'Sandra Milena Peña', 'Líder de Talento')
) AS n(k, nombre, cargo)
WHERE e.is_active = true
  AND ((n.k + e.id) % 8) < 3
  AND NOT EXISTS (
    SELECT 1 FROM coordinadores_empresa c
    WHERE c.empresa_id = e.id
      AND c.correo = 'coord' || n.k || '.emp' || e.id || '@example.com'
  );

INSERT INTO usuarios (nombre, apellido, email, password_hash, documento_identidad, telefono, rol_id)
SELECT v.nombre, v.apellido, v.email,
       (SELECT password_hash FROM usuarios WHERE rol_id = 1 ORDER BY id LIMIT 1),
       v.doc, v.tel, 4
FROM (VALUES
  ('Juan Sebastián', 'Pérez Gómez', 'juan.perez.apr@example.com', '1001000001', '3001000001'),
  ('María Camila', 'López Rodríguez', 'maria.lopez.apr@example.com', '1001000002', '3001000002'),
  ('Santiago', 'Martínez Cruz', 'santiago.martinez.apr@example.com', '1001000003', '3001000003'),
  ('Valentina', 'Hernández Díaz', 'valentina.hernandez.apr@example.com', '1001000004', '3001000004'),
  ('Daniel Felipe', 'García Torres', 'daniel.garcia.apr@example.com', '1001000005', '3001000005'),
  ('Laura Sofía', 'Ramírez Ortiz', 'laura.ramirez.apr@example.com', '1001000006', '3001000006'),
  ('Andrés Mauricio', 'Castro Vargas', 'andres.castro.apr@example.com', '1001000007', '3001000007'),
  ('Karen Daniela', 'Moreno Silva', 'karen.moreno.apr@example.com', '1001000008', '3001000008'),
  ('Brayan Stiven', 'Suárez Rincón', 'brayan.suarez.apr@example.com', '1001000009', '3001000009'),
  ('Paula Andrea', 'Jiménez Mora', 'paula.jimenez.apr@example.com', '1001000010', '3001000010'),
  ('Oscar Iván', 'Ríos Salazar', 'oscar.rios.apr@example.com', '1001000011', '3001000011'),
  ('Yuliana', 'Patiño Reyes', 'yuliana.patino.apr@example.com', '1001000012', '3001000012')
) AS v(nombre, apellido, email, doc, tel)
WHERE NOT EXISTS (SELECT 1 FROM usuarios u WHERE u.email = v.email)
  AND NOT EXISTS (SELECT 1 FROM usuarios u WHERE u.documento_identidad = v.doc);

INSERT INTO usuarios (nombre, apellido, email, password_hash, documento_identidad, telefono, rol_id)
SELECT v.nombre, v.apellido, v.email,
       (SELECT password_hash FROM usuarios WHERE rol_id = 1 ORDER BY id LIMIT 1),
       v.doc, v.tel, 3
FROM (VALUES
  ('Ricardo', 'Alvarado Núñez', 'ricardo.alvarado.ins@example.com', '2001000001', '3102000001'),
  ('Claudia Patricia', 'Bernal Ruiz', 'claudia.bernal.ins@example.com', '2001000002', '3102000002'),
  ('Héctor Fabián', 'Quintero Parra', 'hector.quintero.ins@example.com', '2001000003', '3102000003'),
  ('Marcela', 'Ospina León', 'marcela.ospina.ins@example.com', '2001000004', '3102000004'),
  ('Gustavo Adolfo', 'Beltrán Acosta', 'gustavo.beltran.ins@example.com', '2001000005', '3102000005'),
  ('Liliana', 'Cortés Duarte', 'liliana.cortes.ins@example.com', '2001000006', '3102000006')
) AS v(nombre, apellido, email, doc, tel)
WHERE NOT EXISTS (SELECT 1 FROM usuarios u WHERE u.email = v.email)
  AND NOT EXISTS (SELECT 1 FROM usuarios u WHERE u.documento_identidad = v.doc);

SELECT 'programas' AS tabla, count(*) FROM programas_formacion
UNION ALL SELECT 'fichas', count(*) FROM fichas
UNION ALL SELECT 'modalidades', count(*) FROM modalidades_ep
UNION ALL SELECT 'empresas', count(*) FROM empresas
UNION ALL SELECT 'coordinadores_empresa', count(*) FROM coordinadores_empresa
UNION ALL SELECT 'aprendices (rol 4)', count(*) FROM usuarios WHERE rol_id = 4
UNION ALL SELECT 'instructores (rol 3)', count(*) FROM usuarios WHERE rol_id = 3;
