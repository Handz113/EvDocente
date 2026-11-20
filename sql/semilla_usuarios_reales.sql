-- Los archivos están en UTF-8: evita acentos rotos al cargarlos desde la consola de Windows
SET client_encoding = 'UTF8';

-- ============================================================================
-- SEMILLA DE DATOS REALISTAS DE PRUEBA (~218 entidades base + evaluaciones)
-- Archivo: sql/semilla_usuarios_reales.sql
--
-- Prerrequisitos (en este orden):
--   1. sql/carga_inicial.sql
--   2. sql/datos_prueba.sql (opcional; este script respeta todos los usuarios demo)
--   3. sql/modulo_talleres_laboratorios.sql
--
-- Ejecución en local:
--   psql -U postgres -d EvaluacionDocentes -f sql/semilla_usuarios_reales.sql
--
-- Reversión segura (sin afectar usuarios ni datos demo):
--   psql -U postgres -d EvaluacionDocentes -f sql/revertir_semilla_usuarios_reales.sql
--
-- Optimización de contraseñas:
--   Hashes bcrypt (cost=10, compatibles con bcryptjs en backend/controllers/authController.ts)
--   precalculados una sola vez por rol (no modifica ALU001, DOC001, COORD001, ADMIN001):
--     - Administradores (ADMIN101..ADMIN105): Admin2026!
--     - Coordinadores   (COORD101..COORD105): Coord2026!
--     - Docentes        (DOC101..DOC125):     Docente2026!
--     - Alumnos         (ALU101..ALU220):     Alumno2026!
--
-- Distribución sembrada:
--   - 5 Administradores + 5 Coordinadores + 25 Docentes (4 deptos) + 120 Alumnos (4 carreras, sem 1-9)
--   - 30 Materias + 17 CRNs en el ciclo activo (50101..50117) + 10 CRNs en ciclos históricos cerrados
--   - 8 Instalaciones activas (talleres y laboratorios) + 3 criterios específicos adicionales
--   - 480 inscripciones activas (3 a 5 materias por alumno):
--       * 384 evaluadas (80.0%) con 15 respuestas válidas {0, 2.5, 5, 7.5, 10}
--       * 96 pendientes (20.0%), incluyendo 15 cuentas limpias (ALU206..ALU220) listas para pruebas en vivo
--       * Variedad real de desempeño docente: Excelente, Bueno, Suficiente y 3 en No Suficiente (< 7.0)
--   - 176 evaluaciones activas + 40 históricas de talleres/laboratorios con comentarios variados
-- ============================================================================

BEGIN;

-- ============================================================================
-- 0. SINCRONIZACIÓN DEFENSIVA DE SECUENCIAS (por si solo se ejecutó carga_inicial.sql)
-- ============================================================================
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

-- ============================================================================
-- 1. VERIFICACIÓN DE PRERREQUISITOS Y CICLOS HISTÓRICOS CERRADOS
-- ============================================================================
DO $check$
DECLARE
    v_ciclos_activos INT;
    v_preguntas_activas INT;
BEGIN
    SELECT COUNT(*) INTO v_ciclos_activos FROM CicloEscolar WHERE activo = TRUE;
    IF v_ciclos_activos = 0 THEN
        RAISE EXCEPTION 'No existe un CicloEscolar activo (activo = TRUE). Ejecuta primero sql/carga_inicial.sql.';
    END IF;

    SELECT COUNT(*) INTO v_preguntas_activas FROM Pregunta WHERE activa = TRUE;
    IF v_preguntas_activas = 0 THEN
        RAISE EXCEPTION 'No existen preguntas activas en la tabla Pregunta. Ejecuta primero sql/carga_inicial.sql.';
    END IF;
END
$check$;

-- Garantiza que existan dos ciclos históricos cerrados (si ya los creó datos_prueba.sql, los reutiliza)
INSERT INTO CicloEscolar (nombre, fecha_inicio_eval, fecha_cierre_eval, activo)
SELECT 'Ciclo 2026-1', DATE '2026-02-01', DATE '2026-06-30', FALSE
WHERE NOT EXISTS (SELECT 1 FROM CicloEscolar WHERE nombre = 'Ciclo 2026-1');

INSERT INTO CicloEscolar (nombre, fecha_inicio_eval, fecha_cierre_eval, activo)
SELECT 'Ciclo 2025-2', DATE '2025-08-01', DATE '2025-12-15', FALSE
WHERE NOT EXISTS (SELECT 1 FROM CicloEscolar WHERE nombre = 'Ciclo 2025-2');

-- ============================================================================
-- 2. 5 NUEVOS ADMINISTRADORES Y 5 NUEVOS COORDINADORES (sin alterar demo)
-- ============================================================================
INSERT INTO Usuario (numero_cuenta, correo_institucional, contrasena, id_rol, activo)
VALUES
    -- 5 Administradores (Contraseña: Admin2026!)
    ('ADMIN101', 'admin.patricia.vega@escuela.edu',    '$2b$10$MzPzE5fzqQmzWhl.r9BNEOmHrW.g4Oim7Sa.S0b1.5ZydkQP464su', (SELECT id_rol FROM Rol WHERE nombre = 'Administrador'), TRUE),
    ('ADMIN102', 'admin.jorge.campos@escuela.edu',     '$2b$10$MzPzE5fzqQmzWhl.r9BNEOmHrW.g4Oim7Sa.S0b1.5ZydkQP464su', (SELECT id_rol FROM Rol WHERE nombre = 'Administrador'), TRUE),
    ('ADMIN103', 'admin.monica.rios@escuela.edu',      '$2b$10$MzPzE5fzqQmzWhl.r9BNEOmHrW.g4Oim7Sa.S0b1.5ZydkQP464su', (SELECT id_rol FROM Rol WHERE nombre = 'Administrador'), TRUE),
    ('ADMIN104', 'admin.hector.navarro@escuela.edu',   '$2b$10$MzPzE5fzqQmzWhl.r9BNEOmHrW.g4Oim7Sa.S0b1.5ZydkQP464su', (SELECT id_rol FROM Rol WHERE nombre = 'Administrador'), TRUE),
    ('ADMIN105', 'admin.claudia.ibarra@escuela.edu',   '$2b$10$MzPzE5fzqQmzWhl.r9BNEOmHrW.g4Oim7Sa.S0b1.5ZydkQP464su', (SELECT id_rol FROM Rol WHERE nombre = 'Administrador'), TRUE),
    -- 5 Coordinadores (Contraseña: Coord2026!)
    ('COORD101', 'coord.sistemas@escuela.edu',         '$2b$10$DxkwIoeNpsjMon3FvXGZNu/p1bnYc.AS8ItxthaXXfLeWji49sCXu', (SELECT id_rol FROM Rol WHERE nombre = 'Coordinador'),   TRUE),
    ('COORD102', 'coord.industrial@escuela.edu',       '$2b$10$DxkwIoeNpsjMon3FvXGZNu/p1bnYc.AS8ItxthaXXfLeWji49sCXu', (SELECT id_rol FROM Rol WHERE nombre = 'Coordinador'),   TRUE),
    ('COORD103', 'coord.administracion@escuela.edu',   '$2b$10$DxkwIoeNpsjMon3FvXGZNu/p1bnYc.AS8ItxthaXXfLeWji49sCXu', (SELECT id_rol FROM Rol WHERE nombre = 'Coordinador'),   TRUE),
    ('COORD104', 'coord.cocina@escuela.edu',           '$2b$10$DxkwIoeNpsjMon3FvXGZNu/p1bnYc.AS8ItxthaXXfLeWji49sCXu', (SELECT id_rol FROM Rol WHERE nombre = 'Coordinador'),   TRUE),
    ('COORD105', 'coord.calidad@escuela.edu',          '$2b$10$DxkwIoeNpsjMon3FvXGZNu/p1bnYc.AS8ItxthaXXfLeWji49sCXu', (SELECT id_rol FROM Rol WHERE nombre = 'Coordinador'),   TRUE)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 3. 25 NUEVOS DOCENTES EN 4 DEPARTAMENTOS (DOC101..DOC125, Contraseña: Docente2026!)
