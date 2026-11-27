from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import Usuario
from app.modules.alertas import crud, schemas, service

router = APIRouter(prefix="/alertas", tags=["Alertas"])


@router.get("/pendientes", response_model=schemas.AlertasListOut)
def get_pendientes(
    generar: bool = Query(True, description="Si True, genera alertas automáticas antes de listar"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Alertas pendientes del usuario. Para el dashboard."""
    if generar:
        try:
            service.generar_alertas_por_usuario(db, current_user)
        except Exception as e:
            print(f"[ALERTAS] Error generando: {e}")

    alertas = crud.listar_pendientes(db, current_user)
    return {
        "alertas": alertas,
        "pendientes": len(alertas),
        "total": len(alertas),
    }


@router.get("/historial", response_model=schemas.AlertasListOut)
def get_historial(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Historial: alertas ya resueltas."""
    alertas = crud.listar_resueltas(db, current_user)
    return {
        "alertas": alertas,
        "pendientes": 0,
        "total": len(alertas),
    }


@router.get("/contador", response_model=schemas.ContadorOut)
def get_contador(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Solo cuenta pendientes (para badges)."""
    total = crud.contar_pendientes(db, current_user)
    return {"pendientes": total}


@router.patch("/{alerta_id}/resolver", response_model=schemas.AlertaOut)
def resolver(
    alerta_id: int,
    payload: schemas.ResolverAlertaIn,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """RF-109: marca una alerta propia como resuelta. Se moverá al historial."""
    from app.core.constants import Roles

    ROLES_PUEDEN_RESOLVER = {Roles.COORDINADOR, Roles.INSTRUCTOR, Roles.ADMIN}
    if current_user.rol_id not in ROLES_PUEDEN_RESOLVER:
        raise HTTPException(status_code=403, detail="Tu rol no puede resolver alertas")

    alerta = crud.get_alerta(db, alerta_id)
    if not alerta:
        raise HTTPException(status_code=404, detail="Alerta no encontrada")

    if alerta.estado != "PENDIENTE":
        raise HTTPException(status_code=409, detail="La alerta ya fue resuelta")

    propias = crud.listar_pendientes(db, current_user, limit=100000)
    if alerta.id not in {a.id for a in propias}:
        raise HTTPException(status_code=403, detail="Esta alerta no es tuya")

    return crud.resolver_alerta(db, alerta, current_user.id, payload.nota)