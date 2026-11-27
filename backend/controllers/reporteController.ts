import { Response } from 'express';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import pool from '../config/db';
import { AuthRequest } from '../middlewares/auth';
import { calcularClasificacionDocente } from './evaluacionController';
import { obtenerResultadosDocente } from './docenteController';
import { registrarAuditoria } from '../services/auditoriaService';

interface AreaOportunidadItem {
  idPregunta: number;
  texto: string;
  promedio: number;
  materia: string;
  crn: string;
}

/**
 * Construye el archivo PDF del reporte docente en memoria y devuelve su Buffer.
 */
function generarBufferPDF(datos: {
  nombreDocente: string;
  departamento: string;
  correo: string;
  nombreCiclo: string;
  promedioGeneral: number | null;
  totalEvaluaciones: number;
  categoria: string;
  aptoParaAsignacion: boolean;
  grupos: Awaited<ReturnType<typeof obtenerResultadosDocente>>['grupos'];
  areasOportunidad: AreaOportunidadItem[];
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      info: {
        Title: 'Reporte de Evaluación Docente Institucional',
        Author: 'Sistema de Evaluación Docente (EvDocente)',
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (err) => reject(err));

    const anchoUtil = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    // 1. Encabezado institucional (Verde Esmeralda #0f766e)
    doc.rect(50, 45, anchoUtil, 62).fill('#0f766e');
    doc
      .fillColor('#ffffff')
      .font('Helvetica-Bold')
      .fontSize(16)
      .text('Reporte de Evaluación Docente Institucional', 66, 60, {
        width: anchoUtil - 32,
      });
    doc
      .font('Helvetica')
      .fontSize(9.5)
      .fillColor('#e3f4f2')
      .text(
        `Sistema Institucional EvDocente · Generado el ${new Date().toLocaleDateString('es-MX', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}`,
        66,
        84,
        { width: anchoUtil - 32 }
      );

    doc.y = 124;

    // 2. Ficha de identificación y resumen ejecutivo
    doc
      .fillColor('#1c2333')
      .font('Helvetica-Bold')
      .fontSize(12)
      .text('1. Resumen General de Desempeño', 50, doc.y);
    doc.moveDown(0.4);

    const cajaY = doc.y;
    doc.rect(50, cajaY, anchoUtil, 86).fillAndStroke('#f4f6fb', '#e2e6ef');

    const promedioTexto =
      datos.promedioGeneral !== null ? `${datos.promedioGeneral.toFixed(1)} / 10.0` : 'Sin evaluaciones';
    const estatusTexto = datos.aptoParaAsignacion ? 'Apto para Asignar' : 'No Asignable';

    doc.fillColor('#1c2333').font('Helvetica-Bold').fontSize(10).text('Docente:', 64, cajaY + 12);
    doc.font('Helvetica').fillColor('#1c2333').text(datos.nombreDocente, 145, cajaY + 12);

    doc.font('Helvetica-Bold').fillColor('#1c2333').text('Área / Depto.:', 64, cajaY + 30);
    doc.font('Helvetica').fillColor('#5d6678').text(datos.departamento, 145, cajaY + 30);

    doc.font('Helvetica-Bold').fillColor('#1c2333').text('Ciclo Activo:', 64, cajaY + 48);
    doc.font('Helvetica').fillColor('#5d6678').text(datos.nombreCiclo, 145, cajaY + 48);

    doc.font('Helvetica-Bold').fillColor('#1c2333').text('Evaluaciones:', 64, cajaY + 66);
    doc.font('Helvetica').fillColor('#5d6678').text(String(datos.totalEvaluaciones), 145, cajaY + 66);

    // Columna derecha de métricas clave
    const colDerechaX = 330;
    doc.font('Helvetica-Bold').fillColor('#1c2333').text('Promedio General:', colDerechaX, cajaY + 12);
    doc.font('Helvetica-Bold').fillColor('#0f766e').fontSize(11).text(promedioTexto, colDerechaX + 110, cajaY + 11);

    doc.font('Helvetica-Bold').fontSize(10).fillColor('#1c2333').text('Clasificación:', colDerechaX, cajaY + 34);
    doc.font('Helvetica-Bold').fillColor('#1c2333').text(datos.categoria, colDerechaX + 110, cajaY + 34);

    doc.font('Helvetica-Bold').fillColor('#1c2333').text('Estatus:', colDerechaX, cajaY + 56);
    doc
      .font('Helvetica-Bold')
      .fillColor(datos.aptoParaAsignacion ? '#15803d' : '#dc2626')
      .text(estatusTexto, colDerechaX + 110, cajaY + 56);

    doc.y = cajaY + 102;

    // 3. Listado de Áreas de Oportunidad (preguntas con puntaje menor a 7.0)
    doc
      .fillColor('#1c2333')
      .font('Helvetica-Bold')
      .fontSize(12)
      .text('2. Áreas de Oportunidad (Puntaje menor a 7.0)', 50, doc.y);
    doc.moveDown(0.3);
    doc
      .font('Helvetica')
      .fontSize(9.5)
      .fillColor('#5d6678')
      .text(
        'Reactivos del cuestionario institucional donde el promedio obtenido se ubicó por debajo del umbral mínimo de 7.0:',
        50,
        doc.y,
        { width: anchoUtil }
      );
    doc.moveDown(0.5);

    if (datos.totalEvaluaciones === 0) {
      doc
        .font('Helvetica-Oblique')
        .fontSize(10)
        .fillColor('#5d6678')
        .text('Aún no se registran evaluaciones para el docente en el ciclo activo.', 50, doc.y);
      doc.moveDown(1);
    } else if (datos.areasOportunidad.length === 0) {
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor('#15803d')
        .text(
          'Sin áreas de oportunidad críticas: todos los reactivos evaluados obtuvieron un puntaje igual o mayor a 7.0.',
          50,
          doc.y,
          { width: anchoUtil }
        );
      doc.moveDown(1);
    } else {
      for (const item of datos.areasOportunidad) {
        if (doc.y > doc.page.height - 90) {
          doc.addPage();
        }
        const filaY = doc.y;
        doc.rect(50, filaY, anchoUtil, 28).fillAndStroke('#fee2e2', '#fecaca');
        doc
          .fillColor('#1c2333')
          .font('Helvetica-Bold')
          .fontSize(9.5)
          .text(
            `Reactivo ${item.idPregunta}: ${item.texto}`,
            60,
            filaY + 6,
            { width: anchoUtil - 110, lineBreak: false, ellipsis: true }
          );
        doc
          .fillColor('#5d6678')
          .font('Helvetica')
          .fontSize(8.5)
          .text(`Asignatura: ${item.materia} (CRN ${item.crn})`, 60, filaY + 17, {
            width: anchoUtil - 110,
            lineBreak: false,
          });
        doc
          .fillColor('#dc2626')
          .font('Helvetica-Bold')
          .fontSize(10.5)
          .text(`${item.promedio.toFixed(1)} / 10`, 50 + anchoUtil - 85, filaY + 9, {
            width: 75,
            align: 'right',
          });
        doc.y = filaY + 34;
      }
      doc.moveDown(0.5);
    }

    // 4. Desglose por Asignatura (CRN) en el ciclo activo
    if (doc.y > doc.page.height - 120) {
      doc.addPage();
    }
    doc
      .fillColor('#1c2333')
      .font('Helvetica-Bold')
      .fontSize(12)
      .text('3. Resultados por Asignatura en el Ciclo Activo', 50, doc.y);
    doc.moveDown(0.5);

    if (datos.grupos.length === 0) {
      doc
        .font('Helvetica-Oblique')
        .fontSize(10)
        .fillColor('#5d6678')
        .text('No hay asignaturas asignadas en el ciclo activo.', 50, doc.y);
    } else {
      for (const grupo of datos.grupos) {
        if (doc.y > doc.page.height - 110) {
          doc.addPage();
        }
        const gY = doc.y;
        doc.rect(50, gY, anchoUtil, 26).fillAndStroke('#e3f4f2', '#cbd5e1');
        doc
          .fillColor('#0f766e')
          .font('Helvetica-Bold')
          .fontSize(10)
          .text(`${grupo.nombre} (CRN ${grupo.crn} · Clave ${grupo.clave})`, 60, gY + 8, {
            width: anchoUtil - 190,
            lineBreak: false,
            ellipsis: true,
          });

        const resumenGrupo =
          grupo.promedio !== null
            ? `Promedio: ${grupo.promedio.toFixed(1)} · ${grupo.categoria} (${grupo.totalEvaluaciones} eval.)`
            : 'Sin evaluaciones';
        doc
          .fillColor('#1c2333')
          .font('Helvetica-Bold')
          .fontSize(9)
          .text(resumenGrupo, 50 + anchoUtil - 185, gY + 8, {
            width: 175,
            align: 'right',
          });
        doc.y = gY + 32;

        if (grupo.porPregunta.length > 0) {
          for (const preg of grupo.porPregunta) {
            if (doc.y > doc.page.height - 65) {
              doc.addPage();
            }
            const pY = doc.y;
            const colorPuntaje =
              preg.promedio >= 8.0 ? '#0f766e' : preg.promedio >= 7.0 ? '#d97706' : '#dc2626';
            doc
              .fillColor('#1c2333')
              .font('Helvetica')
              .fontSize(9)
              .text(`${preg.id}. ${preg.texto}`, 60, pY, { width: anchoUtil - 90 });
            doc
              .fillColor(colorPuntaje)
              .font('Helvetica-Bold')
              .fontSize(9)
              .text(preg.promedio.toFixed(1), 50 + anchoUtil - 60, pY, {
                width: 50,
                align: 'right',
              });
            doc.y = Math.max(doc.y, pY + 14);
          }
          doc.moveDown(0.6);
        }
      }
    }

    doc.end();
  });
}