-- ============================================================================
INSERT INTO Usuario (numero_cuenta, correo_institucional, contrasena, id_rol, activo)
SELECT
    ds.numero_cuenta,
    ds.correo,
    '$2b$10$AXBsb2wyISvjleuL25RNieBhMtO/.rJjC0WsaiUGQS.c6Phkkl6Si',
    (SELECT id_rol FROM Rol WHERE nombre = 'Docente'),
    TRUE
FROM (
    VALUES
        -- Departamento: Sistemas (7 docentes)
        ('DOC101', 'elena.morales.doc101@escuela.edu'),
        ('DOC103', 'alejandro.dominguez.doc103@escuela.edu'),
        ('DOC104', 'sofia.castillo.doc104@escuela.edu'),
        ('DOC105', 'ricardo.fuentes.doc105@escuela.edu'),
        ('DOC116', 'gabriel.ortega.doc116@escuela.edu'),
        ('DOC117', 'mariana.delgado.doc117@escuela.edu'),
        ('DOC118', 'fernando.vazquez.doc118@escuela.edu'),
        -- Departamento: Ingeniería Industrial (6 docentes)
        ('DOC102', 'carlos.herrera.doc102@escuela.edu'),
        ('DOC106', 'beatriz.aguilar.doc106@escuela.edu'),
        ('DOC107', 'martin.estrada.doc107@escuela.edu'),
        ('DOC119', 'rocio.sandoval.doc119@escuela.edu'),
        ('DOC120', 'arturo.pacheco.doc120@escuela.edu'),
        ('DOC121', 'veronica.cortes.doc121@escuela.edu'),
        -- Departamento: Administración (6 docentes)
        ('DOC108', 'gabriela.navarro.doc108@escuela.edu'),
        ('DOC109', 'eduardo.salinas.doc109@escuela.edu'),
        ('DOC110', 'patricia.zamora.doc110@escuela.edu'),
        ('DOC111', 'raul.cisneros.doc111@escuela.edu'),
        ('DOC122', 'liliana.juarez.doc122@escuela.edu'),
        ('DOC123', 'oscar.montoya.doc123@escuela.edu'),
        -- Departamento: Gastronomía y Cocina (6 docentes)
        ('DOC112', 'lucia.beltran.doc112@escuela.edu'),
        ('DOC113', 'daniel.rangel.doc113@escuela.edu'),
        ('DOC114', 'karla.espinosa.doc114@escuela.edu'),
        ('DOC115', 'gustavo.pineda.doc115@escuela.edu'),
        ('DOC124', 'paola.villalobos.doc124@escuela.edu'),
        ('DOC125', 'ernesto.maldonado.doc125@escuela.edu')
) AS ds(numero_cuenta, correo)
ON CONFLICT DO NOTHING;

INSERT INTO Docente (id_usuario, nombre, apellido, departamento)
SELECT
    u.id_usuario,
    ds.nombre,
    ds.apellido,
    ds.departamento
FROM (
    VALUES
        -- Departamento: Sistemas (7 docentes)
        ('DOC101', 'Elena',     'Morales Ríos',       'Sistemas'),
        ('DOC103', 'Alejandro', 'Domínguez Cruz',     'Sistemas'),
        ('DOC104', 'Sofía',     'Castillo Méndez',    'Sistemas'),
        ('DOC105', 'Ricardo',   'Fuentes Paredes',    'Sistemas'),
        ('DOC116', 'Gabriel',   'Ortega Luna',        'Sistemas'),
        ('DOC117', 'Mariana',   'Delgado Solís',      'Sistemas'),
        ('DOC118', 'Fernando',  'Vázquez Peña',       'Sistemas'),
        -- Departamento: Ingeniería Industrial (6 docentes)
        ('DOC102', 'Carlos',    'Herrera Valdez',     'Ingeniería Industrial'),
        ('DOC106', 'Beatriz',   'Aguilar Lozano',     'Ingeniería Industrial'),
        ('DOC107', 'Martín',    'Estrada Guerrero',   'Ingeniería Industrial'),
        ('DOC119', 'Rocío',     'Sandoval Reyes',     'Ingeniería Industrial'),
        ('DOC120', 'Arturo',    'Pacheco Medina',     'Ingeniería Industrial'),
        ('DOC121', 'Verónica',  'Cortés Núñez',       'Ingeniería Industrial'),
        -- Departamento: Administración (6 docentes)
        ('DOC108', 'Gabriela',  'Navarro Ochoa',      'Administración'),
        ('DOC109', 'Eduardo',   'Salinas Bautista',   'Administración'),
        ('DOC110', 'Patricia',  'Zamora Trejo',       'Administración'),
        ('DOC111', 'Raúl',      'Cisneros Cabrera',   'Administración'),
        ('DOC122', 'Liliana',   'Juárez Miranda',     'Administración'),
        ('DOC123', 'Óscar',     'Montoya Serrano',    'Administración'),
        -- Departamento: Gastronomía y Cocina (6 docentes)
        ('DOC112', 'Lucía',     'Beltrán Quiroz',     'Gastronomía y Cocina'),
        ('DOC113', 'Daniel',    'Rangel Figueroa',    'Gastronomía y Cocina'),
        ('DOC114', 'Karla',     'Espinosa Romero',    'Gastronomía y Cocina'),
        ('DOC115', 'Gustavo',   'Pineda Lara',        'Gastronomía y Cocina'),
        ('DOC124', 'Paola',     'Villalobos Tapia',   'Gastronomía y Cocina'),
        ('DOC125', 'Ernesto',   'Maldonado Bravo',    'Gastronomía y Cocina')
) AS ds(numero_cuenta, nombre, apellido, departamento)
INNER JOIN Usuario u ON u.numero_cuenta = ds.numero_cuenta
ON CONFLICT (id_usuario) DO NOTHING;

-- ============================================================================
-- 4. 120 NUEVOS ALUMNOS (ALU101..ALU220, Contraseña: Alumno2026!)
--    4 carreras (30 c/u): Ingeniería en Sistemas, Ingeniería Industrial,
--    Administración y Cocina; semestres del 1 al 9 distribuidos de forma uniforme.
-- ============================================================================
WITH nombres_base AS (
    SELECT
        ARRAY[
            'sofia','mateo','valentina','sebastian','regina','santiago','camila','emiliano','renata','diego',
            'mariana','nicolas','fernanda','daniel','paula','andres','andrea','lucas','ximena','gabriel'
        ] AS arr_nombres,
        ARRAY[
            'martinez','garcia','lopez','gonzalez','rodriguez','perez','sanchez','ramirez','cruz','flores',
            'gomez','morales','vazquez','reyes','jimenez','torres','diaz','gutierrez','ruiz','mendoza',
            'aguilar','ortiz','castillo','moreno'
        ] AS arr_apellidos
)
INSERT INTO Usuario (numero_cuenta, correo_institucional, contrasena, id_rol, activo)
SELECT
    'ALU' || (100 + k)::TEXT AS numero_cuenta,
    nb.arr_nombres[((k - 1) % array_length(nb.arr_nombres, 1)) + 1]
        || '.'
        || nb.arr_apellidos[((((k - 1) / 5) + (k - 1) * 7) % array_length(nb.arr_apellidos, 1)) + 1]
        || '.' || (100 + k)::TEXT || '@escuela.edu' AS correo_institucional,
    '$2b$10$HNWfqQQJtBDKSwATMSLvIuGbeTf1LfBjLJUBNGbcWHnAvM3ILGYbe',
    (SELECT id_rol FROM Rol WHERE nombre = 'Alumno'),
    TRUE
FROM generate_series(1, 120) AS k
CROSS JOIN nombres_base nb
ON CONFLICT DO NOTHING;

WITH carreras_base AS (
    SELECT ARRAY[
        'Ingeniería en Sistemas',
        'Ingeniería Industrial',
        'Administración',
        'Cocina'
    ] AS arr_carreras
)
INSERT INTO Alumno (id_usuario, carrera, semestre)
SELECT
    u.id_usuario,
    cb.arr_carreras[((k - 1) % 4) + 1] AS carrera,
    (((k - 1) / 4) % 9) + 1 AS semestre
