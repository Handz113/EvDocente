import { Response } from 'express';
import { PoolClient } from 'pg';
import pool from '../config/db';
import { AuthRequest } from '../middlewares/auth';

// =========================
// MÓDULO TALLERES Y LABORATORIOS
// Tablas: Instalacion, PreguntaInstalacion, EvaluacionInstalacion, RespuestaInstalacion
// (sql/modulo_talleres_laboratorios.sql)
// =========================

export const DIMENSIONES = ['Equipamiento', 'Disponibilidad', 'Limpieza'] as const;
const VALORES_PERMITIDOS = [0, 2.5, 5, 7.5, 10];

// Orden fijo de las dimensiones al listar preguntas
const ORDEN_DIMENSION = `CASE p.dimension WHEN 'Equipamiento' THEN 1 WHEN 'Disponibilidad' THEN 2 ELSE 3 END`;

/** Convierte el :id de la URL a número; devuelve null si no es un entero positivo. */
const idNumerico = (valor: unknown): number | null => {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : null;
};

/** Ciclo escolar activo (CicloEscolar.activo = TRUE). */
const obtenerCicloActivo = async (
  db: PoolClient | typeof pool = pool
): Promise<{ id_ciclo: number; nombre: string } | null> => {
  const { rows } = await db.query(
    'SELECT id_ciclo, nombre FROM CicloEscolar WHERE activo = TRUE ORDER BY id_ciclo DESC LIMIT 1'
  );
  return rows[0] ?? null;
};

const redondear = (v: unknown): number | null =>
  v === null || v === undefined ? null : Math.round(Number(v) * 100) / 100;

const mapearInstalacion = (r: any) => ({
  id: r.id_instalacion,
  nombre: r.nombre,
  tipo: r.tipo,
  descripcion: r.descripcion,
  activa: r.activa,
});

const mapearPregunta = (r: any) => ({
  id: r.id_pregunta_instalacion,
  idInstalacion: r.id_instalacion,
  dimension: r.dimension,
  texto: r.texto,
  activa: r.activa,
});

// ==========================================================
// ALUMNO
// ==========================================================

/**
 * GET /api/instalaciones
 * Instalaciones activas y si el alumno del token ya evaluó cada una en el ciclo activo.
 */
export const listarInstalacionesAlumno = async (req: AuthRequest, res: Response): Promise<void> => {
  const idAlumno = req.user?.id;
  if (!idAlumno) {
    res.status(401).json({ mensaje: 'No se pudo identificar al alumno en la petición.' });
    return;
  }

  try {
    const ciclo = await obtenerCicloActivo();
    const { rows } = await pool.query(
      `SELECT i.id_instalacion, i.nombre, i.tipo, i.descripcion, i.activa,
              EXISTS (
                SELECT 1 FROM EvaluacionInstalacion e
                WHERE e.id_instalacion = i.id_instalacion AND e.id_alumno = $1 AND e.id_ciclo = $2
              ) AS evaluada
       FROM Instalacion i
       WHERE i.activa = TRUE
       ORDER BY i.nombre`,
      [idAlumno, ciclo?.id_ciclo ?? null]
    );

    res.json({
      ciclo: ciclo ? { id: ciclo.id_ciclo, nombre: ciclo.nombre } : null,
      instalaciones: rows.map((r) => ({ ...mapearInstalacion(r), evaluada: r.evaluada })),
    });
  } catch (error) {
    console.error('Error al listar instalaciones del alumno:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor al obtener las instalaciones.' });
  }
};

/**
 * GET /api/instalaciones/:id/preguntas
 * Datos de la instalación, si el alumno ya la evaluó en el ciclo activo y sus preguntas
 * activas (generales con id_instalacion NULL + propias), ordenadas por dimensión.
 */
