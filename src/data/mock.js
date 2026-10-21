// =====================================================================
//  DATOS DE EJEMPLO (temporales)
//  Cuando exista el backend, estas funciones se reemplazan por llamadas
//  a la API (fetch/axios). Las pantallas no tendrán que cambiar.
// =====================================================================

export const periodoActual = {
  id: 'P2026-OTO',
  nombre: 'Otoño 2026',
  inicio: '2026-10-12',
  fin: '2026-10-30',
  activo: true,
}

export const preguntas = [
  { id: 1, categoria: 'Dominio del tema', texto: 'El docente demuestra dominio de los temas de la materia.' },
  { id: 2, categoria: 'Claridad', texto: 'Explica los temas de forma clara y comprensible.' },
  { id: 3, categoria: 'Puntualidad', texto: 'Inicia y termina las clases a tiempo.' },
  { id: 4, categoria: 'Evaluación', texto: 'Los criterios de evaluación son claros y justos.' },
  { id: 5, categoria: 'Trato', texto: 'Mantiene un trato respetuoso con los alumnos.' },
  { id: 6, categoria: 'Retroalimentación', texto: 'Da retroalimentación útil sobre tareas y exámenes.' },
]

export const escala = [
  { valor: 1, etiqueta: 'Muy en desacuerdo' },
  { valor: 2, etiqueta: 'En desacuerdo' },
  { valor: 3, etiqueta: 'Neutral' },
  { valor: 4, etiqueta: 'De acuerdo' },
  { valor: 5, etiqueta: 'Muy de acuerdo' },
]

export const docentes = [
  { id: 'D01', nombre: 'Mtra. Laura Mendoza', area: 'Sistemas', correo: 'laura.mendoza@uvm.edu.mx' },
  { id: 'D02', nombre: 'Ing. Roberto Salas', area: 'Sistemas', correo: 'roberto.salas@uvm.edu.mx' },
  { id: 'D03', nombre: 'Dra. Patricia Núñez', area: 'Ciencias Básicas', correo: 'patricia.nunez@uvm.edu.mx' },
  { id: 'D04', nombre: 'Mtro. Javier Ortega', area: 'Sistemas', correo: 'javier.ortega@uvm.edu.mx' },
]

export const materias = [
  { crn: '40211', clave: 'BDA0201', nombre: 'Bases de Datos Avanzadas', docenteId: 'D01', grupo: '501' },
  { crn: '40215', clave: 'ANSI0301G', nombre: 'Diseño y Gestión de Sistemas', docenteId: 'D02', grupo: '501' },
  { crn: '40230', clave: 'MAT0302', nombre: 'Probabilidad y Estadística', docenteId: 'D03', grupo: '502' },
  { crn: '40242', clave: 'RED0401', nombre: 'Middleware y Sistemas Distribuidos', docenteId: 'D04', grupo: '501' },
  { crn: '40250', clave: 'BDA0201', nombre: 'Bases de Datos Avanzadas', docenteId: 'D01', grupo: '503' },
]

// Alumnos inscritos (solo se usan para iniciar sesión y saber qué materias tiene)
export const alumnos = [
  { matricula: '010101', nombre: 'Alumno Demo', crns: ['40211', '40215', '40230', '40242'] },
]

// Cuentas de personal para el demo
export const personal = [
  { usuario: 'D01', area: 'docente', nombre: 'Mtra. Laura Mendoza', docenteId: 'D01' },
  { usuario: 'coord', area: 'coordinacion', nombre: 'Coordinación de Sistemas' },
  { usuario: 'admin', area: 'administracion', nombre: 'Administrador del sistema' },
]

// ---------------------------------------------------------------------
// ANONIMATO: dos "tablas" separadas
//  1) registroEvaluado: solo sabe QUIÉN ya evaluó QUÉ CRN (sin respuestas)
//  2) respuestas: solo guarda CRN + periodo + calificaciones (sin alumno)
//  Así nunca se puede unir una respuesta con un alumno.
// ---------------------------------------------------------------------
const registroEvaluado = new Set() // claves "matricula|crn|periodo"

