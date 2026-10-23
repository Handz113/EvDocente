import { useState, useEffect } from 'react'
import Layout from '../../../components/Layout'
import Barra from '../../../components/Barra'
import { useAuth } from '../../../context/AuthContext'
import { useNavigate } from '../../../router'
import {
  obtenerMiPromedioAPI,
  obtenerMisResultadosAPI,
  ErrorAPI,
  type ClasificacionDocenteAPI,
  type GrupoResultados,
} from '../../../services/evaluacionService'

export default function PanelDocente() {
  const { usuario, cerrarSesion } = useAuth()
  const navigate = useNavigate()

  const [misGrupos, setMisGrupos] = useState<GrupoResultados[]>([])
  const [crn, setCrn] = useState<string>('')
  const [desempenoAPI, setDesempenoAPI] = useState<ClasificacionDocenteAPI | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = usuario?.token || ''
    // GET /api/evaluaciones/mi-promedio y GET /api/docentes/me/resultados
    Promise.all([obtenerMiPromedioAPI(token), obtenerMisResultadosAPI(token)])
      .then(([promedio, resultados]) => {
        setDesempenoAPI(promedio)
        setMisGrupos(resultados.grupos)
        setCrn(resultados.grupos[0]?.crn || '')
      })
      .catch((err) => {
        if (err instanceof ErrorAPI && err.status === 401) {
          cerrarSesion()
          navigate('/personal/docente/login', { replace: true })
          return
        }
        setError(err.message)
      })
      .finally(() => setCargando(false))
  }, [usuario?.token])

  const grupo = misGrupos.find((m) => m.crn === crn) || misGrupos[0]
  const promedioGeneral = desempenoAPI?.promedio ?? null
  const totalRespuestas = desempenoAPI?.totalEvaluaciones ?? 0

  return (
    <Layout titulo="Docente" tono="personal">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1c2333] mb-1">Resultados y Desempeño Docente</h1>
        <p className="text-sm text-[#5d6678]">
          Promedios calculados en tiempo real a partir de las evaluaciones anónimas de tus alumnos.
        </p>
        {error && (
          <p className="text-sm text-[#dc2626] font-medium bg-[#fee2e2] rounded-xl p-3 mt-4">{error}</p>
        )}
      </div>

      {/* Indicadores KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-[#e2e6ef] rounded-2xl p-5 shadow-xs">
          <div className="text-3xl font-extrabold text-[#0f766e]">
            {promedioGeneral !== null ? promedioGeneral.toFixed(1) : 'S/E'}
          </div>
          <div className="text-xs font-semibold text-[#5d6678] mt-1">
            Promedio General (0 - 10)
          </div>
        </div>

        <div className="bg-white border border-[#e2e6ef] rounded-2xl p-5 shadow-xs">
          <div className="text-3xl font-extrabold text-[#0f766e]">
            {cargando ? '...' : totalRespuestas}
          </div>
          <div className="text-xs font-semibold text-[#5d6678] mt-1">
            Evaluaciones Recibidas
          </div>
        </div>

        <div className="bg-white border border-[#e2e6ef] rounded-2xl p-5 shadow-xs">
          <div className="text-2xl font-bold text-[#1c2333]">
            {cargando ? 'Calculando...' : desempenoAPI?.categoria || '—'}
          </div>
          <div className="text-xs font-semibold text-[#5d6678] mt-1">
            Clasificación Institucional
          </div>
        </div>

        <div className="bg-white border border-[#e2e6ef] rounded-2xl p-5 shadow-xs">
          <span
            className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
              desempenoAPI?.aptoParaAsignacion
                ? 'bg-[#e7f6ec] text-[#15803d]'
                : 'bg-[#fee2e2] text-[#dc2626]'
            }`}
          >
            {desempenoAPI?.aptoParaAsignacion ? 'Apto para Asignar' : 'No Asignable'}
          </span>
          <div className="text-xs font-semibold text-[#5d6678] mt-2">
            Estatus Próximo Periodo
          </div>
        </div>
      </div>

      {/* Selector de CRN y desglose */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <h2 className="text-lg font-bold text-[#1c2333]">Desglose por Asignatura</h2>
        {misGrupos.length > 0 && (
          <select
            className="px-3.5 py-2 rounded-xl border border-[#e2e6ef] bg-white text-xs font-semibold text-[#1c2333] focus:border-[#0f766e]"
            value={crn}
            onChange={(e) => setCrn(e.target.value)}
          >
            {misGrupos.map((m) => (
              <option key={m.crn} value={m.crn}>
                {m.nombre} (CRN {m.crn})
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-[#e2e6ef] rounded-2xl p-6 shadow-xs">
          <h3 className="text-base font-bold text-[#1c2333] mb-1">
            {grupo?.nombre || 'Materia seleccionada'}
          </h3>
          <p className="text-xs text-[#5d6678] mb-6">
            Métricas de las 15 preguntas institucionales
          </p>

          <div className="space-y-4 max-h-[460px] overflow-y-auto pr-2">
            {grupo && grupo.porPregunta.length === 0 && (
              <p className="text-xs text-[#5d6678]">Este grupo aún no tiene evaluaciones.</p>
            )}
            {grupo?.porPregunta.map((p) => (
              <div key={p.id} className="grid grid-cols-[160px_1fr] sm:grid-cols-[180px_1fr] gap-3 items-center text-xs">
                <span className="font-medium text-[#1c2333] truncate" title={p.texto}>
                  {p.texto}
                </span>
                <Barra valor={p.promedio} max={10} />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-[#e2e6ef] rounded-2xl p-6 shadow-xs flex flex-col">
          <h3 className="text-base font-bold text-[#1c2333] mb-1">
            Comentarios Cualitativos Anónimos
          </h3>
          <p className="text-xs text-[#5d6678] mb-4">
            Retroalimentación desvinculada de datos de identidad del alumnado
          </p>

          <div className="space-y-3 overflow-y-auto max-h-[400px] flex-1">
            {grupo && grupo.comentarios.length === 0 && (
              <p className="text-xs text-[#5d6678]">Sin comentarios para este grupo.</p>
            )}
            {grupo?.comentarios.map((c, i) => (
              <div key={i} className="p-3.5 bg-[#f4f6fb] border border-[#e2e6ef] rounded-xl text-xs text-[#1c2333] italic">
                “{c}”
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  )
}
