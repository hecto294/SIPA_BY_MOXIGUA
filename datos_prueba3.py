"""
Datos de prueba ampliados para el Centro de Fichas (Tarea 3).

Ejecutar DESPUÉS de run_all.py (y opcionalmente de datos_prueba.py / datos_prueba2.py):

    python datos_prueba3.py

Es idempotente: se puede ejecutar varias veces sin duplicar registros.
Deja TODAS las columnas de la tabla con datos: programa, ficha, fechas del grupo,
duración, nivel, modalidad, tipo/número de documento, nombre, correo, RAPs
pendientes, % RAPs, estado del registro, alternativa, estado de la alternativa,
fechas de la alternativa y fechas de contrato.
"""
import datetime as dt
from sqlalchemy import create_engine, text
from passlib.context import CryptContext

engine = create_engine(
    "postgresql+psycopg2://sipa_user:sipa_password@sipa_db:5432/sipa_db"
    "?options=-c%20search_path=etapa_productiva"
)
h = CryptContext(schemes=["bcrypt"]).hash("Admin1234*")
TOTAL_RAPS = 24


def one(c, sql, **p):
    return c.execute(text(sql), p).scalar()


def sin_tildes(s):
    for a, b in zip("áéíóúñÁÉÍÓÚÑ", "aeiounAEIOUN"):
        s = s.replace(a, b)
    return s


programas = [
    ("ADSO", "Análisis y Desarrollo de Software"), ("CONT", "Contabilidad y Finanzas"),
    ("GEMP", "Gestión Empresarial"), ("DWEB", "Desarrollo Web"),
    ("MULT", "Producción Multimedia"), ("LOGI", "Gestión Logística"),
]
# (ficha, programa, nivel, jornada, inicio, fin)
fichas = [
    ("2875901", "ADSO", "Tecnólogo", "Mañana", "2023-12-31", "2027-12-30"),
    ("2875902", "ADSO", "Tecnólogo", "Mañana", "2024-01-19", "2025-12-19"),
    ("2875903", "CONT", "Técnico", "Tarde", "2024-06-03", "2026-06-02"),
    ("2875904", "DWEB", "Tecnólogo", "Noche", "2025-03-02", "2027-03-01"),
    ("2875905", "GEMP", "Tecnólogo", "Mañana", "2024-02-12", "2026-02-11"),
    ("2875906", "MULT", "Tecnólogo", "Tarde", "2024-08-05", "2026-08-04"),
    ("2875907", "LOGI", "Técnico", "Mañana", "2024-03-18", "2026-03-17"),
    ("2875908", "CONT", "Tecnólogo", "Noche", "2024-10-01", "2026-09-30"),
]
modalidades = ["Contrato de aprendizaje", "Pasantía", "Vínculo laboral",
               "Proyecto productivo", "Unidad productiva familiar"]
empresas = [
    ("900123456", "TechSoft S.A.S.", "SURA", "Ana Gómez"),
    ("800987654", "Industrias Andina Ltda.", "Positiva", "Luis Torres"),
    ("901555222", "Soluciones Digitales SAS", "Colmena", "Paula Ríos"),
    ("860111333", "Comercial del Norte S.A.", "SURA", "Jorge Díaz"),
    ("900777888", "Logística Express S.A.S.", "Bolívar", "Marcela Ortiz"),
    ("830456789", "Grupo Contable Andes", "Colmena", "Ricardo Salcedo"),
]
instructores = [
    ("Carlos", "Ramírez", "carlos@test.com"), ("Marta", "Rojas", "marta@test.com"),
    ("Julián", "Pérez", "julian@test.com"), ("Patricia", "Londoño", "patricia@test.com"),
    ("Hernán", "Vargas", "hernan@test.com"),
]

# 20 aprendices originales (datos_prueba2.py) + 40 nuevos = 60
nombres_orig = [
    "Laura Martínez", "Andrés Castro", "Camila Herrera", "Sebastián Gil", "Valentina Mora", "Daniel Ortiz",
    "Juliana Vega", "Santiago Rey", "Natalia Cruz", "Mateo Salazar", "Isabella Peña", "Samuel Ruiz",
    "Sofía Ramos", "Nicolás Duarte", "Mariana León", "Tomás Acosta", "Daniela Pardo", "Felipe Cano",
    "Gabriela Soto", "Esteban Mejía",
]
pila = ["Alejandro", "Carolina", "Diego", "Paula", "Jhon", "Lina", "Cristian", "Yesica", "Brayan", "Karen",
        "Wilmer", "Angie", "Óscar", "Lorena", "Fabián", "Tatiana", "Kevin", "Melissa", "Jairo", "Stefany"]