export const obtenerPreguntasInstalacion = async (req: AuthRequest, res: Response): Promise<void> => {
  const idAlumno = req.user?.id;
  const idInstalacion = idNumerico(req.params.id);
  if (!idAlumno) {
    res.status(401).json({ mensaje: 'No se pudo identificar al alumno en la petición.' });
    return;
  }
  if (!idInstalacion) {
    res.status(400).json({ mensaje: 'Identificador de instalación inválido.' });
    return;
  }

  try {
    const instalacion = await pool.query(
      'SELECT id_instalacion, nombre, tipo, descripcion, activa FROM Instalacion WHERE id_instalacion = $1 AND activa = TRUE',
      [idInstalacion]
    );
    if (instalacion.rows.length === 0) {
      res.status(404).json({ mensaje: 'La instalación no existe o no está activa.' });
      return;
    }

    const ciclo = await obtenerCicloActivo();
    const evaluada = ciclo
      ? (
          await pool.query(
            `SELECT 1 FROM EvaluacionInstalacion
             WHERE id_alumno = $1 AND id_instalacion = $2 AND id_ciclo = $3`,
            [idAlumno, idInstalacion, ciclo.id_ciclo]
          )
        ).rows.length > 0
      : false;

    const preguntas = await pool.query(
      `SELECT p.id_pregunta_instalacion, p.id_instalacion, p.dimension, p.texto, p.activa
       FROM PreguntaInstalacion p
       WHERE p.activa = TRUE AND (p.id_instalacion IS NULL OR p.id_instalacion = $1)
       ORDER BY ${ORDEN_DIMENSION}, p.id_pregunta_instalacion`,
      [idInstalacion]
    );

    res.json({
      ciclo: ciclo ? { id: ciclo.id_ciclo, nombre: ciclo.nombre } : null,
      instalacion: mapearInstalacion(instalacion.rows[0]),
      evaluada,
      preguntas: preguntas.rows.map(mapearPregunta),
    });
  } catch (error) {
    console.error('Error al obtener preguntas de la instalación:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor al obtener las preguntas.' });
  }
};

/**
 * POST /api/instalaciones/:id/evaluacion
 * Body: { respuestas: [{ idPregunta, valor }], comentarios? }
 * Debe responder exactamente todas las preguntas activas de la instalación, una vez cada una.
 */
