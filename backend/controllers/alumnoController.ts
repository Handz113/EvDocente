import { Response } from 'express';
import pool from '../config/db';
import { AuthRequest } from '../middlewares/auth';

/**
 * GET /api/alumno/materias
 * Materias (CRN) en las que está inscrito el alumno del token, en ciclos activos,
 * con su docente y si ya fueron evaluadas.
 */
export const obtenerMateriasAlumno = async (req: AuthRequest, res: Response): Promise<void> => {
  const idAlumno = req.user?.id;
  if (!idAlumno) {
    res.status(401).json({ mensaje: 'No se pudo identificar al alumno en la petición.' });
    return;
  }

  try {
    const { rows } = await pool.query(
      `SELECT c.crn, m.clave, m.nombre AS materia,
              d.id_docente, d.nombre AS docente_nombre, d.apellido AS docente_apellido, d.departamento,
              ce.id_ciclo, ce.nombre AS ciclo, ce.fecha_inicio_eval, ce.fecha_cierre_eval,
              EXISTS (
                SELECT 1 FROM Evaluacion e WHERE e.id_alumno = i.id_alumno AND e.id_crn = c.id_crn
              ) AS evaluada
       FROM Inscripcion i
       INNER JOIN CRN c ON c.id_crn = i.id_crn
       INNER JOIN Materia m ON m.id_materia = c.id_materia
       INNER JOIN Docente d ON d.id_docente = c.id_docente
       INNER JOIN CicloEscolar ce ON ce.id_ciclo = c.id_ciclo
       WHERE i.id_alumno = $1 AND ce.activo = TRUE
       ORDER BY m.nombre`,
      [idAlumno]
    );

    const fecha = (v: Date | string) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v));
    const periodo = rows[0]
      ? {
          id: String(rows[0].id_ciclo),
          nombre: rows[0].ciclo,
          inicio: fecha(rows[0].fecha_inicio_eval),
          fin: fecha(rows[0].fecha_cierre_eval),
          activo: true,
        }
      : null;

    res.json({
      periodo,
      materias: rows.map((r) => ({
        crn: String(r.crn),
        clave: r.clave,
        nombre: r.materia,
        docenteId: String(r.id_docente),
        evaluada: r.evaluada,
        docente: {
          id: String(r.id_docente),
          nombre: `${r.docente_nombre} ${r.docente_apellido}`,
          area: r.departamento,
        },
      })),
    });
  } catch (error) {
    console.error('Error al obtener materias del alumno:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor al obtener las materias.' });
  }
};
