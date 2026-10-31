import { Response } from 'express';
import pool from '../config/db';
import { AuthRequest } from '../middlewares/auth';
import { calcularClasificacionDocente } from './evaluacionController';

/**
 * GET /api/docentes
 * Lista de docentes con sus materias del ciclo activo (para coordinación y administración).
 * Los promedios se piden aparte a GET /api/evaluaciones/promedio/:docenteId.
 */
export const listarDocentes = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
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
         AND c.id_ciclo IN (SELECT id_ciclo FROM CicloEscolar WHERE activo = TRUE)
       LEFT JOIN Materia m ON m.id_materia = c.id_materia
       GROUP BY d.id_docente, u.correo_institucional
       ORDER BY d.apellido, d.nombre`
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
 * GET /api/docentes/me/resultados
 * Resultados del docente del token, desglosados por grupo (CRN):
 * promedio por pregunta y comentarios anónimos.
 */
export const misResultados = async (req: AuthRequest, res: Response): Promise<void> => {
  const idDocente = req.user?.id;
  if (!idDocente) {
    res.status(401).json({ mensaje: 'No se pudo identificar al docente en la petición.' });
    return;
  }

  try {
    const grupos = await pool.query(
      `SELECT c.id_crn, c.crn, m.clave, m.nombre, COUNT(e.id_evaluacion)::int AS total,
              AVG(e.promedio) AS promedio
       FROM CRN c
       INNER JOIN Materia m ON m.id_materia = c.id_materia
       INNER JOIN CicloEscolar ce ON ce.id_ciclo = c.id_ciclo AND ce.activo = TRUE
       LEFT JOIN Evaluacion e ON e.id_crn = c.id_crn
       WHERE c.id_docente = $1
       GROUP BY c.id_crn, m.clave, m.nombre
       ORDER BY m.nombre`,
      [idDocente]
    );

    const porPregunta = await pool.query(
      `SELECT e.id_crn, p.id_pregunta, p.texto, AVG(r.valor) AS promedio
       FROM Respuesta r
       INNER JOIN Evaluacion e ON e.id_evaluacion = r.id_evaluacion
       INNER JOIN Pregunta p ON p.id_pregunta = r.id_pregunta
       INNER JOIN CRN c ON c.id_crn = e.id_crn
       WHERE c.id_docente = $1
       GROUP BY e.id_crn, p.id_pregunta, p.texto
       ORDER BY p.id_pregunta`,
      [idDocente]
    );

    // Solo el texto: nunca se devuelve quién escribió el comentario ni la fecha exacta
    const comentarios = await pool.query(
      `SELECT e.id_crn, e.comentarios
       FROM Evaluacion e
       INNER JOIN CRN c ON c.id_crn = e.id_crn
       WHERE c.id_docente = $1 AND e.comentarios IS NOT NULL AND TRIM(e.comentarios) <> ''
       ORDER BY random()`,
      [idDocente]
    );

    res.json({
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
    });
  } catch (error) {
    console.error('Error al obtener resultados del docente:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor al obtener los resultados.' });
  }
};
