import { useState } from 'react'

type Screen = 'login' | 'selection' | 'survey' | 'confirmation'

interface Materia {
  id: number
  nombre: string
  docente: string
  completada: boolean
}

const MATERIAS: Materia[] = [
  { id: 1, nombre: 'Cálculo Diferencial', docente: 'Dr. Alejandro Reyes Morales', completada: true },
  { id: 2, nombre: 'Programación Orientada a Objetos', docente: 'Mtra. Sofía Gutiérrez Vázquez', completada: false },
  { id: 3, nombre: 'Álgebra Lineal', docente: 'Dr. Carlos Mendoza Ibarra', completada: false },
  { id: 4, nombre: 'Sistemas Operativos', docente: 'Ing. Patricia Leal Fuentes', completada: false },
  { id: 5, nombre: 'Base de Datos', docente: 'Mtro. Roberto Sánchez Pérez', completada: true },
]

const PREGUNTAS = [
  'El docente explica los temas con claridad y profundidad.',
  'El docente muestra dominio y actualización en la materia.',
  'El docente fomenta la participación activa en clase.',
  'El docente es puntual y cumple con el programa establecido.',
  'El docente brinda retroalimentación oportuna y constructiva.',
]

function IconoUniversidad() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="16" fill="#003366" />
      <path d="M32 10L52 20V24H12V20L32 10Z" fill="white" fillOpacity="0.9" />
      <rect x="15" y="26" width="6" height="20" fill="white" fillOpacity="0.8" />
      <rect x="29" y="26" width="6" height="20" fill="white" fillOpacity="0.8" />
      <rect x="43" y="26" width="6" height="20" fill="white" fillOpacity="0.8" />
      <rect x="10" y="46" width="44" height="4" fill="white" fillOpacity="0.9" />
      <circle cx="32" cy="20" r="3" fill="#003366" />
    </svg>
  )
}

