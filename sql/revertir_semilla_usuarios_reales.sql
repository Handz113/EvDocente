-- Los archivos están en UTF-8: evita acentos rotos al cargarlos desde la consola de Windows
SET client_encoding = 'UTF8';

-- ============================================================================
-- REVERSIÓN SEGURA DE LA SEMILLA (sql/semilla_usuarios_reales.sql)
-- Archivo: sql/revertir_semilla_usuarios_reales.sql
--
-- Elimina ÚNICAMENTE las entidades sembradas por sql/semilla_usuarios_reales.sql
-- (y cualquier evaluación de prueba ligada a esas cuentas, CRNs o instalaciones),
-- respetando al 100% los usuarios y datos demo base:
--   - ADMIN001, COORD001, DOC001..DOC003, ALU001..ALU006
--   - Materias, CRNs y evaluaciones de carga_inicial.sql / datos_prueba.sql
--   - Instalaciones base ('Centro de Cómputo', 'Laboratorio Clínico') y sus preguntas
--
-- Ejecución en local:
--   psql -U postgres -d EvaluacionDocentes -f sql/revertir_semilla_usuarios_reales.sql
-- ============================================================================

BEGIN;

-- 1. Respuestas de evaluaciones de instalaciones ligadas a alumnos o instalaciones sembradas
DELETE FROM RespuestaInstalacion
WHERE id_evaluacion_instalacion IN (
    SELECT ei.id_evaluacion_instalacion
    FROM EvaluacionInstalacion ei
    LEFT JOIN Alumno a ON a.id_alumno = ei.id_alumno
    LEFT JOIN Usuario u ON u.id_usuario = a.id_usuario
    LEFT JOIN Instalacion i ON i.id_instalacion = ei.id_instalacion
    WHERE u.numero_cuenta ~ '^ALU(10[1-9]|1[1-9][0-9]|2[01][0-9]|220)$'
       OR i.nombre IN (
            'Laboratorio de Desarrollo de Software',
            'Laboratorio de Redes y Ciberseguridad',
            'Taller de Manufactura y CNC',
            'Laboratorio de Control de Calidad y Ergonomía',
            'Taller de Simulación Empresarial y Finanzas',
            'Cocina Caliente Profesional',
            'Taller de Panadería y Repostería',
            'Laboratorio de Electrónica y Robótica'
       )
)
OR id_pregunta_instalacion IN (
    SELECT pi.id_pregunta_instalacion
    FROM PreguntaInstalacion pi
    INNER JOIN Instalacion i ON i.id_instalacion = pi.id_instalacion
    WHERE i.nombre IN (
        'Laboratorio de Desarrollo de Software',
        'Laboratorio de Redes y Ciberseguridad',
        'Taller de Manufactura y CNC',
        'Laboratorio de Control de Calidad y Ergonomía',
        'Taller de Simulación Empresarial y Finanzas',
        'Cocina Caliente Profesional',
        'Taller de Panadería y Repostería',
        'Laboratorio de Electrónica y Robótica'
    )
);

-- 2. Evaluaciones de instalaciones ligadas a alumnos o instalaciones sembradas
DELETE FROM EvaluacionInstalacion
WHERE id_alumno IN (
    SELECT a.id_alumno
    FROM Alumno a
    INNER JOIN Usuario u ON u.id_usuario = a.id_usuario
    WHERE u.numero_cuenta ~ '^ALU(10[1-9]|1[1-9][0-9]|2[01][0-9]|220)$'
)
OR id_instalacion IN (
    SELECT id_instalacion
    FROM Instalacion
    WHERE nombre IN (
        'Laboratorio de Desarrollo de Software',
        'Laboratorio de Redes y Ciberseguridad',
        'Taller de Manufactura y CNC',
        'Laboratorio de Control de Calidad y Ergonomía',
        'Taller de Simulación Empresarial y Finanzas',
        'Cocina Caliente Profesional',
        'Taller de Panadería y Repostería',
        'Laboratorio de Electrónica y Robótica'
    )
);

