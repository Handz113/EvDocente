import { useState, useEffect } from 'react'
import Layout from '../../../components/Layout'
import Barra from '../../../components/Barra'
import { useAuth } from '../../../context/AuthContext'
import { useNavigate } from '../../../router'
import {
  listarDocentesAPI,
  obtenerPromedioDocenteAPI,
  ErrorAPI,
  type DocenteAPI,
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
      if (err instanceof ErrorAPI && err.status === 401) {
        cerrarSesion()
        navigate('/personal/coordinacion/login', { replace: true })
        return
      }
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
  const materiasDocente = docenteDetalle?.materias ?? []

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

      {/* Modal / Sección de detalle docente */}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {materiasDocente.map((m) => (
              <div key={m.crn} className="p-4 rounded-xl border border-[#e2e6ef] bg-[#f4f6fb]">
                <h3 className="text-sm font-bold text-[#1c2333] mb-1">{m.nombre}</h3>
                <p className="text-xs text-[#5d6678] mb-3">CRN {m.crn} · Clave {m.clave}</p>
              </div>
            ))}
          </div>
        </div>
      )}

    </Layout>
  )
}