export const crearEvaluacionInstalacion = async (req: AuthRequest, res: Response): Promise<void> => {
  const idAlumno = req.user?.id;
  const idInstalacion = idNumerico(req.params.id);
  const { respuestas, comentarios } = req.body ?? {};

  if (!idAlumno) {
    res.status(401).json({ mensaje: 'No se pudo identificar al alumno en la petición.' });
    return;
  }
  if (!idInstalacion) {
    res.status(400).json({ mensaje: 'Identificador de instalación inválido.' });
    return;
  }
  if (!Array.isArray(respuestas) || respuestas.length === 0) {
    res.status(400).json({ mensaje: 'Datos inválidos. Se requiere el arreglo "respuestas" con { idPregunta, valor }.' });
    return;
  }

  const valoresValidos = respuestas.every(
    (r: any) =>
      r &&
      Number.isInteger(r.idPregunta) &&
      typeof r.valor === 'number' &&
      VALORES_PERMITIDOS.includes(r.valor)
  );
  if (!valoresValidos) {
    res.status(400).json({
      mensaje: 'Respuestas inválidas. Solo se permiten los valores 0, 2.5, 5, 7.5 y 10 en la escala de evaluación.',
    });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const instalacion = await client.query(
      'SELECT nombre FROM Instalacion WHERE id_instalacion = $1 AND activa = TRUE',
      [idInstalacion]
    );
    if (instalacion.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ mensaje: 'La instalación no existe o no está activa.' });
      return;
    }

    const ciclo = await obtenerCicloActivo(client);
    if (!ciclo) {
      await client.query('ROLLBACK');
      res.status(400).json({ mensaje: 'No hay un ciclo escolar activo para registrar la evaluación.' });
      return;
    }

    const previa = await client.query(
      `SELECT 1 FROM EvaluacionInstalacion
       WHERE id_alumno = $1 AND id_instalacion = $2 AND id_ciclo = $3`,
      [idAlumno, idInstalacion, ciclo.id_ciclo]
    );
    if (previa.rows.length > 0) {
      await client.query('ROLLBACK');
      res.status(400).json({
        mensaje: `Ya evaluaste "${instalacion.rows[0].nombre}" en el ${ciclo.nombre}. Solo se permite una evaluación por ciclo.`,
      });
      return;
    }

    // Preguntas activas que aplican: generales (NULL) + propias de la instalación
    const preguntas = await client.query(
      `SELECT id_pregunta_instalacion FROM PreguntaInstalacion
       WHERE activa = TRUE AND (id_instalacion IS NULL OR id_instalacion = $1)`,
      [idInstalacion]
    );
    const esperadas = new Set<number>(preguntas.rows.map((p) => p.id_pregunta_instalacion));
    const recibidas = new Set<number>(respuestas.map((r: any) => r.idPregunta));

    const exacto =
      esperadas.size > 0 &&
      respuestas.length === esperadas.size &&
      recibidas.size === respuestas.length &&
      [...recibidas].every((id) => esperadas.has(id));

    if (!exacto) {
      await client.query('ROLLBACK');
      res.status(400).json({
        mensaje: `Debes responder exactamente las ${esperadas.size} preguntas activas de esta instalación, una vez cada una.`,
      });
      return;
    }

    const suma = respuestas.reduce((acc: number, r: any) => acc + r.valor, 0);
    const promedio = Math.round((suma / respuestas.length) * 100) / 100;
    const comentarioLimpio =
      typeof comentarios === 'string' && comentarios.trim() ? comentarios.trim().slice(0, 500) : null;

    const evalResult = await client.query(
      `INSERT INTO EvaluacionInstalacion (id_alumno, id_instalacion, id_ciclo, comentarios, promedio, fecha)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING id_evaluacion_instalacion`,
      [idAlumno, idInstalacion, ciclo.id_ciclo, comentarioLimpio, promedio]
    );
    const idEvaluacion = evalResult.rows[0].id_evaluacion_instalacion;

    for (const r of respuestas) {
      await client.query(
        `INSERT INTO RespuestaInstalacion (id_evaluacion_instalacion, id_pregunta_instalacion, valor)
         VALUES ($1, $2, $3)`,
        [idEvaluacion, r.idPregunta, r.valor]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({
      mensaje: 'Evaluación de la instalación registrada exitosamente.',
      evaluacion: { id: idEvaluacion, promedio },
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    // Dos envíos simultáneos: el UNIQUE (id_alumno, id_instalacion, id_ciclo) frena el segundo
    if (error?.code === '23505') {
      res.status(400).json({ mensaje: 'Ya evaluaste esta instalación en el ciclo activo.' });
      return;
    }
    console.error('Error al registrar la evaluación de instalación:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor al procesar la evaluación.' });
  } finally {
    client.release();
  }
};

// ==========================================================
// COORDINACIÓN Y ADMINISTRACIÓN
// ==========================================================

/**
 * GET /api/instalaciones/resultados[?id_ciclo=]
 * Por instalación: total de evaluaciones, promedio general, promedio por dimensión,
 * promedio por pregunta y comentarios (solo el texto, en orden aleatorio).
 * Nunca se devuelve id_alumno, fecha ni nada que identifique al alumno.
 */
export const obtenerResultadosInstalaciones = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    let ciclo: { id_ciclo: number; nombre: string } | null;
    if (req.query.id_ciclo !== undefined) {
      const idCiclo = idNumerico(req.query.id_ciclo);
      if (!idCiclo) {
        res.status(400).json({ mensaje: 'El parámetro id_ciclo debe ser numérico.' });
        return;
      }
      const { rows } = await pool.query('SELECT id_ciclo, nombre FROM CicloEscolar WHERE id_ciclo = $1', [idCiclo]);
      if (rows.length === 0) {
        res.status(404).json({ mensaje: `No existe el ciclo escolar ${idCiclo}.` });
        return;
      }
      ciclo = rows[0];
    } else {
      ciclo = await obtenerCicloActivo();
    }

    if (!ciclo) {
      res.json({ ciclo: null, instalaciones: [] });
      return;
    }
    const idCiclo = ciclo.id_ciclo;

    // Instalaciones activas, más las inactivas que sí tengan evaluaciones en el ciclo
    const generales = await pool.query(
      `SELECT i.id_instalacion, i.nombre, i.tipo, i.descripcion, i.activa,
              COUNT(e.id_evaluacion_instalacion)::int AS total, AVG(e.promedio) AS promedio
       FROM Instalacion i
       LEFT JOIN EvaluacionInstalacion e ON e.id_instalacion = i.id_instalacion AND e.id_ciclo = $1
       GROUP BY i.id_instalacion
       HAVING i.activa = TRUE OR COUNT(e.id_evaluacion_instalacion) > 0
       ORDER BY i.nombre`,
      [idCiclo]
    );

    const porDimension = await pool.query(
      `SELECT e.id_instalacion, p.dimension, AVG(r.valor) AS promedio
       FROM RespuestaInstalacion r
       INNER JOIN EvaluacionInstalacion e ON e.id_evaluacion_instalacion = r.id_evaluacion_instalacion
       INNER JOIN PreguntaInstalacion p ON p.id_pregunta_instalacion = r.id_pregunta_instalacion
       WHERE e.id_ciclo = $1
       GROUP BY e.id_instalacion, p.dimension`,
      [idCiclo]
    );

    const porPregunta = await pool.query(
      `SELECT e.id_instalacion, p.id_pregunta_instalacion, p.dimension, p.texto,
              AVG(r.valor) AS promedio, COUNT(*)::int AS respuestas
       FROM RespuestaInstalacion r
       INNER JOIN EvaluacionInstalacion e ON e.id_evaluacion_instalacion = r.id_evaluacion_instalacion
       INNER JOIN PreguntaInstalacion p ON p.id_pregunta_instalacion = r.id_pregunta_instalacion
       WHERE e.id_ciclo = $1
       GROUP BY e.id_instalacion, p.id_pregunta_instalacion, p.dimension, p.texto
       ORDER BY ${ORDEN_DIMENSION}, p.id_pregunta_instalacion`,
      [idCiclo]
    );

    // Solo el texto: sin alumno ni fecha, y en orden aleatorio
    const comentarios = await pool.query(
      `SELECT e.id_instalacion, e.comentarios
       FROM EvaluacionInstalacion e
       WHERE e.id_ciclo = $1 AND e.comentarios IS NOT NULL AND TRIM(e.comentarios) <> ''
       ORDER BY random()`,
      [idCiclo]
    );

    res.json({
      ciclo: { id: ciclo.id_ciclo, nombre: ciclo.nombre },
      instalaciones: generales.rows.map((g) => {
        const dims = porDimension.rows.filter((d) => d.id_instalacion === g.id_instalacion);
        return {
          ...mapearInstalacion(g),
          totalEvaluaciones: g.total,
          promedio: redondear(g.promedio),
          porDimension: Object.fromEntries(
            DIMENSIONES.map((dim) => [dim, redondear(dims.find((d) => d.dimension === dim)?.promedio ?? null)])
          ),
          porPregunta: porPregunta.rows
            .filter((p) => p.id_instalacion === g.id_instalacion)
            .map((p) => ({
              id: p.id_pregunta_instalacion,
              dimension: p.dimension,
              texto: p.texto,
              promedio: redondear(p.promedio) as number,
              respuestas: p.respuestas,
            })),
          comentarios: comentarios.rows
            .filter((c) => c.id_instalacion === g.id_instalacion)
            .map((c) => c.comentarios as string),
        };
      }),
    });
  } catch (error) {
    console.error('Error al obtener resultados de instalaciones:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor al obtener los resultados.' });
  }
};

