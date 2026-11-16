import { useState, useEffect, useMemo } from 'react'
import {
  ResponsiveContainer,
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
import ParticipacionAlumnos from '../../../components/ParticipacionAlumnos'
import ResultadosInstalaciones from '../../../components/ResultadosInstalaciones'
import { useAuth } from '../../../context/AuthContext'
import { useNavigate } from '../../../router'
import {
  listarDocentesAPI,
  obtenerPromedioDocenteAPI,
  obtenerResultadosDocenteAPI,
  listarCiclosAPI,
  ErrorAPI,
  type DocenteAPI,
  type CicloEscolar,
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

interface DatoGraficoCoordinacion {
  nombre: string
  etiqueta: string
  promedio: number
  evaluaciones: number
  tipo: 'institucional' | 'area' | 'materia' | 'docente'
  subtitulo?: string
}

function acortarEtiqueta(texto: string, max = 18): string {
  return texto.length > max ? `${texto.slice(0, max - 1)}…` : texto
}

function colorBarraCoordinacion(item: DatoGraficoCoordinacion): string {
  if (item.tipo === 'institucional') return '#0f766e'
  if (item.evaluaciones === 0 && item.promedio === 0) return '#cbd5e1'
  if (item.promedio >= 8.5) return '#0d9488'
  if (item.promedio >= 7.0) return '#14b8a6'
  return '#dc2626'
}

function TooltipCoordinacion({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null
  const item = payload[0]?.payload as DatoGraficoCoordinacion | undefined
  if (!item) return null

  const estadoTexto =
    item.evaluaciones === 0 && item.promedio === 0
      ? 'Sin evaluaciones'
      : item.promedio >= 9.0
      ? 'Excelente'
      : item.promedio >= 8.0
      ? 'Bueno'
      : item.promedio >= 7.0
      ? 'Suficiente'
      : 'No Suficiente'

  const estadoClase =
    item.evaluaciones === 0 && item.promedio === 0
      ? 'bg-[#f4f6fb] text-[#5d6678]'
      : item.promedio >= 7.0
      ? 'bg-[#e3f4f2] text-[#0f766e]'
      : 'bg-[#fee2e2] text-[#dc2626]'

  return (
    <div className="bg-white border border-[#e2e6ef] rounded-xl p-3 shadow-md max-w-xs text-xs">
      <div className="flex items-center justify-between gap-3 mb-1">
        <span className="font-bold text-[#1c2333] leading-snug">{item.nombre}</span>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${estadoClase}`}>
          {estadoTexto}
        </span>
      </div>
      {item.subtitulo && <p className="text-[11px] text-[#5d6678] mb-1.5">{item.subtitulo}</p>}
      <div className="flex items-center justify-between gap-4 pt-1.5 border-t border-[#e2e6ef]">
        <span className="text-[#5d6678]">Promedio:</span>
        <strong className="text-sm font-extrabold text-[#0f766e]">{item.promedio.toFixed(2)} / 10</strong>
      </div>
      <div className="flex items-center justify-between gap-4 mt-0.5">
        <span className="text-[#5d6678]">Evaluaciones:</span>
        <span className="font-semibold text-[#1c2333]">{item.evaluaciones}</span>
      </div>
    </div>
  )
}

export default function PanelCoordinacion() {
  const { usuario, cerrarSesion } = useAuth()
  const navigate = useNavigate()
  const [ciclos, setCiclos] = useState<CicloEscolar[]>([])
  const [cicloSeleccionado, setCicloSeleccionado] = useState<string>('')
  const [area, setArea] = useState('todas')
  const [orden, setOrden] = useState<'mayor' | 'menor'>('mayor')
  const [seleccionId, setSeleccionId] = useState<string | null>(null)
  const [listaDocentes, setListaDocentes] = useState<DocenteConMetricas[]>([])
  const [error, setError] = useState('')
  const [resultados, setResultados] = useState<GrupoResultados[]>([])
  const [cargandoDetalle, setCargandoDetalle] = useState(false)
  const [errorDetalle, setErrorDetalle] = useState('')
  const [modoGrafico, setModoGrafico] = useState<'area' | 'materia'>('area')
  const [areaGrafico, setAreaGrafico] = useState<string>('todas')
  const [materiaGrafico, setMateriaGrafico] = useState<string>('')

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
    obtenerResultadosDocenteAPI(seleccionId, usuario?.token || '', cicloSeleccionado)
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
  }, [seleccionId, usuario?.token, cicloSeleccionado])

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
        if (err instanceof ErrorAPI && err.status === 401) return sesionVencida()
        setError(err.message)
      })
  }, [usuario?.token])

  // 2. Consulta de docentes y métricas asociadas al ciclo seleccionado
  useEffect(() => {
    const token = usuario?.token || ''
    if (!token || !cicloSeleccionado) return

    const consultarDocentes = async () => {
      setError('')
      const docentes = await listarDocentesAPI(token, cicloSeleccionado)
      const metricas: DocenteConMetricas[] = await Promise.all(
        docentes.map(async (d) => {
          const apiRes = await obtenerPromedioDocenteAPI(d.id, token, cicloSeleccionado)
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
  }, [usuario?.token, cicloSeleccionado])

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

  const totalRespuestasInst = listaDocentes.reduce((a, r) => a + r.totalEvaluaciones, 0)
  const promedioInstitucional = totalRespuestasInst
    ? listaDocentes.reduce((a, r) => a + (r.promedio ?? 0) * r.totalEvaluaciones, 0) / totalRespuestasInst
    : 0

  const areasGraficoDisponibles = useMemo(
    () => [...new Set(listaDocentes.map((r) => r.area))].sort((a, b) => a.localeCompare(b, 'es')),
    [listaDocentes]
  )

  const materiasGraficoDisponibles = useMemo(() => {
    const mapa = new Map<string, { nombre: string; claves: Set<string> }>()
    for (const d of listaDocentes) {
      for (const m of d.materias) {
        const entry = mapa.get(m.nombre) ?? { nombre: m.nombre, claves: new Set<string>() }
        entry.claves.add(m.clave)
        mapa.set(m.nombre, entry)
      }
    }
    return Array.from(mapa.values())
      .map((item) => ({ nombre: item.nombre, clave: Array.from(item.claves).join(', ') }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  }, [listaDocentes])

  useEffect(() => {
    if (areaGrafico !== 'todas' && !areasGraficoDisponibles.includes(areaGrafico)) {
      setAreaGrafico('todas')
    }
  }, [areaGrafico, areasGraficoDisponibles])

  useEffect(() => {
    if (materiasGraficoDisponibles.length === 0) {
      if (materiaGrafico !== '') setMateriaGrafico('')
      return
    }
    if (!materiasGraficoDisponibles.some((m) => m.nombre === materiaGrafico)) {
      setMateriaGrafico(materiasGraficoDisponibles[0].nombre)
    }
  }, [materiaGrafico, materiasGraficoDisponibles])

  const datosGrafico = useMemo<DatoGraficoCoordinacion[]>(() => {
    if (listaDocentes.length === 0) return []

    const institucional: DatoGraficoCoordinacion = {
      nombre: 'Promedio General Institucional',
      etiqueta: 'Institucional',
      promedio: Number(promedioInstitucional.toFixed(2)),
      evaluaciones: totalRespuestasInst,
      tipo: 'institucional',
      subtitulo: `Ciclo completo · ${listaDocentes.length} docentes`,
    }

    if (modoGrafico === 'area') {
      if (areaGrafico !== 'todas') {
        const docentesArea = listaDocentes.filter((d) => d.area === areaGrafico)
        const evalsArea = docentesArea.reduce((a, d) => a + d.totalEvaluaciones, 0)
        const conEval = docentesArea.filter((d) => d.promedio !== null)
        const promArea =
          evalsArea > 0
            ? docentesArea.reduce((a, d) => a + (d.promedio ?? 0) * d.totalEvaluaciones, 0) / evalsArea
            : conEval.length > 0
            ? conEval.reduce((a, d) => a + (d.promedio ?? 0), 0) / conEval.length
            : 0

        const barraArea: DatoGraficoCoordinacion = {
          nombre: `Área: ${areaGrafico}`,
          etiqueta: acortarEtiqueta(areaGrafico, 16),
          promedio: Number(promArea.toFixed(2)),
          evaluaciones: evalsArea,
          tipo: 'area',
          subtitulo: `Promedio consolidado (${docentesArea.length} docente${docentesArea.length === 1 ? '' : 's'})`,
        }

        const barrasDocentes: DatoGraficoCoordinacion[] = docentesArea
          .map((d) => ({
            nombre: d.nombre,
            etiqueta: acortarEtiqueta(d.nombre, 16),
            promedio: d.promedio !== null ? Number(d.promedio.toFixed(2)) : 0,
            evaluaciones: d.totalEvaluaciones,
            tipo: 'docente' as const,
            subtitulo: `${d.area} · ${d.materias.length} materia${d.materias.length === 1 ? '' : 's'}`,
          }))
          .sort((a, b) => b.promedio - a.promedio)

        return [institucional, barraArea, ...barrasDocentes]
      }

      const porArea = new Map<
        string,
        { sumaPonderada: number; evaluaciones: number; sumaSimple: number; conEval: number; docentes: number }
      >()

      for (const d of listaDocentes) {
        const prev = porArea.get(d.area) ?? {
          sumaPonderada: 0,
          evaluaciones: 0,
          sumaSimple: 0,
          conEval: 0,
          docentes: 0,
        }
        prev.docentes += 1
        if (d.promedio !== null) {
          prev.sumaPonderada += d.promedio * d.totalEvaluaciones
          prev.evaluaciones += d.totalEvaluaciones
          prev.sumaSimple += d.promedio
          prev.conEval += 1
        }
        porArea.set(d.area, prev)
      }

      const barrasAreas: DatoGraficoCoordinacion[] = Array.from(porArea.entries())
        .map(([nombreArea, stats]) => {
          const prom =
            stats.evaluaciones > 0
              ? stats.sumaPonderada / stats.evaluaciones
              : stats.conEval > 0
              ? stats.sumaSimple / stats.conEval
              : 0
          return {
            nombre: nombreArea,
            etiqueta: acortarEtiqueta(nombreArea),
            promedio: Number(prom.toFixed(2)),
            evaluaciones: stats.evaluaciones,
            tipo: 'area' as const,
            subtitulo: `${stats.docentes} docente${stats.docentes === 1 ? '' : 's'} en el área`,
          }
        })
        .sort((a, b) => b.promedio - a.promedio)

      return [institucional, ...barrasAreas]
    }

    // Modo 'materia': muestra solo la materia seleccionada frente al Promedio General Institucional
    if (!materiaGrafico) return [institucional]

    const detallePorCrn = new Map(resultados.map((g) => [g.crn, g]))
    const claves = new Set<string>()
    let sumaPonderada = 0
    let evaluacionesTotal = 0
    let sumaSimple = 0
    let conEval = 0

    const gruposMateria: DatoGraficoCoordinacion[] = []

    for (const d of listaDocentes) {
      for (const m of d.materias) {
        if (m.nombre !== materiaGrafico) continue
        claves.add(m.clave)
        const resCrn = detallePorCrn.get(m.crn)
        const promFuente = resCrn ? resCrn.promedio : d.promedio
        const evalsFuente = resCrn ? resCrn.totalEvaluaciones : d.totalEvaluaciones
        const origenNota = resCrn
          ? 'Promedio exacto del CRN'
          : d.materias.length <= 1
          ? 'Promedio real del docente'
          : 'Promedio general del docente'

        if (promFuente !== null) {
          sumaPonderada += promFuente * evalsFuente
          evaluacionesTotal += evalsFuente
          sumaSimple += promFuente
          conEval += 1
        }

        gruposMateria.push({
          nombre: `${m.nombre} — CRN ${m.crn}`,
          etiqueta: acortarEtiqueta(`${d.nombre} (${m.crn})`, 18),
          promedio: promFuente !== null ? Number(promFuente.toFixed(2)) : 0,
          evaluaciones: evalsFuente,
          tipo: 'docente',
          subtitulo: `${d.nombre} · ${origenNota}`,
        })
      }
    }

    const promMateria =
      evaluacionesTotal > 0
        ? sumaPonderada / evaluacionesTotal
        : conEval > 0
        ? sumaSimple / conEval
        : 0

    const barraMateria: DatoGraficoCoordinacion = {
      nombre: materiaGrafico,
      etiqueta: acortarEtiqueta(materiaGrafico, 18),
      promedio: Number(promMateria.toFixed(2)),
      evaluaciones: evaluacionesTotal,
      tipo: 'materia',
      subtitulo: `Clave: ${Array.from(claves).join(', ')} · ${gruposMateria.length} grupo${
        gruposMateria.length === 1 ? '' : 's'
      }`,
    }

    // Si la materia tiene varios grupos/CRNs, los desglosamos; si tiene 1, mostramos la barra de materia + su grupo si aporta contexto
    return gruposMateria.length > 1
      ? [institucional, barraMateria, ...gruposMateria.sort((a, b) => b.promedio - a.promedio)]
      : [institucional, barraMateria]
  }, [
    listaDocentes,
    modoGrafico,
    areaGrafico,
    materiaGrafico,
    promedioInstitucional,
    totalRespuestasInst,
    resultados,
  ])

  const docenteDetalle = seleccionId ? listaDocentes.find((d) => d.id === seleccionId) : null

  return (
    <Layout titulo="Coordinación" tono="personal">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1c2333] mb-1">Panel de Coordinación Académica</h1>
        <p className="text-sm text-[#5d6678]">
          Monitoreo de desempeño para asignación docente (ciclos activos e históricos).
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

      {/* Gráfico Comparativo Institucional por Área Académica / Materia */}
      <div className="bg-white border border-[#e2e6ef] rounded-2xl p-5 sm:p-6 shadow-xs mb-8 min-w-0">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 mb-5">
          <div>
            <h2 className="text-lg font-bold text-[#1c2333]">
              Desempeño Institucional por {modoGrafico === 'area' ? 'Área Académica' : 'Materia'}
            </h2>
            <p className="text-xs text-[#5d6678]">
              {modoGrafico === 'area'
                ? areaGrafico === 'todas'
                  ? 'Vista general comparativa entre el Promedio General Institucional y todas las áreas académicas (0 - 10).'
                  : `Avance específico del área ${areaGrafico} y sus docentes frente al Promedio General Institucional.`
                : materiaGrafico
                ? `Comparativa de ${materiaGrafico} frente al Promedio General Institucional (escala 0 - 10).`
                : 'Selecciona una materia para visualizar su promedio frente al institucional.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
            <div
              className="inline-flex rounded-xl border border-[#e2e6ef] bg-[#f4f6fb] p-1"
              role="group"
              aria-label="Agrupación del gráfico"
            >
              <button
                type="button"
                onClick={() => setModoGrafico('area')}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  modoGrafico === 'area'
                    ? 'bg-[#0f766e] text-white shadow-xs'
                    : 'text-[#5d6678] hover:text-[#1c2333]'
                }`}
              >
                Por Área Académica
              </button>
              <button
                type="button"
                onClick={() => setModoGrafico('materia')}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  modoGrafico === 'materia'
                    ? 'bg-[#0f766e] text-white shadow-xs'
                    : 'text-[#5d6678] hover:text-[#1c2333]'
                }`}
              >
                Por Materia
              </button>
            </div>

            {modoGrafico === 'area' ? (
              <select
                aria-label="Seleccionar área académica"
                value={areaGrafico}
                onChange={(e) => setAreaGrafico(e.target.value)}
                className="w-full sm:w-52 px-3 py-2 rounded-xl border border-[#e2e6ef] bg-white text-xs font-semibold text-[#1c2333] focus:border-[#0f766e]"
              >
                <option value="todas">Todas las áreas (General)</option>
                {areasGraficoDisponibles.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            ) : (
              <select
                aria-label="Seleccionar materia"
                value={materiaGrafico}
                onChange={(e) => setMateriaGrafico(e.target.value)}
                disabled={materiasGraficoDisponibles.length === 0}
                className="w-full sm:w-64 px-3 py-2 rounded-xl border border-[#e2e6ef] bg-white text-xs font-semibold text-[#1c2333] focus:border-[#0f766e] disabled:opacity-60"
              >
                {materiasGraficoDisponibles.length === 0 ? (
                  <option value="">Sin materias disponibles</option>
                ) : (
                  materiasGraficoDisponibles.map((m) => (
                    <option key={m.nombre} value={m.nombre}>
                      {m.nombre} ({m.clave})
                    </option>
                  ))
                )}
              </select>
            )}
          </div>
        </div>

        {datosGrafico.length === 0 ? (
          <div className="h-64 flex items-center justify-center rounded-xl border border-dashed border-[#e2e6ef] bg-[#f4f6fb]/60 text-xs text-[#5d6678] px-4 text-center">
            {error
              ? 'No se pudieron cargar las métricas para graficar.'
              : 'Cargando métricas institucionales del ciclo seleccionado...'}
          </div>
        ) : (
          <>
            <div className="w-full overflow-x-auto pb-1">
              <div
                className="w-full h-72 sm:h-80 min-w-0"
                style={{
                  minWidth: datosGrafico.length > 5 ? `${Math.max(480, datosGrafico.length * 76)}px` : undefined,
                }}
              >
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <BarChart data={datosGrafico} margin={{ top: 14, right: 16, left: -12, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e6ef" vertical={false} />
                    <XAxis
                      dataKey="etiqueta"
                      tick={{ fill: '#5d6678', fontSize: 11 }}
                      axisLine={{ stroke: '#e2e6ef' }}
                      tickLine={false}
                      interval={0}
                      angle={-15}
                      textAnchor="end"
                      height={54}
                    />
                    <YAxis
                      domain={[0, 10]}
                      ticks={[0, 2, 4, 6, 7, 8, 10]}
                      tick={{ fill: '#5d6678', fontSize: 11 }}
                      axisLine={{ stroke: '#e2e6ef' }}
                      tickLine={false}
                    />
                    <Tooltip
                      content={TooltipCoordinacion}
                      cursor={{ fill: '#e3f4f2', opacity: 0.45 }}
                    />
                    <ReferenceLine
                      y={7}
                      stroke="#d97706"
                      strokeDasharray="4 4"
                      label={{
                        value: 'Mín. Apto (7.0)',
                        fill: '#d97706',
                        fontSize: 11,
                        position: 'insideTopRight',
                      }}
                    />
                    <Bar dataKey="promedio" name="Promedio (0 - 10)" radius={[8, 8, 0, 0]} maxBarSize={54}>
                      {datosGrafico.map((entry, idx) => (
                        <Cell key={`${entry.tipo}-${entry.nombre}-${idx}`} fill={colorBarraCoordinacion(entry)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-3 pt-3 border-t border-[#e2e6ef] text-[11px] text-[#5d6678]">
              <span className="inline-flex items-center gap-1.5 font-medium text-[#1c2333]">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#0f766e]" />
                Promedio General Institucional
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#0d9488]" />
                Destacado (&ge; 8.5)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#14b8a6]" />
                Apto (7.0 – 8.4)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#dc2626]" />
                En Riesgo (&lt; 7.0)
              </span>
            </div>
          </>
        )}
      </div>

      {/* Tabla con Filtros */}
      <div className="bg-white border border-[#e2e6ef] rounded-2xl p-6 shadow-xs mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
          <h2 className="text-lg font-bold text-[#1c2333]">Evaluación por Docente</h2>
          <div className="flex gap-2 flex-wrap">
            {ciclos.length > 0 && (
              <select
                value={cicloSeleccionado}
                onChange={(e) => setCicloSeleccionado(e.target.value)}
                className="px-3 py-2 rounded-xl border border-[#e2e6ef] bg-white text-xs font-semibold text-[#1c2333] focus:border-[#0f766e]"
              >
                {ciclos.map((c) => (
                  <option key={c.id_ciclo} value={String(c.id_ciclo)}>
                    {c.nombre} {c.activo ? '(Activo)' : '(Histórico)'}
                  </option>
                ))}
              </select>
            )}

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
            <p className="text-sm text-[#5d6678]">El docente no tiene materias en el ciclo seleccionado.</p>
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