FROM generate_series(1, 120) AS k
CROSS JOIN carreras_base cb
INNER JOIN Usuario u ON u.numero_cuenta = 'ALU' || (100 + k)::TEXT
ON CONFLICT (id_usuario) DO NOTHING;

-- ============================================================================
-- 5. 30 NUEVAS MATERIAS (claves SIS/IND/ADM/COC, sin colisionar con las base)
-- ============================================================================
INSERT INTO Materia (nombre, clave, creditos)
VALUES
    -- Sistemas (8 materias)
    ('Arquitectura de Software',              'SIS101', 8),
    ('Seguridad Informática y Redes',         'SIS102', 8),
    ('Desarrollo Web Full Stack',             'SIS103', 8),
    ('Inteligencia Artificial Aplicada',      'SIS104', 8),
    ('Sistemas Operativos Modernos',          'SIS105', 6),
    ('Estructura de Datos y Algoritmos',      'SIS201', 8),
    ('Computación en la Nube',                'SIS202', 6),
    ('Minería de Datos y Analítica',          'SIS203', 6),
    -- Ingeniería Industrial (8 materias)
    ('Investigación de Operaciones',          'IND101', 8),
    ('Control Estadístico de Calidad',        'IND102', 8),
    ('Manufactura Esbelta y Six Sigma',       'IND103', 8),
    ('Logística y Cadena de Suministro',      'IND104', 6),
    ('Estudio del Trabajo y Ergonomía',       'IND201', 6),
    ('Simulación de Procesos Industriales',   'IND202', 8),
    ('Seguridad e Higiene Industrial',        'IND203', 6),
    ('Planeación y Control de la Producción', 'IND204', 8),
    -- Administración (7 materias)
    ('Finanzas Corporativas',                 'ADM101', 8),
    ('Dirección Estratégica y Liderazgo',     'ADM102', 6),
    ('Mercadotecnia Digital',                 'ADM103', 6),
    ('Contabilidad Administrativa',           'ADM104', 8),
    ('Gestión del Talento Humano',            'ADM201', 6),
    ('Derecho Mercantil y Laboral',           'ADM202', 6),
    ('Emprendimiento e Innovación',           'ADM203', 6),
    -- Gastronomía y Cocina (7 materias)
    ('Técnicas Culinarias Avanzadas',         'COC101', 8),
    ('Panadería y Repostería Profesional',    'COC102', 8),
    ('Higiene y Conservación de Alimentos',   'COC103', 6),
    ('Costos y Operación de Restaurantes',    'COC104', 6),
    ('Cocina Mexicana Contemporánea',         'COC201', 8),
    ('Enología y Maridaje',                   'COC202', 6),
    ('Nutrición y Dietética Aplicada',        'COC203', 6)
ON CONFLICT (clave) DO NOTHING;

-- ============================================================================
-- 6. 17 CRNs EN EL CICLO ACTIVO (50101..50117) + 10 CRNs EN CICLOS HISTÓRICOS
-- ============================================================================
WITH ciclo_activo AS (
    SELECT id_ciclo FROM CicloEscolar WHERE activo = TRUE ORDER BY id_ciclo DESC LIMIT 1
),
ciclo_hist_1 AS (
    SELECT id_ciclo FROM CicloEscolar WHERE nombre = 'Ciclo 2026-1' ORDER BY id_ciclo DESC LIMIT 1
),
ciclo_hist_2 AS (
    SELECT id_ciclo FROM CicloEscolar WHERE nombre = 'Ciclo 2025-2' ORDER BY id_ciclo DESC LIMIT 1
),
crns_seed (crn_num, doc_cuenta, mat_clave, tipo_ciclo) AS (
    VALUES
        -- 17 CRNs en ciclo activo (activo = TRUE)
        (50101, 'DOC101', 'SIS101', 'ACTIVO'),
        (50102, 'DOC101', 'SIS102', 'ACTIVO'),
        (50103, 'DOC103', 'SIS103', 'ACTIVO'),
        (50104, 'DOC104', 'SIS104', 'ACTIVO'),
        (50105, 'DOC105', 'SIS105', 'ACTIVO'),
        (50106, 'DOC102', 'IND101', 'ACTIVO'),
        (50107, 'DOC102', 'IND102', 'ACTIVO'),
        (50108, 'DOC106', 'IND103', 'ACTIVO'),
        (50109, 'DOC107', 'IND104', 'ACTIVO'),
        (50110, 'DOC108', 'ADM101', 'ACTIVO'),
        (50111, 'DOC109', 'ADM102', 'ACTIVO'),
        (50112, 'DOC110', 'ADM103', 'ACTIVO'),
        (50113, 'DOC111', 'ADM104', 'ACTIVO'),
        (50114, 'DOC112', 'COC101', 'ACTIVO'),
        (50115, 'DOC113', 'COC102', 'ACTIVO'),
        (50116, 'DOC114', 'COC103', 'ACTIVO'),
        (50117, 'DOC115', 'COC104', 'ACTIVO'),
        -- 5 CRNs históricos en Ciclo 2026-1 (cerrado)
        (35101, 'DOC101', 'SIS201', 'HIST1'),
        (35102, 'DOC105', 'SIS203', 'HIST1'),
        (35103, 'DOC102', 'IND201', 'HIST1'),
        (35104, 'DOC108', 'ADM201', 'HIST1'),
        (35105, 'DOC112', 'COC201', 'HIST1'),
        -- 5 CRNs históricos en Ciclo 2025-2 (cerrado)
        (25101, 'DOC116', 'SIS202', 'HIST2'),
        (25102, 'DOC119', 'IND202', 'HIST2'),
        (25103, 'DOC107', 'IND203', 'HIST2'),
        (25104, 'DOC122', 'ADM202', 'HIST2'),
        (25105, 'DOC124', 'COC202', 'HIST2')
)
INSERT INTO CRN (id_docente, id_materia, id_ciclo, crn)
SELECT
    d.id_docente,
    m.id_materia,
    CASE cs.tipo_ciclo
        WHEN 'ACTIVO' THEN (SELECT id_ciclo FROM ciclo_activo)
        WHEN 'HIST1'  THEN (SELECT id_ciclo FROM ciclo_hist_1)
        ELSE               (SELECT id_ciclo FROM ciclo_hist_2)
    END AS id_ciclo,
    cs.crn_num
FROM crns_seed cs
INNER JOIN Usuario u ON u.numero_cuenta = cs.doc_cuenta
INNER JOIN Docente d ON d.id_usuario = u.id_usuario
INNER JOIN Materia m ON m.clave = cs.mat_clave
ON CONFLICT (crn) DO NOTHING;

-- ============================================================================
-- 7. 8 INSTALACIONES ACTIVAS (TALLERES Y LABORATORIOS) + PREGUNTAS ESPECÍFICAS
-- ============================================================================
INSERT INTO Instalacion (nombre, tipo, descripcion, activa)
VALUES
    ('Laboratorio de Desarrollo de Software',       'Centro de Cómputo',  'Estaciones de alto rendimiento con entornos de desarrollo, bases de datos y pruebas automatizadas.', TRUE),
    ('Laboratorio de Redes y Ciberseguridad',       'Laboratorio',        'Switches administrables, servidores virtuales y estaciones para prácticas de redes y seguridad.',     TRUE),
    ('Taller de Manufactura y CNC',                 'Taller',             'Tornos CNC, fresadoras y bancos de metrología para prácticas de Ingeniería Industrial.',              TRUE),
    ('Laboratorio de Control de Calidad y Ergonomía','Laboratorio',       'Instrumentos de medición estadística, cronómetros industriales y estaciones de estudio de tiempos.',   TRUE),
    ('Taller de Simulación Empresarial y Finanzas', 'Aula Especializada', 'Software ERP, terminales de análisis financiero y salas para simulación de negocios.',                TRUE),
    ('Cocina Caliente Profesional',                 'Taller de Cocina',   'Estufas industriales, hornos de convección, freidoras y estaciones individuales de acero inoxidable.', TRUE),
    ('Taller de Panadería y Repostería',            'Taller de Cocina',   'Hornos de piso, amasadoras industriales, cámara de fermentación y mesas de mármol para pastelería.',   TRUE),
    ('Laboratorio de Electrónica y Robótica',       'Laboratorio',        'Osciloscopios, fuentes reguladas, impresoras 3D y kits de microcontroladores para prototipado.',      TRUE)
