import { useState, useEffect, type FormEvent } from 'react'
import { useParams, useNavigate } from '../../router'
import Layout from '../../components/Layout'
import { useAuth } from '../../context/AuthContext'
import { ESCALA_VALORES, ErrorAPI } from '../../services/evaluacionService'
import {
  DIMENSIONES,
  obtenerPreguntasInstalacionAPI,
  enviarEvaluacionInstalacionAPI,
  type Instalacion,
  type PreguntaInstalacion,
} from '../../services/instalacionService'

export default function EvaluacionInstalacion() {
  const { id } = useParams<{ id: string }>()
  const { usuario, cerrarSesion } = useAuth()
  const navigate = useNavigate()

  const [instalacion, setInstalacion] = useState<Instalacion | null>(null)
  const [preguntas, setPreguntas] = useState<PreguntaInstalacion[]>([])
  const [evaluada, setEvaluada] = useState(false)
  const [respuestas, setRespuestas] = useState<Record<number, number>>({})
  const [comentario, setComentario] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(true)
  const [enviando, setEnviando] = useState(false)

  const sesionVencida = () => {
    cerrarSesion()
    navigate('/alumno', { replace: true })
  }

  useEffect(() => {
    // GET /api/instalaciones/:id/preguntas — preguntas activas (generales + propias)
    obtenerPreguntasInstalacionAPI(id || '', usuario?.token || '')
      .then((data) => {
        setInstalacion(data.instalacion)
        setPreguntas(data.preguntas)
        setEvaluada(data.evaluada)
      })
      .catch((err) => {
        if (err instanceof ErrorAPI && err.status === 401) return sesionVencida()
        setError(err.message)
      })
      .finally(() => setCargando(false))
  }, [id, usuario?.token])

  if (cargando) {
    return (
      <Layout titulo="Alumno" tono="alumno">
        <p className="text-sm text-[#5d6678] text-center">Cargando evaluación...</p>
      </Layout>
    )
  }

  if (!instalacion || evaluada || preguntas.length === 0) {
    const titulo = !instalacion
      ? 'No se pudo cargar la instalación'
      : evaluada
        ? 'Instalación ya evaluada'
        : 'Sin preguntas activas'
    const detalle = !instalacion
      ? error || 'La instalación no existe o no está activa.'
      : evaluada
        ? `Ya evaluaste "${instalacion.nombre}" en este ciclo. Solo se permite una evaluación por ciclo.`
        : 'Esta instalación todavía no tiene preguntas activas para evaluar.'
    return (
      <Layout titulo="Alumno" tono="alumno">
        <div className="bg-white border border-[#e2e6ef] rounded-2xl p-8 text-center max-w-lg mx-auto shadow-xs">
          <h2 className="text-xl font-bold text-[#1c2333] mb-2">{titulo}</h2>
          <p className="text-sm text-[#5d6678] mb-5">{detalle}</p>
          <button
            onClick={() => navigate('/alumno/inicio')}
            className="px-5 py-2.5 rounded-xl bg-[#2557d6] text-white font-semibold text-xs shadow-sm hover:bg-[#1f47b2] transition-colors cursor-pointer"
          >
            Volver al inicio
          </button>
        </div>
      </Layout>
    )
  }

  const total = preguntas.length
  const contestadas = preguntas.filter((p) => respuestas[p.id] !== undefined).length
  const completa = contestadas === total
  const pct = Math.round((contestadas / total) * 100)

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    if (!completa) {
      setError(`Debes responder las ${total} preguntas antes de enviar.`)
      return
    }

    setEnviando(true)
    setError('')
    try {
      // POST /api/instalaciones/:id/evaluacion
      await enviarEvaluacionInstalacionAPI(
        instalacion.id,
        preguntas.map((p) => ({ idPregunta: p.id, valor: respuestas[p.id] })),
        usuario?.token || '',
        comentario
      )
      navigate('/alumno/listo', { state: { instalacion: instalacion.nombre } })
    } catch (err) {
      if (err instanceof ErrorAPI && err.status === 401) return sesionVencida()
      setError((err as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  let numero = 0

  return (
    <Layout titulo="Alumno" tono="alumno">
      <form onSubmit={enviar} className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1c2333] mb-1">{instalacion.nombre}</h1>
          <p className="text-sm text-[#5d6678]">
            {instalacion.tipo}
            {instalacion.descripcion ? ` · ${instalacion.descripcion}` : ''}
          </p>
        </div>

        <div className="flex gap-2.5 items-start bg-[#e8eefc] text-[#2557d6] rounded-xl p-3.5 text-xs leading-relaxed mb-6 border border-[#2557d6]/20">
          <span className="text-base">🔒</span>
          <span className="text-[#1c2333]">
            Esta evaluación es anónima. Coordinación y Administración solo verán promedios consolidados y
            comentarios sin tu nombre ni matrícula.
          </span>
        </div>

        <div className="flex justify-between items-center text-xs text-[#5d6678] font-medium mb-1.5">
          <span>
            {contestadas} de {total} preguntas respondidas
          </span>
          <span>{pct}%</span>
        </div>
        <div className="h-2 w-full bg-[#e2e6ef] rounded-full overflow-hidden mb-6">
          <div
            className="h-full bg-[#2557d6] rounded-full transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>

        {DIMENSIONES.map((dim) => {
          const grupo = preguntas.filter((p) => p.dimension === dim)
          if (grupo.length === 0) return null
          return (
            <section key={dim} className="mb-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#2557d6] mb-3">{dim}</h2>
              <div className="space-y-4">
                {grupo.map((p) => {
                  numero += 1
                  return (
                    <div key={p.id} className="bg-white border border-[#e2e6ef] rounded-2xl p-5 shadow-xs">
                      <span className="block text-[11px] font-bold uppercase tracking-wider text-[#2557d6] mb-1">
                        Pregunta {numero} · {p.dimension}
                      </span>
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
                  )
                })}
              </div>
            </section>
          )
        })}

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
            placeholder="¿Qué mejorarías de esta instalación? Evita incluir datos personales."
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