/**
 * GET /api/reportes/docente/me/pdf
 * Genera y descarga en PDF el reporte institucional del docente autenticado en el ciclo activo.
 */
export const descargarReporteDocentePDF = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const idUsuarioToken = req.user?.id_usuario;
    const idDocenteToken = req.user?.id;
    const identificador = Number(idDocenteToken || idUsuarioToken);

    if (!identificador || Number.isNaN(identificador)) {
      res.status(401).json({ mensaje: 'No se pudo identificar al docente autenticado.' });
      return;
    }

    // 1. Obtener datos del docente
    const docenteRes = await pool.query(
      `SELECT d.id_docente, d.nombre, d.apellido, d.departamento, u.correo_institucional
       FROM Docente d
       INNER JOIN Usuario u ON u.id_usuario = d.id_usuario
       WHERE d.id_docente = $1 OR d.id_usuario = $1
       ORDER BY (CASE WHEN d.id_docente = $1 THEN 0 ELSE 1 END)
       LIMIT 1`,
      [identificador]
    );

    if (docenteRes.rows.length === 0) {
      res.status(404).json({ mensaje: 'No se encontró el perfil del docente.' });
      return;
    }

    const infoDocente = docenteRes.rows[0];
    const idDocenteReal: number = infoDocente.id_docente;

    // 2. Obtener el ciclo escolar activo (o el solicitado si se envía ?id_ciclo, por defecto el activo)
    const idCicloQuery =
      req.query.id_ciclo && !Number.isNaN(Number(req.query.id_ciclo)) && Number(req.query.id_ciclo) > 0
        ? Number(req.query.id_ciclo)
        : null;

    const cicloRes = idCicloQuery
      ? await pool.query('SELECT id_ciclo, nombre FROM CicloEscolar WHERE id_ciclo = $1 LIMIT 1', [idCicloQuery])
      : await pool.query(
          'SELECT id_ciclo, nombre FROM CicloEscolar WHERE activo = TRUE ORDER BY id_ciclo DESC LIMIT 1'
        );

    const cicloActivo = cicloRes.rows[0] ?? null;
    const idCicloFiltro: number | null = cicloActivo?.id_ciclo ?? null;
    const nombreCiclo: string = cicloActivo?.nombre ?? 'Ciclo Activo';

    // 3. Consultar evaluaciones globales del docente en el ciclo activo
    const evalResult = await pool.query(
      `SELECT COALESCE(e.promedio, (
                SELECT AVG(r.valor)
                FROM Respuesta r
                WHERE r.id_evaluacion = e.id_evaluacion
              )) AS calificacion
       FROM Evaluacion e
       INNER JOIN CRN c ON e.id_crn = c.id_crn
       WHERE c.id_docente = $1
         AND ($2::int IS NOT NULL AND c.id_ciclo = $2 OR $2::int IS NULL AND c.id_ciclo IN (SELECT id_ciclo FROM CicloEscolar WHERE activo = TRUE))`,
      [idDocenteReal, idCicloFiltro]
    );

    const calificaciones: number[] = evalResult.rows
      .map((row: any) => parseFloat(row.calificacion))
      .filter((cal: number) => !Number.isNaN(cal));

    const clasificacion = calcularClasificacionDocente(calificaciones);

    // 4. Obtener desglose por grupo y preguntas en el ciclo activo
    const { grupos } = await obtenerResultadosDocente(idDocenteReal, idCicloFiltro);

    // Extraer áreas de oportunidad (preguntas con puntaje menor a 7.0)
    const areasOportunidad: AreaOportunidadItem[] = [];
    for (const g of grupos) {
      for (const p of g.porPregunta) {
        if (p.promedio < 7.0) {
          areasOportunidad.push({
            idPregunta: p.id,
            texto: p.texto,
            promedio: p.promedio,
            materia: g.nombre,
            crn: g.crn,
          });
        }
      }
    }
    areasOportunidad.sort((a, b) => a.promedio - b.promedio);

    // 5. Generar Buffer PDF con PDFKit
    const pdfBuffer = await generarBufferPDF({
      nombreDocente: `${infoDocente.nombre} ${infoDocente.apellido}`,
      departamento: infoDocente.departamento,
      correo: infoDocente.correo_institucional,
      nombreCiclo,
      promedioGeneral: clasificacion.promedio,
      totalEvaluaciones: calificaciones.length,
      categoria: clasificacion.categoria,
      aptoParaAsignacion: clasificacion.aptoParaAsignacion,
      grupos,
      areasOportunidad,
    });

    await registrarAuditoria({
      idUsuario: req.user?.id_usuario ?? null,
      rol: req.user?.rol ?? 'Docente',
      accion: 'EXPORTAR_REPORTE',
      entidad: 'Reporte',
      idEntidad: idCicloFiltro ?? null,
      detalle: `Exportación de reporte docente en formato PDF (ciclo: ${nombreCiclo}).`,
      req,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=reporte-evaluacion.pdf');
    res.setHeader('Content-Length', String(pdfBuffer.length));
    res.status(200).send(pdfBuffer);
  } catch (error) {
    console.error('Error al generar el reporte PDF del docente:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor al generar el reporte PDF.' });
  }
};

