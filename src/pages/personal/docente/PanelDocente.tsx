import { useState, useEffect, useMemo } from 'react'
import {
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
  type TooltipContentProps,
} from 'recharts'
import Layout from '../../../components/Layout'
import Barra from '../../../components/Barra'
import { useAuth } from '../../../context/AuthContext'
import { useNavigate } from '../../../router'
import {
  obtenerMiPromedioAPI,
  obtenerMisResultadosAPI,
  listarCiclosAPI,
  ErrorAPI,
  type ClasificacionDocenteAPI,
  type GrupoResultados,
  type CicloEscolar,
} from '../../../services/evaluacionService'

interface DatoRadialClasificacion {
  nivel: 'Suficiente' | 'Bueno' | 'Excelente'
  rango: string
  cantidad: number
  porcentaje: number
  total: number
  fill: string
}

interface DatoReactivo {
  clave: string
  id: number
  texto: string
  promedio: number
}

function clasificacionPorPuntaje(valor: number): {
  etiqueta: string
  color: string
  badgeClass: string
} {
  if (valor >= 9.0) {
    return {
      etiqueta: 'Excelente',
      color: '#0f766e',
      badgeClass: 'bg-[#e3f4f2] text-[#0f766e]',
    }
  }
  if (valor >= 8.0) {
    return {
      etiqueta: 'Bueno',
      color: '#14b8a6',
      badgeClass: 'bg-[#e3f4f2] text-[#0d9488]',
    }
  }
  if (valor >= 7.0) {
    return {
      etiqueta: 'Suficiente',
      color: '#d97706',
      badgeClass: 'bg-[#fef3c7] text-[#b45309]',
    }
  }
  return {
    etiqueta: 'No Suficiente',
    color: '#dc2626',
    badgeClass: 'bg-[#fee2e2] text-[#dc2626]',
  }
}

function TooltipRadialClasificacion({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null
  const item = payload[0]?.payload as DatoRadialClasificacion | undefined
  if (!item) return null

  return (
    <div className="bg-white border border-[#e2e6ef] rounded-xl p-3 shadow-md text-xs max-w-[220px]">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.fill }} />
        <strong className="text-[#1c2333]">{item.nivel}</strong>
        <span className="text-[11px] text-[#5d6678]">({item.rango})</span>
      </div>
      <div className="flex items-center justify-between gap-3 pt-1.5 border-t border-[#e2e6ef]">
        <span className="text-[#5d6678]">Reactivos:</span>
        <strong className="text-[#1c2333]">
          {item.cantidad} de {item.total} ({item.porcentaje}%)
        </strong>
      </div>
    </div>
  )
}

