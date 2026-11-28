# Cambios implementados en SIPA

## 1. Verificación del código de recuperación (todos los roles)
- Archivo: `backend/app/modules/auth/crud.py` (completo)
- Archivo: `backend/app/modules/auth/router.py` (endpoints de recuperación)

Funcionalidad:
- Genera código de 6 dígitos al solicitar recuperación.
- Guarda `reset_code` y `reset_code_expires_at` en el usuario.
- El código **vence** según `PASSWORD_RESET_TOKEN_EXPIRE_MINUTES` (por defecto 30 min).
- Endpoint `/auth/verificar-codigo` valida código y expiración.
- Endpoint `/auth/restablecer-password` cambia la contraseña solo si el código es válido y no ha vencido.
- Funciona para **todos los roles**.

## 2. Crear usuario (Admin)
- Ya existía en `POST /usuarios/` con `require_admin`.
- Campos: nombre, apellido, email, password, rol_id (+ opcionales).
- Se mantiene la validación de email único y documento único.

## 3. Impedir correos repetidos (todo el sistema)
- Modelo `Usuario.email` tiene `unique=True`.
- En creación individual se valida antes de insertar.
- En carga masiva se valida por fila y captura `IntegrityError`.
- Cualquier intento de email duplicado es rechazado con mensaje claro.

## 4. Resultado de cargas masivas (Admin y Coordinador)
- `POST /usuarios/bulk-upload` ahora permite **Admin y Coordinador**.
- Respuesta incluye:
  - `filas_insertadas`
  - `filas_con_advertencia` (ej. sin documento o teléfono)
  - `filas_rechazadas` + `detalle_rechazadas` con motivo
  - `detalle_advertencias`
- Schema `BulkUploadResponse` actualizado.

## 5. Fichas (Admin y Coordinador)
- Ya implementado en `programas_fichas`:
  - Crear / editar / eliminar fichas
  - Número de ficha **único**
  - Fechas inicio/fin, nivel, jornada, aprendices_esperados
  - Permisos: `RolesPermisos.ESCRITURA` = Admin + Coordinador

## 6. Crear proceso de aprendiz (Coordinador e Instructor)
- `POST /procesos` ahora permite **Admin, Coordinador e Instructor**.
- Campos: aprendiz, ficha, modalidad, empresa, coordinador_empresa, instructor, fechas.
- Validaciones de existencia y coherencia de empresa/coordinador.

## Cómo aplicar
Copia los archivos de este ZIP sobre tu proyecto SIPA_BY_MOXIGUA-main respetando las rutas.
