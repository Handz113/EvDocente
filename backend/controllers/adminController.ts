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

const ACCIONES_ESTANDAR_BITACORA = [
  'ACTIVAR',
  'ACTUALIZAR',
  'CREAR',
  'DESACTIVAR',
  'ELIMINAR',
  'EXPORTAR_REPORTE',
  'LOGIN_EXITOSO',
  'LOGIN_FALLIDO',
  'RESET_PASSWORD',
  'SOLICITUD_RESET_PASSWORD',
];

const ENTIDADES_ESTANDAR_BITACORA = [
  'CicloEscolar',
  'CRN',
  'Docente',
  'Instalacion',
  'Materia',
  'Pregunta',
  'Reporte',
  'Sesion',
  'Usuario',
];

function esFechaISOValida(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const [anio, mes, dia] = valor.split('-').map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  return (
    fecha.getUTCFullYear() === anio &&
    fecha.getUTCMonth() === mes - 1 &&
    fecha.getUTCDate() === dia
  );
}

/**
 * GET /api/admin/bitacora
 * Consulta paginada y filtrada de la Bitácora de Auditoría (HU21).
 * Protegida exclusivamente para el rol Administrador (solo lectura, inmutable).
 * Query params opcionales:
 *   busqueda, accion, entidad, fechaInicio (YYYY-MM-DD), fechaFin (YYYY-MM-DD),
 *   pagina (default 1), limite (default 25, máximo 100)
 */
export const obtenerBitacoraAuditoria = async (req: AuthRequest, res: Response): Promise<void> => {
  const busqueda =
    typeof req.query.busqueda === 'string' ? req.query.busqueda.trim() : '';
  const accion =
    typeof req.query.accion === 'string' ? req.query.accion.trim() : '';
  const entidad =
    typeof req.query.entidad === 'string' ? req.query.entidad.trim() : '';
  const fechaInicio =
    typeof req.query.fechaInicio === 'string' ? req.query.fechaInicio.trim() : '';
  const fechaFin =
    typeof req.query.fechaFin === 'string' ? req.query.fechaFin.trim() : '';

  if (fechaInicio && !esFechaISOValida(fechaInicio)) {
    res.status(400).json({ mensaje: 'El parámetro fechaInicio debe tener el formato AAAA-MM-DD válido.' });
    return;
  }

  if (fechaFin && !esFechaISOValida(fechaFin)) {
    res.status(400).json({ mensaje: 'El parámetro fechaFin debe tener el formato AAAA-MM-DD válido.' });
    return;
  }

  const paginaRaw = Number(req.query.pagina);
  const pagina = Number.isInteger(paginaRaw) && paginaRaw >= 1 ? paginaRaw : 1;

  const limiteRaw = Number(req.query.limite);
  const limite =
    Number.isInteger(limiteRaw) && limiteRaw >= 1 ? Math.min(limiteRaw, 100) : 25;
  const offset = (pagina - 1) * limite;

  const condiciones: string[] = [];
  const params: unknown[] = [];

  if (busqueda) {
    params.push(`%${busqueda}%`);
    const idx = params.length;
    condiciones.push(`(
      COALESCE(b.numero_cuenta, u.numero_cuenta, '') ILIKE $${idx}
      OR COALESCE(u.correo_institucional, '') ILIKE $${idx}
      OR COALESCE(TRIM(d.nombre || ' ' || d.apellido), '') ILIKE $${idx}
      OR COALESCE(b.rol, r.nombre, '') ILIKE $${idx}
      OR COALESCE(b.detalle, '') ILIKE $${idx}
    )`);
  }

  if (accion) {
    params.push(accion);
    condiciones.push(`b.accion = $${params.length}`);
  }

  if (entidad) {
    params.push(entidad);
    condiciones.push(`b.entidad = $${params.length}`);
  }

  if (fechaInicio) {
    params.push(fechaInicio);
    condiciones.push(`b.fecha_hora >= $${params.length}::date`);
  }

  if (fechaFin) {
    params.push(fechaFin);
    condiciones.push(`b.fecha_hora < ($${params.length}::date + INTERVAL '1 day')`);
  }

  const whereClause = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';
  const joinsClause = `
    FROM BitacoraAuditoria b
    LEFT JOIN Usuario u ON u.id_usuario = b.id_usuario
    LEFT JOIN Rol r ON r.id_rol = u.id_rol
    LEFT JOIN Docente d ON d.id_usuario = u.id_usuario
  `;

  try {
    const paramsPaginados = [...params, limite, offset];
    const limitIdx = params.length + 1;
    const offsetIdx = params.length + 2;

    const [registrosRes, totalRes, accionesRes, entidadesRes] = await Promise.all([
      pool.query(
        `SELECT b.id_bitacora,
                b.id_usuario,
                COALESCE(b.numero_cuenta, u.numero_cuenta) AS numero_cuenta,
                CASE
                  WHEN d.id_docente IS NOT NULL THEN TRIM(d.nombre || ' ' || d.apellido)
                  WHEN COALESCE(b.rol, r.nombre) = 'Administrador' THEN 'Administración'
                  WHEN COALESCE(b.rol, r.nombre) = 'Coordinador' THEN 'Coordinación Académica'
                  WHEN COALESCE(b.rol, r.nombre) = 'Alumno' THEN 'Alumno'
                  WHEN u.id_usuario IS NOT NULL THEN COALESCE(r.nombre, u.numero_cuenta)
                  ELSE NULL
                END AS nombre_usuario,
                u.correo_institucional,
                COALESCE(b.rol, r.nombre) AS rol,
                b.accion,
                b.entidad,
                b.id_entidad,
                b.detalle,
                b.ip_origen,
                b.fecha_hora
         ${joinsClause}
         ${whereClause}
         ORDER BY b.fecha_hora DESC, b.id_bitacora DESC
         LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
        paramsPaginados
      ),
      pool.query(
        `SELECT COUNT(*)::int AS total
         ${joinsClause}
         ${whereClause}`,
        params
      ),
      pool.query(
        'SELECT DISTINCT accion FROM BitacoraAuditoria WHERE accion IS NOT NULL ORDER BY accion ASC'
      ),
      pool.query(
        'SELECT DISTINCT entidad FROM BitacoraAuditoria WHERE entidad IS NOT NULL ORDER BY entidad ASC'
      ),
    ]);

    const total: number = totalRes.rows[0]?.total ?? 0;
    const totalPaginas = total > 0 ? Math.ceil(total / limite) : 0;

    const accionesDisponibles = Array.from(
      new Set([
        ...ACCIONES_ESTANDAR_BITACORA,
        ...accionesRes.rows.map((row: any) => String(row.accion)),
      ])
    ).sort((a, b) => a.localeCompare(b, 'es'));

    const entidadesDisponibles = Array.from(
      new Set([
        ...ENTIDADES_ESTANDAR_BITACORA,
        ...entidadesRes.rows.map((row: any) => String(row.entidad)),
      ])
    ).sort((a, b) => a.localeCompare(b, 'es'));

    res.status(200).json({
      registros: registrosRes.rows,
      total,
      pagina,
      limite,
      totalPaginas,
      accionesDisponibles,
      entidadesDisponibles,
    });
  } catch (error: any) {
    if (error?.code === '42P01') {
      res.status(503).json({
        mensaje:
          'La tabla BitacoraAuditoria aún no existe en la base de datos. Ejecuta la migración sql/migracion_bitacora_auditoria.sql.',
      });
      return;
    }
    console.error('Error al consultar la bitácora de auditoría:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor al consultar la bitácora de auditoría.' });
  }
};
