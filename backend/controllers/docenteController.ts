import { Response } from 'express';
import pool from '../config/db';
import { AuthRequest } from '../middlewares/auth';
import { calcularClasificacionDocente } from './evaluacionController';

/**
 * GET /api/docentes
 * Lista de docentes con sus materias del ciclo solicitado o activo (para coordinación y administración).
 * Acepta parámetro opcional en query: ?id_ciclo=N
 * Si no se proporciona id_ciclo, filtra por el ciclo escolar activo por defecto.
 * Los promedios se piden aparte a GET /api/evaluaciones/promedio/:docenteId.
 */
export const listarDocentes = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const idCicloRaw = req.query.id_ciclo;
    const idCiclo =
      idCicloRaw && !isNaN(Number(idCicloRaw)) && Number(idCicloRaw) > 0 ? Number(idCicloRaw) : null;

    const { rows } = await pool.query(
      `SELECT d.id_docente, d.nombre, d.apellido, d.departamento, u.correo_institucional,
              COALESCE(
                json_agg(json_build_object('crn', c.crn::text, 'clave', m.clave, 'nombre', m.nombre))
                  FILTER (WHERE c.id_crn IS NOT NULL),
                '[]'
              ) AS materias
       FROM Docente d
       INNER JOIN Usuario u ON u.id_usuario = d.id_usuario
       LEFT JOIN CRN c ON c.id_docente = d.id_docente
         AND ($1::int IS NOT NULL AND c.id_ciclo = $1 OR $1::int IS NULL AND c.id_ciclo IN (SELECT id_ciclo FROM CicloEscolar WHERE activo = TRUE))
       LEFT JOIN Materia m ON m.id_materia = c.id_materia
       GROUP BY d.id_docente, u.correo_institucional
       ORDER BY d.apellido, d.nombre`,
      [idCiclo]
    );

    res.json(
      rows.map((r) => ({
        id: String(r.id_docente),
        nombre: `${r.nombre} ${r.apellido}`,
        area: r.departamento,
        correo: r.correo_institucional,
        materias: r.materias,
      }))
    );
  } catch (error) {
    console.error('Error al listar docentes:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor al listar docentes.' });
  }
};

/**
 * Resultados de un docente en el ciclo solicitado o activo, desglosados por grupo (CRN):
 * promedio, clasificación, promedio por pregunta y comentarios anónimos.
 * Anonimato: nunca se consulta id_alumno, matrícula, correo ni fecha; los
 * comentarios salen solo como texto y en orden aleatorio.
 * La usan GET /api/docentes/me/resultados y GET /api/docentes/:id/resultados.
 */
