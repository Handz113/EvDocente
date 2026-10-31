export interface DocenteResumen {
  id: string
  nombre: string
  area: string
  correo?: string
}

export interface MateriaItem {
  crn: string
  clave: string
  nombre: string
  docenteId: string
  grupo?: string
  docente?: DocenteResumen
  evaluada?: boolean
}

export interface PreguntaItem {
  id: number
  categoria: string
  texto: string
}

export interface EscalaItem {
  valor: number
  etiqueta: string
}

export interface PeriodoItem {
  id: string
  nombre: string
  inicio: string
  fin: string
  activo: boolean
}

export interface EvaluacionPayload {
  crn: number
  calificaciones: number[]
  comentarios?: string
}

export interface EvaluacionRespuestaAPI {
  mensaje: string
  evaluacion?: {
    id: number
    promedio: number
  }
}

export interface ClasificacionDocenteAPI {
  docenteId: number
  totalEvaluaciones: number
  promedio: number | null
  categoria: 'Excelente' | 'Bueno' | 'Suficiente' | 'No Suficiente' | 'Sin Evaluaciones'
  aptoParaAsignacion: boolean
  estatusAsignacion: boolean
  docente?: {
    nombre: string
    apellido: string
    departamento: string
  }
  detalles?: {
    periodoFiltro: string
  }
  mensaje?: string
}

// Catálogo institucional oficial (alineado a sql/carga_inicial.sql)
export const PREGUNTAS_INSTITUCIONALES: PreguntaItem[] = [
  { id: 1, categoria: 'Dominio', texto: 'Dominio de la materia.' },
  { id: 2, categoria: 'Planeación', texto: 'Planeación de clases.' },
  { id: 3, categoria: 'Claridad', texto: 'Claridad en las explicaciones.' },
  { id: 4, categoria: 'Participación', texto: 'Fomento de la participación.' },
  { id: 5, categoria: 'Recursos', texto: 'Uso de recursos didácticos.' },
  { id: 6, categoria: 'Dudas', texto: 'Resolución de dudas.' },
  { id: 7, categoria: 'Puntualidad', texto: 'Puntualidad.' },
  { id: 8, categoria: 'Asistencia', texto: 'Asistencia.' },
  { id: 9, categoria: 'Cumplimiento', texto: 'Cumplimiento del programa.' },
  { id: 10, categoria: 'Retroalimentación', texto: 'Retroalimentación.' },
  { id: 11, categoria: 'Evaluación', texto: 'Evaluación objetiva.' },
  { id: 12, categoria: 'Tecnología', texto: 'Uso de tecnología.' },
  { id: 13, categoria: 'Trato', texto: 'Trato respetuoso.' },
  { id: 14, categoria: 'Motivación', texto: 'Motivación al aprendizaje.' },
  { id: 15, categoria: 'Satisfacción', texto: 'Satisfacción general.' },
]

export const ESCALA_VALORES: EscalaItem[] = [
  { valor: 0, etiqueta: 'Muy en desacuerdo (0)' },
  { valor: 2.5, etiqueta: 'En desacuerdo (2.5)' },
  { valor: 5, etiqueta: 'Neutral (5.0)' },
  { valor: 7.5, etiqueta: 'De acuerdo (7.5)' },
  { valor: 10, etiqueta: 'Muy de acuerdo (10)' },
]

export const PERIODO_ACTUAL: PeriodoItem = {
  id: '1',
  nombre: 'Ciclo 2026-2',
  inicio: '2026-10-01',
  fin: '2026-10-31',
  activo: true,
}

// Datos locales: solo los usa el panel de Administración mientras no tenga sus
// endpoints de catálogos. Alumno, Docente y Coordinación ya leen de la BD.
export const MATERIAS_CATALOGO: MateriaItem[] = [
  { crn: '40211', clave: 'BDA0201', nombre: 'Bases de Datos Avanzadas', docenteId: '1', grupo: '501' },
  { crn: '40215', clave: 'ANSI0301G', nombre: 'Diseño y Gestión de Sistemas', docenteId: '1', grupo: '501' },
  { crn: '40230', clave: 'MAT0302', nombre: 'Probabilidad y Estadística', docenteId: '2', grupo: '502' },
  { crn: '40242', clave: 'RED0401', nombre: 'Middleware y Sistemas Distribuidos', docenteId: '3', grupo: '501' },
]

