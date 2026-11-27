"""
Servicio de generación automática de alertas por rol.
Se ejecuta al vuelo cuando el usuario pide GET /alertas/pendientes.
"""
from datetime import datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import (
    ProcesoEtapaProductiva, Bitacora, ReunionSeguimiento,
    ChecklistDocumentoProceso, EstadoBitacora, EstadoProceso,
    Charla, AsistenciaCharla,
)
from app.modules.alertas import crud as alerta_crud


def generar_alertas_instructor(db: Session, instructor_id: int) -> int:
    """Genera alertas para un instructor específico."""
    count = 0
    hoy = datetime.utcnow().date()

    # 1. Bitácoras ENVIADAS sin revisar +7 días
    hace_7 = datetime.utcnow() - timedelta(days=7)
    bitacoras_pendientes = (
        db.query(Bitacora, ProcesoEtapaProductiva)
        .join(ProcesoEtapaProductiva, Bitacora.proceso_id == ProcesoEtapaProductiva.id)
        .filter(
            Bitacora.is_active == True,
            Bitacora.estado == EstadoBitacora.ENVIADA,
            Bitacora.fecha_envio < hace_7,
            ProcesoEtapaProductiva.instructor_id == instructor_id,
            ProcesoEtapaProductiva.is_active == True,
        ).all()
    )

    for b, p in bitacoras_pendientes:
        clave = f"inst_bitacora_pend_{b.id}_{hoy}"
        if alerta_crud.crear_alerta(
            db,
            titulo=f"Bitácora #{b.numero_bitacora} sin revisar",
            mensaje=f"{p.aprendiz_nombre or 'Aprendiz'} envió su bitácora hace +7 días. Pendiente de revisión.",
            tipo="ADVERTENCIA",
            categoria="EVALUACION",
            rol_destino="INSTRUCTOR",
            usuario_id=instructor_id,
            aprendiz_id=p.aprendiz_id,
            proceso_id=p.id,
            entidad_relacionada="bitacora",
            entidad_id=b.id,
            clave_unica=clave,
        ):
            count += 1

    # 2. Reuniones de seguimiento próximas (7 días)
    en_7 = datetime.utcnow() + timedelta(days=7)
    reuniones_proximas = (
        db.query(ReunionSeguimiento, ProcesoEtapaProductiva)
        .join(ProcesoEtapaProductiva, ReunionSeguimiento.proceso_id == ProcesoEtapaProductiva.id)
        .filter(
            ReunionSeguimiento.is_active == True,
            ReunionSeguimiento.fecha_realizada.is_(None),
            ReunionSeguimiento.fecha_programada.between(datetime.utcnow(), en_7),
            ProcesoEtapaProductiva.instructor_id == instructor_id,
            ProcesoEtapaProductiva.is_active == True,
        ).all()
    )

    for r, p in reuniones_proximas:
        clave = f"inst_reunion_prox_{r.id}_{hoy}"
        momento_txt = r.momento.replace("_", " ") if r.momento else "Reunión"
        if alerta_crud.crear_alerta(
            db,
            titulo="Reunión de seguimiento próxima",
            mensaje=f"{momento_txt} con {p.aprendiz_nombre or 'aprendiz'} el {r.fecha_programada.date()}.",
            tipo="INFO",
            categoria="REUNIONES",
            rol_destino="INSTRUCTOR",
            usuario_id=instructor_id,
            aprendiz_id=p.aprendiz_id,
            proceso_id=p.id,
            entidad_relacionada="reunion",
            entidad_id=r.id,
            clave_unica=clave,
        ):
            count += 1

    # 3. Procesos por finalizar (15 días)
    en_15 = hoy + timedelta(days=15)
    procesos_prox = db.query(ProcesoEtapaProductiva).filter(
        ProcesoEtapaProductiva.is_active == True,
        ProcesoEtapaProductiva.estado == EstadoProceso.ACTIVO,
        ProcesoEtapaProductiva.instructor_id == instructor_id,
        ProcesoEtapaProductiva.fecha_fin.between(hoy, en_15),
    ).all()

    for p in procesos_prox:
        clave = f"inst_prox_fin_{p.id}_{hoy}"
        if alerta_crud.crear_alerta(
            db,
            titulo="Aprendiz próximo a finalizar",
            mensaje=f"{p.aprendiz_nombre or 'Aprendiz'} finaliza etapa productiva el {p.fecha_fin}.",
            tipo="ADVERTENCIA",
            categoria="PLAZOS",
            rol_destino="INSTRUCTOR",
            usuario_id=instructor_id,
            aprendiz_id=p.aprendiz_id,
            proceso_id=p.id,
            entidad_relacionada="proceso",
            entidad_id=p.id,
            clave_unica=clave,
        ):
            count += 1

    # 4. Aprendices sin bitácora +30 días
    hace_30 = datetime.utcnow() - timedelta(days=30)
    procesos_activos = db.query(ProcesoEtapaProductiva).filter(
        ProcesoEtapaProductiva.is_active == True,
        ProcesoEtapaProductiva.estado == EstadoProceso.ACTIVO,
        ProcesoEtapaProductiva.instructor_id == instructor_id,
    ).all()

    for p in procesos_activos:
        ultima = db.query(func.max(Bitacora.created_at)).filter(
            Bitacora.proceso_id == p.id,
            Bitacora.is_active == True,
        ).scalar()

        if ultima is None or ultima < hace_30:
            clave = f"inst_sin_bitacora_{p.id}_{hoy.strftime('%Y-%W')}"
            if alerta_crud.crear_alerta(
                db,
                titulo="Aprendiz sin bitácora reciente",
                mensaje=f"{p.aprendiz_nombre or 'Aprendiz'} lleva +30 días sin registrar bitácora.",
                tipo="URGENTE",
                categoria="BITACORAS",
                rol_destino="INSTRUCTOR",
                usuario_id=instructor_id,
                aprendiz_id=p.aprendiz_id,
                proceso_id=p.id,
                entidad_relacionada="proceso",
                entidad_id=p.id,
                clave_unica=clave,
            ):
                count += 1

    # 5. Reuniones de seguimiento vencidas sin realizar
    ahora_inst = datetime.utcnow()
    reuniones_vencidas = (
        db.query(ReunionSeguimiento, ProcesoEtapaProductiva)
        .join(ProcesoEtapaProductiva, ReunionSeguimiento.proceso_id == ProcesoEtapaProductiva.id)
        .filter(
            ReunionSeguimiento.is_active == True,
            ReunionSeguimiento.fecha_realizada.is_(None),
            func.date(ReunionSeguimiento.fecha_programada) < hoy,
            ProcesoEtapaProductiva.instructor_id == instructor_id,
            ProcesoEtapaProductiva.is_active == True,
        ).all()
    )
    for r, p in reuniones_vencidas:
        momento_txt = r.momento.replace("_", " ") if r.momento else "Reunión"
        if alerta_crud.crear_alerta(
            db,
            titulo="Reunión de seguimiento vencida",
            mensaje=f"{momento_txt} con {p.aprendiz_nombre or 'aprendiz'} estaba programada para el {r.fecha_programada.date()} y no se ha registrado.",
            tipo="URGENTE",
            categoria="REUNIONES",
            rol_destino="INSTRUCTOR",
            usuario_id=instructor_id,
            aprendiz_id=p.aprendiz_id,
            proceso_id=p.id,
            entidad_relacionada="reunion",
            entidad_id=r.id,
            clave_unica=f"inst_reunion_venc_{r.id}_{hoy.strftime('%Y-%W')}",
        ):
            count += 1

    # 6. Charlas próximas que dicta el instructor (7 días)
    ahora_ch = datetime.utcnow()
    charlas_inst = db.query(Charla).filter(
        Charla.is_active == True,
        Charla.instructor_id == instructor_id,
        Charla.fecha_programada.between(ahora_ch, ahora_ch + timedelta(days=7)),
    ).all()
    for ch in charlas_inst:
        tipo_txt = ch.tipo_charla.replace("_", " ").title() if ch.tipo_charla else "Charla"
        if alerta_crud.crear_alerta(
            db,
            titulo="Charla próxima a dictar",
            mensaje=f"{tipo_txt} programada para el {ch.fecha_programada.date()}.",
            tipo="INFO",
            categoria="CHARLAS",
            rol_destino="INSTRUCTOR",
            usuario_id=instructor_id,
            entidad_relacionada="charla",
            entidad_id=ch.id,
            clave_unica=f"inst_charla_prox_{ch.id}_{hoy}",
        ):
            count += 1

    return count


