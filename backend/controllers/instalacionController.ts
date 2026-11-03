import { Request, Response } from 'express';
import pool from '../config/db';

const DIMENSIONES = ['Equipamiento', 'Disponibilidad', 'Limpieza'];
const VALORES_VALIDOS = [0, 2.5, 5, 7.5, 10];

const parseId = (valor: unknown): number | null => {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : null;
};

const errorServidor = (res: Response, contexto: string, error: unknown): void => {
  console.error(`Error al ${contexto}:`, error);
  res.status(500).json({ mensaje: `Error interno del servidor al ${contexto}.` });
};

/** GET /api/instalaciones: lista las instalaciones activas. */
export const listarInstalaciones = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT id_instalacion, nombre, tipo, descripcion
       FROM Instalacion
       WHERE activa = TRUE
       ORDER BY nombre`
    );
    res.status(200).json(result.rows);
  } catch (error) {
    errorServidor(res, 'listar las instalaciones', error);
  }
};

/** POST /api/instalaciones: da de alta una instalación (Administrador). */
export const crearInstalacion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nombre, tipo, descripcion } = req.body ?? {};

    if (typeof nombre !== 'string' || !nombre.trim() || typeof tipo !== 'string' || !tipo.trim()) {
      res.status(400).json({ mensaje: 'Se requieren los campos nombre y tipo.' });
      return;
    }

    const result = await pool.query(
      `INSERT INTO Instalacion (nombre, tipo, descripcion)
       VALUES ($1, $2, $3)
       RETURNING id_instalacion, nombre, tipo, descripcion, activa`,
      [nombre.trim(), tipo.trim(), typeof descripcion === 'string' ? descripcion : null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') {
      res.status(409).json({ mensaje: 'Ya existe una instalación con ese nombre.' });
      return;
    }
    errorServidor(res, 'crear la instalación', error);
  }
};

/** GET /api/instalaciones/:id/preguntas: criterios aplicables a la instalación. */
export const obtenerPreguntasInstalacion = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      res.status(400).json({ mensaje: 'Identificador de instalación inválido.' });
      return;
    }

    const inst = await pool.query(
      `SELECT id_instalacion, nombre, tipo
       FROM Instalacion
       WHERE id_instalacion = $1 AND activa = TRUE`,
      [id]
    );
    if (inst.rows.length === 0) {
      res.status(404).json({ mensaje: `No se encontró la instalación con ID ${id}.` });
      return;
    }

    // Criterios generales (id_instalacion NULL) + los propios de esta instalación
    const preguntas = await pool.query(
      `SELECT id_pregunta_instalacion, dimension, texto
       FROM PreguntaInstalacion
       WHERE activa = TRUE AND (id_instalacion IS NULL OR id_instalacion = $1)
       ORDER BY dimension, id_pregunta_instalacion`,
      [id]
    );

    res.status(200).json({ instalacion: inst.rows[0], preguntas: preguntas.rows });
  } catch (error) {
    errorServidor(res, 'obtener los criterios de la instalación', error);
  }
};

/** POST /api/instalaciones/:id/preguntas: agrega un criterio propio (Administrador). */
export const agregarPreguntaInstalacion = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      res.status(400).json({ mensaje: 'Identificador de instalación inválido.' });
      return;
    }

    const { dimension, texto } = req.body ?? {};
    if (!DIMENSIONES.includes(dimension) || typeof texto !== 'string' || !texto.trim()) {
      res.status(400).json({
        mensaje: `Se requiere texto y una dimensión válida: ${DIMENSIONES.join(', ')}.`
      });
      return;
    }

    const inst = await pool.query('SELECT 1 FROM Instalacion WHERE id_instalacion = $1', [id]);
    if (inst.rows.length === 0) {
      res.status(404).json({ mensaje: `No se encontró la instalación con ID ${id}.` });
      return;
    }

    const result = await pool.query(
      `INSERT INTO PreguntaInstalacion (id_instalacion, dimension, texto)
       VALUES ($1, $2, $3)
       RETURNING id_pregunta_instalacion, id_instalacion, dimension, texto, activa`,
      [id, dimension, texto.trim()]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    errorServidor(res, 'agregar el criterio', error);
  }
};

/**
 * POST /api/instalaciones/:id/evaluaciones (Alumno)
 * Body: { respuestas: [{ id_pregunta_instalacion, valor }], comentarios?: string }
 * Debe contestar exactamente los criterios aplicables, con valores 0, 2.5, 5, 7.5 o 10.
 */
export const evaluarInstalacion = async (req: Request, res: Response): Promise<void> => {
  try {
    const idInstalacion = parseId(req.params.id);
    if (idInstalacion === null) {
      res.status(400).json({ mensaje: 'Identificador de instalación inválido.' });
      return;
    }

    const idUsuario = (req as any).user?.id_usuario;
    if (!idUsuario) {
      res.status(401).json({ mensaje: 'No se pudo identificar al usuario en la petición.' });
      return;
    }

    const { respuestas, comentarios } = req.body ?? {};
    if (!Array.isArray(respuestas) || respuestas.length === 0) {
      res.status(400).json({ mensaje: 'Se requiere un arreglo de respuestas.' });
      return;
    }

    // Validar cada respuesta y que no haya criterios repetidos
    const idsRespondidos = new Set<number>();
    for (const r of respuestas) {
      if (
        !r ||
        !Number.isInteger(r.id_pregunta_instalacion) ||
        typeof r.valor !== 'number' ||
        !VALORES_VALIDOS.includes(r.valor)
      ) {
        res.status(400).json({
          mensaje: 'Cada respuesta debe incluir id_pregunta_instalacion y un valor de 0, 2.5, 5, 7.5 o 10.'
        });
        return;
      }
      if (idsRespondidos.has(r.id_pregunta_instalacion)) {
        res.status(400).json({ mensaje: 'No se puede responder el mismo criterio más de una vez.' });
        return;
      }
      idsRespondidos.add(r.id_pregunta_instalacion);
    }

    const alumno = await pool.query('SELECT id_alumno FROM Alumno WHERE id_usuario = $1', [idUsuario]);
    if (alumno.rows.length === 0) {
      res.status(403).json({ mensaje: 'No se encontró un alumno asociado a este usuario.' });
      return;
    }
    const idAlumno = alumno.rows[0].id_alumno;

    const inst = await pool.query(
      'SELECT 1 FROM Instalacion WHERE id_instalacion = $1 AND activa = TRUE',
      [idInstalacion]
    );
    if (inst.rows.length === 0) {
      res.status(404).json({ mensaje: `No se encontró la instalación con ID ${idInstalacion}.` });
      return;
    }

    const ciclo = await pool.query(
      'SELECT id_ciclo FROM CicloEscolar WHERE activo = TRUE ORDER BY id_ciclo DESC LIMIT 1'
    );
    if (ciclo.rows.length === 0) {
      res.status(400).json({ mensaje: 'No hay un ciclo escolar activo.' });
      return;
    }
    const idCiclo = ciclo.rows[0].id_ciclo;

    // Debe contestar exactamente los criterios aplicables a esta instalación
    const aplicables = await pool.query(
      `SELECT id_pregunta_instalacion
       FROM PreguntaInstalacion
       WHERE activa = TRUE AND (id_instalacion IS NULL OR id_instalacion = $1)`,
      [idInstalacion]
    );
    const esperados = new Set<number>(aplicables.rows.map((r: any) => r.id_pregunta_instalacion));
    const completo =
      esperados.size === idsRespondidos.size && [...idsRespondidos].every((i) => esperados.has(i));
    if (!completo) {
      res.status(400).json({
        mensaje: `Debes responder exactamente los ${esperados.size} criterios de la instalación.`
      });
      return;
    }

    const suma = respuestas.reduce((acc: number, r: any) => acc + r.valor, 0);
    const promedio = Math.round((suma / respuestas.length) * 100) / 100;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const evalResult = await client.query(
        `INSERT INTO EvaluacionInstalacion (id_alumno, id_instalacion, id_ciclo, comentarios, promedio)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id_evaluacion_instalacion`,
        [
          idAlumno,
          idInstalacion,
          idCiclo,
          typeof comentarios === 'string' && comentarios.trim() ? comentarios.trim() : null,
          promedio
        ]
      );
      const idEvaluacion = evalResult.rows[0].id_evaluacion_instalacion;

      await client.query(
        `INSERT INTO RespuestaInstalacion (id_evaluacion_instalacion, id_pregunta_instalacion, valor)
         SELECT $1::int, * FROM UNNEST($2::int[], $3::numeric[])`,
        [
          idEvaluacion,
          respuestas.map((r: any) => r.id_pregunta_instalacion),
          respuestas.map((r: any) => r.valor)
        ]
      );

      await client.query('COMMIT');
      res.status(201).json({
        mensaje: 'Evaluación de la instalación registrada exitosamente.',
        evaluacion: { id: idEvaluacion, promedio }
      });
    } catch (error: any) {
      await client.query('ROLLBACK');
      if (error.code === '23505') {
        res.status(409).json({
          mensaje: 'Ya evaluaste esta instalación en el ciclo escolar activo.'
        });
        return;
      }
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    errorServidor(res, 'registrar la evaluación de la instalación', error);
  }
};

/**
 * GET /api/instalaciones/:id/resultados (Coordinador, Administrador)
 * Opcional: ?id_ciclo=N para filtrar por ciclo escolar.
 */
export const obtenerResultadosInstalacion = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      res.status(400).json({ mensaje: 'Identificador de instalación inválido.' });
      return;
    }

    const idCiclo = req.query.id_ciclo !== undefined ? parseId(req.query.id_ciclo) : undefined;
    if (req.query.id_ciclo !== undefined && idCiclo === null) {
      res.status(400).json({ mensaje: 'El parámetro id_ciclo debe ser un número válido.' });
      return;
    }

    const inst = await pool.query(
      'SELECT id_instalacion, nombre, tipo FROM Instalacion WHERE id_instalacion = $1',
      [id]
    );
    if (inst.rows.length === 0) {
      res.status(404).json({ mensaje: `No se encontró la instalación con ID ${id}.` });
      return;
    }

    const params: number[] = [id];
    let filtro = '';
    if (idCiclo) {
      params.push(idCiclo);
      filtro = ' AND e.id_ciclo = $2';
    }

    const general = await pool.query(
      `SELECT COUNT(*) AS total, ROUND(AVG(e.promedio), 2) AS promedio
       FROM EvaluacionInstalacion e
       WHERE e.id_instalacion = $1${filtro}`,
      params
    );

    const dimensiones = await pool.query(
      `SELECT p.dimension, ROUND(AVG(r.valor), 2) AS promedio
       FROM RespuestaInstalacion r
       INNER JOIN PreguntaInstalacion p ON p.id_pregunta_instalacion = r.id_pregunta_instalacion
       INNER JOIN EvaluacionInstalacion e ON e.id_evaluacion_instalacion = r.id_evaluacion_instalacion
       WHERE e.id_instalacion = $1${filtro}
       GROUP BY p.dimension
       ORDER BY p.dimension`,
      params
    );

    const total = parseInt(general.rows[0].total, 10);
    res.status(200).json({
      instalacion: inst.rows[0],
      totalEvaluaciones: total,
      promedioGeneral: total > 0 ? parseFloat(general.rows[0].promedio) : null,
      porDimension: dimensiones.rows.map((d: any) => ({
        dimension: d.dimension,
        promedio: parseFloat(d.promedio)
      })),
      detalles: { cicloFiltro: idCiclo ?? 'Todos los ciclos' }
    });
  } catch (error) {
    errorServidor(res, 'obtener los resultados de la instalación', error);
  }
};