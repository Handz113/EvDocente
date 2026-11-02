SET client_encoding = 'UTF8';

-- =========================
-- MÓDULO TALLERES Y LABORATORIOS
-- =========================
CREATE TABLE Instalacion (
    id_instalacion SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    tipo VARCHAR(50) NOT NULL,
    descripcion TEXT,
    activa BOOLEAN DEFAULT TRUE
);

-- id_instalacion NULL = el criterio aplica a todas las instalaciones
CREATE TABLE PreguntaInstalacion (
    id_pregunta_instalacion SERIAL PRIMARY KEY,
    id_instalacion INT REFERENCES Instalacion (id_instalacion) ON DELETE CASCADE,
    dimension VARCHAR(20) NOT NULL
        CHECK (dimension IN ('Equipamiento', 'Disponibilidad', 'Limpieza')),
    texto TEXT NOT NULL,
    activa BOOLEAN DEFAULT TRUE
);

CREATE TABLE EvaluacionInstalacion (
    id_evaluacion_instalacion SERIAL PRIMARY KEY,
    id_alumno INT NOT NULL REFERENCES Alumno (id_alumno),
    id_instalacion INT NOT NULL REFERENCES Instalacion (id_instalacion),
    id_ciclo INT NOT NULL REFERENCES CicloEscolar (id_ciclo),
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    comentarios TEXT,
    promedio NUMERIC(4, 2),
    UNIQUE (id_alumno, id_instalacion, id_ciclo)
);

CREATE TABLE RespuestaInstalacion (
    id_respuesta_instalacion SERIAL PRIMARY KEY,
    id_evaluacion_instalacion INT NOT NULL
        REFERENCES EvaluacionInstalacion (id_evaluacion_instalacion) ON DELETE CASCADE,
    id_pregunta_instalacion INT NOT NULL
        REFERENCES PreguntaInstalacion (id_pregunta_instalacion),
    valor NUMERIC(4, 2) NOT NULL,
    CHECK (valor IN (0, 2.5, 5, 7.5, 10)),
    UNIQUE (id_evaluacion_instalacion, id_pregunta_instalacion)
);

-- Datos de ejemplo
INSERT INTO Instalacion (nombre, tipo, descripcion) VALUES
('Centro de Cómputo', 'Centro de Cómputo', 'Equipos de cómputo y red para prácticas'),
('Laboratorio Clínico', 'Laboratorio', 'Instalación para prácticas de análisis clínicos');

INSERT INTO PreguntaInstalacion (id_instalacion, dimension, texto) VALUES
(NULL, 'Equipamiento', 'El equipo y los materiales funcionan correctamente.'),
(NULL, 'Equipamiento', 'La cantidad de equipo es suficiente para el grupo.'),
(NULL, 'Disponibilidad', 'El horario de acceso cubre las necesidades de las prácticas.'),
(NULL, 'Disponibilidad', 'Es fácil conseguir lugar para usar la instalación.'),
(NULL, 'Limpieza', 'La instalación está limpia y ordenada.'),
(NULL, 'Limpieza', 'Las condiciones de higiene y seguridad son adecuadas.'),
((SELECT id_instalacion FROM Instalacion WHERE nombre = 'Laboratorio Clínico'),
 'Equipamiento', 'Los reactivos e instrumentos de laboratorio están disponibles y en buen estado.');