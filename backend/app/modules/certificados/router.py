from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import io
import zipfile

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.core.constants import Roles
from app.models import Usuario, ProcesoEtapaProductiva, Ficha

router = APIRouter(prefix="/certificados", tags=["Certificados"])

@router.get("/ver")
def ver_certificados(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(Roles.ADMIN, Roles.COORDINADOR)),
):
    """RF-104: Listar aprendices que están listos para certificar."""
    procesos = db.query(ProcesoEtapaProductiva).filter(
        ProcesoEtapaProductiva.is_active == True
    ).all()

    certificados = []
    for p in procesos:
        aprendiz = db.query(Usuario).filter(Usuario.id == p.aprendiz_id).first()
        ficha = db.query(Ficha).filter(Ficha.id == p.ficha_id).first()
        
        if aprendiz and ficha:
            certificados.append({
                "id": p.id,
                "aprendiz": f"{aprendiz.nombre} {aprendiz.apellido}",
                "documento": aprendiz.documento_identidad or "N/A",
                "ficha": ficha.numero_ficha,
                "estado": "Listo",
                "fecha": "15/12/2025"
            })
    
    return certificados


@router.get("/descargar-masivo")
def descargar_certificados_masivo(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(Roles.ADMIN, Roles.COORDINADOR)),
):
    """RF-104: Generar y descargar un ZIP con certificados masivos."""
    procesos = db.query(ProcesoEtapaProductiva).filter(
        ProcesoEtapaProductiva.is_active == True
    ).all()

    zip_buffer = io.BytesIO()
    
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for p in procesos:
            aprendiz = db.query(Usuario).filter(Usuario.id == p.aprendiz_id).first()
            if aprendiz:
                contenido_certificado = f"CERTIFICADO DE ETAPA PRODUCTIVA\n\nAprendiz: {aprendiz.nombre} {aprendiz.apellido}\nDocumento: {aprendiz.documento_identidad}\n\nEste documento certifica la culminación exitosa de la etapa productiva."
                nombre_archivo = f"Certificado_{aprendiz.documento_identidad or 'sin_doc'}.txt"
                zip_file.writestr(nombre_archivo, contenido_certificado)

    zip_buffer.seek(0)
    
    return StreamingResponse(
        zip_buffer, 
        media_type="application/zip", 
        headers={"Content-Disposition": "attachment; filename=certificados_masivos.zip"}
    )

@router.get("/mis-certificados")
def mis_certificados(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """RF-105: Mostrar al aprendiz sus certificados emitidos."""
    # Buscar el proceso del aprendiz logueado
    proceso = db.query(ProcesoEtapaProductiva).filter(
        ProcesoEtapaProductiva.aprendiz_id == current_user.id,
        ProcesoEtapaProductiva.is_active == True
    ).first()

    if not proceso:
        return []

    # Solo mostrar si ya fue certificado (fecha_fin no nula)
    if proceso.fecha_fin:
        return [{
            "id": proceso.id,
            "titulo": "Certificado de Etapa Productiva",
            "fecha_emision": proceso.fecha_fin.strftime("%d/%m/%Y"),
            "archivo_url": "#",  # Aquí podrías poner un link real si lo tuvieras
            "estado": "Emitido"
        }]
    else:
        return []
