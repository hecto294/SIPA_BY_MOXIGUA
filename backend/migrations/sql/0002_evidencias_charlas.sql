-- Evidencias de charlas (soporte, listado, foto) usadas por instructor/router.py
CREATE TABLE IF NOT EXISTS etapa_productiva.evidencias_charlas (
    id             BIGSERIAL PRIMARY KEY,
    charla_id      BIGINT       NOT NULL,
    tipo           VARCHAR(20)  NOT NULL,
    nombre_archivo VARCHAR(255) NOT NULL,
    ruta_archivo   VARCHAR(500) NOT NULL,
    subido_por     BIGINT,
    fecha_subida   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    is_active      BOOLEAN      NOT NULL DEFAULT true,
    CONSTRAINT chk_evidencia_charla_tipo
        CHECK (tipo IN ('SOPORTE', 'LISTADO', 'FOTO')),
    CONSTRAINT fk_evidencia_charla
        FOREIGN KEY (charla_id) REFERENCES etapa_productiva.charlas(id) ON DELETE CASCADE,
    CONSTRAINT fk_evidencia_charla_usuario
        FOREIGN KEY (subido_por) REFERENCES etapa_productiva.usuarios(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_evidencias_charlas_charla
    ON etapa_productiva.evidencias_charlas (charla_id);
