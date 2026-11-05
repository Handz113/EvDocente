import { ErrorAPI } from './evaluacionService';

// ==========================================================
// INTERFACES DE TYPESCRIPT PARA CATÁLOGOS DE ADMINISTRACIÓN
// ==========================================================

export interface UsuarioAdmin {
  id_usuario: number;
  numero_cuenta: string;
  correo_institucional: string;
  activo: boolean;
  fecha_creacion?: string;
  id_rol?: number;
  rol?: string;
  nombre?: string;
}

export interface CrearUsuarioPayload {
  numero_cuenta: string;
  correo_institucional: string;
  contrasena: string;
  id_rol?: number;
  rol?: string;
  area?: string;
}

export interface DocenteAdmin {
  id_docente: number;
  id_usuario: number;
  nombre: string;
  apellido: string;
  nombre_completo: string;
  departamento: string;
  numero_cuenta?: string;
  correo_institucional?: string;
  activo: boolean;
}

export interface CrearDocentePayload {
  id_usuario?: number;
  numero_cuenta?: string;
  correo_institucional?: string;
  contrasena?: string;
  nombre: string;
  apellido?: string;
  nombre_completo?: string;
  departamento: string;
}

export interface MateriaAdmin {
  id_crn: number | null;
  crn: number | null;
  id_materia: number;
  clave: string;
  nombre_materia: string;
  nombre: string;
  creditos: number;
  id_docente: number | null;
  docente_asignado: string | null;
  id_ciclo: number | null;
  ciclo_escolar: string | null;
}

export interface CrearMateriaPayload {
  clave: string;
  nombre: string;
  creditos: number;
  crn?: number;
  id_docente?: number;
  id_ciclo?: number;
}

export interface PreguntaAdmin {
  id_pregunta: number;
  numero?: number;
  texto: string;
  texto_pregunta: string;
  dimension: string;
  activa?: boolean;
}

export interface CrearPreguntaPayload {
  texto_pregunta: string;
  dimension: string;
  texto?: string;
  numero?: number;
}

export interface PeriodoAdmin {
  id_ciclo: number;
  nombre: string;
  fecha_inicio_eval: string;
  fecha_cierre_eval: string;
  activo: boolean;
}

export interface CrearPeriodoPayload {
  nombre: string;
  fecha_inicio_eval: string;
  fecha_cierre_eval: string;
  activo?: boolean;
}

// ==========================================================
// HELPER INTERNO DE FETCH
// ==========================================================

