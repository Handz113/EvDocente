-- =========================
-- TABLAS DE SEGURIDAD Y CONFIGURACIÓN (Nuevas)
-- =========================
CREATE DATABASE "EvaluacionDocentes";

CREATE TABLE Rol (
    id_rol SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE Usuario (
    id_usuario SERIAL PRIMARY KEY,
    numero_cuenta VARCHAR(20) NOT NULL UNIQUE,
    correo_institucional VARCHAR(100) NOT NULL UNIQUE,
    contrasena VARCHAR(255) NOT NULL,
    id_rol INT NOT NULL REFERENCES Rol (id_rol),
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE CicloEscolar (
    id_ciclo SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    fecha_inicio_eval DATE NOT NULL,
    fecha_cierre_eval DATE NOT NULL,
    activo BOOLEAN DEFAULT TRUE
);

-- =========================
-- TABLA DOCENTE (Ajustada al modelo conceptual)
-- =========================
CREATE TABLE Docente (
    id_docente SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL UNIQUE REFERENCES Usuario (id_usuario) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    departamento VARCHAR(100) NOT NULL
);

-- =========================
-- TABLA ALUMNO (Ajustada al modelo conceptual)
-- =========================
CREATE TABLE Alumno (
    id_alumno SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL UNIQUE REFERENCES Usuario (id_usuario) ON DELETE CASCADE,
    carrera VARCHAR(100) NOT NULL,
    semestre INT NOT NULL
);

-- =========================
-- TABLA MATERIA
-- =========================
CREATE TABLE Materia (
    id_materia SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    clave VARCHAR(20) NOT NULL UNIQUE,
    creditos INT NOT NULL
);

-- =========================
-- TABLA CRN (Equivalente a Asignación)
-- =========================
CREATE TABLE CRN (
    id_crn SERIAL PRIMARY KEY,
    id_docente INT NOT NULL REFERENCES Docente (id_docente),
    id_materia INT NOT NULL REFERENCES Materia (id_materia),
    id_ciclo INT NOT NULL REFERENCES CicloEscolar (id_ciclo),
    crn INT NOT NULL UNIQUE
);

-- =========================
-- TABLA INSCRIPCIÓN
-- =========================
CREATE TABLE Inscripcion (
    id_inscripcion SERIAL PRIMARY KEY,
    id_alumno INT NOT NULL REFERENCES Alumno (id_alumno),
    id_crn INT NOT NULL REFERENCES CRN (id_crn),
    UNIQUE (id_alumno, id_crn)
);

-- =========================
-- TABLA PREGUNTA (Corregida según requerimientos)
-- =========================
CREATE TABLE Pregunta (
    id_pregunta SERIAL PRIMARY KEY,
    numero INT NOT NULL UNIQUE,
    texto TEXT NOT NULL,
    activa BOOLEAN DEFAULT TRUE
);

-- =========================
-- TABLA EVALUACIÓN
-- =========================
CREATE TABLE Evaluacion (
    id_evaluacion SERIAL PRIMARY KEY,
    id_alumno INT NOT NULL REFERENCES Alumno (id_alumno),
    id_crn INT NOT NULL REFERENCES CRN (id_crn),
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    comentarios TEXT,
    promedio NUMERIC(4, 2),
    UNIQUE (id_alumno, id_crn)
);

-- =========================
-- TABLA RESPUESTA (Validada con escala 0 a 10)
-- =========================
CREATE TABLE Respuesta (
    id_respuesta SERIAL PRIMARY KEY,
    id_evaluacion INT NOT NULL REFERENCES Evaluacion (id_evaluacion) ON DELETE CASCADE,
    id_pregunta INT NOT NULL REFERENCES Pregunta (id_pregunta),
    valor NUMERIC(4, 2) NOT NULL,
    CHECK (valor IN (0, 2.5, 5, 7.5, 10)),
    UNIQUE (id_evaluacion, id_pregunta)
);

-- =========================
-- DATOS BASE Y CARGA INICIAL (Sprint 4)
-- =========================

-- 1. Carga de los 4 perfiles del sistema
INSERT INTO
    Rol (id_rol, nombre)
VALUES (1, 'Administrador'),
    (2, 'Coordinador'),
    (3, 'Docente'),
    (4, 'Alumno');

-- 2. Carga de un ciclo escolar activo para pruebas
INSERT INTO
    CicloEscolar (
        id_ciclo,
        nombre,
        fecha_inicio_eval,
        fecha_cierre_eval,
        activo
    )
VALUES (
        1,
        'Ciclo 2026-2',
        '2026-10-01',
        '2026-10-15',
        true
    );

-- 3. Carga de las 15 preguntas institucionales
INSERT INTO
    Pregunta (
        id_pregunta,
        numero,
        texto,
        activa
    )
VALUES (
        1,
        1,
        'Dominio de la materia.',
        true
    ),
    (
        2,
        2,
        'Planeación de clases.',
        true
    ),
    (
        3,
        3,
        'Claridad en las explicaciones.',
        true
    ),
    (
        4,
        4,
        'Fomento de la participación.',
        true
    ),
    (
        5,
        5,
        'Uso de recursos didácticos.',
        true
    ),
    (
        6,
        6,
        'Resolución de dudas.',
        true
    ),
    (7, 7, 'Puntualidad.', true),
    (8, 8, 'Asistencia.', true),
    (
        9,
        9,
        'Cumplimiento del programa.',
        true
    ),
    (
        10,
        10,
        'Retroalimentación.',
        true
    ),
    (
        11,
        11,
        'Evaluación objetiva.',
        true
    ),
    (
        12,
        12,
        'Uso de tecnología.',
        true
    ),
    (
        13,
        13,
        'Trato respetuoso.',
        true
    ),
    (
        14,
        14,
        'Motivación al aprendizaje.',
        true
    ),
    (
        15,
        15,
        'Satisfacción general.',
        true
    );

-- 4. Usuarios de prueba
INSERT INTO
    Usuario (
        id_usuario,
        numero_cuenta,
        correo_institucional,
        contrasena,
        id_rol,
        activo
    )
VALUES (
        1,
        'ADMIN001',
        'admin@escuela.edu',
        '$2b$10$hashEjemploBcrypt...',
        1,
        true
    ),
    (
        2,
        'COORD001',
        'coordinador@escuela.edu',
        '$2b$10$hashEjemploBcrypt...',
        2,
        true
    ),
    (
        3,
        'DOC001',
        'docente@escuela.edu',
        '$2b$10$hashEjemploBcrypt...',
        3,
        true
    ),
    (
        4,
        'ALU001',
        'alumno@escuela.edu',
        '$2b$10$hashEjemploBcrypt...',
        4,
        true
    );

-- 5. Ligar los usuarios de prueba con el Alumno y Docente para las pruebas de Brian
INSERT INTO
    Docente (
        id_docente,
        id_usuario,
        nombre,
        apellido,
        departamento
    )
VALUES (
        1,
        3,
        'Juan',
        'Pérez',
        'Sistemas'
    );

INSERT INTO
    Alumno (
        id_alumno,
        id_usuario,
        carrera,
        semestre
    )
VALUES (
        1,
        4,
        'Ingeniería en Sistemas',
        7
    );