export const DOCENTES_CATALOGO: DocenteResumen[] = [
  { id: '1', nombre: 'Juan Pérez', area: 'Sistemas', correo: 'docente@escuela.edu' },
  { id: '2', nombre: 'Mtra. Laura Mendoza', area: 'Sistemas', correo: 'laura.mendoza@escuela.edu' },
  { id: '3', nombre: 'Dr. Roberto Salas', area: 'Ciencias Básicas', correo: 'roberto.salas@escuela.edu' },
]

// ==========================================================
// CONEXIÓN CON EL BACKEND (Express en :3000, vía proxy de Vite)
// ==========================================================

/** Error de la API con el código HTTP, para que las vistas distingan 401 (sesión vencida). */
export class ErrorAPI extends Error {
  constructor(mensaje: string, public status: number) {
    super(mensaje)
  }
}

async function peticion<T>(ruta: string, opciones: RequestInit = {}, token?: string): Promise<T> {
  let response: Response
  try {
    response = await fetch(`/api${ruta}`, {
      ...opciones,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...opciones.headers,
      },
    })
  } catch {
    throw new ErrorAPI('No se pudo conectar con el servidor. ¿Está corriendo el backend?', 0)
  }

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const porDefecto =
      response.status === 502 || response.status === 504
        ? 'El backend no está corriendo (npm run dev:backend).'
        : 'Error al comunicarse con el servidor.'
    throw new ErrorAPI(data.mensaje || porDefecto, response.status)
  }
  return data as T
}

export interface RespuestaLogin {
  token: string
  usuario: {
    rol: 'alumno' | 'docente' | 'coordinacion' | 'administracion'
    id: number
    matricula: string
    nombre: string
    docenteId?: string
  }
}

/** POST /api/auth/login */
export function iniciarSesionAPI(usuario: string, contrasena: string, area: string) {
  return peticion<RespuestaLogin>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ usuario, contrasena, area }),
  })
}

/** GET /api/alumno/materias — materias inscritas del alumno con sesión */
export function obtenerMateriasAlumnoAPI(token: string) {
  return peticion<{ periodo: PeriodoItem | null; materias: MateriaItem[] }>('/alumno/materias', {}, token)
}

/** POST /api/evaluaciones */
export function enviarEvaluacionAPI(
  crn: number | string,
  calificaciones: number[],
  token: string,
  comentarios?: string
): Promise<EvaluacionRespuestaAPI> {
  return peticion<EvaluacionRespuestaAPI>(
    '/evaluaciones',
    { method: 'POST', body: JSON.stringify({ crn: Number(crn), calificaciones, comentarios }) },
    token
  )
}

/** GET /api/evaluaciones/promedio/:docenteId (coordinación y administración) */
export function obtenerPromedioDocenteAPI(
  docenteId: number | string,
  token: string,
  periodo?: string
): Promise<ClasificacionDocenteAPI> {
  const query = periodo ? `?periodo=${encodeURIComponent(periodo)}` : ''
  return peticion<ClasificacionDocenteAPI>(`/evaluaciones/promedio/${docenteId}${query}`, {}, token)
}

/** GET /api/evaluaciones/mi-promedio (docente) */
export function obtenerMiPromedioAPI(token: string) {
  return peticion<ClasificacionDocenteAPI>('/evaluaciones/mi-promedio', {}, token)
}

export interface GrupoResultados {
  crn: string
  clave: string
  nombre: string
  totalEvaluaciones: number
  promedio: number | null
  categoria: ClasificacionDocenteAPI['categoria']
  aptoParaAsignacion: boolean
  porPregunta: { id: number; texto: string; promedio: number }[]
  comentarios: string[]
}

/** GET /api/docentes/me/resultados (docente) */
export function obtenerMisResultadosAPI(token: string) {
  return peticion<{ grupos: GrupoResultados[] }>('/docentes/me/resultados', {}, token)
}

export interface DocenteAPI extends DocenteResumen {
  materias: { crn: string; clave: string; nombre: string }[]
}

/** GET /api/docentes (coordinación y administración) */
export function listarDocentesAPI(token: string) {
  return peticion<DocenteAPI[]>('/docentes', {}, token)
}