// ==========================================================
// ADMINISTRACIÓN — CATÁLOGO
// ==========================================================

/** GET /api/instalaciones/catalogo — todas las instalaciones y preguntas, incluidas inactivas. */
export const obtenerCatalogo = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const instalaciones = await pool.query(
      'SELECT id_instalacion, nombre, tipo, descripcion, activa FROM Instalacion ORDER BY nombre'
    );
    const preguntas = await pool.query(
      `SELECT p.id_pregunta_instalacion, p.id_instalacion, p.dimension, p.texto, p.activa
       FROM PreguntaInstalacion p
       ORDER BY p.id_instalacion NULLS FIRST, ${ORDEN_DIMENSION}, p.id_pregunta_instalacion`
    );
    res.json({
      instalaciones: instalaciones.rows.map(mapearInstalacion),
      preguntas: preguntas.rows.map(mapearPregunta),
    });
  } catch (error) {
    console.error('Error al obtener el catálogo de instalaciones:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor al obtener el catálogo.' });
  }
};

/** POST /api/instalaciones — body { nombre, tipo, descripcion? } */
export const crearInstalacion = async (req: AuthRequest, res: Response): Promise<void> => {
  const { nombre, tipo, descripcion } = req.body ?? {};
  const nombreLimpio = typeof nombre === 'string' ? nombre.trim() : '';
  const tipoLimpio = typeof tipo === 'string' ? tipo.trim() : '';

  if (!nombreLimpio || !tipoLimpio) {
    res.status(400).json({ mensaje: 'El nombre y el tipo de la instalación son obligatorios.' });
    return;
  }
  if (nombreLimpio.length > 100 || tipoLimpio.length > 50) {
    res.status(400).json({ mensaje: 'El nombre admite 100 caracteres y el tipo 50.' });
    return;
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO Instalacion (nombre, tipo, descripcion)
       VALUES ($1, $2, $3)
       RETURNING id_instalacion, nombre, tipo, descripcion, activa`,
      [nombreLimpio, tipoLimpio, typeof descripcion === 'string' && descripcion.trim() ? descripcion.trim() : null]
    );
    res.status(201).json({ mensaje: 'Instalación creada.', instalacion: mapearInstalacion(rows[0]) });
  } catch (error: any) {
    if (error?.code === '23505') {
      res.status(400).json({ mensaje: `Ya existe una instalación con el nombre "${nombreLimpio}".` });
      return;
    }
    console.error('Error al crear instalación:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor al crear la instalación.' });
  }
};

/** PATCH /api/instalaciones/:id — body con cualquiera de { nombre, tipo, descripcion, activa } */
export const actualizarInstalacion = async (req: AuthRequest, res: Response): Promise<void> => {
  const idInstalacion = idNumerico(req.params.id);
  if (!idInstalacion) {
    res.status(400).json({ mensaje: 'Identificador de instalación inválido.' });
    return;
  }

  const { nombre, tipo, descripcion, activa } = req.body ?? {};
  let hayCambios = false;

  let nombreVal: string | null = null;
  if (nombre !== undefined) {
    if (typeof nombre !== 'string' || !nombre.trim() || nombre.trim().length > 100) {
      res.status(400).json({ mensaje: 'El nombre es obligatorio (máximo 100 caracteres).' });
      return;
    }
    nombreVal = nombre.trim();
    hayCambios = true;
  }

  let tipoVal: string | null = null;
  if (tipo !== undefined) {
    if (typeof tipo !== 'string' || !tipo.trim() || tipo.trim().length > 50) {
      res.status(400).json({ mensaje: 'El tipo es obligatorio (máximo 50 caracteres).' });
      return;
    }
    tipoVal = tipo.trim();
    hayCambios = true;
  }

  let descripcionVal: string | null = null;
  if (descripcion !== undefined) {
    descripcionVal = typeof descripcion === 'string' && descripcion.trim() ? descripcion.trim() : null;
    hayCambios = true;
  }

  let activaVal: boolean | null = null;
  if (activa !== undefined) {
    if (typeof activa !== 'boolean') {
      res.status(400).json({ mensaje: 'El campo "activa" debe ser true o false.' });
      return;
    }
    activaVal = activa;
    hayCambios = true;
  }

  if (!hayCambios) {
    res.status(400).json({ mensaje: 'No se envió ningún campo para actualizar.' });
    return;
  }

  try {
    const { rows } = await pool.query(
      `UPDATE Instalacion
       SET nombre = COALESCE($1, nombre),
           tipo = COALESCE($2, tipo),
           descripcion = COALESCE($3, descripcion),
           activa = COALESCE($4, activa)
       WHERE id_instalacion = $5
       RETURNING id_instalacion, nombre, tipo, descripcion, activa`,
      [nombreVal, tipoVal, descripcionVal, activaVal, idInstalacion]
    );
    if (rows.length === 0) {
      res.status(404).json({ mensaje: 'La instalación no existe.' });
      return;
    }
    res.json({ mensaje: 'Instalación actualizada.', instalacion: mapearInstalacion(rows[0]) });
  } catch (error: any) {
    if (error?.code === '23505') {
      res.status(400).json({ mensaje: `Ya existe una instalación con el nombre "${String(nombre).trim()}".` });
      return;
    }
    console.error('Error al actualizar instalación:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor al actualizar la instalación.' });
  }
};

/**
 * Valida id_instalacion del body: null = aplica a todas; número = debe existir.
 * Devuelve { ok, valor } o escribe la respuesta 400 y devuelve ok=false.
 */
const validarIdInstalacion = async (valor: unknown, res: Response): Promise<{ ok: boolean; valor: number | null }> => {
  if (valor === null) return { ok: true, valor: null };
  const id = idNumerico(valor);
  if (!id) {
    res.status(400).json({ mensaje: 'id_instalacion debe ser null (todas) o el id de una instalación.' });
    return { ok: false, valor: null };
  }
  const { rows } = await pool.query('SELECT 1 FROM Instalacion WHERE id_instalacion = $1', [id]);
  if (rows.length === 0) {
    res.status(400).json({ mensaje: `No existe la instalación ${id}.` });
    return { ok: false, valor: null };
  }
  return { ok: true, valor: id };
};

const dimensionValida = (d: unknown): boolean => DIMENSIONES.includes(d as (typeof DIMENSIONES)[number]);

/** POST /api/instalaciones/preguntas — body { id_instalacion: number | null, dimension, texto } */
export const crearPregunta = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id_instalacion, dimension, texto } = req.body ?? {};

  if (!dimensionValida(dimension)) {
    res.status(400).json({ mensaje: `Dimensión inválida. Usa: ${DIMENSIONES.join(', ')}.` });
    return;
  }
  if (typeof texto !== 'string' || !texto.trim()) {
    res.status(400).json({ mensaje: 'El texto de la pregunta es obligatorio.' });
    return;
  }

  try {
    const instalacion = await validarIdInstalacion(id_instalacion ?? null, res);
    if (!instalacion.ok) return;

    const { rows } = await pool.query(
      `INSERT INTO PreguntaInstalacion (id_instalacion, dimension, texto)
       VALUES ($1, $2, $3)
       RETURNING id_pregunta_instalacion, id_instalacion, dimension, texto, activa`,
      [instalacion.valor, dimension, texto.trim()]
    );
    res.status(201).json({ mensaje: 'Pregunta creada.', pregunta: mapearPregunta(rows[0]) });
  } catch (error) {
    console.error('Error al crear pregunta de instalación:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor al crear la pregunta.' });
  }
};

/**
 * PATCH /api/instalaciones/preguntas/:id — body con cualquiera de
 * { id_instalacion, dimension, texto, activa }. Las preguntas nunca se borran, solo se desactivan.
 */
export const actualizarPregunta = async (req: AuthRequest, res: Response): Promise<void> => {
  const idPregunta = idNumerico(req.params.id);
  if (!idPregunta) {
    res.status(400).json({ mensaje: 'Identificador de pregunta inválido.' });
    return;
  }

  const { id_instalacion, dimension, texto, activa } = req.body ?? {};
  let hayCambios = false;

  let dimensionVal: string | null = null;
  if (dimension !== undefined) {
    if (!dimensionValida(dimension)) {
      res.status(400).json({ mensaje: `Dimensión inválida. Usa: ${DIMENSIONES.join(', ')}.` });
      return;
    }
    dimensionVal = dimension;
    hayCambios = true;
  }

  let textoVal: string | null = null;
  if (texto !== undefined) {
    if (typeof texto !== 'string' || !texto.trim()) {
      res.status(400).json({ mensaje: 'El texto de la pregunta no puede quedar vacío.' });
      return;
    }
    textoVal = texto.trim();
    hayCambios = true;
  }

  let activaVal: boolean | null = null;
  if (activa !== undefined) {
    if (typeof activa !== 'boolean') {
      res.status(400).json({ mensaje: 'El campo "activa" debe ser true o false.' });
      return;
    }
    activaVal = activa;
    hayCambios = true;
  }

  try {
    let instalacionVal: number | null = null;
    if (id_instalacion !== undefined) {
      const instalacion = await validarIdInstalacion(id_instalacion, res);
      if (!instalacion.ok) return;
      instalacionVal = instalacion.valor;
      hayCambios = true;
    }

    if (!hayCambios) {
      res.status(400).json({ mensaje: 'No se envió ningún campo para actualizar.' });
      return;
    }

    const { rows } = await pool.query(
      `UPDATE PreguntaInstalacion
       SET id_instalacion = COALESCE($1, id_instalacion),
           dimension = COALESCE($2, dimension),
           texto = COALESCE($3, texto),
           activa = COALESCE($4, activa)
       WHERE id_pregunta_instalacion = $5
       RETURNING id_pregunta_instalacion, id_instalacion, dimension, texto, activa`,
      [instalacionVal, dimensionVal, textoVal, activaVal, idPregunta]
    );
    if (rows.length === 0) {
      res.status(404).json({ mensaje: 'La pregunta no existe.' });
      return;
    }
    res.json({ mensaje: 'Pregunta actualizada.', pregunta: mapearPregunta(rows[0]) });
  } catch (error) {
    console.error('Error al actualizar pregunta de instalación:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor al actualizar la pregunta.' });
  }
};
