import { useState, useEffect } from 'react'
import Layout from '../../../components/Layout'
import Barra from '../../../components/Barra'
import ParticipacionAlumnos from '../../../components/ParticipacionAlumnos'
import ResultadosInstalaciones from '../../../components/ResultadosInstalaciones'
import { useAuth } from '../../../context/AuthContext'
import { useNavigate } from '../../../router'
import {
  listarDocentesAPI,
  obtenerPromedioDocenteAPI,
  obtenerResultadosDocenteAPI,
  ErrorAPI,
  type DocenteAPI,
  type GrupoResultados,
} from '../../../services/evaluacionService'

interface DocenteConMetricas {
  id: string
  nombre: string
  area: string
  correo?: string
  materias: DocenteAPI['materias']
  promedio: number | null
  totalEvaluaciones: number
  categoria: string
  apto: boolean
}

export default function PanelCoordinacion() {
  const { usuario, cerrarSesion } = useAuth()
  const navigate = useNavigate()
  const [area, setArea] = useState('todas')
  const [orden, setOrden] = useState<'mayor' | 'menor'>('mayor')
  const [seleccionId, setSeleccionId] = useState<string | null>(null)
  const [listaDocentes, setListaDocentes] = useState<DocenteConMetricas[]>([])
  const [error, setError] = useState('')
  const [resultados, setResultados] = useState<GrupoResultados[]>([])
  const [cargandoDetalle, setCargandoDetalle] = useState(false)
  const [errorDetalle, setErrorDetalle] = useState('')

  const sesionVencida = () => {
    cerrarSesion()
    navigate('/personal/coordinacion/login', { replace: true })
  }

  useEffect(() => {
    if (!seleccionId) return
    let vigente = true
    setResultados([])
    setErrorDetalle('')
    setCargandoDetalle(true)
    // GET /api/docentes/:id/resultados — desglose por CRN, comentarios anónimos
    obtenerResultadosDocenteAPI(seleccionId, usuario?.token || '')
      .then((data) => vigente && setResultados(data.grupos))
      .catch((err) => {
        if (!vigente) return
        if (err instanceof ErrorAPI && err.status === 401) return sesionVencida()
        setErrorDetalle(err.message)
      })
      .finally(() => vigente && setCargandoDetalle(false))
    // Si se elige otro docente antes de que responda, se ignora la respuesta anterior
    return () => {
      vigente = false
    }
  }, [seleccionId, usuario?.token])

  useEffect(() => {
    const token = usuario?.token || ''
    const consultarDocentes = async () => {
      // GET /api/docentes y, por cada uno, GET /api/evaluaciones/promedio/:id
      const docentes = await listarDocentesAPI(token)
      const metricas: DocenteConMetricas[] = await Promise.all(
        docentes.map(async (d) => {
          const apiRes = await obtenerPromedioDocenteAPI(d.id, token)
          return {
            id: d.id,
            nombre: d.nombre,
            area: d.area,
            correo: d.correo,
            materias: d.materias,
            promedio: apiRes.promedio,
            totalEvaluaciones: apiRes.totalEvaluaciones,
            categoria: apiRes.categoria,
            apto: apiRes.aptoParaAsignacion,
          }
        })
      )
      setListaDocentes(metricas)
    }

    consultarDocentes().catch((err) => {
      if (err instanceof ErrorAPI && err.status === 401) return sesionVencida()
      setError(err.message)
    })
  }, [usuario?.token])

  const areasDisponibles = [...new Set(listaDocentes.map((r) => r.area))]

  const listaFiltrada = listaDocentes
    .filter((r) => area === 'todas' || r.area === area)
    .sort((a, b) => {
      // Los docentes sin evaluaciones van al final en ambos órdenes
      if (a.promedio === null) return 1
      if (b.promedio === null) return -1
      return orden === 'mayor' ? b.promedio - a.promedio : a.promedio - b.promedio
    })

  const totalRespuestas = listaFiltrada.reduce((a, r) => a + r.totalEvaluaciones, 0)
  const promedioGeneral = totalRespuestas
    ? listaFiltrada.reduce((a, r) => a + (r.promedio ?? 0) * r.totalEvaluaciones, 0) / totalRespuestas
    : 0
  const enRiesgo = listaFiltrada.filter((r) => r.promedio !== null && r.promedio < 7.0).length

  const docenteDetalle = seleccionId ? listaDocentes.find((d) => d.id === seleccionId) : null

  return (
    <Layout titulo="Coordinación" tono="personal">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1c2333] mb-1">Panel de Coordinación Académica</h1>
        <p className="text-sm text-[#5d6678]">
          Monitoreo de desempeño para asignación docente del ciclo activo.
        </p>
        {error && (
          <p className="text-sm text-[#dc2626] font-medium bg-[#fee2e2] rounded-xl p-3 mt-4">{error}</p>
        )}
      </div>

      {/* Tarjetas KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-[#e2e6ef] rounded-2xl p-5 shadow-xs">
          <div className="text-3xl font-extrabold text-[#0f766e]">
            {promedioGeneral.toFixed(1)}
          </div>
          <div className="text-xs font-semibold text-[#5d6678] mt-1">Promedio General Institucional</div>
        </div>

        <div className="bg-white border border-[#e2e6ef] rounded-2xl p-5 shadow-xs">
          <div className="text-3xl font-extrabold text-[#0f766e]">
            {totalRespuestas}
          </div>
          <div className="text-xs font-semibold text-[#5d6678] mt-1">Evaluaciones Recibidas</div>
        </div>

        <div className="bg-white border border-[#e2e6ef] rounded-2xl p-5 shadow-xs">
          <div className="text-3xl font-extrabold text-[#0f766e]">
            {listaFiltrada.length}
          </div>
          <div className="text-xs font-semibold text-[#5d6678] mt-1">Docentes Monitoreados</div>
        </div>

        <div className="bg-white border border-[#e2e6ef] rounded-2xl p-5 shadow-xs">
          <div className={`text-3xl font-extrabold ${enRiesgo > 0 ? 'text-[#dc2626]' : 'text-[#15803d]'}`}>
            {enRiesgo}
          </div>
          <div className="text-xs font-semibold text-[#5d6678] mt-1">No Aptos (&lt; 7.0)</div>
        </div>
      </div>

      {/* Tabla con Filtros */}
      <div className="bg-white border border-[#e2e6ef] rounded-2xl p-6 shadow-xs mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
          <h2 className="text-lg font-bold text-[#1c2333]">Evaluación por Docente</h2>
          <div className="flex gap-2 flex-wrap">
            <select
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="px-3 py-2 rounded-xl border border-[#e2e6ef] bg-white text-xs font-semibold text-[#1c2333] focus:border-[#0f766e]"
            >
              <option value="todas">Todas las áreas</option>
              {areasDisponibles.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>

            <select
              value={orden}
              onChange={(e) => setOrden(e.target.value as 'mayor' | 'menor')}
              className="px-3 py-2 rounded-xl border border-[#e2e6ef] bg-white text-xs font-semibold text-[#1c2333] focus:border-[#0f766e]"
            >
              <option value="mayor">Mayor promedio</option>
              <option value="menor">Menor promedio</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#e2e6ef] text-[#5d6678] uppercase tracking-wider">
                <th className="py-3 px-3 font-semibold">Docente</th>
                <th className="py-3 px-3 font-semibold">Área</th>
                <th className="py-3 px-3 font-semibold">Evaluaciones</th>
                <th className="py-3 px-3 font-semibold w-48">Promedio (Escala 10)</th>
                <th className="py-3 px-3 font-semibold">Clasificación</th>
                <th className="py-3 px-3 font-semibold text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e6ef]">
              {listaFiltrada.map((r) => (
                <tr key={r.id} className="hover:bg-[#f4f6fb]/60 transition-colors">
                  <td className="py-3 px-3 font-medium text-[#1c2333]">{r.nombre}</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-full bg-[#e3f4f2] text-[#0f766e] text-[11px] font-semibold">
                      {r.area}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-[#5d6678]">{r.totalEvaluaciones}</td>
                  <td className="py-3 px-3">
                    {r.promedio === null ? (
                      <span className="text-[#5d6678]">Sin evaluaciones</span>
                    ) : (
                      <Barra valor={r.promedio} max={10} />
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`font-semibold ${
                        r.apto ? 'text-[#15803d]' : 'text-[#dc2626]'
                      }`}
                    >
                      {r.categoria}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => setSeleccionId(r.id)}
                      className="px-3 py-1 rounded-lg border border-[#e2e6ef] text-[#0f766e] hover:bg-[#e3f4f2] font-semibold transition-colors cursor-pointer"
                    >
                      Ver detalle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detalle del docente: por qué le fue bien o mal en cada materia */}
      {docenteDetalle && (
        <div className="bg-white border border-[#e2e6ef] rounded-2xl p-6 shadow-md mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-bold text-[#1c2333]">{docenteDetalle.nombre}</h2>
              <p className="text-xs text-[#5d6678]">{docenteDetalle.correo} · {docenteDetalle.area}</p>
            </div>
            <button
              onClick={() => setSeleccionId(null)}
              className="px-3 py-1.5 rounded-lg border border-[#e2e6ef] text-xs font-semibold text-[#5d6678] hover:bg-[#f4f6fb] cursor-pointer"
            >
              Cerrar detalle
            </button>
          </div>

          {cargandoDetalle && <p className="text-sm text-[#5d6678]">Cargando resultados...</p>}
          {errorDetalle && (
            <p className="text-sm text-[#dc2626] font-medium bg-[#fee2e2] rounded-xl p-3">{errorDetalle}</p>
          )}
          {!cargandoDetalle && !errorDetalle && resultados.length === 0 && (
            <p className="text-sm text-[#5d6678]">El docente no tiene materias en el ciclo activo.</p>
          )}

          <div className="space-y-4">
            {resultados.map((g) => (
              <DetalleMateria key={g.crn} grupo={g} />
            ))}
          </div>
        </div>
      )}

      {/* Participación: solo Respondió / Pendiente, sin calificaciones */}
      <ParticipacionAlumnos area="coordinacion" />

      {/* Talleres y laboratorios: promedios y comentarios anónimos */}
      <ResultadosInstalaciones area="coordinacion" />

    </Layout>
  )
}

/** Resultados de una materia (CRN): promedio, preguntas, áreas de oportunidad y comentarios. */
function DetalleMateria({ grupo }: { grupo: GrupoResultados }) {
  const areasOportunidad = grupo.porPregunta
    .filter((p) => p.promedio < 7.0)
    .sort((a, b) => a.promedio - b.promedio)

  return (
    <div className="p-4 rounded-xl border border-[#e2e6ef] bg-[#f4f6fb]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
        <div>
          <h3 className="text-sm font-bold text-[#1c2333]">{grupo.nombre}</h3>
          <p className="text-xs text-[#5d6678]">
            CRN {grupo.crn} · Clave {grupo.clave}
          </p>
        </div>
        {grupo.totalEvaluaciones > 0 && grupo.promedio !== null && (
          <div className="flex items-center gap-3 text-xs">
            <span className="text-2xl font-extrabold text-[#0f766e]">{grupo.promedio.toFixed(1)}</span>
            <span className="text-[#5d6678]">{grupo.totalEvaluaciones} evaluaciones</span>
            <span className={`font-semibold ${grupo.aptoParaAsignacion ? 'text-[#15803d]' : 'text-[#dc2626]'}`}>
              {grupo.categoria}
            </span>
          </div>
        )}
      </div>

      {grupo.totalEvaluaciones === 0 ? (
        <p className="text-xs text-[#5d6678]">Sin evaluaciones todavía.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#5d6678] mb-2">Promedio por pregunta</h4>
            <div className="space-y-2">
              {grupo.porPregunta.map((p) => (
                <div key={p.id}>
                  <p className="text-xs text-[#1c2333] mb-1">
                    {p.id}. {p.texto}
                  </p>
                  <Barra valor={p.promedio} max={10} />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#5d6678] mb-2">Áreas de oportunidad</h4>
              {areasOportunidad.length === 0 ? (
                <p className="text-xs text-[#15803d] font-medium">Sin áreas de oportunidad.</p>
              ) : (
                <ul className="space-y-1.5">
                  {areasOportunidad.map((p) => (
                    <li
                      key={p.id}
                      className="flex justify-between gap-3 text-xs p-2.5 rounded-lg bg-[#fee2e2] text-[#1c2333]"
                    >
                      <span>{p.texto}</span>
                      <strong className="text-[#dc2626]">{p.promedio.toFixed(1)}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#5d6678] mb-2">Comentarios anónimos</h4>
              {grupo.comentarios.length === 0 ? (
                <p className="text-xs text-[#5d6678]">Sin comentarios todavía.</p>
              ) : (
                <ul className="space-y-2">
                  {grupo.comentarios.map((c, i) => (
                    <li key={i} className="text-xs text-[#1c2333] p-3 rounded-xl border border-[#e2e6ef] bg-white">
                      “{c}”
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
