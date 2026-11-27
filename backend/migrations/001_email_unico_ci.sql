-- Impide correos repetidos (sin distinguir mayúsculas/minúsculas).
-- 1) Revisar duplicados existentes ANTES de crear el índice (debe devolver 0 filas):
SELECT LOWER(email) AS email, COUNT(*) AS repeticiones, array_agg(id) AS ids
FROM etapa_productiva.usuarios
GROUP BY LOWER(email)
HAVING COUNT(*) > 1;

-- 2) Si hay duplicados, corregirlos/desactivarlos a mano y luego ejecutar:
CREATE UNIQUE INDEX IF NOT EXISTS uq_usuarios_email_lower
    ON etapa_productiva.usuarios (LOWER(email));