apellidos = ["Gómez Rincón", "Torres Beltrán", "Ríos Quintero", "Díaz Montoya", "Ortiz Parra", "Salcedo Arias",
             "Vargas Molina", "Londoño Suárez", "Cardona Ibáñez", "Bernal Forero"]
nuevos = []
for k in range(40):
    nuevos.append(f"{pila[k % 20]} {apellidos[(k * 3 + k // 20) % 10]}")
aprendices = nombres_orig + nuevos

estados = ["ACTIVO", "ACTIVO", "ACTIVO", "CONDICIONADO", "FINALIZADO", "ACTIVO", "APLAZADO", "ACTIVO", "RETIRADO", "ACTIVO"]

with engine.begin() as c:
    # --- Sincroniza los contadores de id (la base puede traer registros con id fijo) ---
    for tabla in ("roles", "usuarios", "programas_formacion", "fichas", "modalidades_ep", "empresas",
                  "coordinadores_empresa", "procesos_etapa_productiva", "novedades_proceso"):
        c.execute(text(
            f"SELECT setval(pg_get_serial_sequence('etapa_productiva.{tabla}', 'id'), "
            f"COALESCE((SELECT MAX(id) FROM etapa_productiva.{tabla}), 0) + 1, false) "
            f"WHERE pg_get_serial_sequence('etapa_productiva.{tabla}', 'id') IS NOT NULL"))

    # --- Compatibilidad con bases antiguas: columnas viejas que ya no se usan ---
    for col in ("password", "rol"):
        existe = one(c, "SELECT 1 FROM information_schema.columns WHERE table_schema='etapa_productiva' "
                        "AND table_name='usuarios' AND column_name=:col AND is_nullable='NO'", col=col)
        if existe:
            c.execute(text(f'ALTER TABLE usuarios ALTER COLUMN "{col}" DROP NOT NULL'))

    # --- Datos vacíos de registros anteriores ---
    c.execute(text("UPDATE usuarios SET preferencias_ui='{}' WHERE preferencias_ui IS NULL"))
    c.execute(text("UPDATE usuarios SET created_at=now() WHERE created_at IS NULL"))
    c.execute(text("UPDATE usuarios SET updated_at=now() WHERE updated_at IS NULL"))
    c.execute(text("UPDATE fichas SET nivel='Tecnólogo' WHERE nivel IS NULL OR nivel=''"))
    c.execute(text("UPDATE fichas SET jornada='Mañana' WHERE jornada IS NULL OR jornada=''"))

    # --- Roles (si no existen) ---
    for rid, rn in [(1, "ADMIN"), (2, "COORDINADOR"), (3, "INSTRUCTOR"), (4, "APRENDIZ"),
                    (5, "APOYO_ADMINISTRATIVO"), (6, "CONSULTA")]:
        c.execute(text("INSERT INTO roles (id, nombre, is_active) VALUES (:i,:n,true) ON CONFLICT (id) DO NOTHING"),
                  {"i": rid, "n": rn})

    # --- Usuarios de acceso (contraseña Test1234) ---
    h_test = CryptContext(schemes=["bcrypt"]).hash("Test1234")
    for nom, ape, em, rid in [("Usuario", "Admin", "usuario1@test.com", 1), ("Usuario", "Instructor", "usuario2@test.com", 3),
                              ("Usuario", "Aprendiz", "usuario3@test.com", 4), ("Usuario", "Coordinador", "usuario4@test.com", 2),
                              ("Usuario", "Consulta", "usuario5@test.com", 6),
                              ("Admin", "SIPA", "admin@sipa.com", 1)]:
        c.execute(text("INSERT INTO usuarios (nombre, apellido, email, password_hash, rol_id, is_active) "
                       "VALUES (:n,:a,:e,:h,:r,true) ON CONFLICT (email) DO UPDATE SET password_hash=:h, rol_id=:r, is_active=true"),
                  {"n": nom, "a": ape, "e": em, "h": h_test if em != "admin@sipa.com" else h, "r": rid})

    # --- Columnas nuevas de procesos (por si la tabla ya existía sin ellas) ---
    c.execute(text("ALTER TABLE procesos_etapa_productiva ADD COLUMN IF NOT EXISTS raps_pendientes INTEGER"))
    c.execute(text("ALTER TABLE procesos_etapa_productiva ADD COLUMN IF NOT EXISTS porcentaje_raps NUMERIC(5,2)"))
    c.execute(text("ALTER TABLE procesos_etapa_productiva ADD COLUMN IF NOT EXISTS fecha_inicio_contrato DATE"))
    c.execute(text("ALTER TABLE procesos_etapa_productiva ADD COLUMN IF NOT EXISTS fecha_fin_contrato DATE"))

    # --- Catálogos ---
    for cod, nom in programas:
        c.execute(text("INSERT INTO programas_formacion (codigo, nombre, is_active) VALUES (:c,:n,true) "
                       "ON CONFLICT (codigo) DO NOTHING"), {"c": cod, "n": nom})
    for num, prog, niv, jor, ini, fin in fichas:
        c.execute(text(
            "INSERT INTO fichas (programa_id, numero_ficha, fecha_inicio, fecha_fin, nivel, jornada, aprendices_esperados, is_active) "
            "SELECT id,:num,:ini,:fin,:niv,:jor,0,true FROM programas_formacion WHERE codigo=:p "
            "ON CONFLICT (numero_ficha) DO NOTHING"),
            {"num": num, "ini": ini, "fin": fin, "niv": niv, "jor": jor, "p": prog})
    for m in modalidades:
        c.execute(text("INSERT INTO modalidades_ep (nombre, is_active) VALUES (:n,true) ON CONFLICT (nombre) DO NOTHING"), {"n": m})
    for nit, rs, arl, coord in empresas:
        c.execute(text("INSERT INTO empresas (nit, razon_social, arl, is_active) VALUES (:n,:r,:a,true) ON CONFLICT (nit) DO NOTHING"),
                  {"n": nit, "r": rs, "a": arl})
        c.execute(text("INSERT INTO coordinadores_empresa (empresa_id, nombre, is_active) SELECT id,:co,true FROM empresas "
                       "WHERE nit=:n AND NOT EXISTS (SELECT 1 FROM coordinadores_empresa WHERE nombre=:co)"),
                  {"co": coord, "n": nit})
    for nom, ape, em in instructores:
        c.execute(text("INSERT INTO usuarios (nombre, apellido, email, password_hash, rol_id, telefono, is_active) "
                       "VALUES (:n,:a,:e,:h,3,:t,true) ON CONFLICT (email) DO NOTHING"),
                  {"n": nom, "a": ape, "e": em, "h": h, "t": "3205550" + str(100 + len(em))})

    inst_ids = [one(c, "SELECT id FROM usuarios WHERE email=:e", e=e[2]) for e in instructores]
    mod_ids = [one(c, "SELECT id FROM modalidades_ep WHERE nombre=:n", n=m) for m in modalidades]
    emp = [(one(c, "SELECT id FROM empresas WHERE nit=:n", n=e[0]),
            one(c, "SELECT id FROM coordinadores_empresa WHERE nombre=:n", n=e[3])) for e in empresas]
    ficha_ids = [one(c, "SELECT id FROM fichas WHERE numero_ficha=:n", n=f[0]) for f in fichas]

    # --- Aprendices + procesos ---
    for i, nombre in enumerate(aprendices):
        nom, ape = nombre.split(" ", 1)
        if i < 20:  # mismos correos/documentos que datos_prueba2.py
            email = sin_tildes(nom.lower()) + "@test.com"
            doc = "111111111" if i == 0 else str(1000000000 + i * 7919)
        else:
            email = f"{sin_tildes(nom.lower())}.{sin_tildes(ape.split()[0].lower())}{i}@test.com"
            doc = str(1100000000 + i * 7919)
        tel = "3" + str(100000000 + i * 31337)[:9]
        tipo = "TI" if i % 6 == 5 else ("CE" if i % 17 == 16 else "CC")
        c.execute(text(
            "INSERT INTO usuarios (nombre, apellido, email, password_hash, rol_id, tipo_documento, documento_identidad, telefono, is_active) "
            "VALUES (:n,:a,:e,:h,4,:td,:d,:t,true) ON CONFLICT (email) DO NOTHING"),
            {"n": nom, "a": ape, "e": email, "h": h, "td": tipo, "d": doc, "t": tel})
        aid = one(c, "SELECT id FROM usuarios WHERE email=:e", e=email)
        ini = dt.date(2025, 1, 15) + dt.timedelta(days=30 * (i % 6))
        fin = ini + dt.timedelta(days=180)
        empresa_id, coord_id = emp[i % len(emp)]
        c.execute(text("""
            INSERT INTO procesos_etapa_productiva
              (aprendiz_id, ficha_id, modalidad_id, empresa_id, coordinador_empresa_id, instructor_id,
               fecha_inicio, fecha_fin, estado, estado_sofia, is_active)
            SELECT :a,:f,:m,:e,:ce,:i,:ini,:fin,:es,'PENDIENTE',true
            WHERE NOT EXISTS (SELECT 1 FROM procesos_etapa_productiva WHERE aprendiz_id=:a)
        """), {"a": aid, "f": ficha_ids[i % len(ficha_ids)], "m": mod_ids[i % 5], "e": empresa_id, "ce": coord_id,
               "i": inst_ids[i % len(inst_ids)], "ini": ini, "fin": fin, "es": estados[i % 10]})

    # --- Toda ficha debe tener al menos 4 aprendices activos (si no, la fila saldría vacía) ---
    MIN_POR_FICHA = 4
    extra = 0
    todas_fichas = [r[0] for r in c.execute(text("SELECT id FROM fichas ORDER BY id")).fetchall()]
    for fi_idx, fid in enumerate(todas_fichas):
        activos = one(c, "SELECT COUNT(*) FROM procesos_etapa_productiva WHERE ficha_id=:f AND is_active=true", f=fid)
        while activos < MIN_POR_FICHA:
            extra += 1
            k = 60 + extra
            nom = pila[k % 20]
            ape = apellidos[(k * 7) % 10]
            email = f"{sin_tildes(nom.lower())}.{sin_tildes(ape.split()[0].lower())}{k}@test.com"
            c.execute(text(
                "INSERT INTO usuarios (nombre, apellido, email, password_hash, rol_id, tipo_documento, documento_identidad, telefono, is_active) "
                "VALUES (:n,:a,:e,:h,4,'CC',:d,:t,true) ON CONFLICT (email) DO NOTHING"),
                {"n": nom, "a": ape, "e": email, "h": h, "d": str(1200000000 + k * 7919), "t": "3" + str(100000000 + k * 31337)[:9]})
            aid = one(c, "SELECT id FROM usuarios WHERE email=:e", e=email)
            ini = dt.date(2025, 2, 10) + dt.timedelta(days=21 * (k % 6))
            empresa_id, coord_id = emp[k % len(emp)]
            c.execute(text("""
                INSERT INTO procesos_etapa_productiva
                  (aprendiz_id, ficha_id, modalidad_id, empresa_id, coordinador_empresa_id, instructor_id,
                   fecha_inicio, fecha_fin, estado, estado_sofia, is_active)
                SELECT :a,:f,:m,:e,:ce,:i,:ini,:fin,:es,'PENDIENTE',true
                WHERE NOT EXISTS (SELECT 1 FROM procesos_etapa_productiva WHERE aprendiz_id=:a)
            """), {"a": aid, "f": fid, "m": mod_ids[k % 5], "e": empresa_id, "ce": coord_id,
                   "i": inst_ids[k % len(inst_ids)], "ini": ini, "fin": ini + dt.timedelta(days=180),
                   "es": estados[k % 10]})
            activos = one(c, "SELECT COUNT(*) FROM procesos_etapa_productiva WHERE ficha_id=:f AND is_active=true", f=fid)

    # --- Aprendices con datos personales vacíos: se rellenan ---
    ap = c.execute(text(
        "SELECT DISTINCT u.id FROM usuarios u JOIN procesos_etapa_productiva p ON p.aprendiz_id=u.id "
        "WHERE u.tipo_documento IS NULL OR u.documento_identidad IS NULL OR u.documento_identidad='' "
        "OR u.telefono IS NULL OR u.telefono=''")).fetchall()
    for (uid,) in ap:
        c.execute(text("UPDATE usuarios SET tipo_documento=COALESCE(tipo_documento,'CC'), "
                       "documento_identidad=COALESCE(NULLIF(documento_identidad,''), :d), "
                       "telefono=COALESCE(NULLIF(telefono,''), :t) WHERE id=:id"),
                  {"d": str(1300000000 + uid * 7919), "t": "3" + str(150000000 + uid * 31337)[:9], "id": uid})

    # Procesos con empresa/modalidad/instructor vacíos o fechas incoherentes se completan abajo.
    # --- Completar TODOS los campos de TODOS los procesos (incluidos los ya existentes) ---
    filas = c.execute(text(
        "SELECT id, estado::text, fecha_inicio, fecha_fin, empresa_id, modalidad_id FROM procesos_etapa_productiva ORDER BY id")).fetchall()
    for n, (pid, estado, fi, ff, empresa_id, modalidad_id) in enumerate(filas):
        if estado == "FINALIZADO":
            pend = 0
        else:
            pend = (pid * 5 + n) % 9 + 1
        pct = round((TOTAL_RAPS - pend) * 100 / TOTAL_RAPS, 2)
        params = {"id": pid, "p": pend, "pc": pct,
                  "ci": fi + dt.timedelta(days=7), "cf": ff - dt.timedelta(days=7)}
        c.execute(text("UPDATE procesos_etapa_productiva SET raps_pendientes=COALESCE(raps_pendientes,:p), "
                       "porcentaje_raps=COALESCE(porcentaje_raps,:pc), "
                       "fecha_inicio_contrato=COALESCE(fecha_inicio_contrato,:ci), "
                       "fecha_fin_contrato=COALESCE(fecha_fin_contrato,:cf) WHERE id=:id"), params)
        if empresa_id is None:
            e_id, ce_id = emp[n % len(emp)]
            c.execute(text("UPDATE procesos_etapa_productiva SET empresa_id=:e, coordinador_empresa_id=:ce WHERE id=:id"),
                      {"e": e_id, "ce": ce_id, "id": pid})
        if modalidad_id is None:
            c.execute(text("UPDATE procesos_etapa_productiva SET modalidad_id=:m WHERE id=:id"),
                      {"m": mod_ids[n % 5], "id": pid})

    # Aprendices esperados = aprendices reales de cada ficha
    c.execute(text("UPDATE fichas f SET aprendices_esperados = (SELECT COUNT(*) FROM procesos_etapa_productiva p WHERE p.ficha_id=f.id)"))

    # --- Algunas novedades de ejemplo ---
    ejemplos = [
        ("OTRO", "Cambio de ficha: pasa de la ficha 2875902 a la 2875901 por reubicación de horario."),
        ("CAMBIO_EMPRESA", "Cambio de empresa por cierre de la unidad productiva donde estaba vinculado."),
        ("INCAPACIDAD", "Incapacidad médica de 15 días con soporte de la EPS."),
        ("PRORROGA", "Prórroga de 2 meses de la etapa productiva autorizada por el coordinador."),
        ("RENUNCIA", "Renuncia voluntaria a la empresa por motivos personales."),
    ]
    pids = [r[0] for r in c.execute(text("SELECT id FROM procesos_etapa_productiva ORDER BY id")).fetchall()]
    for k, pid in enumerate(pids[::4]):
        tipo, desc = ejemplos[k % len(ejemplos)]
        c.execute(text(
            "INSERT INTO novedades_proceso (proceso_id, tipo_novedad, fecha_novedad, descripcion, is_active) "
            "SELECT :p, CAST(:t AS tipo_novedad_t), :f, :d, true "
            "WHERE NOT EXISTS (SELECT 1 FROM novedades_proceso WHERE proceso_id=:p AND descripcion=:d)"),
            {"p": pid, "t": tipo, "f": dt.date(2025, 3, 1) + dt.timedelta(days=9 * k), "d": desc})

print("Datos de prueba ampliados listos: 8 fichas, 60 aprendices con todos los campos completos.")