function TooltipReactivoDocente({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null
  const item = payload[0]?.payload as DatoReactivo | undefined
  if (!item) return null

  const estado = clasificacionPorPuntaje(item.promedio)

  return (
    <div className="bg-white border border-[#e2e6ef] rounded-xl p-3 shadow-md max-w-xs text-xs">
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="font-bold text-[#0f766e]">Reactivo {item.id}</span>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${estado.badgeClass}`}>
          {estado.etiqueta}
        </span>
      </div>
      <p className="text-[#1c2333] leading-snug mb-2">{item.texto}</p>
      <div className="flex items-center justify-between gap-4 pt-1.5 border-t border-[#e2e6ef]">
        <span className="text-[#5d6678]">Promedio obtenido:</span>
        <strong className="text-sm font-extrabold" style={{ color: estado.color }}>
          {item.promedio.toFixed(2)} / 10
        </strong>
      </div>
    </div>
  )
}

export default function PanelDocente() {
  const { usuario, cerrarSesion } = useAuth()
  const navigate = useNavigate()

  const [ciclos, setCiclos] = useState<CicloEscolar[]>([])
  const [cicloSeleccionado, setCicloSeleccionado] = useState<string>('')
  const [misGrupos, setMisGrupos] = useState<GrupoResultados[]>([])
  const [crn, setCrn] = useState<string>('')
  const [desempenoAPI, setDesempenoAPI] = useState<ClasificacionDocenteAPI | null>(null)
  const [cargando, setCargando] = useState(true)
  const [descargandoPDF, setDescargandoPDF] = useState(false)
  const [error, setError] = useState('')

  const exportarReportePDF = async () => {
    const token = usuario?.token || ''
    if (!token || descargandoPDF) return

    setDescargandoPDF(true)
    setError('')
    try {
      const response = await fetch('/api/reportes/docente/me/pdf', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.status === 401) {
        cerrarSesion()
        navigate('/personal/docente/login', { replace: true })
        return
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.mensaje || 'No se pudo generar el reporte en PDF.')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const enlace = document.createElement('a')
      enlace.href = url
      enlace.download = 'reporte-evaluacion.pdf'
      document.body.appendChild(enlace)
      enlace.click()
      enlace.remove()
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      setError(err?.message || 'Error al descargar el reporte en PDF.')
    } finally {
      setDescargandoPDF(false)
    }
  }

  // 1. Carga inicial del catálogo de ciclos escolares
  useEffect(() => {
    const token = usuario?.token || ''
    if (!token) return

    listarCiclosAPI(token)
      .then((data) => {
        setCiclos(data)
        const activo = data.find((c) => c.activo) || data[0]
        if (activo) {
          setCicloSeleccionado(String(activo.id_ciclo))
        }
      })
      .catch((err) => {
        if (err instanceof ErrorAPI && err.status === 401) {
          cerrarSesion()
          navigate('/personal/docente/login', { replace: true })
          return
        }
        setError(err.message)
      })
  }, [usuario?.token])

  // 2. Consulta de métricas y resultados al seleccionar un ciclo
  useEffect(() => {
    const token = usuario?.token || ''
    if (!token || !cicloSeleccionado) return

    setCargando(true)
    setError('')

    Promise.all([
      obtenerMiPromedioAPI(token, cicloSeleccionado),
      obtenerMisResultadosAPI(token, cicloSeleccionado),
    ])
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
  }, [usuario?.token, cicloSeleccionado])

  const grupo = misGrupos.find((m) => m.crn === crn) || misGrupos[0]
  const promedioGeneral = desempenoAPI?.promedio ?? null
  const totalRespuestas = desempenoAPI?.totalEvaluaciones ?? 0

  const datosReactivos = useMemo<DatoReactivo[]>(() => {
    return (grupo?.porPregunta ?? []).map((p) => ({
      clave: `R${p.id}`,
      id: p.id,
      texto: p.texto,
      promedio: Number(p.promedio.toFixed(2)),
    }))
  }, [grupo])

  const { datosClasificacionRadial, conteoNoSuficiente } = useMemo(() => {
    const preguntas = grupo?.porPregunta ?? []
    const total = preguntas.length
    let excelente = 0
    let bueno = 0
    let suficiente = 0
    let noSuficiente = 0

    for (const p of preguntas) {
      if (p.promedio >= 9.0) excelente += 1
      else if (p.promedio >= 8.0) bueno += 1
      else if (p.promedio >= 7.0) suficiente += 1
      else noSuficiente += 1
    }

    const datos: DatoRadialClasificacion[] = [
      {
        nivel: 'Suficiente',
        rango: '7.0 – 7.9',
        cantidad: suficiente,
        porcentaje: total > 0 ? Math.round((suficiente / total) * 100) : 0,
        total,
        fill: '#d97706',
      },
      {
        nivel: 'Bueno',
        rango: '8.0 – 8.9',
        cantidad: bueno,
        porcentaje: total > 0 ? Math.round((bueno / total) * 100) : 0,
        total,
        fill: '#14b8a6',
      },
      {
        nivel: 'Excelente',
        rango: '9.0 – 10',
        cantidad: excelente,
        porcentaje: total > 0 ? Math.round((excelente / total) * 100) : 0,
        total,
        fill: '#0f766e',
      },
    ]

    return { datosClasificacionRadial: datos, conteoNoSuficiente: noSuficiente }
  }, [grupo])

  const categoriaActiva =
    grupo && grupo.totalEvaluaciones > 0 ? grupo.categoria : desempenoAPI?.categoria || 'Sin Evaluaciones'

  return (
    <Layout titulo="Docente" tono="personal">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1c2333] mb-1">Resultados y Desempeño Docente</h1>
          <p className="text-sm text-[#5d6678]">
            Promedios calculados en tiempo real a partir de las evaluaciones anónimas de tus alumnos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {ciclos.length > 0 && (
            <div className="flex items-center gap-2">
              <label htmlFor="selector-ciclo" className="text-xs font-semibold text-[#5d6678] whitespace-nowrap">
                Periodo escolar:
              </label>
              <select
                id="selector-ciclo"
                value={cicloSeleccionado}
                onChange={(e) => setCicloSeleccionado(e.target.value)}
                className="px-3.5 py-2 rounded-xl border border-[#e2e6ef] bg-white text-xs font-semibold text-[#1c2333] focus:border-[#0f766e] focus:outline-none shadow-xs cursor-pointer"
              >
                {ciclos.map((c) => (
                  <option key={c.id_ciclo} value={String(c.id_ciclo)}>
                    {c.nombre} {c.activo ? '(Activo)' : '(Histórico)'}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={exportarReportePDF}
            disabled={descargandoPDF}
            className="px-3.5 py-2 rounded-xl border border-[#0f766e] bg-white text-[#0f766e] hover:bg-[#e3f4f2] text-xs font-semibold transition-colors shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {descargandoPDF ? 'Exportando PDF...' : 'Exportar a PDF'}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-[#dc2626] font-medium bg-[#fee2e2] rounded-xl p-3 mb-6">{error}</p>
      )}

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
            className="w-full sm:w-auto px-3.5 py-2 rounded-xl border border-[#e2e6ef] bg-white text-xs font-semibold text-[#1c2333] focus:border-[#0f766e]"
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

      {/* Gráficos Institucionales Interactivos */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        {/* Gráfico Radial de Clasificación Institucional */}
        <div className="lg:col-span-5 bg-white border border-[#e2e6ef] rounded-2xl p-5 sm:p-6 shadow-xs min-w-0 flex flex-col">
          <div className="flex items-start justify-between gap-3 mb-1">
            <div>
              <h3 className="text-base font-bold text-[#1c2333]">Clasificación Institucional</h3>
              <p className="text-xs text-[#5d6678]">
                Distribución de reactivos por rango de desempeño
              </p>
            </div>
            <span
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 ${
                categoriaActiva === 'No Suficiente' || categoriaActiva === 'Sin Evaluaciones'
                  ? categoriaActiva === 'Sin Evaluaciones'
                    ? 'bg-[#f4f6fb] text-[#5d6678]'
                    : 'bg-[#fee2e2] text-[#dc2626]'
                  : 'bg-[#e3f4f2] text-[#0f766e]'
              }`}
            >
              {cargando ? 'Cargando...' : categoriaActiva}
            </span>
          </div>

          {cargando ? (
            <div className="h-56 flex items-center justify-center text-xs text-[#5d6678]">
              Cargando clasificación institucional...
            </div>
          ) : datosReactivos.length === 0 ? (
            <div className="h-56 flex items-center justify-center rounded-xl border border-dashed border-[#e2e6ef] bg-[#f4f6fb]/60 text-xs text-[#5d6678] px-4 text-center mt-4">
              Este grupo aún no tiene evaluaciones para calcular la distribución radial.
            </div>
          ) : (
            <>
              <div className="w-full h-56 sm:h-60 min-w-0 mt-2">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <RadialBarChart
                    cx="50%"
                    cy="50%"
                    innerRadius="32%"
                    outerRadius="95%"
                    barSize={14}
                    data={datosClasificacionRadial}
                    startAngle={90}
                    endAngle={-270}
                  >
                    <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                    <RadialBar
                      background={{ fill: '#f4f6fb' }}
                      dataKey="porcentaje"
                      cornerRadius={8}
                    />
                    <Tooltip content={TooltipRadialClasificacion} />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2 mt-2 pt-3 border-t border-[#e2e6ef]">
                {[...datosClasificacionRadial].reverse().map((item) => (
                  <div key={item.nivel} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.fill }}
                      />
                      <span className="font-semibold text-[#1c2333]">{item.nivel}</span>
                      <span className="text-[11px] text-[#5d6678]">({item.rango})</span>
                    </div>
                    <span className="font-bold text-[#1c2333]">
                      {item.cantidad} ({item.porcentaje}%)
                    </span>
                  </div>
                ))}
                {conteoNoSuficiente > 0 && (
                  <div className="flex items-center justify-between text-xs pt-1 text-[#dc2626]">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#dc2626] shrink-0" />
                      <span className="font-semibold">Por reforzar (&lt; 7.0)</span>
                    </div>
                    <span className="font-bold">{conteoNoSuficiente}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Gráfico de Barras de los 15 Reactivos */}
        <div className="lg:col-span-7 bg-white border border-[#e2e6ef] rounded-2xl p-5 sm:p-6 shadow-xs min-w-0 flex flex-col">
          <div className="mb-4">
            <h3 className="text-base font-bold text-[#1c2333]">
              Desglose por Reactivo del Cuestionario
            </h3>
            <p className="text-xs text-[#5d6678]">
              Promedio obtenido en los {datosReactivos.length || 15} reactivos de{' '}
              {grupo?.nombre || 'la asignatura'} (escala 0 - 10).
            </p>
          </div>

          {cargando ? (
            <div className="h-64 flex items-center justify-center text-xs text-[#5d6678]">
              Cargando resultados por reactivo...
            </div>
          ) : datosReactivos.length === 0 ? (
            <div className="h-64 flex items-center justify-center rounded-xl border border-dashed border-[#e2e6ef] bg-[#f4f6fb]/60 text-xs text-[#5d6678] px-4 text-center">
              Este grupo aún no tiene evaluaciones registradas para mostrar el gráfico de reactivos.
            </div>
          ) : (
            <>
              <div className="w-full overflow-x-auto pb-1">
                <div className="w-full h-64 sm:h-72 min-w-[460px] sm:min-w-0">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <BarChart data={datosReactivos} margin={{ top: 12, right: 12, left: -16, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e6ef" vertical={false} />
                      <XAxis
                        dataKey="clave"
                        tick={{ fill: '#5d6678', fontSize: 11 }}
                        axisLine={{ stroke: '#e2e6ef' }}
                        tickLine={false}
                        interval={0}
                      />
                      <YAxis
                        domain={[0, 10]}
                        ticks={[0, 2, 4, 6, 7, 8, 10]}
                        tick={{ fill: '#5d6678', fontSize: 11 }}
                        axisLine={{ stroke: '#e2e6ef' }}
                        tickLine={false}
                      />
                      <Tooltip
                        content={TooltipReactivoDocente}
                        cursor={{ fill: '#e3f4f2', opacity: 0.45 }}
                      />
                      <ReferenceLine
                        y={7}
                        stroke="#d97706"
                        strokeDasharray="4 4"
                        label={{
                          value: 'Mín. 7.0',
                          fill: '#d97706',
                          fontSize: 10,
                          position: 'insideTopRight',
                        }}
                      />
                      <Bar dataKey="promedio" name="Promedio" radius={[6, 6, 0, 0]} maxBarSize={28}>
                        {datosReactivos.map((entry) => (
                          <Cell key={entry.id} fill={clasificacionPorPuntaje(entry.promedio).color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 pt-3 border-t border-[#e2e6ef] text-[11px] text-[#5d6678]">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#0f766e]" />
                  Excelente (&ge; 9.0)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#14b8a6]" />
                  Bueno (8.0 – 8.9)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#d97706]" />
                  Suficiente (7.0 – 7.9)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#dc2626]" />
                  No Suficiente (&lt; 7.0)
                </span>
              </div>
            </>
          )}
        </div>
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