// ==========================================================
// REPORTE DIRECTIVO DE COORDINACIÓN ( Analítico y Tabular )
// ==========================================================

type TipoFiltroCoordinacion = 'general' | 'area' | 'materia' | 'carrera';

interface FilaDesempenoCoordinacion {
  docente: string;
  area: string;
  materiaDetalle: string;
  evaluaciones: number;
  promedio: number | null;
  categoria: string;
  apto: boolean;
}

interface ResumenDimensionTaller {
  dimension: 'Equipamiento' | 'Disponibilidad' | 'Limpieza';
  promedio: number | null;
  respuestas: number;
}

interface FilaInstalacionReporte {
  nombre: string;
  tipo: string;
  evaluaciones: number;
  promedio: number | null;
  porDimension: Record<'Equipamiento' | 'Disponibilidad' | 'Limpieza', number | null>;
}

/**
 * GET /api/reportes/coordinacion/pdf
 * Query params: id_ciclo, filtro_tipo ('general' | 'area' | 'materia' | 'carrera'), filtro_valor
 * Protegido para Coordinador y Administrador.
 */
export const descargarReporteCoordinacionPDF = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // 1. Resolver ciclo escolar (solicitado o activo por defecto)
    const idCicloRaw = req.query.id_ciclo;
    const idCicloParam =
      idCicloRaw && !Number.isNaN(Number(idCicloRaw)) && Number(idCicloRaw) > 0
        ? Number(idCicloRaw)
        : null;

    const cicloRes = idCicloParam
      ? await pool.query('SELECT id_ciclo, nombre, activo FROM CicloEscolar WHERE id_ciclo = $1 LIMIT 1', [
          idCicloParam,
        ])
      : await pool.query(
          'SELECT id_ciclo, nombre, activo FROM CicloEscolar WHERE activo = TRUE ORDER BY id_ciclo DESC LIMIT 1'
        );

    const cicloRow =
      cicloRes.rows[0] ??
      (await pool.query('SELECT id_ciclo, nombre, activo FROM CicloEscolar ORDER BY id_ciclo DESC LIMIT 1'))
        .rows[0] ??
      null;

    if (!cicloRow) {
      res.status(404).json({ mensaje: 'No existen ciclos escolares registrados para generar el reporte.' });
      return;
    }

    const idCiclo: number = cicloRow.id_ciclo;
    const nombreCiclo: string = `${cicloRow.nombre}${cicloRow.activo ? ' (Activo)' : ' (Histórico)'}`;

    // 2. Normalizar filtro recibido por query parameters
    const tiposPermitidos: TipoFiltroCoordinacion[] = ['general', 'area', 'materia', 'carrera'];
    const rawTipo = String(req.query.filtro_tipo ?? 'general').toLowerCase().trim() as TipoFiltroCoordinacion;
    const rawValor = String(req.query.filtro_valor ?? '').trim();

    const filtroTipo: TipoFiltroCoordinacion =
      tiposPermitidos.includes(rawTipo) &&
      rawTipo !== 'general' &&
      rawValor !== '' &&
      rawValor.toLowerCase() !== 'todas' &&
      rawValor.toLowerCase() !== 'todos'
        ? rawTipo
        : 'general';
    const filtroValor = filtroTipo === 'general' ? '' : rawValor;

    const etiquetaFiltro =
      filtroTipo === 'area'
        ? `Área Académica: ${filtroValor}`
        : filtroTipo === 'materia'
        ? `Materia: ${filtroValor}`
        : filtroTipo === 'carrera'
        ? `Carrera: ${filtroValor}`
        : 'General Institucional (Todas las áreas)';

    // 3. Sección 1: KPIs Globales del ciclo (y del filtro si aplica)
    const evalGlobalRes = await pool.query(
      `SELECT COALESCE(e.promedio, (
                SELECT AVG(r.valor) FROM Respuesta r WHERE r.id_evaluacion = e.id_evaluacion
              )) AS calificacion
       FROM Evaluacion e
       INNER JOIN CRN c ON c.id_crn = e.id_crn
       WHERE c.id_ciclo = $1`,
      [idCiclo]
    );

    const calificacionesGlobales: number[] = evalGlobalRes.rows
      .map((r: any) => parseFloat(r.calificacion))
      .filter((v: number) => !Number.isNaN(v));
    const kpiGlobal = calcularClasificacionDocente(calificacionesGlobales);

    const partGlobalRes = await pool.query(
      `SELECT COUNT(*)::int AS total_inscripciones,
              COUNT(e.id_evaluacion)::int AS respondieron
       FROM Inscripcion i
       INNER JOIN CRN c ON c.id_crn = i.id_crn
       LEFT JOIN Evaluacion e ON e.id_alumno = i.id_alumno AND e.id_crn = i.id_crn
       WHERE c.id_ciclo = $1`,
      [idCiclo]
    );
    const totalInscripciones: number = partGlobalRes.rows[0]?.total_inscripciones ?? 0;
    const totalRespondieron: number = partGlobalRes.rows[0]?.respondieron ?? 0;
    const indiceParticipacion =
      totalInscripciones > 0 ? Math.round((totalRespondieron / totalInscripciones) * 1000) / 10 : 0;

    // 4. Sección 2: Tabla de Desempeño según el filtro aplicado
    const filasDesempeno: FilaDesempenoCoordinacion[] = [];

    if (filtroTipo === 'materia') {
      // Desglose por CRN / Docente de la materia seleccionada
      const matRes = await pool.query(
        `SELECT d.id_docente, d.nombre, d.apellido, d.departamento,
                c.crn, m.clave, m.nombre AS materia_nombre,
                COALESCE(
                  json_agg(
                    COALESCE(e.promedio, (
                      SELECT AVG(r.valor) FROM Respuesta r WHERE r.id_evaluacion = e.id_evaluacion
                    ))
                  ) FILTER (WHERE e.id_evaluacion IS NOT NULL),
                  '[]'
                ) AS calificaciones
         FROM CRN c
         INNER JOIN Materia m ON m.id_materia = c.id_materia
         INNER JOIN Docente d ON d.id_docente = c.id_docente
         LEFT JOIN Evaluacion e ON e.id_crn = c.id_crn
         WHERE c.id_ciclo = $1
           AND (LOWER(m.nombre) = LOWER($2) OR LOWER(m.clave) = LOWER($2))
         GROUP BY d.id_docente, c.id_crn, m.id_materia
         ORDER BY d.apellido, d.nombre, c.crn`,
        [idCiclo, filtroValor]
      );

      for (const r of matRes.rows) {
        const cals: number[] = (r.calificaciones as any[])
          .map((v) => Number(v))
          .filter((v) => !Number.isNaN(v));
        const clasif = calcularClasificacionDocente(cals);
        filasDesempeno.push({
          docente: `${r.nombre} ${r.apellido}`,
          area: r.departamento,
          materiaDetalle: `${r.materia_nombre} (CRN ${r.crn} · ${r.clave})`,
          evaluaciones: cals.length,
          promedio: clasif.promedio,
          categoria: clasif.categoria,
          apto: clasif.aptoParaAsignacion,
        });
      }
    } else {
      // General, por Área Académica o por Carrera
      const paramsDocentes: any[] = [idCiclo];
      let condicionFiltro = '';

      if (filtroTipo === 'area') {
        paramsDocentes.push(filtroValor);
        condicionFiltro = 'WHERE LOWER(d.departamento) = LOWER($2)';
      } else if (filtroTipo === 'carrera') {
        paramsDocentes.push(filtroValor);
        condicionFiltro = `WHERE EXISTS (
          SELECT 1
          FROM CRN c2
          INNER JOIN Inscripcion i2 ON i2.id_crn = c2.id_crn
          INNER JOIN Alumno a2 ON a2.id_alumno = i2.id_alumno
          WHERE c2.id_docente = d.id_docente
            AND c2.id_ciclo = $1
            AND LOWER(a2.carrera) = LOWER($2)
        )`;
      }

      const docRes = await pool.query(
        `SELECT d.id_docente, d.nombre, d.apellido, d.departamento,
                COALESCE(
                  json_agg(DISTINCT m.nombre || ' (' || c.crn::text || ')')
                    FILTER (WHERE c.id_crn IS NOT NULL),
                  '[]'
                ) AS materias,
                COALESCE(
                  json_agg(
                    COALESCE(e.promedio, (
                      SELECT AVG(r.valor) FROM Respuesta r WHERE r.id_evaluacion = e.id_evaluacion
                    ))
                  ) FILTER (WHERE e.id_evaluacion IS NOT NULL),
                  '[]'
                ) AS calificaciones
         FROM Docente d
         LEFT JOIN CRN c ON c.id_docente = d.id_docente AND c.id_ciclo = $1
         LEFT JOIN Materia m ON m.id_materia = c.id_materia
         LEFT JOIN Evaluacion e ON e.id_crn = c.id_crn
         ${condicionFiltro}
         GROUP BY d.id_docente
         ORDER BY d.apellido, d.nombre`,
        paramsDocentes
      );

      for (const r of docRes.rows) {
        const cals: number[] = (r.calificaciones as any[])
          .map((v) => Number(v))
          .filter((v) => !Number.isNaN(v));
        const clasif = calcularClasificacionDocente(cals);
        const listaMats = Array.isArray(r.materias) && r.materias.length > 0
          ? r.materias.join(', ')
          : 'Sin asignaciones en el ciclo';
        filasDesempeno.push({
          docente: `${r.nombre} ${r.apellido}`,
          area: r.departamento,
          materiaDetalle: listaMats,
          evaluaciones: cals.length,
          promedio: clasif.promedio,
          categoria: clasif.categoria,
          apto: clasif.aptoParaAsignacion,
        });
      }
    }

    // Ordenar de mayor a menor promedio (sin evaluaciones al final)
    filasDesempeno.sort((a, b) => {
      if (a.promedio === null) return 1;
      if (b.promedio === null) return -1;
      return b.promedio - a.promedio;
    });

    // 5. Sección 3: Resumen de Talleres y Laboratorios (Promedio global por dimensión e instalación)
    const DIMENSIONES_OFICIALES: ('Equipamiento' | 'Disponibilidad' | 'Limpieza')[] = [
      'Equipamiento',
      'Disponibilidad',
      'Limpieza',
    ];

    const dimGlobalRes = await pool.query(
      `SELECT p.dimension,
              AVG(r.valor) AS promedio,
              COUNT(*)::int AS respuestas
       FROM RespuestaInstalacion r
       INNER JOIN EvaluacionInstalacion e ON e.id_evaluacion_instalacion = r.id_evaluacion_instalacion
       INNER JOIN PreguntaInstalacion p ON p.id_pregunta_instalacion = r.id_pregunta_instalacion
       WHERE e.id_ciclo = $1
       GROUP BY p.dimension`,
      [idCiclo]
    );

    const resumenDimensiones: ResumenDimensionTaller[] = DIMENSIONES_OFICIALES.map((dim) => {
      const fila = dimGlobalRes.rows.find((d: any) => d.dimension === dim);
      return {
        dimension: dim,
        promedio: fila && fila.promedio !== null ? Math.round(Number(fila.promedio) * 100) / 100 : null,
        respuestas: fila ? Number(fila.respuestas) : 0,
      };
    });

    const instGeneralesRes = await pool.query(
      `SELECT i.id_instalacion, i.nombre, i.tipo,
              COUNT(e.id_evaluacion_instalacion)::int AS total,
              AVG(e.promedio) AS promedio
       FROM Instalacion i
       LEFT JOIN EvaluacionInstalacion e ON e.id_instalacion = i.id_instalacion AND e.id_ciclo = $1
       GROUP BY i.id_instalacion
       HAVING i.activa = TRUE OR COUNT(e.id_evaluacion_instalacion) > 0
       ORDER BY i.nombre`,
      [idCiclo]
    );

    const instDimRes = await pool.query(
      `SELECT e.id_instalacion, p.dimension, AVG(r.valor) AS promedio
       FROM RespuestaInstalacion r
       INNER JOIN EvaluacionInstalacion e ON e.id_evaluacion_instalacion = r.id_evaluacion_instalacion
       INNER JOIN PreguntaInstalacion p ON p.id_pregunta_instalacion = r.id_pregunta_instalacion
       WHERE e.id_ciclo = $1
       GROUP BY e.id_instalacion, p.dimension`,
      [idCiclo]
    );

    const filasInstalaciones: FilaInstalacionReporte[] = instGeneralesRes.rows.map((g: any) => {
      const dims = instDimRes.rows.filter((d: any) => d.id_instalacion === g.id_instalacion);
      const mapaDim = {
        Equipamiento: null as number | null,
        Disponibilidad: null as number | null,
        Limpieza: null as number | null,
      };
      for (const dim of DIMENSIONES_OFICIALES) {
        const encontrado = dims.find((d: any) => d.dimension === dim);
        mapaDim[dim] =
          encontrado && encontrado.promedio !== null
            ? Math.round(Number(encontrado.promedio) * 100) / 100
            : null;
      }
      return {
        nombre: g.nombre,
        tipo: g.tipo,
        evaluaciones: Number(g.total),
        promedio: g.promedio !== null ? Math.round(Number(g.promedio) * 100) / 100 : null,
        porDimension: mapaDim,
      };
    });

    const totalEvalTalleres = filasInstalaciones.reduce((acc, f) => acc + f.evaluaciones, 0);
    const promedioGlobalTalleres =
      totalEvalTalleres > 0
        ? Math.round(
            (filasInstalaciones.reduce((acc, f) => acc + (f.promedio ?? 0) * f.evaluaciones, 0) /
              totalEvalTalleres) *
              100
          ) / 100
        : null;

    // 6. Registrar exportación en auditoría y enviar PDF como stream de descarga
    await registrarAuditoria({
      idUsuario: req.user?.id_usuario ?? null,
      rol: req.user?.rol ?? null,
      accion: 'EXPORTAR_REPORTE',
      entidad: 'Reporte',
      idEntidad: idCiclo,
      detalle: `Exportación de reporte directivo en formato PDF (ciclo: ${nombreCiclo}; filtro: ${etiquetaFiltro}).`,
      req,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=reporte-directivo-coordinacion.pdf'
    );

    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: 45, bottom: 45, left: 45, right: 45 },
      info: {
        Title: 'Reporte Directivo de Evaluación Institucional',
        Author: 'Coordinación Académica — EvDocente',
      },
    });

    doc.pipe(res);

    const leftX = 45;
    const anchoUtil = doc.page.width - leftX * 2;

    // --- ENCABEZADO Y SUBTÍTULO ---
    doc.rect(leftX, 40, anchoUtil, 68).fill('#0f766e');
    doc
      .fillColor('#ffffff')
      .font('Helvetica-Bold')
      .fontSize(15)
      .text('Reporte Directivo de Evaluación Institucional', leftX + 16, 53, {
        width: anchoUtil - 32,
      });
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor('#e3f4f2')
      .text(`Ciclo Escolar: ${nombreCiclo}   |   Filtro: ${etiquetaFiltro}`, leftX + 16, 74, {
        width: anchoUtil - 32,
      });
    doc
      .font('Helvetica')
      .fontSize(8.5)
      .fillColor('#cbd5e1')
      .text(
        `Fecha de emisión: ${new Date().toLocaleDateString('es-MX', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}`,
        leftX + 16,
        90,
        { width: anchoUtil - 32 }
      );

    doc.y = 122;

    // --- SECCIÓN 1: KPIs GLOBALES ---
    doc
      .fillColor('#1c2333')
      .font('Helvetica-Bold')
      .fontSize(11.5)
      .text('1. Indicadores Clave Globales (KPIs Institucionales)', leftX, doc.y);
    doc.moveDown(0.4);

    const kpiY = doc.y;
    const gapKpi = 10;
    const anchoKpi = (anchoUtil - gapKpi * 2) / 3;

    const kpisData = [
      {
        titulo: 'Promedio Institucional',
        valor: kpiGlobal.promedio !== null ? `${kpiGlobal.promedio.toFixed(1)} / 10` : 'S/E',
        detalle: `Clasificación: ${kpiGlobal.categoria}`,
      },
      {
        titulo: 'Total de Evaluaciones',
        valor: String(calificacionesGlobales.length),
        detalle: `${filasDesempeno.length} registro(s) en el filtro actual`,
      },
      {
        titulo: 'Índice de Participación',
        valor: `${indiceParticipacion.toFixed(1)}%`,
        detalle: `${totalRespondieron} de ${totalInscripciones} inscripciones`,
      },
    ];

    kpisData.forEach((kpi, idx) => {
      const boxX = leftX + idx * (anchoKpi + gapKpi);
      doc.rect(boxX, kpiY, anchoKpi, 58).fillAndStroke('#f4f6fb', '#e2e6ef');
      doc
        .fillColor('#5d6678')
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .text(kpi.titulo.toUpperCase(), boxX + 10, kpiY + 9, { width: anchoKpi - 20 });
      doc
        .fillColor('#0f766e')
        .font('Helvetica-Bold')
        .fontSize(14)
        .text(kpi.valor, boxX + 10, kpiY + 23, { width: anchoKpi - 20 });
      doc
        .fillColor('#5d6678')
        .font('Helvetica')
        .fontSize(8)
        .text(kpi.detalle, boxX + 10, kpiY + 42, { width: anchoKpi - 20 });
    });

    doc.y = kpiY + 72;

    // --- SECCIÓN 2: TABLA DE DESEMPEÑO ---
    doc
      .fillColor('#1c2333')
      .font('Helvetica-Bold')
      .fontSize(11.5)
      .text(`2. Tabla de Desempeño Docente (${etiquetaFiltro})`, leftX, doc.y);
    doc.moveDown(0.4);

    const colDocente = 130;
    const colArea = 95;
    const colMateria = 145;
    const colEval = 38;
    const colProm = 46;
    const colClasif = anchoUtil - (colDocente + colArea + colMateria + colEval + colProm);

    const dibujarEncabezadoTablaDesempeno = (yPos: number) => {
      doc.rect(leftX, yPos, anchoUtil, 22).fill('#0f766e');
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8.5);
      let curX = leftX + 6;
      doc.text('DOCENTE', curX, yPos + 7, { width: colDocente - 8 });
      curX += colDocente;
      doc.text('ÁREA', curX, yPos + 7, { width: colArea - 8 });
      curX += colArea;
      doc.text('MATERIA(S) / CRN', curX, yPos + 7, { width: colMateria - 8 });
      curX += colMateria;
      doc.text('EVAL.', curX, yPos + 7, { width: colEval - 4, align: 'center' });
      curX += colEval;
      doc.text('PROM.', curX, yPos + 7, { width: colProm - 4, align: 'center' });
      curX += colProm;
      doc.text('CLASIFICACIÓN', curX, yPos + 7, { width: colClasif - 8, align: 'right' });
      return yPos + 22;
    };

    if (filasDesempeno.length === 0) {
      doc
        .font('Helvetica-Oblique')
        .fontSize(9.5)
        .fillColor('#5d6678')
        .text('No se encontraron registros de docentes o materias para el filtro seleccionado.', leftX, doc.y);
      doc.moveDown(1);
    } else {
      let filaY = dibujarEncabezadoTablaDesempeno(doc.y);

      filasDesempeno.forEach((fila, idx) => {
        if (filaY > doc.page.height - 75) {
          doc.addPage();
          filaY = dibujarEncabezadoTablaDesempeno(45);
        }

        const bgFila = idx % 2 === 0 ? '#ffffff' : '#f4f6fb';
        doc.rect(leftX, filaY, anchoUtil, 22).fillAndStroke(bgFila, '#e2e6ef');

        let curX = leftX + 6;
        doc
          .fillColor('#1c2333')
          .font('Helvetica-Bold')
          .fontSize(8.5)
          .text(fila.docente, curX, filaY + 7, {
            width: colDocente - 8,
            lineBreak: false,
            ellipsis: true,
          });
        curX += colDocente;

        doc
          .fillColor('#5d6678')
          .font('Helvetica')
          .fontSize(8)
          .text(fila.area, curX, filaY + 7, {
            width: colArea - 8,
            lineBreak: false,
            ellipsis: true,
          });
        curX += colArea;

        doc
          .fillColor('#1c2333')
          .font('Helvetica')
          .fontSize(8)
          .text(fila.materiaDetalle, curX, filaY + 7, {
            width: colMateria - 8,
            lineBreak: false,
            ellipsis: true,
          });
        curX += colMateria;

        doc
          .fillColor('#5d6678')
          .font('Helvetica')
          .fontSize(8.5)
          .text(String(fila.evaluaciones), curX, filaY + 7, {
            width: colEval - 4,
            align: 'center',
          });
        curX += colEval;

        const promStr = fila.promedio !== null ? fila.promedio.toFixed(1) : 'S/E';
        doc
          .fillColor('#0f766e')
          .font('Helvetica-Bold')
          .fontSize(8.5)
          .text(promStr, curX, filaY + 7, {
            width: colProm - 4,
            align: 'center',
          });
        curX += colProm;

        const colorClasif =
          fila.promedio === null
            ? '#5d6678'
            : fila.apto
            ? '#15803d'
            : '#dc2626';
        doc
          .fillColor(colorClasif)
          .font('Helvetica-Bold')
          .fontSize(8)
          .text(fila.categoria, curX, filaY + 7, {
            width: colClasif - 10,
            align: 'right',
            lineBreak: false,
          });

        filaY += 22;
      });

      doc.y = filaY + 14;
    }

    // --- SECCIÓN 3: RESUMEN DE TALLERES Y LABORATORIOS ---
    if (doc.y > doc.page.height - 170) {
      doc.addPage();
    }

    doc
      .fillColor('#1c2333')
      .font('Helvetica-Bold')
      .fontSize(11.5)
      .text('3. Resumen de Talleres y Laboratorios (Promedio Global por Dimensión)', leftX, doc.y);
    doc.moveDown(0.3);
    doc
      .fillColor('#5d6678')
      .font('Helvetica')
      .fontSize(8.5)
      .text(
        `Promedio global de talleres: ${
          promedioGlobalTalleres !== null ? `${promedioGlobalTalleres.toFixed(2)} / 10` : 'Sin evaluaciones'
        }   ·   Evaluaciones recibidas en el ciclo: ${totalEvalTalleres}`,
        leftX,
        doc.y
      );
    doc.moveDown(0.5);

    // Tarjetas de promedio global por cada una de las 3 dimensiones
    const dimY = doc.y;
    const anchoDim = (anchoUtil - gapKpi * 2) / 3;
    resumenDimensiones.forEach((d, idx) => {
      const boxX = leftX + idx * (anchoDim + gapKpi);
      doc.rect(boxX, dimY, anchoDim, 48).fillAndStroke('#f4f6fb', '#e2e6ef');
      doc
        .fillColor('#5d6678')
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .text(`DIMENSIÓN: ${d.dimension.toUpperCase()}`, boxX + 10, dimY + 8, {
          width: anchoDim - 20,
        });
      doc
        .fillColor('#0f766e')
        .font('Helvetica-Bold')
        .fontSize(13)
        .text(d.promedio !== null ? `${d.promedio.toFixed(2)} / 10` : 'S/E', boxX + 10, dimY + 23, {
          width: anchoDim - 20,
        });
    });

    doc.y = dimY + 60;

    // Tabla de desglose por taller / laboratorio
    if (filasInstalaciones.length > 0) {
      const wInst = 165;
      const wTipo = 85;
      const wEval = 48;
      const wProm = 56;
      const wDim = (anchoUtil - (wInst + wTipo + wEval + wProm)) / 3;

      const dibujarEncabezadoTalleres = (yPos: number) => {
        doc.rect(leftX, yPos, anchoUtil, 20).fill('#0f766e');
        doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8);
        let x = leftX + 6;
        doc.text('INSTALACIÓN', x, yPos + 6, { width: wInst - 8 });
        x += wInst;
        doc.text('TIPO', x, yPos + 6, { width: wTipo - 6 });
        x += wTipo;
        doc.text('EVAL.', x, yPos + 6, { width: wEval - 4, align: 'center' });
        x += wEval;
        doc.text('PROM.', x, yPos + 6, { width: wProm - 4, align: 'center' });
        x += wProm;
        doc.text('EQUIP.', x, yPos + 6, { width: wDim - 4, align: 'center' });
        x += wDim;
        doc.text('DISPON.', x, yPos + 6, { width: wDim - 4, align: 'center' });
        x += wDim;
        doc.text('LIMPIEZA', x, yPos + 6, { width: wDim - 4, align: 'center' });
        return yPos + 20;
      };

      if (doc.y > doc.page.height - 75) {
        doc.addPage();
      }
      let tY = dibujarEncabezadoTalleres(doc.y);

      filasInstalaciones.forEach((inst, idx) => {
        if (tY > doc.page.height - 65) {
          doc.addPage();
          tY = dibujarEncabezadoTalleres(45);
        }
        const bg = idx % 2 === 0 ? '#ffffff' : '#f4f6fb';
        doc.rect(leftX, tY, anchoUtil, 20).fillAndStroke(bg, '#e2e6ef');

        let x = leftX + 6;
        doc
          .fillColor('#1c2333')
          .font('Helvetica-Bold')
          .fontSize(8)
          .text(inst.nombre, x, tY + 6, { width: wInst - 8, lineBreak: false, ellipsis: true });
        x += wInst;

        doc
          .fillColor('#5d6678')
          .font('Helvetica')
          .fontSize(8)
          .text(inst.tipo, x, tY + 6, { width: wTipo - 6, lineBreak: false, ellipsis: true });
        x += wTipo;

        doc
          .fillColor('#5d6678')
          .font('Helvetica')
          .fontSize(8)
          .text(String(inst.evaluaciones), x, tY + 6, { width: wEval - 4, align: 'center' });
        x += wEval;

        doc
          .fillColor('#0f766e')
          .font('Helvetica-Bold')
          .fontSize(8)
          .text(inst.promedio !== null ? inst.promedio.toFixed(1) : '—', x, tY + 6, {
            width: wProm - 4,
            align: 'center',
          });
        x += wProm;

        for (const dim of DIMENSIONES_OFICIALES) {
          const val = inst.porDimension[dim];
          doc
            .fillColor('#1c2333')
            .font('Helvetica')
            .fontSize(8)
            .text(val !== null ? val.toFixed(1) : '—', x, tY + 6, {
              width: wDim - 4,
              align: 'center',
            });
          x += wDim;
        }

        tY += 20;
      });
    }

    doc.end();
  } catch (error) {
    console.error('Error al generar el reporte PDF de coordinación:', error);
    if (!res.headersSent) {
      res.status(500).json({ mensaje: 'Error interno del servidor al generar el reporte directivo en PDF.' });
    }
  }
};

