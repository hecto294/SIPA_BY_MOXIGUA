from sqlalchemy import create_engine, text
from passlib.context import CryptContext

engine = create_engine(
    "postgresql+psycopg2://sipa_user:sipa_password@sipa_db:5432/sipa_db"
    "?options=-c%20search_path=etapa_productiva"
)
h = CryptContext(schemes=["bcrypt"]).hash("Admin1234*")

with engine.begin() as c:
    c.execute(text("INSERT INTO programas_formacion (codigo, nombre, is_active) VALUES ('ADSO','Análisis y Desarrollo de Software',true) ON CONFLICT (codigo) DO NOTHING"))
    c.execute(text("INSERT INTO fichas (programa_id, numero_ficha, fecha_inicio, fecha_fin, nivel, jornada, aprendices_esperados, is_active) SELECT id,'2875902','2024-01-19','2025-12-19','Tecnólogo','Mañana',1,true FROM programas_formacion WHERE codigo='ADSO' ON CONFLICT (numero_ficha) DO NOTHING"))
    c.execute(text("INSERT INTO modalidades_ep (nombre, is_active) VALUES ('Contrato de aprendizaje', true) ON CONFLICT (nombre) DO NOTHING"))
    c.execute(text("INSERT INTO empresas (nit, razon_social, arl, is_active) VALUES ('900123456','TechSoft S.A.S.','SURA',true) ON CONFLICT (nit) DO NOTHING"))
    c.execute(text("INSERT INTO coordinadores_empresa (empresa_id, nombre, is_active) SELECT id,'Ana Gómez',true FROM empresas WHERE nit='900123456' AND NOT EXISTS (SELECT 1 FROM coordinadores_empresa WHERE nombre='Ana Gómez')"))
    c.execute(text("INSERT INTO usuarios (nombre, apellido, email, password_hash, rol_id, is_active) VALUES ('Carlos','Ramírez','carlos@test.com',:h,3,true) ON CONFLICT (email) DO NOTHING"), {"h": h})
    c.execute(text("INSERT INTO usuarios (nombre, apellido, email, password_hash, rol_id, tipo_documento, documento_identidad, telefono, is_active) VALUES ('Laura','Martínez','laura@test.com',:h,4,'CC','111111111','3001111111',true) ON CONFLICT (email) DO NOTHING"), {"h": h})
    c.execute(text("""
        INSERT INTO procesos_etapa_productiva
          (aprendiz_id, ficha_id, modalidad_id, empresa_id, coordinador_empresa_id, instructor_id,
           fecha_inicio, fecha_fin, estado, estado_sofia, is_active)
        SELECT a.id, f.id, m.id, e.id, ce.id, i.id,
               '2025-01-19','2025-12-19','ACTIVO','PENDIENTE',true
        FROM usuarios a, usuarios i, fichas f, modalidades_ep m, empresas e, coordinadores_empresa ce
        WHERE a.email='laura@test.com' AND i.email='carlos@test.com' AND f.numero_ficha='2875902'
          AND m.nombre='Contrato de aprendizaje' AND e.nit='900123456' AND ce.empresa_id=e.id
          AND NOT EXISTS (SELECT 1 FROM procesos_etapa_productiva p WHERE p.aprendiz_id=a.id AND p.ficha_id=f.id)
    """))
print("Datos de prueba listos")
