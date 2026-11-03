import { Response } from 'express';
import pool from '../config/db';
import { AuthRequest } from '../middlewares/auth';

/**
 * GET /api/participacion
 * Por cada alumno inscrito y cada CRN del ciclo activo: si ya respondió la evaluación o está pendiente.
 * Anonimato: de Evaluacion solo se usa si existe la fila. Nunca se consultan calificaciones,
 * promedio, comentarios ni fecha, y no se toca la tabla Respuesta.
 */
export const obtenerParticipacion = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { rows } = await pool.query(
      `SELECT u.numero_cuenta AS matricula, u.correo_institucional AS correo, a.carrera, a.semestre,
              c.crn, m.clave, m.nombre AS materia, d.nombre AS docente_nombre, d.apellido AS docente_apellido,
              (e.id_evaluacion IS NOT NULL) AS respondio
       FROM Inscripcion i
       INNER JOIN Alumno a ON a.id_alumno = i.id_alumno
       INNER JOIN Usuario u ON u.id_usuario = a.id_usuario
       INNER JOIN CRN c ON c.id_crn = i.id_crn
       INNER JOIN Materia m ON m.id_materia = c.id_materia
       INNER JOIN Docente d ON d.id_docente = c.id_docente
       INNER JOIN CicloEscolar ce ON ce.id_ciclo = c.id_ciclo AND ce.activo = TRUE
       LEFT JOIN Evaluacion e ON e.id_alumno = i.id_alumno AND e.id_crn = i.id_crn
       ORDER BY m.nombre, u.numero_cuenta`
    );

    const participacion = rows.map((r) => ({
      matricula: r.matricula,
      correo: r.correo,
      carrera: r.carrera,
      semestre: r.semestre,
      crn: String(r.crn),
      clave: r.clave,
      materia: r.materia,
      docente: `${r.docente_nombre} ${r.docente_apellido}`,
      respondio: r.respondio,
    }));

    const total = participacion.length;
    const respondieron = participacion.filter((p) => p.respondio).length;

    res.json({
      participacion,
      resumen: {
        total,
        respondieron,
        pendientes: total - respondieron,
        porcentaje: total ? Math.round((respondieron / total) * 1000) / 10 : 0,
      },
    });
  } catch (error) {
    console.error('Error al obtener la participación:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor al obtener la participación.' });
  }
};