// ==========================================================
// EXPORTACIÓN ANALÍTICA EXCEL (.xlsx) Y CSV — COORDINACIÓN
// ==========================================================

interface FilaTabularExportacion {
  id: number;
  nombre: string;
  departamento: string;
  materia: string;
  crn: string;
  promedio: number | null;
  clasificacion: string;
}

/**
 * Extrae las filas filtradas (ID, Nombre, Departamento, Materia, CRN, Promedio, Clasificación)
 * reutilizando los parámetros de query (id_ciclo, filtro_tipo, filtro_valor).
 */
async function obtenerDatosTabularesCoordinacion(query: AuthRequest['query']): Promise<{
  idCiclo: number;
  nombreCiclo: string;
  etiquetaFiltro: string;
  filas: FilaTabularExportacion[];
} | null> {
  const idCicloRaw = query.id_ciclo;
  const idCicloParam =
    idCicloRaw && !Number.isNaN(Number(idCicloRaw)) && Number(idCicloRaw) > 0
      ? Number(idCicloRaw)
      : null;

  const cicloRes = idCicloParam
    ? await pool.query('SELECT id_ciclo, nombre, activo FROM CicloEscolar WHERE id_ciclo = $1 LIMIT 1', [
        idCicloParam,
      ])
    : await pool.query(
        'SELECT id_ciclo, nombre, activo FROM CicloEscolar WHERE activo = TRUE ORDER BY id_ciclo DESC LIMIT 1'
      );

  const cicloRow =
    cicloRes.rows[0] ??
    (await pool.query('SELECT id_ciclo, nombre, activo FROM CicloEscolar ORDER BY id_ciclo DESC LIMIT 1'))
      .rows[0] ??
    null;

  if (!cicloRow) return null;

  const idCiclo: number = cicloRow.id_ciclo;
  const nombreCiclo: string = `${cicloRow.nombre}${cicloRow.activo ? ' (Activo)' : ' (Histórico)'}`;

  const tiposPermitidos: TipoFiltroCoordinacion[] = ['general', 'area', 'materia', 'carrera'];
  const rawTipo = String(query.filtro_tipo ?? 'general').toLowerCase().trim() as TipoFiltroCoordinacion;
  const rawValor = String(query.filtro_valor ?? '').trim();

  const filtroTipo: TipoFiltroCoordinacion =
    tiposPermitidos.includes(rawTipo) &&
    rawTipo !== 'general' &&
    rawValor !== '' &&
    rawValor.toLowerCase() !== 'todas' &&
    rawValor.toLowerCase() !== 'todos'
      ? rawTipo
      : 'general';
  const filtroValor = filtroTipo === 'general' ? '' : rawValor;

  const etiquetaFiltro =
    filtroTipo === 'area'
      ? `Área Académica: ${filtroValor}`
      : filtroTipo === 'materia'
      ? `Materia: ${filtroValor}`
      : filtroTipo === 'carrera'
      ? `Carrera: ${filtroValor}`
      : 'General Institucional';

  const params: any[] = [idCiclo];
  let whereSQL = '';

  if (filtroTipo === 'area') {
    params.push(filtroValor);
    whereSQL = 'WHERE LOWER(d.departamento) = LOWER($2)';
  } else if (filtroTipo === 'materia') {
    params.push(filtroValor);
    whereSQL = 'WHERE c.id_crn IS NOT NULL AND (LOWER(m.nombre) = LOWER($2) OR LOWER(m.clave) = LOWER($2))';
  } else if (filtroTipo === 'carrera') {
    params.push(filtroValor);
    whereSQL = `WHERE c.id_crn IS NOT NULL AND EXISTS (
      SELECT 1
      FROM Inscripcion i2
      INNER JOIN Alumno a2 ON a2.id_alumno = i2.id_alumno
      WHERE i2.id_crn = c.id_crn AND LOWER(a2.carrera) = LOWER($2)
    )`;
  }

  const { rows } = await pool.query(
    `SELECT d.id_docente,
            d.nombre,
            d.apellido,
            d.departamento,
            c.crn,
            m.nombre AS materia_nombre,
            COALESCE(
              json_agg(
                COALESCE(e.promedio, (
                  SELECT AVG(r.valor) FROM Respuesta r WHERE r.id_evaluacion = e.id_evaluacion
                ))
              ) FILTER (WHERE e.id_evaluacion IS NOT NULL),
              '[]'
            ) AS calificaciones
     FROM Docente d
     LEFT JOIN CRN c ON c.id_docente = d.id_docente AND c.id_ciclo = $1
     LEFT JOIN Materia m ON m.id_materia = c.id_materia
     LEFT JOIN Evaluacion e ON e.id_crn = c.id_crn
     ${whereSQL}
     GROUP BY d.id_docente, c.id_crn, m.id_materia
     ORDER BY d.id_docente ASC, m.nombre ASC NULLS LAST, c.crn ASC NULLS LAST`,
    params
  );

  const filas: FilaTabularExportacion[] = rows.map((r: any) => {
    const cals: number[] = (r.calificaciones as any[])
      .map((v) => Number(v))
      .filter((v) => !Number.isNaN(v));
    const clasif = calcularClasificacionDocente(cals);
    return {
      id: Number(r.id_docente),
      nombre: `${r.nombre} ${r.apellido}`,
      departamento: r.departamento,
      materia: r.materia_nombre ?? 'Sin asignación',
      crn: r.crn !== null && r.crn !== undefined ? String(r.crn) : '—',
      promedio: clasif.promedio,
      clasificacion: clasif.categoria,
    };
  });

  return {
    idCiclo,
    nombreCiclo,
    etiquetaFiltro,
    filas,
  };
}

