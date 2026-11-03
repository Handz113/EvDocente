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

-- 2. Ciclos escolares: ampliar el actual e insertar ciclos históricos inactivos para pruebas
UPDATE CicloEscolar
SET fecha_cierre_eval = '2026-11-30'
WHERE id_ciclo = 1;

INSERT INTO CicloEscolar (id_ciclo, nombre, fecha_inicio_eval, fecha_cierre_eval, activo)
VALUES
    (2, 'Ciclo 2026-1', '2026-02-01', '2026-06-30', false),
    (3, 'Ciclo 2025-2', '2025-08-01', '2025-12-15', false)
ON CONFLICT (id_ciclo) DO UPDATE
SET nombre = EXCLUDED.nombre,
    fecha_inicio_eval = EXCLUDED.fecha_inicio_eval,
    fecha_cierre_eval = EXCLUDED.fecha_cierre_eval,
    activo = EXCLUDED.activo;

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

-- 8. Alumnos de prueba adicionales con evaluaciones pendientes (para el panel de Administración)
INSERT INTO Usuario (numero_cuenta, correo_institucional, contrasena, id_rol, activo)
VALUES
    ('ALU002', 'carlos.ramirez@escuela.edu', '$2b$10$Dk9PNoPZIhAgQM6ABVBW2.OcxJnmlZd1Tx85RBH3fXG0KZv3x9wT.', 4, true),
    ('ALU003', 'maria.gomez@escuela.edu', '$2b$10$Dk9PNoPZIhAgQM6ABVBW2.OcxJnmlZd1Tx85RBH3fXG0KZv3x9wT.', 4, true),
    ('ALU004', 'diego.hernandez@escuela.edu', '$2b$10$Dk9PNoPZIhAgQM6ABVBW2.OcxJnmlZd1Tx85RBH3fXG0KZv3x9wT.', 4, true),
    ('ALU005', 'valeria.morales@escuela.edu', '$2b$10$Dk9PNoPZIhAgQM6ABVBW2.OcxJnmlZd1Tx85RBH3fXG0KZv3x9wT.', 4, true),
    ('ALU006', 'alejandro.torres@escuela.edu', '$2b$10$Dk9PNoPZIhAgQM6ABVBW2.OcxJnmlZd1Tx85RBH3fXG0KZv3x9wT.', 4, true)
ON CONFLICT (numero_cuenta) DO NOTHING;

INSERT INTO Alumno (id_usuario, carrera, semestre)
SELECT u.id_usuario, 'Ingeniería en Sistemas', 7 FROM Usuario u WHERE u.numero_cuenta = 'ALU002' ON CONFLICT DO NOTHING;
INSERT INTO Alumno (id_usuario, carrera, semestre)
SELECT u.id_usuario, 'Ingeniería en Sistemas', 7 FROM Usuario u WHERE u.numero_cuenta = 'ALU003' ON CONFLICT DO NOTHING;
INSERT INTO Alumno (id_usuario, carrera, semestre)
SELECT u.id_usuario, 'Ingeniería en Computación', 6 FROM Usuario u WHERE u.numero_cuenta = 'ALU004' ON CONFLICT DO NOTHING;
INSERT INTO Alumno (id_usuario, carrera, semestre)
SELECT u.id_usuario, 'Ingeniería en Computación', 6 FROM Usuario u WHERE u.numero_cuenta = 'ALU005' ON CONFLICT DO NOTHING;
INSERT INTO Alumno (id_usuario, carrera, semestre)
SELECT u.id_usuario, 'Ingeniería en Software', 8 FROM Usuario u WHERE u.numero_cuenta = 'ALU006' ON CONFLICT DO NOTHING;

INSERT INTO Inscripcion (id_alumno, id_crn)
SELECT a.id_alumno, (SELECT id_crn FROM CRN LIMIT 1) FROM Alumno a JOIN Usuario u ON u.id_usuario = a.id_usuario WHERE u.numero_cuenta = 'ALU002'
ON CONFLICT DO NOTHING;
INSERT INTO Inscripcion (id_alumno, id_crn)
SELECT a.id_alumno, (SELECT id_crn FROM CRN ORDER BY id_crn OFFSET 1 LIMIT 1) FROM Alumno a JOIN Usuario u ON u.id_usuario = a.id_usuario WHERE u.numero_cuenta = 'ALU003'
ON CONFLICT DO NOTHING;
INSERT INTO Inscripcion (id_alumno, id_crn)
SELECT a.id_alumno, (SELECT id_crn FROM CRN ORDER BY id_crn OFFSET 2 LIMIT 1) FROM Alumno a JOIN Usuario u ON u.id_usuario = a.id_usuario WHERE u.numero_cuenta = 'ALU004'
ON CONFLICT DO NOTHING;
INSERT INTO Inscripcion (id_alumno, id_crn)
SELECT a.id_alumno, (SELECT id_crn FROM CRN ORDER BY id_crn OFFSET 3 LIMIT 1) FROM Alumno a JOIN Usuario u ON u.id_usuario = a.id_usuario WHERE u.numero_cuenta = 'ALU005'
ON CONFLICT DO NOTHING;
INSERT INTO Inscripcion (id_alumno, id_crn)
SELECT a.id_alumno, (SELECT id_crn FROM CRN ORDER BY id_crn OFFSET 0 LIMIT 1) FROM Alumno a JOIN Usuario u ON u.id_usuario = a.id_usuario WHERE u.numero_cuenta = 'ALU006'
ON CONFLICT DO NOTHING;

