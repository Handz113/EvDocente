import { Response } from 'express';
import pool from '../config/db';
import { AuthRequest } from '../middlewares/auth';

/**
 * GET /api/ciclos
 * Devuelve todos los periodos escolares registrados en la tabla CicloEscolar,
 * ordenados cronológicamente por fecha_inicio_eval descendente.
 * Accesible para Docentes, Coordinadores y Administradores.
 */
export const listarCiclos = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { rows } = await pool.query(
      `SELECT id_ciclo, nombre, fecha_inicio_eval, fecha_cierre_eval, activo
       FROM CicloEscolar
       ORDER BY fecha_inicio_eval DESC`
    );

    res.status(200).json(rows);
  } catch (error) {
    console.error('Error al listar ciclos escolares:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor al listar los ciclos escolares.' });
  }
};