/**
 * GET /api/reportes/coordinacion/excel
 * Exporta en formato Excel (.xlsx) los resultados de desempeño docente según los filtros activos.
 */
export const descargarReporteCoordinacionExcel = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const datos = await obtenerDatosTabularesCoordinacion(req.query);
    if (!datos) {
      res.status(404).json({ mensaje: 'No existen ciclos escolares registrados para exportar.' });
      return;
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistema de Evaluación Docente (EvDocente)';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Desempeño Docente');
    sheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Nombre', key: 'nombre', width: 28 },
      { header: 'Departamento', key: 'departamento', width: 22 },
      { header: 'Materia', key: 'materia', width: 34 },
      { header: 'CRN', key: 'crn', width: 14 },
      { header: 'Promedio', key: 'promedio', width: 14 },
      { header: 'Clasificación', key: 'clasificacion', width: 20 },
    ];

    // Estilo de la fila de cabecera institucional (Verde Esmeralda #0f766e)
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F766E' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'left' };
    headerRow.height = 24;

    for (const fila of datos.filas) {
      sheet.addRow({
        id: fila.id,
        nombre: fila.nombre,
        departamento: fila.departamento,
        materia: fila.materia,
        crn: fila.crn,
        promedio: fila.promedio !== null ? Number(fila.promedio.toFixed(1)) : 'Sin evaluaciones',
        clasificacion: fila.clasificacion,
      });
    }

    await registrarAuditoria({
      idUsuario: req.user?.id_usuario ?? null,
      rol: req.user?.rol ?? null,
      accion: 'EXPORTAR_REPORTE',
      entidad: 'Reporte',
      idEntidad: datos.idCiclo,
      detalle: `Exportación de reporte en formato Excel (ciclo: ${datos.nombreCiclo}; filtro: ${datos.etiquetaFiltro}).`,
      req,
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', 'attachment; filename=reporte.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error al generar el reporte Excel de coordinación:', error);
    if (!res.headersSent) {
      res.status(500).json({ mensaje: 'Error interno del servidor al generar el reporte Excel.' });
    }
  }
};