-- 9. Asignaciones históricas (CRN) para ciclos inactivos (Ciclo 2026-1 y Ciclo 2025-2)
INSERT INTO CRN (id_crn, id_docente, id_materia, id_ciclo, crn)
VALUES
    (5, 1, 1, 2, 30111), -- DOC001 (Juan Pérez), Bases de Datos, Ciclo 2026-1
    (6, 2, 3, 2, 30122), -- DOC002 (Laura Mendoza), Probabilidad, Ciclo 2026-1
    (7, 1, 2, 3, 20111), -- DOC001 (Juan Pérez), Diseño de Sistemas, Ciclo 2025-2
    (8, 2, 3, 3, 20122)  -- DOC002 (Laura Mendoza), Probabilidad, Ciclo 2025-2
ON CONFLICT (id_crn) DO UPDATE
SET id_docente = EXCLUDED.id_docente,
    id_materia = EXCLUDED.id_materia,
    id_ciclo = EXCLUDED.id_ciclo,
    crn = EXCLUDED.crn;

-- 10. Inscripciones a materias de ciclos pasados
INSERT INTO Inscripcion (id_alumno, id_crn)
SELECT a.id_alumno, 5 FROM Alumno a JOIN Usuario u ON u.id_usuario = a.id_usuario WHERE u.numero_cuenta = 'ALU001'
ON CONFLICT DO NOTHING;
INSERT INTO Inscripcion (id_alumno, id_crn)
SELECT a.id_alumno, 6 FROM Alumno a JOIN Usuario u ON u.id_usuario = a.id_usuario WHERE u.numero_cuenta = 'ALU001'
ON CONFLICT DO NOTHING;
INSERT INTO Inscripcion (id_alumno, id_crn)
SELECT a.id_alumno, 7 FROM Alumno a JOIN Usuario u ON u.id_usuario = a.id_usuario WHERE u.numero_cuenta = 'ALU002'
ON CONFLICT DO NOTHING;
INSERT INTO Inscripcion (id_alumno, id_crn)
SELECT a.id_alumno, 8 FROM Alumno a JOIN Usuario u ON u.id_usuario = a.id_usuario WHERE u.numero_cuenta = 'ALU002'
ON CONFLICT DO NOTHING;

-- 11. Evaluaciones históricas concluidas para contrastar desempeño de DOC001 y DOC002
-- Evaluacion 1: ALU001 evalúa a DOC001 en Ciclo 2026-1 (CRN 5) -> Promedio 9.5
INSERT INTO Evaluacion (id_evaluacion, id_alumno, id_crn, fecha, comentarios, promedio)
SELECT 1, a.id_alumno, 5, '2026-06-15 10:00:00', 'Excelente dominio técnico y claridad durante el curso anterior.', 9.50
FROM Alumno a JOIN Usuario u ON u.id_usuario = a.id_usuario WHERE u.numero_cuenta = 'ALU001'
ON CONFLICT (id_alumno, id_crn) DO UPDATE
SET promedio = EXCLUDED.promedio, comentarios = EXCLUDED.comentarios;

-- Evaluacion 2: ALU001 evalúa a DOC002 en Ciclo 2026-1 (CRN 6) -> Promedio 7.5
INSERT INTO Evaluacion (id_evaluacion, id_alumno, id_crn, fecha, comentarios, promedio)
SELECT 2, a.id_alumno, 6, '2026-06-16 11:30:00', 'Buen temario, aunque el ritmo de las clases fue muy acelerado.', 7.50
FROM Alumno a JOIN Usuario u ON u.id_usuario = a.id_usuario WHERE u.numero_cuenta = 'ALU001'
ON CONFLICT (id_alumno, id_crn) DO UPDATE
SET promedio = EXCLUDED.promedio, comentarios = EXCLUDED.comentarios;

-- Evaluacion 3: ALU002 evalúa a DOC001 en Ciclo 2025-2 (CRN 7) -> Promedio 8.83
INSERT INTO Evaluacion (id_evaluacion, id_alumno, id_crn, fecha, comentarios, promedio)
SELECT 3, a.id_alumno, 7, '2025-12-05 09:15:00', 'Muy buen profesor, fomentó la participación constante.', 8.83
FROM Alumno a JOIN Usuario u ON u.id_usuario = a.id_usuario WHERE u.numero_cuenta = 'ALU002'
ON CONFLICT (id_alumno, id_crn) DO UPDATE
SET promedio = EXCLUDED.promedio, comentarios = EXCLUDED.comentarios;