function IconoCheck() {
  return (
    <svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="48" cy="48" r="48" fill="#e8f5e9" />
      <circle cx="48" cy="48" r="38" fill="#003366" />
      <path d="M28 48L42 62L68 36" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ────────────────────────────────────────
// SCREEN 1 — Login
// ────────────────────────────────────────
function PantallaLogin({ onLogin }: { onLogin: () => void }) {
  const [matricula, setMatricula] = useState('')
  const [correo, setCorreo] = useState('')
  const [errors, setErrors] = useState<{ matricula?: string; correo?: string }>({})

  const validate = () => {
    const errs: typeof errors = {}
    if (!matricula.trim()) errs.matricula = 'La matrícula es requerida'
    if (!correo.trim()) errs.correo = 'El correo es requerido'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) errs.correo = 'Ingresa un correo válido'
    return errs
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    onLogin()
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-[#f2f2f2]">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-lg px-8 py-10 flex flex-col items-center gap-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <IconoUniversidad />
          <div className="text-center">
            <p className="text-xs font-medium text-[#888] tracking-widest uppercase" style={{ fontFamily: 'Inter, sans-serif' }}>
              Sistema Institucional
            </p>
            <h1 className="text-2xl font-bold text-[#003366] mt-1 leading-tight" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Evaluación<br />Docente
            </h1>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-[#003366] ml-1" style={{ fontFamily: 'Inter, sans-serif' }}>
              Matrícula
            </label>
            <input
              type="text"
              maxLength={100}
              value={matricula}
              onChange={e => { setMatricula(e.target.value); setErrors(p => ({ ...p, matricula: undefined })) }}
              placeholder="Ingresa tu matrícula"
              className={`w-full px-4 py-3 rounded-2xl border text-sm bg-[#f8f9fc] transition-all focus:border-[#003366] focus:ring-2 focus:ring-[#003366]/20 ${errors.matricula ? 'border-red-400' : 'border-[#e0e0e0]'}`}
              style={{ fontFamily: 'Inter, sans-serif' }}
            />
            {errors.matricula && <p className="text-xs text-red-500 ml-1">{errors.matricula}</p>}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-[#003366] ml-1" style={{ fontFamily: 'Inter, sans-serif' }}>
              Correo Institucional
            </label>
            <input
              type="email"
              maxLength={100}
              value={correo}
              onChange={e => { setCorreo(e.target.value); setErrors(p => ({ ...p, correo: undefined })) }}
              placeholder="correo@institucion.edu.mx"
              className={`w-full px-4 py-3 rounded-2xl border text-sm bg-[#f8f9fc] transition-all focus:border-[#003366] focus:ring-2 focus:ring-[#003366]/20 ${errors.correo ? 'border-red-400' : 'border-[#e0e0e0]'}`}
              style={{ fontFamily: 'Inter, sans-serif' }}
            />
            {errors.correo && <p className="text-xs text-red-500 ml-1">{errors.correo}</p>}
          </div>

          <button
            type="submit"
            className="mt-2 w-full py-3.5 rounded-full bg-[#003366] text-white font-semibold text-sm tracking-wide transition-all hover:bg-[#002244] active:scale-[0.98] shadow-md"
            style={{ fontFamily: 'Poppins, sans-serif' }}
          >
            Iniciar Sesión
          </button>
        </form>

        <p className="text-[11px] text-[#aaa] text-center" style={{ fontFamily: 'Inter, sans-serif' }}>
          ¿Problemas para acceder? Contacta a Control Escolar
        </p>
      </div>
    </div>
  )
}

// ────────────────────────────────────────
// SCREEN 2 — Survey Selection
// ────────────────────────────────────────
function PantallaSeleccion({ onResponder }: { onResponder: (id: number) => void }) {
  const pendientes = MATERIAS.filter(m => !m.completada).length
  const completadas = MATERIAS.filter(m => m.completada).length

  return (
    <div className="min-h-screen flex flex-col bg-[#f2f2f2]">
      {/* Header */}
      <div className="bg-[#003366] px-6 pt-12 pb-8 rounded-b-[2rem] shadow-lg">
        <p className="text-[#a8c4e0] text-xs font-medium tracking-widest uppercase mb-1" style={{ fontFamily: 'Inter, sans-serif' }}>
          Bienvenido de nuevo
        </p>
        <h2 className="text-white text-2xl font-bold leading-tight" style={{ fontFamily: 'Poppins, sans-serif' }}>
          María González López
        </h2>
        <p className="text-[#a8c4e0] text-sm mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>
          Semestre 4° · Ingeniería en Sistemas
        </p>
        <div className="flex gap-4 mt-5">
          <div className="bg-white/10 rounded-2xl px-4 py-2.5 flex-1 text-center">
            <p className="text-white text-xl font-bold" style={{ fontFamily: 'Poppins, sans-serif' }}>{pendientes}</p>
            <p className="text-[#a8c4e0] text-xs" style={{ fontFamily: 'Inter, sans-serif' }}>Pendientes</p>
          </div>
          <div className="bg-white/10 rounded-2xl px-4 py-2.5 flex-1 text-center">
            <p className="text-white text-xl font-bold" style={{ fontFamily: 'Poppins, sans-serif' }}>{completadas}</p>
            <p className="text-[#a8c4e0] text-xs" style={{ fontFamily: 'Inter, sans-serif' }}>Completadas</p>
          </div>
          <div className="bg-white/10 rounded-2xl px-4 py-2.5 flex-1 text-center">
            <p className="text-white text-xl font-bold" style={{ fontFamily: 'Poppins, sans-serif' }}>{MATERIAS.length}</p>
            <p className="text-[#a8c4e0] text-xs" style={{ fontFamily: 'Inter, sans-serif' }}>Total</p>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 px-5 py-6 flex flex-col gap-3 overflow-y-auto">
        <h3 className="text-[#003366] font-semibold text-sm mb-1 px-1" style={{ fontFamily: 'Poppins, sans-serif' }}>
          Mis Encuestas
        </h3>
        {MATERIAS.map(materia => (
          <div
            key={materia.id}
            className="bg-white rounded-2xl px-5 py-4 shadow-sm flex flex-col gap-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[#1a1a2e] text-sm leading-snug" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  {materia.nombre}
                </p>
                <p className="text-[#666] text-xs mt-0.5" style={{ fontFamily: 'Inter, sans-serif' }}>
                  {materia.docente}
                </p>
              </div>
              <span
                className={`shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-full tracking-wide ${
                  materia.completada
                    ? 'bg-[#e8f5e9] text-[#2e7d32]'
                    : 'bg-[#fff8e1] text-[#f57c00]'
                }`}
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                {materia.completada ? '✓ Completada' : 'Pendiente'}
              </span>
            </div>
            <button
              onClick={() => !materia.completada && onResponder(materia.id)}
              disabled={materia.completada}
              className={`w-full py-2.5 rounded-full text-sm font-semibold transition-all ${
                materia.completada
                  ? 'bg-[#f2f2f2] text-[#bbb] cursor-not-allowed'
                  : 'bg-[#003366] text-white hover:bg-[#002244] active:scale-[0.98] shadow-sm'
              }`}
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              {materia.completada ? 'Ya respondida' : 'Responder Encuesta'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ────────────────────────────────────────
// SCREEN 3 — Survey Form
// ────────────────────────────────────────
function PantallaEncuesta({ materiaId, onEnviar }: { materiaId: number; onEnviar: () => void }) {
  const materia = MATERIAS.find(m => m.id === materiaId)!
  const [preguntaActual, setPreguntaActual] = useState(0)
  const [respuestas, setRespuestas] = useState<(number | null)[]>(Array(PREGUNTAS.length).fill(null))
  const [comentarios, setComentarios] = useState('')

  const total = PREGUNTAS.length
  const esUltima = preguntaActual === total - 1
  const progreso = ((preguntaActual + 1) / total) * 100
  const respuestaActual = respuestas[preguntaActual]

  const handleRespuesta = (val: number) => {
    setRespuestas(prev => { const n = [...prev]; n[preguntaActual] = val; return n })
  }

  const handleSiguiente = () => {
    if (esUltima) { onEnviar(); return }
    setPreguntaActual(p => p + 1)
  }

  const etiquetas: Record<number, string> = {
    1: 'En desacuerdo',
    2: 'Poco de acuerdo',
    3: 'Neutral',
    4: 'De acuerdo',
    5: 'Muy de acuerdo',
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f2f2f2]">
      {/* Fixed header */}
      <div className="bg-[#003366] px-6 pt-10 pb-5">
        <p className="text-[#a8c4e0] text-xs tracking-wide uppercase mb-1" style={{ fontFamily: 'Inter, sans-serif' }}>
          Evaluando
        </p>
        <h2 className="text-white font-bold text-lg leading-snug" style={{ fontFamily: 'Poppins, sans-serif' }}>
          {materia.nombre}
        </h2>
        <p className="text-[#a8c4e0] text-sm mt-0.5" style={{ fontFamily: 'Inter, sans-serif' }}>
          {materia.docente}
        </p>

        {/* Progress bar */}
        <div className="mt-5">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[#a8c4e0] text-xs" style={{ fontFamily: 'Inter, sans-serif' }}>
              Pregunta {preguntaActual + 1} de {total}
            </span>
            <span className="text-white text-xs font-semibold" style={{ fontFamily: 'Inter, sans-serif' }}>
              {Math.round(progreso)}%
            </span>
          </div>
          <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-500"
              style={{ width: `${progreso}%` }}
            />
          </div>
        </div>
      </div>

      {/* Question content */}
      <div className="flex-1 overflow-y-auto px-5 py-6 flex flex-col gap-5">
        <div className="bg-white rounded-2xl px-6 py-6 shadow-sm">
          <p className="text-[#003366] font-semibold text-base leading-relaxed" style={{ fontFamily: 'Poppins, sans-serif' }}>
            {PREGUNTAS[preguntaActual]}
          </p>
        </div>

        {/* Scale */}
        <div className="bg-white rounded-2xl px-6 py-6 shadow-sm">
          <p className="text-[#888] text-xs mb-4 text-center" style={{ fontFamily: 'Inter, sans-serif' }}>
            Selecciona tu respuesta
          </p>
          <div className="flex justify-between gap-2">
            {[1, 2, 3, 4, 5].map(val => (
              <button
                key={val}
                onClick={() => handleRespuesta(val)}
                className={`flex-1 flex flex-col items-center gap-2 py-3 rounded-2xl border-2 transition-all ${
                  respuestaActual === val
                    ? 'border-[#003366] bg-[#003366]'
                    : 'border-[#e0e0e0] bg-[#f8f9fc] hover:border-[#003366]/40'
                }`}
              >
                <span
                  className={`text-lg font-bold ${respuestaActual === val ? 'text-white' : 'text-[#003366]'}`}
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                >
                  {val}
                </span>
              </button>
            ))}
          </div>
          {/* Labels row */}
          <div className="flex justify-between mt-3 px-1">
            <span className="text-[10px] text-[#888] max-w-[60px] text-left leading-tight" style={{ fontFamily: 'Inter, sans-serif' }}>
              {etiquetas[1]}
            </span>
            <span className="text-[10px] text-[#888] max-w-[60px] text-right leading-tight" style={{ fontFamily: 'Inter, sans-serif' }}>
              {etiquetas[5]}
            </span>
          </div>
          {respuestaActual && (
            <p className="text-center text-sm font-medium text-[#003366] mt-3" style={{ fontFamily: 'Inter, sans-serif' }}>
              {etiquetas[respuestaActual]}
            </p>
          )}
        </div>

        {/* Comments – only last question */}
        {esUltima && (
          <div className="bg-white rounded-2xl px-6 py-5 shadow-sm">
            <label className="text-xs font-semibold text-[#003366] block mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
              Comentarios adicionales (opcional)
            </label>
            <textarea
              rows={4}
              value={comentarios}
              onChange={e => setComentarios(e.target.value)}
              placeholder="Comentarios adicionales (opcional)"
              className="w-full text-sm bg-[#f8f9fc] border border-[#e0e0e0] rounded-xl px-4 py-3 resize-none focus:border-[#003366] focus:ring-2 focus:ring-[#003366]/20 transition-all"
              style={{ fontFamily: 'Inter, sans-serif' }}
            />
          </div>
        )}
      </div>

      {/* Fixed bottom nav */}
      <div className="bg-white border-t border-[#e0e0e0] px-5 py-4 flex gap-3">
        <button
          onClick={() => setPreguntaActual(p => Math.max(0, p - 1))}
          disabled={preguntaActual === 0}
          className={`flex-1 py-3.5 rounded-full border-2 text-sm font-semibold transition-all ${
            preguntaActual === 0
              ? 'border-[#e0e0e0] text-[#ccc] cursor-not-allowed'
              : 'border-[#003366] text-[#003366] hover:bg-[#003366]/5 active:scale-[0.98]'
          }`}
          style={{ fontFamily: 'Poppins, sans-serif' }}
        >
          Anterior
        </button>
        <button
          onClick={handleSiguiente}
          disabled={respuestaActual === null}
          className={`flex-[1.5] py-3.5 rounded-full text-sm font-semibold transition-all shadow-md ${
            respuestaActual === null
              ? 'bg-[#ccc] text-white cursor-not-allowed'
              : esUltima
              ? 'bg-[#003366] text-white hover:bg-[#002244] active:scale-[0.98] ring-2 ring-[#003366]/30'
              : 'bg-[#003366] text-white hover:bg-[#002244] active:scale-[0.98]'
          }`}
          style={{ fontFamily: 'Poppins, sans-serif' }}
        >
          {esUltima ? 'Enviar Evaluación' : 'Siguiente'}
        </button>
      </div>
    </div>
  )
}

// ────────────────────────────────────────
// SCREEN 4 — Confirmation
// ────────────────────────────────────────
function PantallaConfirmacion({ onVolver }: { onVolver: () => void }) {
  const now = new Date()
  const fecha = now.toLocaleDateString('es-MX', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
  const hora = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f2f2f2] px-6 py-12">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-lg px-8 py-12 flex flex-col items-center gap-6 text-center">
        <IconoCheck />

        <div className="flex flex-col gap-2">
          <h2 className="text-[#003366] text-2xl font-bold leading-tight" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Tu evaluación fue enviada correctamente
          </h2>
          <p className="text-[#888] text-sm leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
            Gracias por participar en la evaluación docente. Tu opinión contribuye a mejorar la calidad educativa.
          </p>
        </div>

        <div className="w-full bg-[#f2f2f2] rounded-2xl px-5 py-4">
          <p className="text-[#888] text-xs uppercase tracking-widest mb-1" style={{ fontFamily: 'Inter, sans-serif' }}>
            Fecha y hora de envío
          </p>
          <p className="text-[#003366] font-semibold text-sm" style={{ fontFamily: 'Poppins, sans-serif' }}>
            {fecha}, {hora} hrs
          </p>
        </div>

        <div className="w-full flex flex-col gap-2">
          <div className="flex justify-between text-sm px-1">
            <span className="text-[#888]" style={{ fontFamily: 'Inter, sans-serif' }}>Encuestas completadas</span>
            <span className="font-semibold text-[#2e7d32]" style={{ fontFamily: 'Poppins, sans-serif' }}>3 / 5</span>
          </div>
          <div className="w-full h-2 bg-[#e0e0e0] rounded-full overflow-hidden">
            <div className="h-full bg-[#003366] rounded-full" style={{ width: '60%' }} />
          </div>
          <p className="text-[10px] text-[#aaa]" style={{ fontFamily: 'Inter, sans-serif' }}>
            Aún tienes encuestas pendientes por completar
          </p>
        </div>

        <button
          onClick={onVolver}
          className="w-full py-3.5 rounded-full bg-[#003366] text-white font-semibold text-sm tracking-wide transition-all hover:bg-[#002244] active:scale-[0.98] shadow-md"
          style={{ fontFamily: 'Poppins, sans-serif' }}
        >
          Volver al Inicio
        </button>
      </div>
    </div>
  )
}

// ────────────────────────────────────────
// ROOT
// ────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState<Screen>('login')
  const [materiaSeleccionada, setMateriaSeleccionada] = useState<number | null>(null)

  const handleResponder = (id: number) => {
    setMateriaSeleccionada(id)
    setScreen('survey')
  }

  return (
    <div className="max-w-md mx-auto min-h-screen shadow-2xl overflow-hidden relative">
      {/* Screen navigation pills */}
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex gap-1.5 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-lg border border-[#e0e0e0]">
        {(['login', 'selection', 'survey', 'confirmation'] as Screen[]).map((s, i) => (
          <button
            key={s}
            onClick={() => {
              if (s === 'survey' && !materiaSeleccionada) setMateriaSeleccionada(2)
              setScreen(s)
            }}
            className={`text-[10px] font-semibold px-2.5 py-1 rounded-full transition-all ${
              screen === s ? 'bg-[#003366] text-white' : 'text-[#888] hover:text-[#003366]'
            }`}
            style={{ fontFamily: 'Poppins, sans-serif' }}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {screen === 'login' && <PantallaLogin onLogin={() => setScreen('selection')} />}
      {screen === 'selection' && <PantallaSeleccion onResponder={handleResponder} />}
      {screen === 'survey' && materiaSeleccionada !== null && (
        <PantallaEncuesta materiaId={materiaSeleccionada} onEnviar={() => setScreen('confirmation')} />
      )}
      {screen === 'confirmation' && <PantallaConfirmacion onVolver={() => setScreen('selection')} />}
    </div>
  )
}
