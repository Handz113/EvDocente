import { Request, Response } from 'express';
import pool from '../config/db';

export const crearEvaluacion = async (req: Request, res: Response): Promise<void> => {
  const idAlumno = (req as any).user?.id || (req as any).user?.matricula;
  const { crn, calificaciones } = req.body;

  if (!crn || !calificaciones || !Array.isArray(calificaciones) || calificaciones.length !== 15) {
    res.status(400).json({
      mensaje: 'Datos inválidos. Se requiere el CRN de la clase y un arreglo exactamente con 15 calificaciones.'
    });
    return;
  }

  // Validación estricta de escala según restricción CHECK (valor IN (0, 2.5, 5, 7.5, 10))
  const VALORES_PERMITIDOS = [0, 2.5, 5, 7.5, 10];
  const calificacionesValidas = calificaciones.every(
    (v: any) => typeof v === 'number' && !Number.isNaN(v) && VALORES_PERMITIDOS.includes(v)
  );

  if (!calificacionesValidas) {
    res.status(400).json({
      mensaje: 'Calificaciones inválidas. Solo se permiten los valores 0, 2.5, 5, 7.5 y 10 en la escala de evaluación.'
    });
    return;
  }

  if (!idAlumno) {
    res.status(401).json({ mensaje: 'No se pudo identificar al alumno en la petición.' });
    return;
  }

  const client = await pool.connect();

  try {
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


export type CategoriaDesempeno = 'Excelente' | 'Bueno' | 'Suficiente' | 'No Suficiente' | 'Sin Evaluaciones';

export interface ResultadoClasificacion {
  promedio: number | null;
  categoria: CategoriaDesempeno;
  aptoParaAsignacion: boolean;
  estatusAsignacion: boolean;
}

export interface RespuestaPromedioDocente {
  docenteId: number;
  totalEvaluaciones: number;
  promedio: number | null;
  categoria: CategoriaDesempeno;
  aptoParaAsignacion: boolean;
  estatusAsignacion: boolean;
  docente?: {
    nombre: string;
    apellido: string;
    departamento: string;
  };
  detalles?: {
    periodoFiltro: string;
  };
  mensaje?: string;
}

/**
 * Lógica matemática pura para calcular el promedio aritmético y determinar la 
 * clasificación de desempeño docente según los rangos del negocio:
 * 
 * - "Excelente":     9.0 a 10.0
 * - "Bueno":         8.0 a 8.9
 * - "Suficiente":    7.0 a 7.9
 * - "No Suficiente": 0.0 a 6.9
 * 
 * Determina el estatus para la asignación posterior de materias (aptoParaAsignacion / estatusAsignacion):
 * - true  (Apto)      -> "Excelente", "Bueno" o "Suficiente" (>= 7.0)
 * - false (Bloqueado) -> "No Suficiente" (<= 6.9)
 *
 * @param calificaciones Arreglo de números en escala de 0 a 10
 */
export const calcularClasificacionDocente = (calificaciones: number[]): ResultadoClasificacion => {
  if (!calificaciones || calificaciones.length === 0) {
    return {
      promedio: null,
      categoria: 'Sin Evaluaciones',
      aptoParaAsignacion: false,
      estatusAsignacion: false,
    };
  }

  const suma = calificaciones.reduce((acc, cal) => acc + Number(cal), 0);
  const promedioRaw = suma / calificaciones.length;
  // Redondeo aritmético a 1 decimal exacto acotado entre 0 y 10
  const promedio = Math.min(10.0, Math.max(0.0, Math.round(promedioRaw * 10) / 10));

  let categoria: CategoriaDesempeno;
  let aptoParaAsignacion: boolean;

  if (promedio >= 9.0) {
    categoria = 'Excelente';
    aptoParaAsignacion = true;
  } else if (promedio >= 8.0) {
    categoria = 'Bueno';
    aptoParaAsignacion = true;
  } else if (promedio >= 7.0) {
    categoria = 'Suficiente';
    aptoParaAsignacion = true;
  } else {
    categoria = 'No Suficiente';
    aptoParaAsignacion = false;
  }

  return {
    promedio,
    categoria,
    aptoParaAsignacion,
    estatusAsignacion: aptoParaAsignacion,
  };
};

/**
 * Controlador HTTP para calcular y obtener el promedio de evaluaciones y la clasificación
 * de desempeño docente en tiempo real.
 * 
 * Parámetros:
 * - req.params.docenteId o req.params.id: ID numérico del docente en la tabla Docente
 * - req.query.periodo o req.query.id_ciclo: (Opcional) Filtrar por ciclo escolar
 */
export const obtenerPromedioDocente = async (req: Request, res: Response): Promise<void> => {
  try {
    const paramId = req.params.docenteId || req.params.id;
    const docenteId = parseInt(paramId, 10);

    if (!paramId || isNaN(docenteId)) {
      res.status(400).json({
        mensaje: 'Identificador de docente inválido. Se requiere un ID numérico.'
      });
      return;
    }

    // 1. Verificar existencia del docente en la tabla Docente (soporta id_docente o id_usuario)
    const docenteQuery = `
      SELECT id_docente, id_usuario, nombre, apellido, departamento
      FROM Docente
      WHERE id_docente = $1 OR id_usuario = $1
      ORDER BY (CASE WHEN id_docente = $1 THEN 0 ELSE 1 END)
      LIMIT 1
    `;
    const docenteResult = await pool.query(docenteQuery, [docenteId]);

    if (docenteResult.rows.length === 0) {
      res.status(404).json({
        mensaje: `No se encontró el docente con ID ${docenteId}.`
      });
      return;
    }

    const infoDocente = docenteResult.rows[0];
    const idDocenteReal = infoDocente.id_docente;

    // 2. Construir la consulta de evaluaciones con soporte opcional para CicloEscolar (periodo)
    const { periodo, id_ciclo, ciclo } = req.query;
    const filtroPeriodo = (id_ciclo || periodo || ciclo) as string | undefined;

    let evaluacionQuery = `
      SELECT 
        e.id_evaluacion,
        COALESCE(e.promedio, (
          SELECT AVG(r.valor) 
          FROM Respuesta r 
          WHERE r.id_evaluacion = e.id_evaluacion
        )) AS calificacion,
        c.id_crn,
        c.crn,
        c.id_ciclo,
        ce.nombre AS ciclo_nombre
      FROM Evaluacion e
      INNER JOIN CRN c ON e.id_crn = c.id_crn
      LEFT JOIN CicloEscolar ce ON c.id_ciclo = ce.id_ciclo
      WHERE c.id_docente = $1
    `;

    const queryParams: any[] = [idDocenteReal];

    if (filtroPeriodo) {
      queryParams.push(filtroPeriodo);
      if (!isNaN(Number(filtroPeriodo))) {
        evaluacionQuery += ` AND (c.id_ciclo = $2 OR ce.nombre = $2::text)`;
      } else {
        evaluacionQuery += ` AND (LOWER(ce.nombre) = LOWER($2::text) OR LOWER(ce.nombre) LIKE LOWER('%' || $2::text || '%'))`;
      }
    }

    const evalResult = await pool.query(evaluacionQuery, queryParams);

    // 3. Caso: El docente no tiene evaluaciones registradas
    if (evalResult.rows.length === 0) {
      res.status(200).json({
        docenteId: idDocenteReal,
        docente: {
          nombre: infoDocente.nombre,
          apellido: infoDocente.apellido,
          departamento: infoDocente.departamento,
        },
        totalEvaluaciones: 0,
        promedio: null,
        categoria: 'Sin Evaluaciones',
        aptoParaAsignacion: false,
        estatusAsignacion: false,
        detalles: {
          periodoFiltro: filtroPeriodo ? String(filtroPeriodo) : 'Todos los periodos',
        },
        mensaje: filtroPeriodo
          ? `El docente no cuenta con evaluaciones registradas para el periodo '${filtroPeriodo}'.`
          : 'El docente aún no cuenta con evaluaciones registradas en el sistema.',
      });
      return;
    }

    // 4. Extraer las calificaciones obtenidas en los cuestionarios y clasificar
    const calificaciones: number[] = evalResult.rows
      .map((row: any) => parseFloat(row.calificacion))
      .filter((cal: number) => !isNaN(cal));

    const clasificacion = calcularClasificacionDocente(calificaciones);

    // En sql/carga_inicial.sql no existen columnas consolidadas en Docente (ej. promedio_consolidado),
    // por lo que retornamos el cálculo consolidado en tiempo real según las reglas de negocio.
    res.status(200).json({
      docenteId: idDocenteReal,
      docente: {
        nombre: infoDocente.nombre,
        apellido: infoDocente.apellido,
        departamento: infoDocente.departamento,
      },
      totalEvaluaciones: calificaciones.length,
      promedio: clasificacion.promedio,
      categoria: clasificacion.categoria,
      aptoParaAsignacion: clasificacion.aptoParaAsignacion,
      estatusAsignacion: clasificacion.estatusAsignacion,
      detalles: {
        periodoFiltro: filtroPeriodo ? String(filtroPeriodo) : 'Todos los periodos',
      },
    });

  } catch (error) {
    console.error('Error al calcular el promedio y desempeño del docente:', error);
    res.status(500).json({
      mensaje: 'Error interno del servidor al obtener el promedio y clasificación del docente.'
    });
  }
};

// Exportar alias para mayor coherencia con diversas convenciones REST
export const calcularDesempenoDocente = obtenerPromedioDocente;