ON CONFLICT (nombre) DO NOTHING;

-- Defensa: si no existieran preguntas generales de instalaciones, inserta las 6 estándar
INSERT INTO PreguntaInstalacion (id_instalacion, dimension, texto, activa)
SELECT NULL, v.dimension, v.texto, TRUE
FROM (
    VALUES
        ('Equipamiento',   'El equipo y los materiales funcionan correctamente.'),
        ('Equipamiento',   'La cantidad de equipo es suficiente para el grupo.'),
        ('Disponibilidad', 'El horario de acceso cubre las necesidades de las prácticas.'),
        ('Disponibilidad', 'Es fácil conseguir lugar para usar la instalación.'),
        ('Limpieza',       'La instalación está limpia y ordenada.'),
        ('Limpieza',       'Las condiciones de higiene y seguridad son adecuadas.')
) AS v(dimension, texto)
WHERE NOT EXISTS (SELECT 1 FROM PreguntaInstalacion WHERE id_instalacion IS NULL);

-- 3 criterios específicos adicionales para enriquecer la evaluación de talleres clave
INSERT INTO PreguntaInstalacion (id_instalacion, dimension, texto, activa)
SELECT i.id_instalacion, p.dimension, p.texto, TRUE
FROM (
    VALUES
        ('Cocina Caliente Profesional',           'Equipamiento',   'Las estufas, hornos y campanas de extracción operan de forma segura y eficiente.'),
        ('Taller de Manufactura y CNC',           'Equipamiento',   'Las máquinas CNC y herramientas de medición están calibradas y disponibles para práctica.'),
        ('Laboratorio de Redes y Ciberseguridad', 'Disponibilidad', 'Los racks de red y entornos virtuales están disponibles sin fallas durante la sesión.')
) AS p(inst_nombre, dimension, texto)
INNER JOIN Instalacion i ON i.nombre = p.inst_nombre
WHERE NOT EXISTS (
    SELECT 1
    FROM PreguntaInstalacion pi
    WHERE pi.id_instalacion = i.id_instalacion
      AND pi.texto = p.texto
);

-- ============================================================================
-- 8, 9 y 10. INSCRIPCIONES, EVALUACIONES DOCENTES (15 RESPUESTAS) Y
--            EVALUACIONES DE INSTALACIONES (CON COMENTARIOS VARIADOS)
-- ============================================================================
DO $seed$
DECLARE
    v_ciclo_activo    INT;
    v_inicio_activo   DATE;
    v_cierre_activo   DATE;
    v_ciclo_hist_1    INT;
    v_inicio_hist_1   DATE;
    v_cierre_hist_1   DATE;
    v_ciclo_hist_2    INT;
    v_inicio_hist_2   DATE;
    v_cierre_hist_2   DATE;

    -- Variables de iteración para inscripciones y evaluaciones docentes
    v_k               INT;
    v_id_alumno       INT;
    v_career_idx      INT;
    v_c_idx           INT;
    v_num_mat         INT;
    v_eval_count      INT;
    v_group_idx       INT;
    v_core_crns       INT[];
    v_elec_crns       INT[];
    v_assigned_crns   INT[];
    v_j               INT;
    v_crn_num         INT;
    v_id_crn          INT;
    v_tier            TEXT;
    v_id_eval         INT;
    v_fecha_eval      TIMESTAMP;
    v_comentario      TEXT;
    v_h               INT;
    v_valor           NUMERIC(4, 2);
    r_preg            RECORD;

    -- Comentarios realistas en español clasificados por nivel de desempeño docente
    v_com_excelente TEXT[] := ARRAY[
        'Excelente dominio de la materia; explica con muchísima claridad y relaciona la teoría con casos reales.',
        'Siempre llega puntual, resuelve todas las dudas con paciencia y motiva al grupo a participar.',
        'Las clases están muy bien planeadas y los proyectos prácticos refuerzan todo lo visto en clase.',
        'Gran disposición para dar retroalimentación detallada y objetiva en cada entrega.',
        'De los mejores docentes del departamento; domina las herramientas actuales y fomenta el pensamiento crítico.',
        'Evaluación justa, ambiente respetuoso y materiales didácticos muy completos durante todo el semestre.'
    ];
    v_com_bueno TEXT[] := ARRAY[
        'Muy buenas clases y dominio del tema; sería ideal compartir las presentaciones con mayor anticipación.',
        'Explica bien y resuelve dudas en clase, aunque a veces el ritmo se acelera antes de los parciales.',
        'Buen manejo de grupo y evaluación clara; vendrían bien más ejercicios prácticos en clase.',
        'Cumple con el temario y mantiene un trato respetuoso; podría integrar más herramientas digitales.',
        'Se aprende bastante en el curso, solo hace falta un poco más de tiempo para retroalimentar proyectos.'
    ];
    v_com_suficiente TEXT[] := ARRAY[
        'Cumple con el programa, pero falta retroalimentación más específica sobre los errores en tareas y exámenes.',
        'Conoce la materia, aunque las clases se vuelven monótonas y faltan recursos didácticos visuales.',
        'Las explicaciones son aceptables, pero se agradecería mejor organización en las fechas de entrega.',
        'Falta aprovechar mejor la tecnología y dedicar más espacio a resolver dudas prácticas en clase.',
        'El temario se cubre, pero la dinámica de clase podría ser más participativa y estructurada.'
    ];
    v_com_nosuf TEXT[] := ARRAY[
        'Falta planeación en las sesiones; con frecuencia se improvisa y quedan temas sin explicar con claridad.',
        'Los criterios de evaluación no fueron claros desde el inicio y tarda demasiado en entregar calificaciones.',
        'Hubo varias inasistencias y poca puntualidad, lo que afectó el avance normal del programa.',
        'Cuando se plantean dudas no se resuelven con claridad y no hay retroalimentación sobre los proyectos.',
        'Se requiere mejorar drásticamente la metodología de enseñanza y el cumplimiento del temario oficial.'
    ];

    -- Variables para evaluaciones de instalaciones (talleres y laboratorios)
    r_inst            RECORD;
    r_alu_inst        RECORD;
    r_pinst           RECORD;
    v_id_eval_inst    INT;
    v_inst_idx        INT := 0;
    v_alu_seq         INT;
    v_com_inst        TEXT;

    v_com_inst_alto TEXT[] := ARRAY[
        'Instalación impecable, equipo moderno y excelente mantenimiento durante todas las prácticas.',
        'Todo funciona correctamente y siempre se encuentra limpia, ordenada y lista para trabajar.',
        'Muy buen espacio para prácticas; el equipamiento está actualizado y las condiciones de seguridad son óptimas.',
        'Excelente atención en el taller y disponibilidad adecuada de equipos para todo el grupo.'
    ];
    v_com_inst_medio TEXT[] := ARRAY[
        'El equipo en general funciona bien, aunque en horas pico cuesta encontrar estación libre.',
        'Buena limpieza y orden, pero algunos equipos requieren actualización o mantenimiento preventivo.',
        'Cumple para las prácticas del semestre; ayudaría ampliar el horario de acceso en la tarde.',
        'Espacio funcional y seguro, aunque hace falta mayor cantidad de insumos para grupos numerosos.'
    ];
    v_com_inst_bajo TEXT[] := ARRAY[
        'Varios equipos presentan fallas recurrentes y es difícil conseguir lugar disponible en horario de clase.',
        'Se necesita mantenimiento urgente al equipamiento y mejor organización en el préstamo de espacios.',
        'La limpieza es aceptable, pero la disponibilidad de horarios y el estado de los instrumentos limitan las prácticas.',
        'Falta calibración y renovación de equipo; a menudo tenemos que compartir estación entre varios alumnos.'
    ];
