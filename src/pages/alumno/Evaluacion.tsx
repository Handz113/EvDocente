import { useState, useEffect, type FormEvent } from 'react'
import { useParams, useNavigate, Navigate } from '../../router'
import Layout from '../../components/Layout'
import { useAuth } from '../../context/AuthContext'
import {
  PREGUNTAS_INSTITUCIONALES,
  ESCALA_VALORES,
  obtenerMateriasAlumnoAPI,
  enviarEvaluacionAPI,
  ErrorAPI,
  type MateriaItem,
} from '../../services/evaluacionService'

export default function Evaluacion() {
  const { crn } = useParams<{ crn: string }>()
  const { usuario, cerrarSesion } = useAuth()
  const navigate = useNavigate()

  const [respuestas, setRespuestas] = useState<Record<number, number>>({})
  const [comentario, setComentario] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [materia, setMateria] = useState<MateriaItem | null>(null)
  const [cargando, setCargando] = useState(true)

  const sesionVencida = () => {
    cerrarSesion()
    navigate('/alumno', { replace: true })
  }

  useEffect(() => {
    // Se consulta al backend para confirmar que el alumno sí está inscrito en este CRN
    obtenerMateriasAlumnoAPI(usuario?.token || '')
      .then((data) => setMateria(data.materias.find((m) => m.crn === crn) ?? null))
      .catch((err) => {
        if (err instanceof ErrorAPI && err.status === 401) return sesionVencida()
        setError(err.message)
      })
      .finally(() => setCargando(false))
  }, [crn, usuario?.token])

  if (cargando) {
    return (
      <Layout titulo="Alumno" tono="alumno">
        <p className="text-sm text-[#5d6678] text-center">Cargando evaluación...</p>
      </Layout>
    )
  }

  const docente = materia?.docente

  if (!materia) {
    return (
      <Layout titulo="Alumno" tono="alumno">
        <div className="bg-white border border-[#e2e6ef] rounded-2xl p-8 text-center max-w-lg mx-auto shadow-xs">
          <h2 className="text-xl font-bold text-[#1c2333] mb-2">
            {error ? 'No se pudo cargar la evaluación' : 'Materia no encontrada'}
          </h2>
          <p className="text-sm text-[#5d6678] mb-5">
            {error || 'El CRN indicado no corresponde a una materia activa en tu plan de estudios.'}
          </p>
          <button
            onClick={() => navigate('/alumno/inicio')}
            className="px-5 py-2.5 rounded-xl bg-[#2557d6] text-white font-semibold text-xs shadow-sm hover:bg-[#1f47b2] transition-colors"
          >
            Volver a mis materias
          </button>
        </div>
      </Layout>
    )
  }

  if (materia.evaluada) {
    return <Navigate to="/alumno/inicio" replace />
  }

  const contestadas = Object.keys(respuestas).length
  const completa = contestadas === PREGUNTAS_INSTITUCIONALES.length

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    if (!completa) {
      setError(`Debes responder las ${PREGUNTAS_INSTITUCIONALES.length} preguntas institucionales antes de enviar.`)
      return
    }

    setEnviando(true)
    setError('')

    // Convertir el mapa de respuestas al arreglo de 15 calificaciones requeridas por el endpoint
    const arregloCalificaciones = PREGUNTAS_INSTITUCIONALES.map((p) => respuestas[p.id])

    try {
      // POST /api/evaluaciones — el backend registra la evaluación y sus 15 respuestas
      await enviarEvaluacionAPI(materia.crn, arregloCalificaciones, usuario?.token || '', comentario)
      navigate('/alumno/listo', { state: { materia: materia.nombre } })
    } catch (err) {
      if (err instanceof ErrorAPI && err.status === 401) return sesionVencida()
      setError((err as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Layout titulo="Alumno" tono="alumno">
      <form onSubmit={enviar} className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1c2333] mb-1">{materia.nombre}</h1>
          <p className="text-sm text-[#5d6678]">
            {docente?.nombre || 'Docente'} · CRN {materia.crn} · Clave {materia.clave}
          </p>
        </div>

        <div className="flex gap-2.5 items-start bg-[#e8eefc] text-[#2557d6] rounded-xl p-3.5 text-xs leading-relaxed mb-6 border border-[#2557d6]/20">
          <span className="text-base">🔒</span>
          <span className="text-[#1c2333]">
            Esta evaluación es anónima. El docente solo recibirá promedios aritméticos consolidados y métricas por reactivo.
          </span>
        </div>

        <div className="flex justify-between items-center text-xs text-[#5d6678] font-medium mb-1.5">
          <span>{contestadas} de {PREGUNTAS_INSTITUCIONALES.length} preguntas respondidas</span>
          <span>{Math.round((contestadas / PREGUNTAS_INSTITUCIONALES.length) * 100)}%</span>
        </div>
        <div className="h-2 w-full bg-[#e2e6ef] rounded-full overflow-hidden mb-6">
          <div
            className="h-full bg-[#2557d6] rounded-full transition-all duration-300"
            style={{ width: `${(contestadas / PREGUNTAS_INSTITUCIONALES.length) * 100}%` }}
          />
        </div>

        <div className="space-y-4 mb-6">
          {PREGUNTAS_INSTITUCIONALES.map((p, index) => (
            <div
              key={p.id}
              className="bg-white border border-[#e2e6ef] rounded-2xl p-5 shadow-xs"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#2557d6]">
                  Pregunta {index + 1} · {p.categoria}
                </span>
              </div>
              <p className="text-sm font-semibold text-[#1c2333] mb-4">{p.texto}</p>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {ESCALA_VALORES.map((op) => {
                  const seleccionada = respuestas[p.id] === op.valor
                  return (
                    <label
                      key={op.valor}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border cursor-pointer text-center transition-all ${
                        seleccionada
                          ? 'border-[#2557d6] bg-[#e8eefc] text-[#2557d6] shadow-xs'
                          : 'border-[#e2e6ef] bg-[#f4f6fb] text-[#5d6678] hover:border-[#2557d6]/50'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`pregunta_${p.id}`}
                        value={op.valor}
                        checked={seleccionada}
                        onChange={() => {
                          setRespuestas((prev) => ({ ...prev, [p.id]: op.valor }))
                          setError('')
                        }}
                        className="sr-only"
                      />
                      <strong className="text-base font-bold mb-0.5">{op.valor}</strong>
                      <span className="text-[10px] leading-tight font-medium">
                        {op.etiqueta.split('(')[0].trim()}
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white border border-[#e2e6ef] rounded-2xl p-5 shadow-xs mb-6">
          <label htmlFor="comentario" className="block text-xs font-semibold text-[#1c2333] mb-1.5">
            Comentario u observaciones (opcional)
          </label>
          <textarea
            id="comentario"
            rows={3}
            maxLength={500}
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder="¿Qué retroalimentación constructiva aportarías? Evita incluir datos personales."
            className="w-full px-3.5 py-2.5 rounded-xl border border-[#e2e6ef] bg-white text-sm focus:border-[#2557d6] focus:ring-2 focus:ring-[#2557d6]/20 transition-all"
          />
          <div className="flex justify-end mt-1">
            <span className="text-[11px] text-[#5d6678]">{comentario.length}/500</span>
          </div>
        </div>

        {error && <p className="text-xs text-[#dc2626] font-semibold mb-4 text-center">{error}</p>}

        <div className="flex justify-between items-center gap-4">
          <button
            type="button"
            onClick={() => navigate('/alumno/inicio')}
            className="px-5 py-2.5 rounded-xl border border-[#e2e6ef] text-[#5d6678] hover:text-[#1c2333] hover:bg-white text-xs font-semibold transition-all cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!completa || enviando}
            className={`px-6 py-3 rounded-xl font-semibold text-xs text-white shadow-md transition-all ${
              !completa || enviando
                ? 'bg-[#e2e6ef] text-[#5d6678] cursor-not-allowed opacity-70'
                : 'bg-[#2557d6] hover:bg-[#1f47b2] cursor-pointer'
            }`}
          >
            {enviando ? 'Enviando...' : 'Finalizar y enviar evaluación'}
          </button>
        </div>
      </form>
    </Layout>
  )
}