-- 3. Preguntas específicas de las 8 instalaciones sembradas
DELETE FROM PreguntaInstalacion
WHERE id_instalacion IN (
    SELECT id_instalacion
    FROM Instalacion
    WHERE nombre IN (
        'Laboratorio de Desarrollo de Software',
        'Laboratorio de Redes y Ciberseguridad',
        'Taller de Manufactura y CNC',
        'Laboratorio de Control de Calidad y Ergonomía',
        'Taller de Simulación Empresarial y Finanzas',
        'Cocina Caliente Profesional',
        'Taller de Panadería y Repostería',
        'Laboratorio de Electrónica y Robótica'
    )
);

-- 4. Las 8 instalaciones sembradas
DELETE FROM Instalacion
WHERE nombre IN (
    'Laboratorio de Desarrollo de Software',
    'Laboratorio de Redes y Ciberseguridad',
    'Taller de Manufactura y CNC',
    'Laboratorio de Control de Calidad y Ergonomía',
    'Taller de Simulación Empresarial y Finanzas',
    'Cocina Caliente Profesional',
    'Taller de Panadería y Repostería',
    'Laboratorio de Electrónica y Robótica'
);

-- 5. Respuestas docentes ligadas a alumnos o CRNs sembrados
DELETE FROM Respuesta
WHERE id_evaluacion IN (
    SELECT e.id_evaluacion
    FROM Evaluacion e
    LEFT JOIN Alumno a ON a.id_alumno = e.id_alumno
    LEFT JOIN Usuario ua ON ua.id_usuario = a.id_usuario
    LEFT JOIN CRN c ON c.id_crn = e.id_crn
    LEFT JOIN Docente d ON d.id_docente = c.id_docente
    LEFT JOIN Usuario ud ON ud.id_usuario = d.id_usuario
    LEFT JOIN Materia m ON m.id_materia = c.id_materia
    WHERE ua.numero_cuenta ~ '^ALU(10[1-9]|1[1-9][0-9]|2[01][0-9]|220)$'
       OR ud.numero_cuenta ~ '^DOC1(0[1-9]|1[0-9]|2[0-5])$'
       OR c.crn BETWEEN 50101 AND 50117
       OR c.crn BETWEEN 35101 AND 35105
       OR c.crn BETWEEN 25101 AND 25105
       OR m.clave IN (
            'SIS101','SIS102','SIS103','SIS104','SIS105','SIS201','SIS202','SIS203',
            'IND101','IND102','IND103','IND104','IND201','IND202','IND203','IND204',
            'ADM101','ADM102','ADM103','ADM104','ADM201','ADM202','ADM203',
            'COC101','COC102','COC103','COC104','COC201','COC202','COC203'
       )
);

-- 6. Evaluaciones docentes ligadas a alumnos o CRNs sembrados
DELETE FROM Evaluacion
WHERE id_alumno IN (
    SELECT a.id_alumno
    FROM Alumno a
    INNER JOIN Usuario u ON u.id_usuario = a.id_usuario
    WHERE u.numero_cuenta ~ '^ALU(10[1-9]|1[1-9][0-9]|2[01][0-9]|220)$'
)
OR id_crn IN (
    SELECT c.id_crn
    FROM CRN c
    LEFT JOIN Docente d ON d.id_docente = c.id_docente
    LEFT JOIN Usuario ud ON ud.id_usuario = d.id_usuario
    LEFT JOIN Materia m ON m.id_materia = c.id_materia
    WHERE c.crn BETWEEN 50101 AND 50117
       OR c.crn BETWEEN 35101 AND 35105
       OR c.crn BETWEEN 25101 AND 25105
       OR ud.numero_cuenta ~ '^DOC1(0[1-9]|1[0-9]|2[0-5])$'
       OR m.clave IN (
            'SIS101','SIS102','SIS103','SIS104','SIS105','SIS201','SIS202','SIS203',
            'IND101','IND102','IND103','IND104','IND201','IND202','IND203','IND204',
            'ADM101','ADM102','ADM103','ADM104','ADM201','ADM202','ADM203',
            'COC101','COC102','COC103','COC104','COC201','COC202','COC203'
       )
);