def generar_alertas_aprendiz(db: Session, aprendiz_id: int) -> int:
    """Genera alertas para un aprendiz específico."""
    count = 0
    hoy = datetime.utcnow().date()
    mes_actual = hoy.strftime("%Y-%m")

    procesos = db.query(ProcesoEtapaProductiva).filter(
        ProcesoEtapaProductiva.is_active == True,
        ProcesoEtapaProductiva.estado == EstadoProceso.ACTIVO,
        ProcesoEtapaProductiva.aprendiz_id == aprendiz_id,
    ).all()

    for p in procesos:
        # Sin bitácora del mes (a partir del día 25)
        if hoy.day >= 25:
            bitacora_mes = db.query(Bitacora).filter(
                Bitacora.proceso_id == p.id,
                Bitacora.periodo_reportado == mes_actual,
                Bitacora.is_active == True,
            ).first()
            if not bitacora_mes:
                clave = f"apz_bitacora_mes_{p.id}_{mes_actual}"
                if alerta_crud.crear_alerta(
                    db,
                    titulo="Bitácora del mes pendiente",
                    mensaje=f"Aún no has subido la bitácora de {mes_actual}.",
                    tipo="URGENTE",
                    categoria="BITACORAS",
                    rol_destino="APRENDIZ",
                    usuario_id=aprendiz_id,
                    aprendiz_id=aprendiz_id,
                    proceso_id=p.id,
                    entidad_relacionada="proceso",
                    entidad_id=p.id,
                    clave_unica=clave,
                ):
                    count += 1

        # Bitácoras con observaciones sin corregir
        con_obs = db.query(Bitacora).filter(
            Bitacora.proceso_id == p.id,
            Bitacora.estado == EstadoBitacora.CON_OBSERVACIONES,
            Bitacora.is_active == True,
        ).all()

        for b in con_obs:
            clave = f"apz_bitacora_obs_{b.id}"
            if alerta_crud.crear_alerta(
                db,
                titulo=f"Bitácora #{b.numero_bitacora} con observaciones",
                mensaje="Revisa las observaciones del instructor y corrige.",
                tipo="ADVERTENCIA",
                categoria="BITACORAS",
                rol_destino="APRENDIZ",
                usuario_id=aprendiz_id,
                aprendiz_id=aprendiz_id,
                proceso_id=p.id,
                entidad_relacionada="bitacora",
                entidad_id=b.id,
                clave_unica=clave,
            ):
                count += 1

        # Documentos pendientes
        pendientes = db.query(ChecklistDocumentoProceso).filter(
            ChecklistDocumentoProceso.proceso_id == p.id,
            ChecklistDocumentoProceso.estado == "PENDIENTE",
            ChecklistDocumentoProceso.is_active == True,
        ).count()
        if pendientes > 0:
            clave = f"apz_checklist_{p.id}_{hoy.strftime('%Y-%W')}"
            if alerta_crud.crear_alerta(
                db,
                titulo="Documentos pendientes",
                mensaje=f"Tienes {pendientes} documentos pendientes por subir.",
                tipo="ADVERTENCIA",
                categoria="DOCUMENTOS",
                rol_destino="APRENDIZ",
                usuario_id=aprendiz_id,
                aprendiz_id=aprendiz_id,
                proceso_id=p.id,
                entidad_relacionada="proceso",
                entidad_id=p.id,
                clave_unica=clave,
            ):
                count += 1

        # Reuniones de seguimiento próximas (7 días)
        ahora = datetime.utcnow()
        reuniones = db.query(ReunionSeguimiento).filter(
            ReunionSeguimiento.proceso_id == p.id,
            ReunionSeguimiento.is_active == True,
            ReunionSeguimiento.fecha_realizada.is_(None),
            ReunionSeguimiento.fecha_programada.between(ahora, ahora + timedelta(days=7)),
        ).all()
        for r in reuniones:
            momento_txt = r.momento.replace("_", " ") if r.momento else "Reunión"
            if alerta_crud.crear_alerta(
                db,
                titulo="Reunión de seguimiento próxima",
                mensaje=f"{momento_txt} programada para el {r.fecha_programada.date()}.",
                tipo="INFO",
                categoria="REUNIONES",
                rol_destino="APRENDIZ",
                usuario_id=aprendiz_id,
                aprendiz_id=aprendiz_id,
                proceso_id=p.id,
                entidad_relacionada="reunion",
                entidad_id=r.id,
                clave_unica=f"apz_reunion_prox_{r.id}_{hoy}",
            ):
                count += 1

        # Reuniones de seguimiento vencidas sin realizar
        vencidas = db.query(ReunionSeguimiento).filter(
            ReunionSeguimiento.proceso_id == p.id,
            ReunionSeguimiento.is_active == True,
            ReunionSeguimiento.fecha_realizada.is_(None),
            func.date(ReunionSeguimiento.fecha_programada) < hoy,
        ).all()
        for r in vencidas:
            momento_txt = r.momento.replace("_", " ") if r.momento else "Reunión"
            if alerta_crud.crear_alerta(
                db,
                titulo="Reunión de seguimiento sin realizar",
                mensaje=f"{momento_txt} estaba programada para el {r.fecha_programada.date()} y no se ha registrado.",
                tipo="URGENTE",
                categoria="REUNIONES",
                rol_destino="APRENDIZ",
                usuario_id=aprendiz_id,
                aprendiz_id=aprendiz_id,
                proceso_id=p.id,
                entidad_relacionada="reunion",
                entidad_id=r.id,
                clave_unica=f"apz_reunion_venc_{r.id}_{hoy.strftime('%Y-%W')}",
            ):
                count += 1

        # Plazo: etapa productiva por finalizar (15 días)
        if p.fecha_fin and hoy <= p.fecha_fin <= hoy + timedelta(days=15):
            if alerta_crud.crear_alerta(
                db,
                titulo="Tu etapa productiva está por finalizar",
                mensaje=f"Tu etapa productiva termina el {p.fecha_fin}.",
                tipo="ADVERTENCIA",
                categoria="PLAZOS",
                rol_destino="APRENDIZ",
                usuario_id=aprendiz_id,
                aprendiz_id=aprendiz_id,
                proceso_id=p.id,
                entidad_relacionada="proceso",
                entidad_id=p.id,
                clave_unica=f"apz_prox_fin_{p.id}_{hoy}",
            ):
                count += 1

        # Charlas de la ficha: próximas (7 días)
        ahora_ch = datetime.utcnow()
        charlas_prox = db.query(Charla).filter(
            Charla.ficha_id == p.ficha_id,
            Charla.is_active == True,
            Charla.fecha_programada.between(ahora_ch, ahora_ch + timedelta(days=7)),
        ).all()
        for ch in charlas_prox:
            tipo_txt = ch.tipo_charla.replace("_", " ").title() if ch.tipo_charla else "Charla"
            if alerta_crud.crear_alerta(
                db,
                titulo="Charla próxima",
                mensaje=f"{tipo_txt} programada para el {ch.fecha_programada.date()}.",
                tipo="INFO",
                categoria="CHARLAS",
                rol_destino="APRENDIZ",
                usuario_id=aprendiz_id,
                aprendiz_id=aprendiz_id,
                proceso_id=p.id,
                entidad_relacionada="charla",
                entidad_id=ch.id,
                clave_unica=f"apz_charla_prox_{ch.id}_{hoy}",
            ):
                count += 1

        # Charlas ya realizadas sin asistencia registrada
        charlas_pasadas = db.query(Charla).filter(
            Charla.ficha_id == p.ficha_id,
            Charla.is_active == True,
            Charla.fecha_programada < ahora_ch,
        ).all()
        for ch in charlas_pasadas:
            asistencia = db.query(AsistenciaCharla).filter(
                AsistenciaCharla.charla_id == ch.id,
                AsistenciaCharla.aprendiz_id == aprendiz_id,
                AsistenciaCharla.is_active == True,
            ).first()
            if not asistencia or not asistencia.asistio:
                tipo_txt = ch.tipo_charla.replace("_", " ").title() if ch.tipo_charla else "Charla"
                if alerta_crud.crear_alerta(
                    db,
                    titulo="Asistencia a charla pendiente",
                    mensaje=f"No tienes asistencia registrada para la {tipo_txt} del {ch.fecha_programada.date()}.",
                    tipo="ADVERTENCIA",
                    categoria="CHARLAS",
                    rol_destino="APRENDIZ",
                    usuario_id=aprendiz_id,
                    aprendiz_id=aprendiz_id,
                    proceso_id=p.id,
                    entidad_relacionada="charla",
                    entidad_id=ch.id,
                    clave_unica=f"apz_charla_asist_{ch.id}_{hoy.strftime('%Y-%W')}",
                ):
                    count += 1

    return count


def generar_alertas_por_usuario(db: Session, usuario) -> int:
    """Punto de entrada: genera alertas según el rol del usuario."""
    from app.core.constants import Roles

    if usuario.rol_id == Roles.INSTRUCTOR:
        return generar_alertas_instructor(db, usuario.id)
    elif usuario.rol_id == Roles.APRENDIZ:
        return generar_alertas_aprendiz(db, usuario.id)
    # ADMIN, COORDINADOR, APOYO: agregar reglas después
    return 0