function escaparCampoCSV(valor: string | number | null | undefined): string {
  const texto = valor === null || valor === undefined ? '' : String(valor);
  if (texto.includes(',') || texto.includes('"') || texto.includes('\n') || texto.includes('\r')) {
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
}

/**
 * GET /api/reportes/coordinacion/csv
 * Exporta en formato CSV (texto plano) los resultados de desempeño docente según los filtros activos.
 */
export const descargarReporteCoordinacionCSV = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const datos = await obtenerDatosTabularesCoordinacion(req.query);
    if (!datos) {
      res.status(404).json({ mensaje: 'No existen ciclos escolares registrados para exportar.' });
      return;
    }

    const cabecera = 'ID,Nombre,Departamento,Materia,CRN,Promedio,Clasificación\n';
    const lineas = datos.filas.map((fila) => {
      const promedioTexto = fila.promedio !== null ? fila.promedio.toFixed(1) : 'Sin evaluaciones';
      return [
        escaparCampoCSV(fila.id),
        escaparCampoCSV(fila.nombre),
        escaparCampoCSV(fila.departamento),
        escaparCampoCSV(fila.materia),
        escaparCampoCSV(fila.crn),
        escaparCampoCSV(promedioTexto),
        escaparCampoCSV(fila.clasificacion),
      ].join(',');
    });

    const contenidoCSV = cabecera + lineas.join('\n');

    await registrarAuditoria({
      idUsuario: req.user?.id_usuario ?? null,
      rol: req.user?.rol ?? null,
      accion: 'EXPORTAR_REPORTE',
      entidad: 'Reporte',
      idEntidad: datos.idCiclo,
      detalle: `Exportación de reporte en formato CSV (ciclo: ${datos.nombreCiclo}; filtro: ${datos.etiquetaFiltro}).`,
      req,
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=reporte.csv');
    res.status(200).send(contenidoCSV);
  } catch (error) {
    console.error('Error al generar el reporte CSV de coordinación:', error);
    if (!res.headersSent) {
      res.status(500).json({ mensaje: 'Error interno del servidor al generar el reporte CSV.' });
    }
  }
};
