import { Request } from 'express';
import pool from '../config/db';
import { AuthRequest } from '../middlewares/auth';

export type AccionAuditoria =
  | 'LOGIN_EXITOSO'
  | 'LOGIN_FALLIDO'
  | 'SOLICITUD_RESET_PASSWORD'
  | 'RESET_PASSWORD'
  | 'CREAR'
  | 'ACTUALIZAR'
  | 'ACTIVAR'
  | 'DESACTIVAR'
  | 'ELIMINAR'
  | 'EXPORTAR_REPORTE'
  | (string & {});

export type EntidadAuditoria =
  | 'Sesion'
  | 'Usuario'
  | 'Docente'
  | 'Materia'
  | 'CRN'
  | 'Pregunta'
  | 'CicloEscolar'
  | 'Instalacion'
  | 'Reporte'
  | (string & {});

export interface RegistroAuditoriaParams {
  idUsuario?: number | null;
  numeroCuenta?: string | null;
  rol?: string | null;
  accion: AccionAuditoria;
  entidad: EntidadAuditoria;
  idEntidad?: string | number | null;
  detalle?: string | null;
  req?: Request | AuthRequest;
}

/**
 * Extrae de forma segura la dirección IP de origen respetando x-forwarded-for
 * (proxies/Render) o req.ip, normalizando el prefijo ::ffff: y acotando a 64 caracteres.
 */
export function extraerIpOrigen(req?: Request | AuthRequest): string | null {
  if (!req) return null;

  const forwarded = req.headers?.['x-forwarded-for'];
  let ipRaw: string | undefined;

  if (typeof forwarded === 'string' && forwarded.trim()) {
    ipRaw = forwarded.split(',')[0]?.trim();
  } else if (Array.isArray(forwarded) && forwarded.length > 0) {
    ipRaw = forwarded[0]?.split(',')[0]?.trim();
  }

  if (!ipRaw) {
    ipRaw = req.ip || req.socket?.remoteAddress || undefined;
  }

  if (!ipRaw) return null;

  const limpia = ipRaw.replace(/^::ffff:/i, '').trim();
  return limpia ? limpia.slice(0, 64) : null;
}

function normalizarIdUsuario(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === '') return null;
  const num = Number(valor);
  return Number.isInteger(num) && num > 0 ? num : null;
}

function normalizarTextoAcotado(valor: unknown, maxLen: number): string | null {
  if (valor === null || valor === undefined) return null;
  const texto = String(valor).trim();
  return texto ? texto.slice(0, maxLen) : null;
}

/**
 * Inserta un evento en BitacoraAuditoria de forma segura y no bloqueante (fail-safe).
 * Si se proporciona idUsuario sin numeroCuenta o rol, los resuelve automáticamente
 * desde Usuario/Rol en la misma consulta parametrizada.
 *
 * Seguridad:
 * - Nunca pasar contraseñas, hashes, tokens JWT ni datos de evaluaciones de alumnos.
 * - Cualquier error de BD se captura y registra en consola sin afectar el flujo principal.
 */
export async function registrarAuditoria({
  idUsuario,
  numeroCuenta,
  rol,
  accion,
  entidad,
  idEntidad,
  detalle,
  req,
}: RegistroAuditoriaParams): Promise<void> {
  try {
    const authUser = (req as AuthRequest | undefined)?.user;
    const idUsuarioFinal =
      idUsuario !== undefined
        ? normalizarIdUsuario(idUsuario)
        : normalizarIdUsuario(authUser?.id_usuario);

    const numeroCuentaFinal = normalizarTextoAcotado(numeroCuenta, 50);
    const rolFinal =
      rol !== undefined
        ? normalizarTextoAcotado(rol, 30)
        : normalizarTextoAcotado(authUser?.rol, 30);

    const accionFinal = normalizarTextoAcotado(accion, 60);
    const entidadFinal = normalizarTextoAcotado(entidad, 60);
    if (!accionFinal || !entidadFinal) return;

    const idEntidadFinal = normalizarTextoAcotado(idEntidad, 60);
    const detalleFinal =
      typeof detalle === 'string' && detalle.trim() ? detalle.trim() : null;
    const ipOrigen = extraerIpOrigen(req);

    await pool.query(
      `INSERT INTO BitacoraAuditoria (
         id_usuario,
         numero_cuenta,
         rol,
         accion,
         entidad,
         id_entidad,
         detalle,
         ip_origen
       )
       SELECT
         u.id_usuario,
         LEFT(COALESCE($2::varchar, u.numero_cuenta), 50),
         LEFT(COALESCE($3::varchar, r.nombre), 30),
         $4::varchar,
         $5::varchar,
         $6::varchar,
         $7::text,
         $8::varchar
       FROM (SELECT 1) AS origen
       LEFT JOIN Usuario u ON u.id_usuario = $1::integer
       LEFT JOIN Rol r ON r.id_rol = u.id_rol`,
      [
        idUsuarioFinal,
        numeroCuentaFinal,
        rolFinal,
        accionFinal,
        entidadFinal,
        idEntidadFinal,
        detalleFinal,
        ipOrigen,
      ]
    );
  } catch (error) {
    console.error('Error al registrar evento en BitacoraAuditoria:', error);
  }
}
