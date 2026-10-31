-- Los archivos están en UTF-8: evita acentos rotos al cargarlos desde la consola de Windows
SET client_encoding = 'UTF8';

-- =========================================================
-- DATOS DE PRUEBA PARA LA INTEGRACIÓN FRONT ↔ BACK
-- Ejecutar DESPUÉS de sql/carga_inicial.sql:
--   psql -U postgres -d EvaluacionDocentes -f sql/datos_prueba.sql
--
-- Contraseña de TODOS los usuarios de prueba: demo123
-- =========================================================

-- 1. Contraseñas reales cifradas con bcrypt (carga_inicial trae hashes de ejemplo que no validan)
UPDATE Usuario
SET contrasena = '$2b$10$Dk9PNoPZIhAgQM6ABVBW2.OcxJnmlZd1Tx85RBH3fXG0KZv3x9wT.'
WHERE numero_cuenta IN ('ADMIN001', 'COORD001', 'DOC001', 'ALU001');

-- 2. Ampliar el periodo de evaluación del ciclo de pruebas para poder probar hoy
UPDATE CicloEscolar
SET fecha_cierre_eval = '2026-11-30'
WHERE id_ciclo = 1;

-- 3. Dos docentes más
INSERT INTO Usuario (id_usuario, numero_cuenta, correo_institucional, contrasena, id_rol, activo)
VALUES
    (5, 'DOC002', 'laura.mendoza@escuela.edu', '$2b$10$Dk9PNoPZIhAgQM6ABVBW2.OcxJnmlZd1Tx85RBH3fXG0KZv3x9wT.', 3, true),
    (6, 'DOC003', 'roberto.salas@escuela.edu', '$2b$10$Dk9PNoPZIhAgQM6ABVBW2.OcxJnmlZd1Tx85RBH3fXG0KZv3x9wT.', 3, true);

INSERT INTO Docente (id_docente, id_usuario, nombre, apellido, departamento)
VALUES
    (2, 5, 'Laura', 'Mendoza', 'Sistemas'),
    (3, 6, 'Roberto', 'Salas', 'Ciencias Básicas');

-- 4. Materias
INSERT INTO Materia (id_materia, nombre, clave, creditos)
VALUES
    (1, 'Bases de Datos Avanzadas', 'BDA0201', 8),
    (2, 'Diseño y Gestión de Sistemas', 'ANSI0301G', 8),
    (3, 'Probabilidad y Estadística', 'MAT0302', 6),
    (4, 'Middleware y Sistemas Distribuidos', 'RED0401', 8);

-- 5. CRN = asignación docente-materia-ciclo (el campo "crn" es el número visible)
INSERT INTO CRN (id_crn, id_docente, id_materia, id_ciclo, crn)
VALUES
    (1, 1, 1, 1, 40211),
    (2, 1, 2, 1, 40215),
    (3, 2, 3, 1, 40230),
    (4, 3, 4, 1, 40242);

-- 6. Inscribir al alumno de prueba en las 4 materias
INSERT INTO Inscripcion (id_alumno, id_crn)
VALUES (1, 1), (1, 2), (1, 3), (1, 4);

-- 7. Las tablas usan SERIAL pero los datos se insertaron con id fijo:
--    se ajustan las secuencias para que los siguientes INSERT no choquen.
SELECT setval(pg_get_serial_sequence('rol', 'id_rol'), (SELECT MAX(id_rol) FROM Rol));
SELECT setval(pg_get_serial_sequence('usuario', 'id_usuario'), (SELECT MAX(id_usuario) FROM Usuario));
SELECT setval(pg_get_serial_sequence('cicloescolar', 'id_ciclo'), (SELECT MAX(id_ciclo) FROM CicloEscolar));
SELECT setval(pg_get_serial_sequence('docente', 'id_docente'), (SELECT MAX(id_docente) FROM Docente));
SELECT setval(pg_get_serial_sequence('alumno', 'id_alumno'), (SELECT MAX(id_alumno) FROM Alumno));
SELECT setval(pg_get_serial_sequence('materia', 'id_materia'), (SELECT MAX(id_materia) FROM Materia));
SELECT setval(pg_get_serial_sequence('crn', 'id_crn'), (SELECT MAX(id_crn) FROM CRN));
SELECT setval(pg_get_serial_sequence('pregunta', 'id_pregunta'), (SELECT MAX(id_pregunta) FROM Pregunta));