-- Evaluacion 4: ALU002 evalúa a DOC002 en Ciclo 2025-2 (CRN 8) -> Promedio 9.00
INSERT INTO Evaluacion (id_evaluacion, id_alumno, id_crn, fecha, comentarios, promedio)
SELECT 4, a.id_alumno, 8, '2025-12-06 14:00:00', 'Excelente atención a dudas y trato respetuoso.', 9.00
FROM Alumno a JOIN Usuario u ON u.id_usuario = a.id_usuario WHERE u.numero_cuenta = 'ALU002'
ON CONFLICT (id_alumno, id_crn) DO UPDATE
SET promedio = EXCLUDED.promedio, comentarios = EXCLUDED.comentarios;

-- 12. Respuestas asociadas a cada evaluación histórica (15 preguntas institucionales)
-- Respuestas Eval 1 (DOC001, Ciclo 2026-1)
INSERT INTO Respuesta (id_evaluacion, id_pregunta, valor) VALUES
    (1, 1, 10), (1, 2, 10), (1, 3, 10), (1, 4, 10), (1, 5, 10),
    (1, 6, 10), (1, 7, 10), (1, 8, 10), (1, 9, 10), (1, 10, 10),
    (1, 11, 7.5), (1, 12, 10), (1, 13, 10), (1, 14, 7.5), (1, 15, 7.5)
ON CONFLICT (id_evaluacion, id_pregunta) DO UPDATE SET valor = EXCLUDED.valor;

-- Respuestas Eval 2 (DOC002, Ciclo 2026-1)
INSERT INTO Respuesta (id_evaluacion, id_pregunta, valor) VALUES
    (2, 1, 7.5), (2, 2, 7.5), (2, 3, 7.5), (2, 4, 7.5), (2, 5, 7.5),
    (2, 6, 7.5), (2, 7, 7.5), (2, 8, 7.5), (2, 9, 7.5), (2, 10, 7.5),
    (2, 11, 7.5), (2, 12, 7.5), (2, 13, 7.5), (2, 14, 7.5), (2, 15, 7.5)
ON CONFLICT (id_evaluacion, id_pregunta) DO UPDATE SET valor = EXCLUDED.valor;

-- Respuestas Eval 3 (DOC001, Ciclo 2025-2)
INSERT INTO Respuesta (id_evaluacion, id_pregunta, valor) VALUES
    (3, 1, 10), (3, 2, 10), (3, 3, 10), (3, 4, 10), (3, 5, 10),
    (3, 6, 10), (3, 7, 10), (3, 8, 10), (3, 9, 7.5), (3, 10, 7.5),
    (3, 11, 7.5), (3, 12, 7.5), (3, 13, 7.5), (3, 14, 7.5), (3, 15, 7.5)
ON CONFLICT (id_evaluacion, id_pregunta) DO UPDATE SET valor = EXCLUDED.valor;

-- Respuestas Eval 4 (DOC002, Ciclo 2025-2)
INSERT INTO Respuesta (id_evaluacion, id_pregunta, valor) VALUES
    (4, 1, 10), (4, 2, 10), (4, 3, 10), (4, 4, 10), (4, 5, 10),
    (4, 6, 10), (4, 7, 10), (4, 8, 10), (4, 9, 10), (4, 10, 7.5),
    (4, 11, 7.5), (4, 12, 7.5), (4, 13, 7.5), (4, 14, 7.5), (4, 15, 7.5)
ON CONFLICT (id_evaluacion, id_pregunta) DO UPDATE SET valor = EXCLUDED.valor;

-- 13. Ajustar secuencias tras la inserción completa
SELECT setval(pg_get_serial_sequence('rol', 'id_rol'), (SELECT MAX(id_rol) FROM Rol));
SELECT setval(pg_get_serial_sequence('usuario', 'id_usuario'), (SELECT MAX(id_usuario) FROM Usuario));
SELECT setval(pg_get_serial_sequence('cicloescolar', 'id_ciclo'), (SELECT MAX(id_ciclo) FROM CicloEscolar));
SELECT setval(pg_get_serial_sequence('docente', 'id_docente'), (SELECT MAX(id_docente) FROM Docente));
SELECT setval(pg_get_serial_sequence('alumno', 'id_alumno'), (SELECT MAX(id_alumno) FROM Alumno));
SELECT setval(pg_get_serial_sequence('materia', 'id_materia'), (SELECT MAX(id_materia) FROM Materia));
SELECT setval(pg_get_serial_sequence('crn', 'id_crn'), (SELECT MAX(id_crn) FROM CRN));
SELECT setval(pg_get_serial_sequence('pregunta', 'id_pregunta'), (SELECT MAX(id_pregunta) FROM Pregunta));
SELECT setval(pg_get_serial_sequence('evaluacion', 'id_evaluacion'), (SELECT MAX(id_evaluacion) FROM Evaluacion));
SELECT setval(pg_get_serial_sequence('respuesta', 'id_respuesta'), (SELECT MAX(id_respuesta) FROM Respuesta));