-- 7. Inscripciones ligadas a alumnos o CRNs sembrados
DELETE FROM Inscripcion
WHERE id_alumno IN (
    SELECT a.id_alumno
    FROM Alumno a
    INNER JOIN Usuario u ON u.id_usuario = a.id_usuario
    WHERE u.numero_cuenta ~ '^ALU(10[1-9]|1[1-9][0-9]|2[01][0-9]|220)$'
)
OR id_crn IN (
    SELECT c.id_crn
    FROM CRN c
    LEFT JOIN Docente d ON d.id_docente = c.id_docente
    LEFT JOIN Usuario ud ON ud.id_usuario = d.id_usuario
    LEFT JOIN Materia m ON m.id_materia = c.id_materia
    WHERE c.crn BETWEEN 50101 AND 50117
       OR c.crn BETWEEN 35101 AND 35105
       OR c.crn BETWEEN 25101 AND 25105
       OR ud.numero_cuenta ~ '^DOC1(0[1-9]|1[0-9]|2[0-5])$'
       OR m.clave IN (
            'SIS101','SIS102','SIS103','SIS104','SIS105','SIS201','SIS202','SIS203',
            'IND101','IND102','IND103','IND104','IND201','IND202','IND203','IND204',
            'ADM101','ADM102','ADM103','ADM104','ADM201','ADM202','ADM203',
            'COC101','COC102','COC103','COC104','COC201','COC202','COC203'
       )
);

-- 8. CRNs sembrados (17 activos + 10 históricos + cualquiera creado con docentes/materias sembrados)
DELETE FROM CRN
WHERE crn BETWEEN 50101 AND 50117
   OR crn BETWEEN 35101 AND 35105
   OR crn BETWEEN 25101 AND 25105
   OR id_docente IN (
       SELECT d.id_docente
       FROM Docente d
       INNER JOIN Usuario u ON u.id_usuario = d.id_usuario
       WHERE u.numero_cuenta ~ '^DOC1(0[1-9]|1[0-9]|2[0-5])$'
   )
   OR id_materia IN (
       SELECT id_materia
       FROM Materia
       WHERE clave IN (
            'SIS101','SIS102','SIS103','SIS104','SIS105','SIS201','SIS202','SIS203',
            'IND101','IND102','IND103','IND104','IND201','IND202','IND203','IND204',
            'ADM101','ADM102','ADM103','ADM104','ADM201','ADM202','ADM203',
            'COC101','COC102','COC103','COC104','COC201','COC202','COC203'
       )
   );

-- 9. Las 30 materias sembradas
DELETE FROM Materia
WHERE clave IN (
    'SIS101','SIS102','SIS103','SIS104','SIS105','SIS201','SIS202','SIS203',
    'IND101','IND102','IND103','IND104','IND201','IND202','IND203','IND204',
    'ADM101','ADM102','ADM103','ADM104','ADM201','ADM202','ADM203',
    'COC101','COC102','COC103','COC104','COC201','COC202','COC203'
);

-- 10. Los 25 docentes y 120 alumnos sembrados (y sus 155 cuentas de Usuario)
DELETE FROM Docente
WHERE id_usuario IN (
    SELECT id_usuario FROM Usuario WHERE numero_cuenta ~ '^DOC1(0[1-9]|1[0-9]|2[0-5])$'
);

DELETE FROM Alumno
WHERE id_usuario IN (
    SELECT id_usuario FROM Usuario WHERE numero_cuenta ~ '^ALU(10[1-9]|1[1-9][0-9]|2[01][0-9]|220)$'
);

DELETE FROM Usuario
WHERE numero_cuenta ~ '^ADMIN10[1-5]$'
   OR numero_cuenta ~ '^COORD10[1-5]$'
   OR numero_cuenta ~ '^DOC1(0[1-9]|1[0-9]|2[0-5])$'
   OR numero_cuenta ~ '^ALU(10[1-9]|1[1-9][0-9]|2[01][0-9]|220)$';

-- 11. Ciclos históricos cerrados: solo se borran si fueron creados por esta semilla (id > 3) y no tienen referencias
DELETE FROM CicloEscolar ce
WHERE ce.activo = FALSE
  AND ce.nombre IN ('Ciclo 2026-1', 'Ciclo 2025-2')
  AND ce.id_ciclo NOT IN (1, 2, 3)
  AND NOT EXISTS (SELECT 1 FROM CRN c WHERE c.id_ciclo = ce.id_ciclo)
  AND NOT EXISTS (SELECT 1 FROM EvaluacionInstalacion ei WHERE ei.id_ciclo = ce.id_ciclo);

