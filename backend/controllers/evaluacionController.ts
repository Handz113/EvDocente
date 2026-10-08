import { Request, Response } from 'express';
import pool from '../config/db';

export const crearEvaluacion = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();

  try {
    const idAlumno = (req as any).user?.id || (req as any).user?.matricula;
    const { crn, calificaciones } = req.body;

    if (!crn || !calificaciones || !Array.isArray(calificaciones) || calificaciones.length !== 15) {
      res.status(400).json({
        mensaje: 'Datos inválidos. Se requiere el CRN de la clase y un arreglo exactamente con 15 calificaciones.'
      });
      return;
    }

    if (!idAlumno) {
      res.status(401).json({ mensaje: 'No se pudo identificar al alumno en la petición.' });
      return;
    }

    await client.query('BEGIN');

    // 2. Usar los nombres reales: Evaluacion, id_alumno, id_crn
    const checkQuery = `
      SELECT id_evaluacion FROM Evaluacion 
      WHERE id_alumno = $1 AND id_crn = $2
    `;
    const checkResult = await client.query(checkQuery, [idAlumno, crn]);

    if (checkResult.rows.length > 0) {
      await client.query('ROLLBACK');
      res.status(400).json({ mensaje: 'El alumno ya ha evaluado esta asignación previamente.' });
      return;
    }

    // 3. Calcular el promedio
    const suma = calificaciones.reduce((acc: number, val: number) => acc + val, 0);
    const promedio = suma / calificaciones.length;

    // 4. Insertar usando los nombres reales
    const insertEvalQuery = `
      INSERT INTO Evaluacion (id_alumno, id_crn, promedio, fecha)
      VALUES ($1, $2, $3, NOW())
      RETURNING id_evaluacion
    `;
    const evalResult = await client.query(insertEvalQuery, [idAlumno, crn, promedio]);
    const evaluacionId = evalResult.rows[0].id_evaluacion;

    // 5. Insertar respuestas usando: Respuesta, id_evaluacion, id_pregunta, valor
    const insertRespuestasQuery = `
      INSERT INTO Respuesta (id_evaluacion, id_pregunta, valor)
      VALUES ($1, $2, $3)
    `;

    for (let i = 0; i < calificaciones.length; i++) {
      await client.query(insertRespuestasQuery, [evaluacionId, i + 1, calificaciones[i]]);
    }

    await client.query('COMMIT');
    res.status(201).json({
      mensaje: 'Evaluación registrada exitosamente.',
      evaluacion: { id: evaluacionId, promedio }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al registrar la evaluación:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor al procesar la evaluación.' });
  } finally {
    client.release();
  }
};