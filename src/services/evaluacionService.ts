export interface DocenteResumen {
  id: string
  nombre: string
  area: string
  correo: string
}

export interface MateriaItem {
  crn: string
  clave: string
  nombre: string
  docenteId: string
  grupo: string
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

// Materias institucionales preconfiguradas
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

const API_BASE = '/api/evaluaciones'

/**
 * Envía una evaluación docente a la API real del backend (POST /api/evaluaciones)
 */
export async function enviarEvaluacionAPI(
  crn: number | string,
  calificaciones: number[],
  token: string
): Promise<EvaluacionRespuestaAPI> {
  const response = await fetch(`${API_BASE}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      crn: Number(crn),
      calificaciones,
    }),
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.mensaje || 'Error al enviar la evaluación.')
  }
  return data
}

/**
 * Consulta el promedio y desempeño de un docente en tiempo real desde la API real (GET /api/evaluaciones/promedio/:docenteId)
 */
export async function obtenerPromedioDocenteAPI(
  docenteId: number | string,
  token: string,
  periodo?: string
): Promise<ClasificacionDocenteAPI> {
  const url = new URL(`${API_BASE}/promedio/${docenteId}`, window.location.origin)
  if (periodo) {
    url.searchParams.append('periodo', periodo)
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.mensaje || 'Error al obtener promedio docente.')
  }
  return data
}