BEGIN
    -- Resolver ciclos escolares dinámicamente
    SELECT id_ciclo, fecha_inicio_eval, fecha_cierre_eval
      INTO v_ciclo_activo, v_inicio_activo, v_cierre_activo
    FROM CicloEscolar
    WHERE activo = TRUE
    ORDER BY id_ciclo DESC
    LIMIT 1;

    SELECT id_ciclo, fecha_inicio_eval, fecha_cierre_eval
      INTO v_ciclo_hist_1, v_inicio_hist_1, v_cierre_hist_1
    FROM CicloEscolar
    WHERE nombre = 'Ciclo 2026-1'
    ORDER BY id_ciclo DESC
    LIMIT 1;

    SELECT id_ciclo, fecha_inicio_eval, fecha_cierre_eval
      INTO v_ciclo_hist_2, v_inicio_hist_2, v_cierre_hist_2
    FROM CicloEscolar
    WHERE nombre = 'Ciclo 2025-2'
    ORDER BY id_ciclo DESC
    LIMIT 1;

    -- ========================================================================
    -- A) INSCRIPCIONES Y EVALUACIONES EN EL CICLO ACTIVO (120 ALUMNOS)
    --    * 480 inscripciones totales (40 con 3 mat, 40 con 4 mat, 40 con 5 mat)
    --    * 384 evaluaciones (80.0%) y 96 pendientes (20.0%)
    --    * ALU101..ALU187 (87): 100% evaluadas (348)
    --    * ALU188..ALU205 (18): 50% evaluadas (36) / 50% pendientes (36)
    --    * ALU206..ALU220 (15): 0% evaluadas (cuentas limpias, 60 pendientes)
    -- ========================================================================
    FOR v_k IN 1..120 LOOP
        SELECT a.id_alumno INTO v_id_alumno
        FROM Alumno a
        INNER JOIN Usuario u ON u.id_usuario = a.id_usuario
        WHERE u.numero_cuenta = 'ALU' || (100 + v_k)::TEXT;

        IF v_id_alumno IS NULL THEN
            CONTINUE;
        END IF;

        v_career_idx := (v_k - 1) % 4;   -- 0: Sistemas, 1: Industrial, 2: Admin, 3: Cocina
        v_c_idx      := (v_k - 1) / 4;   -- 0..29 índice dentro de su carrera
        v_num_mat    := ((v_k - 1) % 3) + 3; -- 3, 4 o 5 materias

        IF v_career_idx = 0 THEN
            v_core_crns := ARRAY[50101, 50102, 50103, 50104, 50105];
            v_elec_crns := ARRAY[]::INT[];
        ELSIF v_career_idx = 1 THEN
            v_core_crns := ARRAY[50106, 50107, 50108, 50109];
            v_elec_crns := ARRAY[50101, 50110, 50111, 50104];
        ELSIF v_career_idx = 2 THEN
            v_core_crns := ARRAY[50110, 50111, 50112, 50113];
            v_elec_crns := ARRAY[50109, 50103, 50117, 50107];
        ELSE
            v_core_crns := ARRAY[50114, 50115, 50116, 50117];
            v_elec_crns := ARRAY[50112, 50113, 50110, 50111];
        END IF;

        v_assigned_crns := ARRAY[]::INT[];
        IF v_career_idx = 0 THEN
            FOR v_j IN 0..(v_num_mat - 1) LOOP
                v_assigned_crns := array_append(
                    v_assigned_crns,
                    v_core_crns[((v_c_idx + v_j) % array_length(v_core_crns, 1)) + 1]
                );
            END LOOP;
        ELSE
            FOR v_j IN 0..(LEAST(v_num_mat, array_length(v_core_crns, 1)) - 1) LOOP
                v_assigned_crns := array_append(
                    v_assigned_crns,
                    v_core_crns[((v_c_idx + v_j) % array_length(v_core_crns, 1)) + 1]
                );
            END LOOP;
            IF v_num_mat = 5 THEN
                v_assigned_crns := array_append(
                    v_assigned_crns,
                    v_elec_crns[(v_c_idx % array_length(v_elec_crns, 1)) + 1]
                );
            END IF;
        END IF;

        -- Determinar cuántas materias evaluará este alumno
        IF v_k <= 87 THEN
            v_eval_count := v_num_mat;
        ELSIF v_k <= 105 THEN
            v_group_idx := (v_k - 88) / 3;
            IF v_num_mat = 3 THEN
                v_eval_count := CASE WHEN (v_group_idx % 2) = 0 THEN 1 ELSE 2 END;
            ELSIF v_num_mat = 4 THEN
                v_eval_count := 2;
            ELSE
                v_eval_count := CASE WHEN (v_group_idx % 2) = 0 THEN 2 ELSE 3 END;
            END IF;
        ELSE
            -- ALU206..ALU220: cuentas limpias para pruebas en vivo (0 evaluaciones)
            v_eval_count := 0;
        END IF;

        FOR v_j IN 1..array_length(v_assigned_crns, 1) LOOP
            v_crn_num := v_assigned_crns[v_j];
            SELECT id_crn INTO v_id_crn FROM CRN WHERE crn = v_crn_num;

            IF v_id_crn IS NULL THEN
                CONTINUE;
            END IF;

            -- Inscripción idempotente
            INSERT INTO Inscripcion (id_alumno, id_crn)
            VALUES (v_id_alumno, v_id_crn)
            ON CONFLICT (id_alumno, id_crn) DO NOTHING;

            -- Evaluar únicamente las primeras v_eval_count materias
            IF v_j <= v_eval_count THEN
                -- Perfil de desempeño por CRN (garantiza las 4 categorías y 3 docentes < 7.0)
                v_tier := CASE v_crn_num
                    WHEN 50101 THEN 'EXC_ALTO'   -- DOC101 (Excelente ~9.6)
                    WHEN 50102 THEN 'EXC_ALTO'   -- DOC101 (Excelente ~9.6)
                    WHEN 50103 THEN 'BUE_STD'    -- DOC103 (Bueno ~8.2)
                    WHEN 50104 THEN 'BUE_ALTO'   -- DOC104 (Bueno ~8.7)
                    WHEN 50105 THEN 'NOSUF_MED'  -- DOC105 (No Suficiente ~5.3)
                    WHEN 50106 THEN 'BUE_ALTO'   -- DOC102 (Bueno ~8.4)
                    WHEN 50107 THEN 'BUE_STD'    -- DOC102 (Bueno ~8.4)
                    WHEN 50108 THEN 'EXC_MED'    -- DOC106 (Excelente ~9.4)
                    WHEN 50109 THEN 'SUF_STD'    -- DOC107 (Suficiente ~7.2, áreas < 7.0)
                    WHEN 50110 THEN 'EXC_ALTO'   -- DOC108 (Excelente ~9.6)
                    WHEN 50111 THEN 'BUE_ALTO'   -- DOC109 (Bueno ~8.6)
                    WHEN 50112 THEN 'SUF_ALTO'   -- DOC110 (Suficiente ~7.7, áreas < 7.0)
                    WHEN 50113 THEN 'NOSUF_MOD'  -- DOC111 (No Suficiente ~6.1)
                    WHEN 50114 THEN 'EXC_STD'    -- DOC112 (Excelente ~9.1)
                    WHEN 50115 THEN 'BUE_STD'    -- DOC113 (Bueno ~8.2)
                    WHEN 50116 THEN 'SUF_STD'    -- DOC114 (Suficiente ~7.3, áreas < 7.0)
                    WHEN 50117 THEN 'NOSUF_CRIT' -- DOC115 (No Suficiente ~4.2)
                    ELSE 'BUE_STD'
                END;

                -- ~75% incluyen comentario acorde al desempeño, ~25% sin comentario (NULL)
                IF ((v_k + v_crn_num) % 4) = 0 THEN
                    v_comentario := NULL;
                ELSIF v_tier LIKE 'EXC%' THEN
                    v_comentario := v_com_excelente[((v_k + v_crn_num) % array_length(v_com_excelente, 1)) + 1];
                ELSIF v_tier LIKE 'BUE%' THEN
                    v_comentario := v_com_bueno[((v_k + v_crn_num) % array_length(v_com_bueno, 1)) + 1];
                ELSIF v_tier LIKE 'SUF%' THEN
                    v_comentario := v_com_suficiente[((v_k + v_crn_num) % array_length(v_com_suficiente, 1)) + 1];
                ELSE
                    v_comentario := v_com_nosuf[((v_k + v_crn_num) % array_length(v_com_nosuf, 1)) + 1];
                END IF;

                v_fecha_eval :=
                    v_inicio_activo::TIMESTAMP
                    + (((v_k * 7 + v_crn_num) % GREATEST(1, (LEAST(CURRENT_DATE, v_cierre_activo) - v_inicio_activo + 1))) * INTERVAL '1 day')
                    + ((8 + ((v_k + v_crn_num) % 12)) * INTERVAL '1 hour')
                    + (((v_k * 13) % 60) * INTERVAL '1 minute');

                v_id_eval := NULL;
                INSERT INTO Evaluacion (id_alumno, id_crn, fecha, comentarios, promedio)
                VALUES (v_id_alumno, v_id_crn, v_fecha_eval, v_comentario, NULL)
                ON CONFLICT (id_alumno, id_crn) DO NOTHING
                RETURNING id_evaluacion INTO v_id_eval;

                -- Insertar las 15 respuestas válidas {0, 2.5, 5, 7.5, 10} solo si la evaluación es nueva
                IF v_id_eval IS NOT NULL THEN
                    FOR r_preg IN
                        SELECT id_pregunta, ROW_NUMBER() OVER (ORDER BY id_pregunta ASC) AS q_pos
                        FROM Pregunta
                        WHERE activa = TRUE
                        ORDER BY id_pregunta ASC
                    LOOP
                        v_h := (v_k * 31 + v_crn_num * 17 + r_preg.q_pos::INT * 13) % 20;

                        v_valor := CASE v_tier
                            WHEN 'EXC_ALTO' THEN
                                CASE WHEN v_h < 17 THEN 10.00 ELSE 7.50 END
                            WHEN 'EXC_MED' THEN
                                CASE WHEN v_h < 15 THEN 10.00 ELSE 7.50 END
                            WHEN 'EXC_STD' THEN
                                CASE WHEN v_h < 13 THEN 10.00 ELSE 7.50 END
                            WHEN 'BUE_ALTO' THEN
                                CASE WHEN v_h < 10 THEN 10.00 WHEN v_h < 19 THEN 7.50 ELSE 5.00 END
                            WHEN 'BUE_STD' THEN
                                CASE WHEN v_h < 8  THEN 10.00 WHEN v_h < 18 THEN 7.50 ELSE 5.00 END
                            WHEN 'SUF_ALTO' THEN
                                CASE
                                    WHEN r_preg.q_pos IN (10, 12) THEN
                                        CASE WHEN v_h < 2 THEN 10.00 WHEN v_h < 10 THEN 7.50 WHEN v_h < 18 THEN 5.00 ELSE 2.50 END
                                    ELSE
                                        CASE WHEN v_h < 6 THEN 10.00 WHEN v_h < 17 THEN 7.50 ELSE 5.00 END
                                END
                            WHEN 'SUF_STD' THEN
                                CASE
                                    WHEN r_preg.q_pos IN (5, 10, 12) THEN
                                        CASE WHEN v_h < 1 THEN 10.00 WHEN v_h < 8 THEN 7.50 WHEN v_h < 17 THEN 5.00 ELSE 2.50 END
                                    ELSE
                                        CASE WHEN v_h < 4 THEN 10.00 WHEN v_h < 17 THEN 7.50 ELSE 5.00 END
                                END
                            WHEN 'NOSUF_MOD' THEN
                                CASE
                                    WHEN r_preg.q_pos IN (8, 13) THEN
                                        CASE WHEN v_h < 4 THEN 10.00 WHEN v_h < 16 THEN 7.50 ELSE 5.00 END
                                    ELSE
                                        CASE WHEN v_h < 1 THEN 10.00 WHEN v_h < 9 THEN 7.50 WHEN v_h < 17 THEN 5.00 ELSE 2.50 END
                                END
                            WHEN 'NOSUF_MED' THEN
                                CASE
                                    WHEN r_preg.q_pos = 1 THEN
                                        CASE WHEN v_h < 3 THEN 10.00 WHEN v_h < 15 THEN 7.50 ELSE 5.00 END
                                    ELSE
                                        CASE WHEN v_h < 1 THEN 10.00 WHEN v_h < 7 THEN 7.50 WHEN v_h < 15 THEN 5.00 WHEN v_h < 19 THEN 2.50 ELSE 0.00 END
                                END
                            ELSE -- NOSUF_CRIT
                                CASE WHEN v_h < 4 THEN 7.50 WHEN v_h < 12 THEN 5.00 WHEN v_h < 18 THEN 2.50 ELSE 0.00 END
                        END;

                        INSERT INTO Respuesta (id_evaluacion, id_pregunta, valor)
                        VALUES (v_id_eval, r_preg.id_pregunta, v_valor)
                        ON CONFLICT (id_evaluacion, id_pregunta) DO NOTHING;
                    END LOOP;

                    UPDATE Evaluacion
                    SET promedio = (SELECT ROUND(AVG(valor), 2) FROM Respuesta WHERE id_evaluacion = v_id_eval)
                    WHERE id_evaluacion = v_id_eval;
                END IF;
            END IF;
        END LOOP;
    END LOOP;

    -- ========================================================================
    -- B) INSCRIPCIONES Y EVALUACIONES HISTÓRICAS (10 CRNs CERRADOS, 80 EVALS)
    --    Ciclo 2026-1 (35101..35105) y Ciclo 2025-2 (25101..25105)
    -- ========================================================================
    FOREACH v_crn_num IN ARRAY ARRAY[35101, 35102, 35103, 35104, 35105, 25101, 25102, 25103, 25104, 25105]
    LOOP
        SELECT id_crn INTO v_id_crn FROM CRN WHERE crn = v_crn_num;
        IF v_id_crn IS NULL THEN
            CONTINUE;
        END IF;

        v_tier := CASE v_crn_num
            WHEN 35101 THEN 'EXC_MED'
            WHEN 35102 THEN 'NOSUF_MOD'
            WHEN 35103 THEN 'BUE_STD'
            WHEN 35104 THEN 'EXC_ALTO'
            WHEN 35105 THEN 'EXC_STD'
            WHEN 25101 THEN 'BUE_ALTO'
            WHEN 25102 THEN 'BUE_STD'
            WHEN 25103 THEN 'SUF_ALTO'
            WHEN 25104 THEN 'EXC_MED'
            ELSE 'BUE_ALTO'
        END;

        -- 8 alumnos por CRN histórico (tomados de ALU109..ALU148, sin tocar cuentas limpias)
        FOR v_j IN 1..8 LOOP
            v_k := ((v_crn_num % 10) * 8 + v_j);
            IF v_k > 80 THEN
                v_k := ((v_k - 1) % 80) + 1;
            END IF;

            SELECT a.id_alumno INTO v_id_alumno
            FROM Alumno a
            INNER JOIN Usuario u ON u.id_usuario = a.id_usuario
            WHERE u.numero_cuenta = 'ALU' || (100 + v_k)::TEXT;

            IF v_id_alumno IS NULL THEN
                CONTINUE;
            END IF;

            INSERT INTO Inscripcion (id_alumno, id_crn)
            VALUES (v_id_alumno, v_id_crn)
            ON CONFLICT (id_alumno, id_crn) DO NOTHING;

            IF v_crn_num >= 35000 THEN
                v_fecha_eval := v_inicio_hist_1::TIMESTAMP
                    + (((v_k * 5 + v_j) % GREATEST(1, (v_cierre_hist_1 - v_inicio_hist_1 + 1))) * INTERVAL '1 day')
                    + ((9 + (v_j % 9)) * INTERVAL '1 hour');
            ELSE
                v_fecha_eval := v_inicio_hist_2::TIMESTAMP
                    + (((v_k * 5 + v_j) % GREATEST(1, (v_cierre_hist_2 - v_inicio_hist_2 + 1))) * INTERVAL '1 day')
                    + ((9 + (v_j % 9)) * INTERVAL '1 hour');
            END IF;

            IF ((v_k + v_crn_num) % 4) = 0 THEN
                v_comentario := NULL;
            ELSIF v_tier LIKE 'EXC%' THEN
                v_comentario := v_com_excelente[((v_k + v_crn_num) % array_length(v_com_excelente, 1)) + 1];
            ELSIF v_tier LIKE 'BUE%' THEN
                v_comentario := v_com_bueno[((v_k + v_crn_num) % array_length(v_com_bueno, 1)) + 1];
            ELSIF v_tier LIKE 'SUF%' THEN
                v_comentario := v_com_suficiente[((v_k + v_crn_num) % array_length(v_com_suficiente, 1)) + 1];
            ELSE
                v_comentario := v_com_nosuf[((v_k + v_crn_num) % array_length(v_com_nosuf, 1)) + 1];
            END IF;

            v_id_eval := NULL;
            INSERT INTO Evaluacion (id_alumno, id_crn, fecha, comentarios, promedio)
            VALUES (v_id_alumno, v_id_crn, v_fecha_eval, v_comentario, NULL)
            ON CONFLICT (id_alumno, id_crn) DO NOTHING
            RETURNING id_evaluacion INTO v_id_eval;

            IF v_id_eval IS NOT NULL THEN
                FOR r_preg IN
                    SELECT id_pregunta, ROW_NUMBER() OVER (ORDER BY id_pregunta ASC) AS q_pos
                    FROM Pregunta
                    WHERE activa = TRUE
                    ORDER BY id_pregunta ASC
                LOOP
                    v_h := (v_k * 29 + v_crn_num * 11 + r_preg.q_pos::INT * 13) % 20;

                    v_valor := CASE v_tier
                        WHEN 'EXC_ALTO' THEN CASE WHEN v_h < 17 THEN 10.00 ELSE 7.50 END
                        WHEN 'EXC_MED'  THEN CASE WHEN v_h < 15 THEN 10.00 ELSE 7.50 END
                        WHEN 'EXC_STD'  THEN CASE WHEN v_h < 13 THEN 10.00 ELSE 7.50 END
                        WHEN 'BUE_ALTO' THEN CASE WHEN v_h < 10 THEN 10.00 WHEN v_h < 19 THEN 7.50 ELSE 5.00 END
                        WHEN 'BUE_STD'  THEN CASE WHEN v_h < 8  THEN 10.00 WHEN v_h < 18 THEN 7.50 ELSE 5.00 END
                        WHEN 'SUF_ALTO' THEN CASE WHEN v_h < 5  THEN 10.00 WHEN v_h < 15 THEN 7.50 ELSE 5.00 END
                        ELSE                 CASE WHEN v_h < 2  THEN 10.00 WHEN v_h < 9  THEN 7.50 WHEN v_h < 17 THEN 5.00 ELSE 2.50 END
                    END;

                    INSERT INTO Respuesta (id_evaluacion, id_pregunta, valor)
                    VALUES (v_id_eval, r_preg.id_pregunta, v_valor)
                    ON CONFLICT (id_evaluacion, id_pregunta) DO NOTHING;
                END LOOP;

                UPDATE Evaluacion
                SET promedio = (SELECT ROUND(AVG(valor), 2) FROM Respuesta WHERE id_evaluacion = v_id_eval)
                WHERE id_evaluacion = v_id_eval;
            END IF;
        END LOOP;
    END LOOP;

    -- ========================================================================
    -- C) EVALUACIONES DE TALLERES Y LABORATORIOS (8 INSTALACIONES)
    --    * 22 evaluaciones por instalación en el ciclo activo = 176 evaluaciones
    --    * 5 evaluaciones por instalación en Ciclo 2026-1     = 40 evaluaciones
    --    * Solo usa alumnos ALU101..ALU205 (respeta las 15 cuentas limpias ALU206..ALU220)
    -- ========================================================================
    FOR r_inst IN
        SELECT
            i.id_instalacion,
            i.nombre,
            cfg.perfil,
            cfg.carrera_pref,
            cfg.orden
        FROM (
            VALUES
                (1, 'Laboratorio de Desarrollo de Software',       'INST_ALTO',   'Ingeniería en Sistemas'),
                (2, 'Cocina Caliente Profesional',                 'INST_ALTO',   'Cocina'),
                (3, 'Taller de Panadería y Repostería',            'INST_BUENO',  'Cocina'),
                (4, 'Taller de Simulación Empresarial y Finanzas', 'INST_BUENO',  'Administración'),
                (5, 'Taller de Manufactura y CNC',                 'INST_MEDIO',  'Ingeniería Industrial'),
                (6, 'Laboratorio de Electrónica y Robótica',       'INST_MEDIO',  'Ingeniería en Sistemas'),
                (7, 'Laboratorio de Redes y Ciberseguridad',       'INST_DISP',   'Ingeniería en Sistemas'),
                (8, 'Laboratorio de Control de Calidad y Ergonomía','INST_EQUIP', 'Ingeniería Industrial')
        ) AS cfg(orden, nombre, perfil, carrera_pref)
        INNER JOIN Instalacion i ON i.nombre = cfg.nombre
        ORDER BY cfg.orden
    LOOP
        v_inst_idx := r_inst.orden;
        v_alu_seq  := 0;

        -- 22 evaluaciones en ciclo activo por instalación
        FOR r_alu_inst IN
            SELECT
                a.id_alumno,
                CASE
                    WHEN u.numero_cuenta ~ '^ALU[0-9]+$' THEN SUBSTRING(u.numero_cuenta FROM 4)::INT
                    ELSE 0
                END AS alu_num
            FROM Alumno a
            INNER JOIN Usuario u ON u.id_usuario = a.id_usuario
            WHERE u.numero_cuenta ~ '^ALU(1[0-9]{2}|20[0-5])$'
              AND (a.carrera = r_inst.carrera_pref OR (v_inst_idx IN (1, 4, 6) AND a.carrera IN ('Administración', 'Ingeniería Industrial')))
            ORDER BY
                CASE WHEN v_inst_idx = 6 THEN 0 WHEN a.carrera = r_inst.carrera_pref THEN 0 ELSE 1 END,
                ((CASE WHEN u.numero_cuenta ~ '^ALU[0-9]+$' THEN SUBSTRING(u.numero_cuenta FROM 4)::INT ELSE 0 END * 7 + v_inst_idx * 13) % 105)
            LIMIT 22
        LOOP
            v_alu_seq := v_alu_seq + 1;

            IF ((r_alu_inst.alu_num + v_inst_idx) % 5) = 0 THEN
                v_com_inst := NULL;
            ELSIF r_inst.perfil IN ('INST_ALTO', 'INST_BUENO') THEN
                v_com_inst := v_com_inst_alto[((r_alu_inst.alu_num + v_inst_idx) % array_length(v_com_inst_alto, 1)) + 1];
            ELSIF r_inst.perfil = 'INST_MEDIO' THEN
                v_com_inst := v_com_inst_medio[((r_alu_inst.alu_num + v_inst_idx) % array_length(v_com_inst_medio, 1)) + 1];
            ELSE
                v_com_inst := v_com_inst_bajo[((r_alu_inst.alu_num + v_inst_idx) % array_length(v_com_inst_bajo, 1)) + 1];
            END IF;

            v_fecha_eval :=
                v_inicio_activo::TIMESTAMP
                + (((r_alu_inst.alu_num * 3 + v_inst_idx * 5) % GREATEST(1, (LEAST(CURRENT_DATE, v_cierre_activo) - v_inicio_activo + 1))) * INTERVAL '1 day')
                + ((9 + ((r_alu_inst.alu_num + v_inst_idx) % 10)) * INTERVAL '1 hour')
                + (((v_alu_seq * 11) % 60) * INTERVAL '1 minute');

            v_id_eval_inst := NULL;
            INSERT INTO EvaluacionInstalacion (id_alumno, id_instalacion, id_ciclo, fecha, comentarios, promedio)
            VALUES (r_alu_inst.id_alumno, r_inst.id_instalacion, v_ciclo_activo, v_fecha_eval, v_com_inst, NULL)
            ON CONFLICT (id_alumno, id_instalacion, id_ciclo) DO NOTHING
            RETURNING id_evaluacion_instalacion INTO v_id_eval_inst;

            IF v_id_eval_inst IS NOT NULL THEN
                FOR r_pinst IN
                    SELECT id_pregunta_instalacion, dimension
                    FROM PreguntaInstalacion
                    WHERE activa = TRUE
                      AND (id_instalacion IS NULL OR id_instalacion = r_inst.id_instalacion)
                    ORDER BY id_pregunta_instalacion
                LOOP
                    v_h := (r_alu_inst.alu_num * 19 + v_inst_idx * 23 + r_pinst.id_pregunta_instalacion * 11) % 20;

                    v_valor := CASE r_inst.perfil
                        WHEN 'INST_ALTO' THEN
                            CASE WHEN v_h < 14 THEN 10.00 WHEN v_h < 19 THEN 7.50 ELSE 5.00 END
                        WHEN 'INST_BUENO' THEN
                            CASE WHEN v_h < 10 THEN 10.00 WHEN v_h < 18 THEN 7.50 ELSE 5.00 END
                        WHEN 'INST_MEDIO' THEN
                            CASE
                                WHEN r_pinst.dimension = 'Disponibilidad' THEN
                                    CASE WHEN v_h < 4 THEN 10.00 WHEN v_h < 14 THEN 7.50 ELSE 5.00 END
                                ELSE
                                    CASE WHEN v_h < 7 THEN 10.00 WHEN v_h < 17 THEN 7.50 ELSE 5.00 END
                            END
                        WHEN 'INST_DISP' THEN
                            CASE
                                WHEN r_pinst.dimension = 'Disponibilidad' THEN
                                    CASE WHEN v_h < 1 THEN 10.00 WHEN v_h < 8 THEN 7.50 WHEN v_h < 16 THEN 5.00 ELSE 2.50 END
                                ELSE
                                    CASE WHEN v_h < 5 THEN 10.00 WHEN v_h < 15 THEN 7.50 ELSE 5.00 END
                            END
                        ELSE -- INST_EQUIP
                            CASE
                                WHEN r_pinst.dimension = 'Equipamiento' THEN
                                    CASE WHEN v_h < 1 THEN 10.00 WHEN v_h < 7 THEN 7.50 WHEN v_h < 15 THEN 5.00 WHEN v_h < 19 THEN 2.50 ELSE 0.00 END
                                WHEN r_pinst.dimension = 'Disponibilidad' THEN
                                    CASE WHEN v_h < 2 THEN 10.00 WHEN v_h < 11 THEN 7.50 WHEN v_h < 18 THEN 5.00 ELSE 2.50 END
                                ELSE
                                    CASE WHEN v_h < 5 THEN 10.00 WHEN v_h < 16 THEN 7.50 ELSE 5.00 END
                            END
                    END;

                    INSERT INTO RespuestaInstalacion (id_evaluacion_instalacion, id_pregunta_instalacion, valor)
                    VALUES (v_id_eval_inst, r_pinst.id_pregunta_instalacion, v_valor)
                    ON CONFLICT (id_evaluacion_instalacion, id_pregunta_instalacion) DO NOTHING;
                END LOOP;

                UPDATE EvaluacionInstalacion
                SET promedio = (
                    SELECT ROUND(AVG(valor), 2)
                    FROM RespuestaInstalacion
                    WHERE id_evaluacion_instalacion = v_id_eval_inst
                )
                WHERE id_evaluacion_instalacion = v_id_eval_inst;
            END IF;
        END LOOP;

        -- 5 evaluaciones históricas en Ciclo 2026-1 por instalación (para comparativa histórica)
        FOR r_alu_inst IN
            SELECT
                a.id_alumno,
                CASE
                    WHEN u.numero_cuenta ~ '^ALU[0-9]+$' THEN SUBSTRING(u.numero_cuenta FROM 4)::INT
                    ELSE 0
                END AS alu_num
            FROM Alumno a
            INNER JOIN Usuario u ON u.id_usuario = a.id_usuario
            WHERE u.numero_cuenta ~ '^ALU1[0-4][0-9]$'
              AND a.carrera = r_inst.carrera_pref
            ORDER BY a.id_alumno
            LIMIT 5
        LOOP
            v_com_inst := CASE
                WHEN r_inst.perfil IN ('INST_ALTO', 'INST_BUENO')
                    THEN v_com_inst_alto[((r_alu_inst.alu_num + v_inst_idx) % array_length(v_com_inst_alto, 1)) + 1]
                WHEN r_inst.perfil = 'INST_MEDIO'
                    THEN v_com_inst_medio[((r_alu_inst.alu_num + v_inst_idx) % array_length(v_com_inst_medio, 1)) + 1]
                ELSE v_com_inst_bajo[((r_alu_inst.alu_num + v_inst_idx) % array_length(v_com_inst_bajo, 1)) + 1]
            END;

            v_fecha_eval :=
                v_inicio_hist_1::TIMESTAMP
                + (((r_alu_inst.alu_num * 5 + v_inst_idx * 7) % GREATEST(1, (v_cierre_hist_1 - v_inicio_hist_1 + 1))) * INTERVAL '1 day')
                + INTERVAL '11 hours';

            v_id_eval_inst := NULL;
            INSERT INTO EvaluacionInstalacion (id_alumno, id_instalacion, id_ciclo, fecha, comentarios, promedio)
            VALUES (r_alu_inst.id_alumno, r_inst.id_instalacion, v_ciclo_hist_1, v_fecha_eval, v_com_inst, NULL)
            ON CONFLICT (id_alumno, id_instalacion, id_ciclo) DO NOTHING
            RETURNING id_evaluacion_instalacion INTO v_id_eval_inst;

            IF v_id_eval_inst IS NOT NULL THEN
                FOR r_pinst IN
                    SELECT id_pregunta_instalacion, dimension
                    FROM PreguntaInstalacion
                    WHERE activa = TRUE
                      AND (id_instalacion IS NULL OR id_instalacion = r_inst.id_instalacion)
                    ORDER BY id_pregunta_instalacion
                LOOP
                    v_h := (r_alu_inst.alu_num * 17 + v_inst_idx * 19 + r_pinst.id_pregunta_instalacion * 7) % 20;
                    v_valor := CASE
                        WHEN r_inst.perfil IN ('INST_ALTO', 'INST_BUENO') THEN
                            CASE WHEN v_h < 12 THEN 10.00 WHEN v_h < 19 THEN 7.50 ELSE 5.00 END
                        WHEN r_inst.perfil = 'INST_MEDIO' THEN
                            CASE WHEN v_h < 6 THEN 10.00 WHEN v_h < 16 THEN 7.50 ELSE 5.00 END
                        ELSE
                            CASE WHEN v_h < 2 THEN 10.00 WHEN v_h < 10 THEN 7.50 WHEN v_h < 17 THEN 5.00 ELSE 2.50 END
                    END;

                    INSERT INTO RespuestaInstalacion (id_evaluacion_instalacion, id_pregunta_instalacion, valor)
                    VALUES (v_id_eval_inst, r_pinst.id_pregunta_instalacion, v_valor)
                    ON CONFLICT (id_evaluacion_instalacion, id_pregunta_instalacion) DO NOTHING;
                END LOOP;

                UPDATE EvaluacionInstalacion
                SET promedio = (
                    SELECT ROUND(AVG(valor), 2)
                    FROM RespuestaInstalacion
                    WHERE id_evaluacion_instalacion = v_id_eval_inst
                )
                WHERE id_evaluacion_instalacion = v_id_eval_inst;
            END IF;
        END LOOP;
    END LOOP;
END
$seed$;

-- ============================================================================
-- 11. SINCRONIZACIÓN FINAL DE SECUENCIAS
-- ============================================================================
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
