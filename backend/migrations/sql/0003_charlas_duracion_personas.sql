-- Columnas usadas por instructor/router.py al crear y listar charlas
ALTER TABLE etapa_productiva.charlas
    ADD COLUMN IF NOT EXISTS duracion_horas NUMERIC(5,2) NOT NULL DEFAULT 2.0,
    ADD COLUMN IF NOT EXISTS personas_solicitadas INTEGER NOT NULL DEFAULT 0;
