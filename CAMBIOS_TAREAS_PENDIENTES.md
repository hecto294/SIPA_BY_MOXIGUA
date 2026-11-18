# Cambios solicitados - SIPA by Moxigua

Se implementaron las tres tareas del documento "tareas faltantes SIPA":

1. **Registro de novedades del aprendiz:** en el detalle del aprendiz se agregó un campo de texto y el botón Guardar. Las novedades se conservan en el navegador mediante almacenamiento local, asociadas al registro del aprendiz.
2. **Presentación de usuarios:** en Gestión de Usuarios el campo se presenta como "Contraseña" y se muestra enmascarado por seguridad. No se expone el nombre técnico `password_hash` ni se muestra `rol_id` en la tabla. La relación interna de rol se conserva en el modelo porque es necesaria para los permisos y las relaciones del sistema.
3. **Listado ampliado de fichas y aprendices:** se agregó un listado con los campos solicitados en el documento: programa, ficha, fechas, duración, nivel, modalidad, identificación, nombre, correo, RAPS, estado de registro y datos de etapa productiva. Incluye seis registros ficticios completos para demostración; no corresponden a personas reales ni sustituyen registros de la base de datos.

## Nota
La novedad se guarda localmente en el navegador de quien la registra. Para que quede compartida entre usuarios y dispositivos, se requiere conectar este formulario a un endpoint del backend.