export const obtenerResultadosDocente = async (
  idDocente: number | string,
  idCicloParam?: number | string | null
) => {
  const idCiclo =
    idCicloParam && !isNaN(Number(idCicloParam)) && Number(idCicloParam) > 0
      ? Number(idCicloParam)
      : null;

  const queryParams: any[] = [idDocente, idCiclo];

  const grupos = await pool.query(
    `SELECT c.id_crn, c.crn, m.clave, m.nombre, COUNT(e.id_evaluacion)::int AS total,
            AVG(e.promedio) AS promedio
     FROM CRN c
     INNER JOIN Materia m ON m.id_materia = c.id_materia
     INNER JOIN CicloEscolar ce ON ce.id_ciclo = c.id_ciclo
     LEFT JOIN Evaluacion e ON e.id_crn = c.id_crn
     WHERE c.id_docente = $1
       AND ($2::int IS NOT NULL AND c.id_ciclo = $2 OR $2::int IS NULL AND c.id_ciclo IN (SELECT id_ciclo FROM CicloEscolar WHERE activo = TRUE))
     GROUP BY c.id_crn, m.clave, m.nombre
     ORDER BY m.nombre`,
    queryParams
  );

  const porPregunta = await pool.query(
    `SELECT e.id_crn, p.id_pregunta, p.texto, AVG(r.valor) AS promedio
     FROM Respuesta r
     INNER JOIN Evaluacion e ON e.id_evaluacion = r.id_evaluacion
     INNER JOIN Pregunta p ON p.id_pregunta = r.id_pregunta
     INNER JOIN CRN c ON c.id_crn = e.id_crn
     WHERE c.id_docente = $1
       AND ($2::int IS NOT NULL AND c.id_ciclo = $2 OR $2::int IS NULL AND c.id_ciclo IN (SELECT id_ciclo FROM CicloEscolar WHERE activo = TRUE))
     GROUP BY e.id_crn, p.id_pregunta, p.texto
     ORDER BY p.id_pregunta`,
    queryParams
  );

  // Solo el texto: nunca se devuelve quién escribió el comentario ni la fecha exacta
  const comentarios = await pool.query(
    `SELECT e.id_crn, e.comentarios
     FROM Evaluacion e
     INNER JOIN CRN c ON c.id_crn = e.id_crn
     WHERE c.id_docente = $1
       AND ($2::int IS NOT NULL AND c.id_ciclo = $2 OR $2::int IS NULL AND c.id_ciclo IN (SELECT id_ciclo FROM CicloEscolar WHERE activo = TRUE))
       AND e.comentarios IS NOT NULL AND TRIM(e.comentarios) <> ''
     ORDER BY random()`,
    queryParams
  );

  return {
    grupos: grupos.rows.map((g) => ({
      crn: String(g.crn),
      clave: g.clave,
      nombre: g.nombre,
      totalEvaluaciones: g.total,
      ...calcularClasificacionDocente(g.promedio === null ? [] : [Number(g.promedio)]),
      porPregunta: porPregunta.rows
        .filter((p) => p.id_crn === g.id_crn)
        .map((p) => ({ id: p.id_pregunta, texto: p.texto, promedio: Number(p.promedio) })),
      comentarios: comentarios.rows.filter((c) => c.id_crn === g.id_crn).map((c) => c.comentarios),
    })),
  };
};

/**
 * GET /api/docentes/me/resultados
 * Resultados del docente del token, desglosados por grupo (CRN):
 * promedio por pregunta y comentarios anónimos.
 * Acepta parámetro opcional en query: ?id_ciclo=N
 * Si no se proporciona id_ciclo, filtra por el ciclo escolar activo por defecto.
 */
export const misResultados = async (req: AuthRequest, res: Response): Promise<void> => {
  const idDocente = req.user?.id;
  if (!idDocente) {
    res.status(401).json({ mensaje: 'No se pudo identificar al docente en la petición.' });
    return;
  }

  try {
    const idCicloRaw = req.query.id_ciclo;
    const data = await obtenerResultadosDocente(
      idDocente,
      idCicloRaw ? String(idCicloRaw) : null
    );
    res.json(data);
  } catch (error) {
    console.error('Error al obtener resultados del docente:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor al obtener los resultados.' });
  }
};

/**
 * GET /api/docentes/:id/resultados (Coordinador, Administrador)
 * Lo mismo que /me/resultados, para el docente indicado (id_docente).
 * Acepta parámetro opcional en query: ?id_ciclo=N
 */
export const resultadosDeDocente = async (req: AuthRequest, res: Response): Promise<void> => {
  const idDocente = Number(req.params.id);
  if (!Number.isInteger(idDocente) || idDocente <= 0) {
    res.status(400).json({ mensaje: 'Identificador de docente inválido. Se requiere un ID numérico.' });
    return;
  }

  try {
    const existe = await pool.query('SELECT 1 FROM Docente WHERE id_docente = $1', [idDocente]);
    if (existe.rows.length === 0) {
      res.status(404).json({ mensaje: `No se encontró el docente con ID ${idDocente}.` });
      return;
    }
    const idCicloRaw = req.query.id_ciclo;
    const data = await obtenerResultadosDocente(
      idDocente,
      idCicloRaw ? String(idCicloRaw) : null
    );
    res.json(data);
  } catch (error) {
    console.error('Error al obtener resultados del docente:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor al obtener los resultados.' });
  }
};
