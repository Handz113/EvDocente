import { peticion } from './evaluacionService'

// ==========================================================
// MÓDULO TALLERES Y LABORATORIOS (/api/instalaciones)
// ==========================================================

export type Dimension = 'Equipamiento' | 'Disponibilidad' | 'Limpieza'

export const DIMENSIONES: Dimension[] = ['Equipamiento', 'Disponibilidad', 'Limpieza']

export interface CicloAPI {
  id: number
  nombre: string
}

export interface Instalacion {
  id: number
  nombre: string
  tipo: string
  descripcion: string | null
  activa: boolean
}

export interface InstalacionAlumno extends Instalacion {
  evaluada: boolean
}

export interface PreguntaInstalacion {
  id: number
  /** null = la pregunta aplica a todas las instalaciones */
  idInstalacion: number | null
  dimension: Dimension
  texto: string
  activa: boolean
}

export interface RespuestaInstalacionItem {
  idPregunta: number
  valor: number
}

export interface ResultadoInstalacion extends Instalacion {
  totalEvaluaciones: number
  promedio: number | null
  porDimension: Record<Dimension, number | null>
  porPregunta: { id: number; dimension: Dimension; texto: string; promedio: number; respuestas: number }[]
  /** Solo el texto, en orden aleatorio y sin datos del alumno */
  comentarios: string[]
}

export interface NuevaInstalacion {
  nombre: string
  tipo: string
  descripcion?: string
}

export interface NuevaPregunta {
  id_instalacion: number | null
  dimension: Dimension
  texto: string
}

// ---------- Alumno ----------

/** GET /api/instalaciones — instalaciones activas y si ya se evaluaron en el ciclo activo */
export function listarInstalacionesAlumnoAPI(token: string) {
  return peticion<{ ciclo: CicloAPI | null; instalaciones: InstalacionAlumno[] }>('/instalaciones', {}, token)
}

/** GET /api/instalaciones/:id/preguntas — cuestionario de una instalación */
export function obtenerPreguntasInstalacionAPI(id: number | string, token: string) {
  return peticion<{
    ciclo: CicloAPI | null
    instalacion: Instalacion
    evaluada: boolean
    preguntas: PreguntaInstalacion[]
  }>(`/instalaciones/${id}/preguntas`, {}, token)
}

/** POST /api/instalaciones/:id/evaluacion */
export function enviarEvaluacionInstalacionAPI(
  id: number | string,
  respuestas: RespuestaInstalacionItem[],
  token: string,
  comentarios?: string
) {
  return peticion<{ mensaje: string; evaluacion?: { id: number; promedio: number } }>(
    `/instalaciones/${id}/evaluacion`,
    { method: 'POST', body: JSON.stringify({ respuestas, comentarios }) },
    token
  )
}

// ---------- Coordinación y Administración ----------

/** GET /api/instalaciones/resultados[?id_ciclo=] — por defecto el ciclo activo */
export function obtenerResultadosInstalacionesAPI(token: string, idCiclo?: number | string) {
  const query = idCiclo !== undefined && idCiclo !== '' ? `?id_ciclo=${encodeURIComponent(String(idCiclo))}` : ''
  return peticion<{ ciclo: CicloAPI | null; instalaciones: ResultadoInstalacion[] }>(
    `/instalaciones/resultados${query}`,
    {},
    token
  )
}

// ---------- Administración ----------

/** GET /api/instalaciones/catalogo — todas, incluidas inactivas */
export function obtenerCatalogoInstalacionesAPI(token: string) {
  return peticion<{ instalaciones: Instalacion[]; preguntas: PreguntaInstalacion[] }>(
    '/instalaciones/catalogo',
    {},
    token
  )
}

/** POST /api/instalaciones */
export function crearInstalacionAPI(datos: NuevaInstalacion, token: string) {
  return peticion<{ mensaje: string; instalacion: Instalacion }>(
    '/instalaciones',
    { method: 'POST', body: JSON.stringify(datos) },
    token
  )
}

/** PATCH /api/instalaciones/:id — editar o activar/desactivar */
export function actualizarInstalacionAPI(
  id: number,
  cambios: Partial<NuevaInstalacion> & { activa?: boolean },
  token: string
) {
  return peticion<{ mensaje: string; instalacion: Instalacion }>(
    `/instalaciones/${id}`,
    { method: 'PATCH', body: JSON.stringify(cambios) },
    token
  )
}

/** POST /api/instalaciones/preguntas */
export function crearPreguntaInstalacionAPI(datos: NuevaPregunta, token: string) {
  return peticion<{ mensaje: string; pregunta: PreguntaInstalacion }>(
    '/instalaciones/preguntas',
    { method: 'POST', body: JSON.stringify(datos) },
    token
  )
}

/** PATCH /api/instalaciones/preguntas/:id — editar o activar/desactivar (nunca se borran) */
export function actualizarPreguntaInstalacionAPI(
  id: number,
  cambios: Partial<NuevaPregunta> & { activa?: boolean },
  token: string
) {
  return peticion<{ mensaje: string; pregunta: PreguntaInstalacion }>(
    `/instalaciones/preguntas/${id}`,
    { method: 'PATCH', body: JSON.stringify(cambios) },
    token
  )
}
