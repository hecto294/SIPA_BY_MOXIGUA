import datetime as dt
from sqlalchemy import create_engine, text
from passlib.context import CryptContext

engine = create_engine(
    "postgresql+psycopg2://sipa_user:sipa_password@sipa_db:5432/sipa_db"
    "?options=-c%20search_path=etapa_productiva"
)
h = CryptContext(schemes=["bcrypt"]).hash("Admin1234*")

def one(c, sql, **p):
    return c.execute(text(sql), p).scalar()

programas = [("ADSO", "Análisis y Desarrollo de Software"), ("CONT", "Contabilidad y Finanzas"),
             ("GEMP", "Gestión Empresarial"), ("DWEB", "Desarrollo Web"), ("MULT", "Producción Multimedia")]
fichas = [("2875901", "ADSO", "Tecnólogo", "Mañana", "2023-12-31", "2027-12-30"),
          ("2875902", "ADSO", "Tecnólogo", "Mañana", "2024-01-19", "2025-12-19"),
          ("2875903", "CONT", "Técnico", "Tarde", "2024-06-03", "2026-06-02"),
          ("2875904", "DWEB", "Tecnólogo", "Noche", "2025-03-02", "2027-03-01"),
          ("2875905", "GEMP", "Tecnólogo", "Mañana", "2024-02-12", "2026-02-11")]
modalidades = ["Contrato de aprendizaje", "Pasantía", "Vínculo laboral", "Proyecto productivo", "Unidad productiva familiar"]
empresas = [("900123456", "TechSoft S.A.S.", "SURA", "Ana Gómez"), ("800987654", "Industrias Andina Ltda.", "Positiva", "Luis Torres"),
            ("901555222", "Soluciones Digitales SAS", "Colmena", "Paula Ríos"), ("860111333", "Comercial del Norte S.A.", "SURA", "Jorge Díaz")]
instructores = [("Marta", "Rojas", "marta@test.com"), ("Julián", "Pérez", "julian@test.com")]
aprendices = ["Laura Martínez", "Andrés Castro", "Camila Herrera", "Sebastián Gil", "Valentina Mora", "Daniel Ortiz",
              "Juliana Vega", "Santiago Rey", "Natalia Cruz", "Mateo Salazar", "Isabella Peña", "Samuel Ruiz",
              "Sofía Ramos", "Nicolás Duarte", "Mariana León", "Tomás Acosta", "Daniela Pardo", "Felipe Cano",
              "Gabriela Soto", "Esteban Mejía"]
estados = ["ACTIVO", "ACTIVO", "ACTIVO", "CONDICIONADO", "FINALIZADO", "ACTIVO", "APLAZADO", "ACTIVO", "RETIRADO", "ACTIVO"]

with engine.begin() as c:
    for cod, nom in programas:
        c.execute(text("INSERT INTO programas_formacion (codigo, nombre, is_active) VALUES (:c,:n,true) ON CONFLICT (codigo) DO NOTHING"), {"c": cod, "n": nom})
    for num, prog, niv, jor, ini, fin in fichas:
        c.execute(text("INSERT INTO fichas (programa_id, numero_ficha, fecha_inicio, fecha_fin, nivel, jornada, aprendices_esperados, is_active) "
                       "SELECT id,:num,:ini,:fin,:niv,:jor,4,true FROM programas_formacion WHERE codigo=:p ON CONFLICT (numero_ficha) DO NOTHING"),
                  {"num": num, "ini": ini, "fin": fin, "niv": niv, "jor": jor, "p": prog})
    for m in modalidades:
        c.execute(text("INSERT INTO modalidades_ep (nombre, is_active) VALUES (:n,true) ON CONFLICT (nombre) DO NOTHING"), {"n": m})
    for nit, rs, arl, coord in empresas:
        c.execute(text("INSERT INTO empresas (nit, razon_social, arl, is_active) VALUES (:n,:r,:a,true) ON CONFLICT (nit) DO NOTHING"), {"n": nit, "r": rs, "a": arl})
        c.execute(text("INSERT INTO coordinadores_empresa (empresa_id, nombre, is_active) SELECT id,:co,true FROM empresas WHERE nit=:n "
                       "AND NOT EXISTS (SELECT 1 FROM coordinadores_empresa WHERE nombre=:co)"), {"co": coord, "n": nit})
    for nom, ape, em in instructores:
        c.execute(text("INSERT INTO usuarios (nombre, apellido, email, password_hash, rol_id, is_active) VALUES (:n,:a,:e,:h,3,true) ON CONFLICT (email) DO NOTHING"),
                  {"n": nom, "a": ape, "e": em, "h": h})

    inst_ids = [one(c, "SELECT id FROM usuarios WHERE email=:e", e=e) for e in ["carlos@test.com", "marta@test.com", "julian@test.com"]]
    mod_ids = [one(c, "SELECT id FROM modalidades_ep WHERE nombre=:n", n=m) for m in modalidades]
    emp = [(one(c, "SELECT id FROM empresas WHERE nit=:n", n=nit),
            one(c, "SELECT id FROM coordinadores_empresa WHERE nombre=:n", n=co)) for nit, _, _, co in empresas]
    ficha_ids = [one(c, "SELECT id FROM fichas WHERE numero_ficha=:n", n=f[0]) for f in fichas]

    for i, nombre in enumerate(aprendices):
        nom, ape = nombre.split(" ", 1)
        email = nom.lower().replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u") + "@test.com"
        doc = str(1000000000 + i * 7919 + 111111111 * (1 if i == 0 else 0)) if i else "111111111"
        c.execute(text("INSERT INTO usuarios (nombre, apellido, email, password_hash, rol_id, tipo_documento, documento_identidad, telefono, is_active) "
                       "VALUES (:n,:a,:e,:h,4,:td,:d,:t,true) ON CONFLICT (email) DO NOTHING"),
                  {"n": nom, "a": ape, "e": email, "h": h, "td": "TI" if i % 6 == 5 else "CC", "d": doc, "t": "3" + str(100000000 + i * 31337)[:9]})
        aid = one(c, "SELECT id FROM usuarios WHERE email=:e", e=email)
        ini = dt.date(2025, 1, 15) + dt.timedelta(days=30 * (i % 6))
        fin = ini + dt.timedelta(days=180)
        empresa_id, coord_id = (None, None) if i % 7 == 6 else emp[i % 4]
        c.execute(text("""
            INSERT INTO procesos_etapa_productiva
              (aprendiz_id, ficha_id, modalidad_id, empresa_id, coordinador_empresa_id, instructor_id,
               fecha_inicio, fecha_fin, estado, estado_sofia, is_active)
            SELECT :a,:f,:m,:e,:ce,:i,:ini,:fin,:es,'PENDIENTE',true
            WHERE NOT EXISTS (SELECT 1 FROM procesos_etapa_productiva WHERE aprendiz_id=:a AND ficha_id=:f)
        """), {"a": aid, "f": ficha_ids[i % 5], "m": mod_ids[i % 5], "e": empresa_id, "ce": coord_id,
               "i": inst_ids[i % 3], "ini": ini, "fin": fin, "es": estados[i % 10]})
print("Datos adicionales listos")