const respuestas = [
  // Datos de ejemplo ya capturados
  ...generarEjemplos('40211', [5, 4, 5, 4, 5, 4], 18),
  ...generarEjemplos('40215', [4, 4, 3, 4, 5, 3], 15),
  ...generarEjemplos('40230', [3, 3, 4, 3, 4, 3], 12),
  ...generarEjemplos('40242', [5, 5, 4, 5, 5, 5], 20),
  ...generarEjemplos('40250', [4, 5, 5, 4, 4, 4], 9),
]

function generarEjemplos(crn, base, n) {
  const lista = []
  const comentarios = [
    'Explica muy bien, me gustan los ejemplos prácticos.',
    'Podría dar más retroalimentación en las tareas.',
    'Excelente clase.',
    'A veces va muy rápido con los temas.',
    'Las prácticas en laboratorio ayudan mucho.',
    'Me gustaría que subiera el material antes de clase.',
    'Resuelve dudas con paciencia.',
    'Los exámenes no siempre coinciden con lo visto en clase.',
    'Muy puntual y organizado.',
    'Sería bueno tener más ejercicios de repaso.',
  ]
  const desfase = Number(crn) % comentarios.length
  for (let i = 0; i < n; i++) {
    const calificaciones = {}
    base.forEach((v, idx) => {
      const ruido = [-1, 0, 0, 0, 1][(i + idx) % 5]
      calificaciones[idx + 1] = Math.min(5, Math.max(1, v + ruido))
    })
    lista.push({ crn, periodo: periodoActual.id, calificaciones, comentario: i % 3 === 2 ? '' : comentarios[(i + desfase) % comentarios.length] })
  }
  return lista
}

// =========================== "API" ===================================

export function buscarAlumno(matricula) {
  return alumnos.find((a) => a.matricula === matricula)
}

export function materiasDeAlumno(matricula) {
  const alumno = buscarAlumno(matricula)
  if (!alumno) return []
  return alumno.crns
    .map((crn) => materias.find((m) => m.crn === crn))
    .filter(Boolean)
    .map((m) => ({
      ...m,
      docente: docentes.find((d) => d.id === m.docenteId),
      evaluada: registroEvaluado.has(`${matricula}|${m.crn}|${periodoActual.id}`),
    }))
}

export function materiaPorCrn(crn) {
  const m = materias.find((x) => x.crn === crn)
  if (!m) return null
  return { ...m, docente: docentes.find((d) => d.id === m.docenteId) }
}

export function enviarEvaluacion(matricula, crn, calificaciones, comentario) {
  const clave = `${matricula}|${crn}|${periodoActual.id}`
  if (registroEvaluado.has(clave)) throw new Error('Ya evaluaste esta materia en este periodo.')
  // 1) Se marca que el alumno ya evaluó (sin respuestas)
  registroEvaluado.add(clave)
  // 2) Se guarda la respuesta SIN datos del alumno
  respuestas.push({ crn, periodo: periodoActual.id, calificaciones, comentario: comentario.trim() })
}

export function resultadosPorCrn(crn) {
  const lista = respuestas.filter((r) => r.crn === crn && r.periodo === periodoActual.id)
  const total = lista.length
  const porPregunta = preguntas.map((p) => {
    const suma = lista.reduce((acc, r) => acc + (r.calificaciones[p.id] || 0), 0)
    return { ...p, promedio: total ? suma / total : 0 }
  })
  const general = total ? porPregunta.reduce((a, p) => a + p.promedio, 0) / porPregunta.length : 0
  // Se barajan los comentarios para que el orden no revele quién escribió qué
  const comentarios = lista.map((r) => r.comentario).filter(Boolean).sort(() => Math.random() - 0.5)
  return { total, porPregunta, general, comentarios }
}

export function resumenDocentes() {
  return docentes.map((d) => {
    const suyas = materias.filter((m) => m.docenteId === d.id)
    const res = suyas.map((m) => ({ materia: m, ...resultadosPorCrn(m.crn) }))
    const total = res.reduce((a, r) => a + r.total, 0)
    const general = total ? res.reduce((a, r) => a + r.general * r.total, 0) / total : 0
    return { docente: d, materias: res, total, general }
  })
}

export const MIN_RESPUESTAS_PARA_MOSTRAR = 5 // protege el anonimato en grupos pequeños
