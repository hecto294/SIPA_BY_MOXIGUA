from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy import text
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, Field, ConfigDict

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.constants import Roles
from app.models import Usuario, Empresa
from app.modules.instructor.schemas import (
    InstructorEmpresaOut,
    InstructorEmpresaCreate,
    InstructorEmpresaUpdate,
)

router = APIRouter(prefix="/instructor", tags=["Instructor"])


@router.get("/empresas/{instructor_id}", response_model=List[InstructorEmpresaOut])
def empresas_del_instructor(
    instructor_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Lista las empresas con las que trabaja el instructor
    (empresas asociadas a sus procesos activos).
    """
    # Permisos: el instructor solo puede ver las suyas
    if current_user.rol_id == Roles.INSTRUCTOR and current_user.id != instructor_id:
        raise HTTPException(
            status_code=403,
            detail="Solo puedes consultar las empresas de tu propio usuario",
        )
    if current_user.rol_id not in (Roles.ADMIN, Roles.COORDINADOR, Roles.INSTRUCTOR):
        raise HTTPException(status_code=403, detail="No autorizado")

    query = text("""
        SELECT 
            e.id,
            e.razon_social,
            e.nit,
            e.direccion,
            e.telefono,
            e.correo_contacto,
            e.arl,
            e.is_active,
            COUNT(DISTINCT p.aprendiz_id) AS aprendices_count
        FROM etapa_productiva.procesos_etapa_productiva p
        JOIN etapa_productiva.empresas e ON e.id = p.empresa_id
        WHERE p.instructor_id = :instructor_id
          AND p.is_active = true
          AND (e.is_active = true OR e.is_active IS NULL)
          AND (e.deleted_at IS NULL)
        GROUP BY e.id, e.razon_social, e.nit, e.direccion, e.telefono,
                 e.correo_contacto, e.arl, e.is_active
        ORDER BY e.razon_social
    """)
    rows = db.execute(query, {"instructor_id": instructor_id}).mappings().all()
    return [dict(r) for r in rows]


@router.post("/empresas", response_model=InstructorEmpresaOut, status_code=201)
def crear_empresa_instructor(
    data: InstructorEmpresaCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Crea una nueva empresa.
    Disponible para Instructor, Coordinador y Admin.
    """
    if current_user.rol_id not in (Roles.ADMIN, Roles.COORDINADOR, Roles.INSTRUCTOR):
        raise HTTPException(status_code=403, detail="No autorizado para crear empresas")

    existe = db.query(Empresa).filter(
        Empresa.nit == data.nit,
        Empresa.is_active == True,
    ).first()
    if existe:
        raise HTTPException(status_code=400, detail="Ya existe una empresa con ese NIT")

    nueva = Empresa(
        razon_social=data.razon_social,
        nit=data.nit,
        direccion=data.direccion,
        telefono=data.telefono,
        correo_contacto=str(data.correo_contacto) if data.correo_contacto else None,
        arl=data.arl,
        is_active=True,
    )
    db.add(nueva)
    db.commit()
    db.refresh(nueva)

    return {
        "id": nueva.id,
        "razon_social": nueva.razon_social,
        "nit": nueva.nit,
        "direccion": nueva.direccion,
        "telefono": nueva.telefono,
        "correo_contacto": nueva.correo_contacto,
        "arl": nueva.arl,
        "is_active": nueva.is_active,
        "aprendices_count": 0,
    }


@router.put("/empresas/{empresa_id}", response_model=InstructorEmpresaOut)
def actualizar_empresa_instructor(
    empresa_id: int,
    data: InstructorEmpresaUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Actualiza una empresa.
    - Instructor: solo si tiene al menos un proceso activo con esa empresa.
    - Admin / Coordinador: pueden actualizar cualquiera.
    """
    empresa = db.query(Empresa).filter(
        Empresa.id == empresa_id,
        Empresa.is_active == True,
    ).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    # Validar permiso del instructor
    if current_user.rol_id == Roles.INSTRUCTOR:
        tiene_proceso = db.execute(
            text("""
                SELECT 1 FROM etapa_productiva.procesos_etapa_productiva
                WHERE instructor_id = :iid
                  AND empresa_id = :eid
                  AND is_active = true
                LIMIT 1
            """),
            {"iid": current_user.id, "eid": empresa_id},
        ).first()
        if not tiene_proceso:
            raise HTTPException(
                status_code=403,
                detail="Solo puedes editar empresas con las que trabajas (procesos asignados)",
            )
    elif current_user.rol_id not in (Roles.ADMIN, Roles.COORDINADOR):
        raise HTTPException(status_code=403, detail="No autorizado")

    # Validar NIT único si se cambia
    if data.nit and data.nit != empresa.nit:
        existe = db.query(Empresa).filter(
            Empresa.nit == data.nit,
            Empresa.id != empresa_id,
            Empresa.is_active == True,
        ).first()
        if existe:
            raise HTTPException(status_code=400, detail="Ya existe otra empresa con ese NIT")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if key == "correo_contacto" and value is not None:
            value = str(value)
        setattr(empresa, key, value)

    db.commit()
    db.refresh(empresa)

    # Contar aprendices actuales
    count_row = db.execute(
        text("""
            SELECT COUNT(DISTINCT aprendiz_id) AS total
            FROM etapa_productiva.procesos_etapa_productiva
            WHERE empresa_id = :eid AND is_active = true
        """),
        {"eid": empresa_id},
    ).mappings().first()

    return {
        "id": empresa.id,
        "razon_social": empresa.razon_social,
        "nit": empresa.nit,
        "direccion": empresa.direccion,
        "telefono": empresa.telefono,
        "correo_contacto": empresa.correo_contacto,
        "arl": empresa.arl,
        "is_active": empresa.is_active,
        "aprendices_count": count_row["total"] if count_row else 0,
    }


@router.delete("/empresas/{empresa_id}", status_code=204)
def eliminar_empresa_instructor(
    empresa_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Soft-delete de una empresa.
    - Instructor: solo si tiene procesos con esa empresa y no tiene aprendices activos.
    - Admin / Coordinador: pueden eliminar.
    """
    empresa = db.query(Empresa).filter(
        Empresa.id == empresa_id,
        Empresa.is_active == True,
    ).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    if current_user.rol_id == Roles.INSTRUCTOR:
        tiene_proceso = db.execute(
            text("""
                SELECT 1 FROM etapa_productiva.procesos_etapa_productiva
                WHERE instructor_id = :iid
                  AND empresa_id = :eid
                  AND is_active = true
                LIMIT 1
            """),
            {"iid": current_user.id, "eid": empresa_id},
        ).first()
        if not tiene_proceso:
            raise HTTPException(
                status_code=403,
                detail="Solo puedes eliminar empresas con las que trabajas",
            )
    elif current_user.rol_id not in (Roles.ADMIN, Roles.COORDINADOR):
        raise HTTPException(status_code=403, detail="No autorizado")

    # Evitar borrar si hay procesos activos
    activos = db.execute(
        text("""
            SELECT COUNT(*) AS total
            FROM etapa_productiva.procesos_etapa_productiva
            WHERE empresa_id = :eid AND is_active = true
        """),
        {"eid": empresa_id},
    ).mappings().first()

    if activos and activos["total"] > 0:
        raise HTTPException(
            status_code=400,
            detail=f"No se puede eliminar: hay {activos['total']} proceso(s) activo(s) con esta empresa",
        )

    empresa.is_active = False
    db.commit()
    return None