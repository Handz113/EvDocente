-- Los archivos están en UTF-8: evita acentos rotos al cargarlos desde la consola de Windows
SET client_encoding = 'UTF8';

-- ============================================================================
-- MIGRACIÓN IDEMPOTENTE: HU21 — BITÁCORA DE AUDITORÍA
-- Archivo: sql/migracion_bitacora_auditoria.sql
--
-- Crea la tabla BitacoraAuditoria para registrar accesos, recuperaciones de
-- contraseña, cambios administrativos y exportaciones de reportes del sistema,
-- junto con índices optimizados para consultas rápidas (< 3s).
--
-- Reglas de integridad y privacidad:
--   - Solo lectura e inmutable desde la API (sin endpoints de edición/borrado).
--   - id_usuario admite NULL (con ON DELETE SET NULL) para registrar intentos
--     fallidos de acceso con cuentas inexistentes o conservar el historial si
--     un usuario es eliminado.
--   - Nunca almacena contraseñas, hashes, tokens ni respuestas/calificaciones
--     de evaluaciones estudiantiles.
--
-- Ejecución en local:
--   psql -U postgres -d EvaluacionDocentes -v ON_ERROR_STOP=1 -f sql/migracion_bitacora_auditoria.sql
--
-- Ejecución en Neon:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f sql/migracion_bitacora_auditoria.sql
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS BitacoraAuditoria (
    id_bitacora SERIAL PRIMARY KEY,
    id_usuario INTEGER NULL REFERENCES Usuario (id_usuario) ON DELETE SET NULL,
    numero_cuenta VARCHAR(50) NULL,
    rol VARCHAR(30) NULL,
    accion VARCHAR(60) NOT NULL,
    entidad VARCHAR(60) NOT NULL,
    id_entidad VARCHAR(60) NULL,
    detalle TEXT NULL,
    ip_origen VARCHAR(64) NULL,
    fecha_hora TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para mantener tiempos de respuesta < 3s en filtros y paginación
CREATE INDEX IF NOT EXISTS idx_bitacora_fecha_hora
    ON BitacoraAuditoria (fecha_hora DESC);

CREATE INDEX IF NOT EXISTS idx_bitacora_usuario
    ON BitacoraAuditoria (id_usuario);

CREATE INDEX IF NOT EXISTS idx_bitacora_accion_entidad
    ON BitacoraAuditoria (accion, entidad);

COMMIT;
