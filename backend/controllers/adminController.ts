import { Response } from 'express';
import pool from '../config/db';
import { AuthRequest } from '../middlewares/auth';

/**
 * GET /api/admin/faltantes
 * Obtiene la lista de alumnos que aún no han completado la evaluación docente
 * de sus materias inscritas.
 */
export const obtenerAlumnosFaltantes = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const consulta = `
      SELECT 
        u.numero_cuenta AS "matricula",
        u.correo_institucional AS "nombreAlumno",
        c.crn AS "crnFaltante",
        m.nombre AS "nombreMateria"
      FROM Inscripcion i
      INNER JOIN Alumno a ON a.id_alumno = i.id_alumno
      INNER JOIN Usuario u ON u.id_usuario = a.id_usuario
      INNER JOIN CRN c ON c.id_crn = i.id_crn
      INNER JOIN Materia m ON m.id_materia = c.id_materia
      LEFT JOIN Evaluacion e ON e.id_alumno = i.id_alumno AND e.id_crn = i.id_crn
      WHERE e.id_evaluacion IS NULL
      ORDER BY u.numero_cuenta, c.crn
    `;

    const { rows } = await pool.query(consulta);

    res.status(200).json({
      faltantes: rows,
    });
  } catch (error) {
    console.error('Error al obtener alumnos con evaluaciones faltantes:', error);
    res.status(500).json({
      mensaje: 'Error interno del servidor al obtener la lista de alumnos faltantes.',
    });
  }
};