async function fetchAdmin<T>(
  ruta: string,
  opciones: RequestInit = {},
  token?: string
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${ruta}`, {
      ...opciones,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...opciones.headers,
      },
    });
  } catch {
    throw new ErrorAPI('No se pudo conectar con el servidor. ¿Está corriendo el backend?', 0);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const porDefecto =
      response.status === 502 || response.status === 504
        ? 'El backend no está corriendo (npm run dev:backend).'
        : 'Error al comunicarse con el servidor.';
    throw new ErrorAPI(data.mensaje || porDefecto, response.status);
  }

  return data as T;
}

// ==========================================================
// 1. SERVICIOS DE USUARIOS
// ==========================================================

/** GET /api/admin/usuarios */
export function obtenerUsuariosAPI(token: string): Promise<UsuarioAdmin[]> {
  return fetchAdmin<UsuarioAdmin[]>('/admin/usuarios', { method: 'GET' }, token);
}

/** POST /api/admin/usuarios */
export function crearUsuarioAPI(
  datos: CrearUsuarioPayload,
  token: string
): Promise<UsuarioAdmin> {
  return fetchAdmin<UsuarioAdmin>(
    '/admin/usuarios',
    {
      method: 'POST',
      body: JSON.stringify(datos),
    },
    token
  );
}

/** PATCH /api/admin/usuarios/:id/activo */
export function toggleUsuarioAPI(
  id: number | string,
  activo: boolean,
  token: string
): Promise<UsuarioAdmin> {
  return fetchAdmin<UsuarioAdmin>(
    `/admin/usuarios/${id}/activo`,
    {
      method: 'PATCH',
      body: JSON.stringify({ activo }),
    },
    token
  );
}

// ==========================================================
// 2. SERVICIOS DE DOCENTES
// ==========================================================

/** GET /api/admin/docentes */
export function obtenerDocentesAPI(token: string): Promise<DocenteAdmin[]> {
  return fetchAdmin<DocenteAdmin[]>('/admin/docentes', { method: 'GET' }, token);
}

/** Alias de obtenerDocentesAPI para desambiguar frente a listarDocentesAPI de coordinación */
export const obtenerDocentesAdminAPI = obtenerDocentesAPI;

/** POST /api/admin/docentes */
export function crearDocenteAPI(
  datos: CrearDocentePayload,
  token: string
): Promise<DocenteAdmin> {
  return fetchAdmin<DocenteAdmin>(
    '/admin/docentes',
    {
      method: 'POST',
      body: JSON.stringify(datos),
    },
    token
  );
}

// ==========================================================
// 3. SERVICIOS DE MATERIAS Y CRN
// ==========================================================

/** GET /api/admin/materias */
export function obtenerMateriasAPI(token: string): Promise<MateriaAdmin[]> {
  return fetchAdmin<MateriaAdmin[]>('/admin/materias', { method: 'GET' }, token);
}

export const obtenerMateriasCRNAPI = obtenerMateriasAPI;

/** POST /api/admin/materias */
export function crearMateriaAPI(
  datos: CrearMateriaPayload,
  token: string
): Promise<MateriaAdmin> {
  return fetchAdmin<MateriaAdmin>(
    '/admin/materias',
    {
      method: 'POST',
      body: JSON.stringify(datos),
    },
    token
  );
}

// ==========================================================
// 4. SERVICIOS DE PREGUNTAS DOCENTES
// ==========================================================

/** GET /api/admin/preguntas */
export function obtenerPreguntasAPI(token: string): Promise<PreguntaAdmin[]> {
  return fetchAdmin<PreguntaAdmin[]>('/admin/preguntas', { method: 'GET' }, token);
}

/** POST /api/admin/preguntas */
export function crearPreguntaAPI(
  datos: CrearPreguntaPayload,
  token: string
): Promise<PreguntaAdmin> {
  return fetchAdmin<PreguntaAdmin>(
    '/admin/preguntas',
    {
      method: 'POST',
      body: JSON.stringify(datos),
    },
    token
  );
}

/** DELETE /api/admin/preguntas/:id */
export function eliminarPreguntaAPI(
  id: number | string,
  token: string
): Promise<{ mensaje: string }> {
  return fetchAdmin<{ mensaje: string }>(
    `/admin/preguntas/${id}`,
    {
      method: 'DELETE',
    },
    token
  );
}

// ==========================================================
// 5. SERVICIOS DE PERIODOS / CICLOS ESCOLARES
// ==========================================================

/** GET /api/ciclos (reutiliza el endpoint de ciclos existente) */
export function obtenerPeriodosAPI(token: string): Promise<PeriodoAdmin[]> {
  return fetchAdmin<PeriodoAdmin[]>('/ciclos', { method: 'GET' }, token);
}

export const obtenerCiclosAPI = obtenerPeriodosAPI;

/** POST /api/admin/ciclos */
export function crearPeriodoAPI(
  datos: CrearPeriodoPayload,
  token: string
): Promise<PeriodoAdmin> {
  return fetchAdmin<PeriodoAdmin>(
    '/admin/ciclos',
    {
      method: 'POST',
      body: JSON.stringify(datos),
    },
    token
  );
}

export const crearCicloAPI = crearPeriodoAPI;

/** PATCH /api/admin/ciclos/:id/activo */
export function togglePeriodoAPI(
  id: number | string,
  activo: boolean,
  token: string
): Promise<PeriodoAdmin> {
  return fetchAdmin<PeriodoAdmin>(
    `/admin/ciclos/${id}/activo`,
    {
      method: 'PATCH',
      body: JSON.stringify({ activo }),
    },
    token
  );
}

export const toggleCicloAPI = togglePeriodoAPI;
