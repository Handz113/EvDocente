-- Los archivos están en UTF-8: evita acentos rotos al cargarlos desde la consola de Windows
SET client_encoding = 'UTF8';

-- ============================================================================
-- MIGRACIÓN NO DESTRUCTIVA: RESTRICCIÓN DE INSTALACIONES POR CARRERA
-- Archivo: sql/migracion_instalacion_carrera.sql
--
-- Agrega la columna Instalacion.carrera (VARCHAR(150) DEFAULT NULL) y asigna
-- la carrera exacta (coincidente con Alumno.carrera) a los talleres y
-- laboratorios existentes.
--
-- Reglas:
--   - NULL = Instalación general / compartida (visible para todas las carreras).
--   - Texto exacto de carrera = Solo visible y evaluable por alumnos de esa
--     carrera (y por el usuario demo ALU001).
--   - Script 100% idempotente: no sobrescribe asignaciones ya configuradas.
--
-- Ejecución en local:
--   psql -U postgres -d EvaluacionDocentes -v ON_ERROR_STOP=1 -f sql/migracion_instalacion_carrera.sql
--
-- Ejecución en Neon:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f sql/migracion_instalacion_carrera.sql
-- ============================================================================

BEGIN;

-- 1. Agregar columna de forma no destructiva
ALTER TABLE Instalacion
    ADD COLUMN IF NOT EXISTS carrera VARCHAR(150) DEFAULT NULL;

-- 2. Mapeo exacto para las instalaciones conocidas de la semilla (sin sobrescribir cambios manuales)
UPDATE Instalacion
SET carrera = 'Ingeniería en Sistemas'
WHERE (carrera IS NULL OR TRIM(carrera) = '')
  AND nombre IN (
      'Laboratorio de Desarrollo de Software',
      'Laboratorio de Redes y Ciberseguridad',
      'Laboratorio de Electrónica y Robótica'
  );

UPDATE Instalacion
SET carrera = 'Ingeniería Industrial'
WHERE (carrera IS NULL OR TRIM(carrera) = '')
  AND nombre IN (
      'Taller de Manufactura y CNC',
      'Laboratorio de Control de Calidad y Ergonomía'
  );

UPDATE Instalacion
SET carrera = 'Administración'
WHERE (carrera IS NULL OR TRIM(carrera) = '')
  AND nombre IN (
      'Taller de Simulación Empresarial y Finanzas'
  );

UPDATE Instalacion
SET carrera = 'Cocina'
WHERE (carrera IS NULL OR TRIM(carrera) = '')
  AND nombre IN (
      'Cocina Caliente Profesional',
      'Taller de Panadería y Repostería'
  );

-- 3. Respaldo por patrón de nombre/tipo para instalaciones específicas adicionales
--    (respeta instalaciones generales/compartidas como 'Centro de Cómputo' y 'Laboratorio Clínico')
UPDATE Instalacion
SET carrera = CASE
    WHEN nombre ILIKE '%cocina%'
      OR nombre ILIKE '%gastronom%'
      OR nombre ILIKE '%panader%'
      OR nombre ILIKE '%reposter%'
      OR tipo   ILIKE '%cocina%'
        THEN 'Cocina'
    WHEN nombre ILIKE '%manufactura%'
      OR nombre ILIKE '%cnc%'
      OR nombre ILIKE '%calidad%'
      OR nombre ILIKE '%ergonom%'
      OR nombre ILIKE '%industrial%'
        THEN 'Ingeniería Industrial'
    WHEN nombre ILIKE '%empresarial%'
      OR nombre ILIKE '%finanzas%'
      OR nombre ILIKE '%administraci%'
      OR nombre ILIKE '%negocios%'
        THEN 'Administración'
    WHEN nombre ILIKE '%software%'
      OR nombre ILIKE '%redes%'
      OR nombre ILIKE '%ciberseguridad%'
      OR nombre ILIKE '%robótica%'
      OR nombre ILIKE '%robotica%'
      OR nombre ILIKE '%sistemas%'
        THEN 'Ingeniería en Sistemas'
    ELSE NULL
END
WHERE (carrera IS NULL OR TRIM(carrera) = '')
  AND nombre NOT IN ('Centro de Cómputo', 'Laboratorio Clínico');

COMMIT;