-- 12. Reajustar secuencias tras la reversión
SELECT setval(pg_get_serial_sequence('rol', 'id_rol'),
              COALESCE((SELECT MAX(id_rol) FROM Rol), 1),
              (SELECT MAX(id_rol) IS NOT NULL FROM Rol));
SELECT setval(pg_get_serial_sequence('usuario', 'id_usuario'),
              COALESCE((SELECT MAX(id_usuario) FROM Usuario), 1),
              (SELECT MAX(id_usuario) IS NOT NULL FROM Usuario));
SELECT setval(pg_get_serial_sequence('cicloescolar', 'id_ciclo'),
              COALESCE((SELECT MAX(id_ciclo) FROM CicloEscolar), 1),
              (SELECT MAX(id_ciclo) IS NOT NULL FROM CicloEscolar));
SELECT setval(pg_get_serial_sequence('docente', 'id_docente'),
              COALESCE((SELECT MAX(id_docente) FROM Docente), 1),
              (SELECT MAX(id_docente) IS NOT NULL FROM Docente));
SELECT setval(pg_get_serial_sequence('alumno', 'id_alumno'),
              COALESCE((SELECT MAX(id_alumno) FROM Alumno), 1),
              (SELECT MAX(id_alumno) IS NOT NULL FROM Alumno));
SELECT setval(pg_get_serial_sequence('materia', 'id_materia'),
              COALESCE((SELECT MAX(id_materia) FROM Materia), 1),
              (SELECT MAX(id_materia) IS NOT NULL FROM Materia));
SELECT setval(pg_get_serial_sequence('crn', 'id_crn'),
              COALESCE((SELECT MAX(id_crn) FROM CRN), 1),
              (SELECT MAX(id_crn) IS NOT NULL FROM CRN));
SELECT setval(pg_get_serial_sequence('inscripcion', 'id_inscripcion'),
              COALESCE((SELECT MAX(id_inscripcion) FROM Inscripcion), 1),
              (SELECT MAX(id_inscripcion) IS NOT NULL FROM Inscripcion));
SELECT setval(pg_get_serial_sequence('pregunta', 'id_pregunta'),
              COALESCE((SELECT MAX(id_pregunta) FROM Pregunta), 1),
              (SELECT MAX(id_pregunta) IS NOT NULL FROM Pregunta));
SELECT setval(pg_get_serial_sequence('evaluacion', 'id_evaluacion'),
              COALESCE((SELECT MAX(id_evaluacion) FROM Evaluacion), 1),
              (SELECT MAX(id_evaluacion) IS NOT NULL FROM Evaluacion));
SELECT setval(pg_get_serial_sequence('respuesta', 'id_respuesta'),
              COALESCE((SELECT MAX(id_respuesta) FROM Respuesta), 1),
              (SELECT MAX(id_respuesta) IS NOT NULL FROM Respuesta));
SELECT setval(pg_get_serial_sequence('instalacion', 'id_instalacion'),
              COALESCE((SELECT MAX(id_instalacion) FROM Instalacion), 1),
              (SELECT MAX(id_instalacion) IS NOT NULL FROM Instalacion));
SELECT setval(pg_get_serial_sequence('preguntainstalacion', 'id_pregunta_instalacion'),
              COALESCE((SELECT MAX(id_pregunta_instalacion) FROM PreguntaInstalacion), 1),
              (SELECT MAX(id_pregunta_instalacion) IS NOT NULL FROM PreguntaInstalacion));
SELECT setval(pg_get_serial_sequence('evaluacioninstalacion', 'id_evaluacion_instalacion'),
              COALESCE((SELECT MAX(id_evaluacion_instalacion) FROM EvaluacionInstalacion), 1),
              (SELECT MAX(id_evaluacion_instalacion) IS NOT NULL FROM EvaluacionInstalacion));
SELECT setval(pg_get_serial_sequence('respuestainstalacion', 'id_respuesta_instalacion'),
              COALESCE((SELECT MAX(id_respuesta_instalacion) FROM RespuestaInstalacion), 1),
              (SELECT MAX(id_respuesta_instalacion) IS NOT NULL FROM RespuestaInstalacion));

COMMIT;
