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
import { useAuth } from '../context/AuthContext'
import { useNavigate } from '../router'
import {
  obtenerParticipacionAPI,
  ErrorAPI,
  type ParticipacionAPI,
  type ResumenParticipacion,
} from '../services/evaluacionService'

interface Props {
  /** Área del panel, para mandar a su login si la sesión venció */
  area: 'coordinacion' | 'administracion'
}

interface DatoGraficoParticipacion {
  nombre: string
  etiqueta: string
  porcentaje: number
  respondieron: number
  pendientes: number
  total: number
  tipo: 'general' | 'carrera' | 'semestre' | 'materia' | 'grupo'
  subtitulo?: string
}

function acortarEtiqueta(texto: string, max = 18): string {
  return texto.length > max ? `${texto.slice(0, max - 1)}…` : texto
}

function calcularPorcentaje(respondieron: number, total: number): number {
  return total > 0 ? Math.round((respondieron / total) * 1000) / 10 : 0
}

function colorBarraParticipacion(item: DatoGraficoParticipacion): string {
  if (item.tipo === 'general') return '#0f766e'
  if (item.total === 0) return '#cbd5e1'
  if (item.porcentaje >= 80) return '#0d9488'
  if (item.porcentaje >= 50) return '#14b8a6'
  if (item.porcentaje > 0) return '#d97706'
  return '#dc2626'
}

function TooltipParticipacion({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null
  const item = payload[0]?.payload as DatoGraficoParticipacion | undefined
  if (!item) return null

  const badgeClase =
    item.porcentaje >= 50
      ? 'bg-[#e3f4f2] text-[#0f766e]'
      : item.porcentaje > 0
      ? 'bg-[#fef3c7] text-[#b45309]'
      : 'bg-[#fee2e2] text-[#dc2626]'

  return (
    <div className="bg-white border border-[#e2e6ef] rounded-xl p-3 shadow-md max-w-xs text-xs">
      <div className="flex items-center justify-between gap-3 mb-1">
        <span className="font-bold text-[#1c2333] leading-snug">{item.nombre}</span>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${badgeClase}`}>
          {item.porcentaje.toFixed(1)}%
        </span>
      </div>
      {item.subtitulo && <p className="text-[11px] text-[#5d6678] mb-1.5">{item.subtitulo}</p>}
      <div className="space-y-0.5 pt-1.5 border-t border-[#e2e6ef]">
        <div className="flex items-center justify-between gap-4">
          <span className="text-[#5d6678]">Contestadas:</span>
          <strong className="text-[#15803d]">{item.respondieron}</strong>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[#5d6678]">Pendientes:</span>
          <strong className="text-[#b45309]">{item.pendientes}</strong>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[#5d6678]">Total inscripciones:</span>
          <span className="font-semibold text-[#1c2333]">{item.total}</span>
        </div>
      </div>
    </div>
  )
}

/** Lista de participación: solo indica si cada alumno respondió, nunca qué respondió. */
export default function ParticipacionAlumnos({ area }: Props) {
  const { usuario, cerrarSesion } = useAuth()
  const navigate = useNavigate()
  const [filas, setFilas] = useState<ParticipacionAPI[]>([])
  const [resumen, setResumen] = useState<ResumenParticipacion | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [crn, setCrn] = useState('todas')
  const [estado, setEstado] = useState<'todos' | 'respondio' | 'pendiente'>('todos')
  const [busqueda, setBusqueda] = useState('')
  const [modoGrafico, setModoGrafico] = useState<'carrera' | 'materia'>('carrera')
  const [carreraGrafico, setCarreraGrafico] = useState<string>('todas')
  const [materiaGrafico, setMateriaGrafico] = useState<string>('')

  useEffect(() => {
    obtenerParticipacionAPI(usuario?.token || '')
      .then((data) => {
        setFilas(data.participacion)
        setResumen(data.resumen)
      })
      .catch((err) => {
        if (err instanceof ErrorAPI && err.status === 401) {
          cerrarSesion()
          navigate(`/personal/${area}/login`, { replace: true })
          return
        }
        setError(err.message)
      })
      .finally(() => setCargando(false))
  }, [usuario?.token])

  const materias = [...new Map(filas.map((f) => [f.crn, f])).values()]
  const texto = busqueda.trim().toLowerCase()

  const carrerasDisponibles = useMemo(
    () => [...new Set(filas.map((f) => f.carrera).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es')),
    [filas]
  )

  const materiasGraficoDisponibles = useMemo(() => {
    const mapa = new Map<string, { nombre: string; claves: Set<string> }>()
    for (const f of filas) {
      const entry = mapa.get(f.materia) ?? { nombre: f.materia, claves: new Set<string>() }
      entry.claves.add(f.clave)
      mapa.set(f.materia, entry)
    }
    return Array.from(mapa.values())
      .map((item) => ({ nombre: item.nombre, clave: Array.from(item.claves).join(', ') }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  }, [filas])

  useEffect(() => {
    if (carreraGrafico !== 'todas' && !carrerasDisponibles.includes(carreraGrafico)) {
      setCarreraGrafico('todas')
    }
  }, [carreraGrafico, carrerasDisponibles])

  useEffect(() => {
    if (materiasGraficoDisponibles.length === 0) {
      if (materiaGrafico !== '') setMateriaGrafico('')
      return
    }
    if (!materiasGraficoDisponibles.some((m) => m.nombre === materiaGrafico)) {
      setMateriaGrafico(materiasGraficoDisponibles[0].nombre)
    }
  }, [materiaGrafico, materiasGraficoDisponibles])

  const { datosGrafico, resumenGrafico } = useMemo<{
    datosGrafico: DatoGraficoParticipacion[]
    resumenGrafico: { respondieron: number; pendientes: number; total: number; porcentaje: number }
  }>(() => {
    if (filas.length === 0) {
      return {
        datosGrafico: [],
        resumenGrafico: { respondieron: 0, pendientes: 0, total: 0, porcentaje: 0 },
      }
    }

    const totalGlobal = resumen?.total ?? filas.length
    const respondieronGlobal = resumen?.respondieron ?? filas.filter((f) => f.respondio).length
    const pendientesGlobal = totalGlobal - respondieronGlobal
    const porcentajeGlobal = resumen?.porcentaje ?? calcularPorcentaje(respondieronGlobal, totalGlobal)

    const barraGeneral: DatoGraficoParticipacion = {
      nombre: 'Índice General de Participación',
      etiqueta: 'General',
      porcentaje: porcentajeGlobal,
      respondieron: respondieronGlobal,
      pendientes: pendientesGlobal,
      total: totalGlobal,
      tipo: 'general',
      subtitulo: 'Todas las inscripciones del ciclo activo',
    }

    if (modoGrafico === 'carrera') {
      if (carreraGrafico !== 'todas') {
        const filasCarrera = filas.filter((f) => f.carrera === carreraGrafico)
        const respCarrera = filasCarrera.filter((f) => f.respondio).length
        const totCarrera = filasCarrera.length
        const pendCarrera = totCarrera - respCarrera
        const pctCarrera = calcularPorcentaje(respCarrera, totCarrera)

        const barraCarrera: DatoGraficoParticipacion = {
          nombre: `Carrera: ${carreraGrafico}`,
          etiqueta: acortarEtiqueta(carreraGrafico, 16),
          porcentaje: pctCarrera,
          respondieron: respCarrera,
          pendientes: pendCarrera,
          total: totCarrera,
          tipo: 'carrera',
          subtitulo: 'Avance total de la carrera seleccionada',
        }

        const porSemestre = new Map<number, { total: number; respondieron: number }>()
        for (const f of filasCarrera) {
          const prev = porSemestre.get(f.semestre) ?? { total: 0, respondieron: 0 }
          prev.total += 1
          if (f.respondio) prev.respondieron += 1
          porSemestre.set(f.semestre, prev)
        }

        const barrasSemestres: DatoGraficoParticipacion[] = Array.from(porSemestre.entries())
          .sort((a, b) => a[0] - b[0])
          .map(([sem, stats]) => ({
            nombre: `${carreraGrafico} — Semestre ${sem}`,
            etiqueta: `Sem. ${sem}`,
            porcentaje: calcularPorcentaje(stats.respondieron, stats.total),
            respondieron: stats.respondieron,
            pendientes: stats.total - stats.respondieron,
            total: stats.total,
            tipo: 'semestre',
            subtitulo: `Desglose semestre ${sem}`,
          }))

        return {
          datosGrafico: [barraGeneral, barraCarrera, ...barrasSemestres],
          resumenGrafico: {
            respondieron: respCarrera,
            pendientes: pendCarrera,
            total: totCarrera,
            porcentaje: pctCarrera,
          },
        }
      }

      const porCarrera = new Map<string, { total: number; respondieron: number }>()
      for (const f of filas) {
        const nombreCarrera = f.carrera || 'Sin carrera'
        const prev = porCarrera.get(nombreCarrera) ?? { total: 0, respondieron: 0 }
        prev.total += 1
        if (f.respondio) prev.respondieron += 1
        porCarrera.set(nombreCarrera, prev)
      }

      const barrasCarreras: DatoGraficoParticipacion[] = Array.from(porCarrera.entries())
        .map(([nombreCarrera, stats]) => ({
          nombre: nombreCarrera,
          etiqueta: acortarEtiqueta(nombreCarrera, 18),
          porcentaje: calcularPorcentaje(stats.respondieron, stats.total),
          respondieron: stats.respondieron,
          pendientes: stats.total - stats.respondieron,
          total: stats.total,
          tipo: 'carrera' as const,
          subtitulo: 'Avance acumulado por carrera',
        }))
        .sort((a, b) => b.porcentaje - a.porcentaje)

      return {
        datosGrafico: [barraGeneral, ...barrasCarreras],
        resumenGrafico: {
          respondieron: respondieronGlobal,
          pendientes: pendientesGlobal,
          total: totalGlobal,
          porcentaje: porcentajeGlobal,
        },
      }
    }

    // Modo 'materia': muestra el avance únicamente de la materia seleccionada (y sus CRNs si tiene varios)
    if (!materiaGrafico) {
      return {
        datosGrafico: [barraGeneral],
        resumenGrafico: {
          respondieron: respondieronGlobal,
          pendientes: pendientesGlobal,
          total: totalGlobal,
          porcentaje: porcentajeGlobal,
        },
      }
    }

    const filasMateria = filas.filter((f) => f.materia === materiaGrafico)
    const respMat = filasMateria.filter((f) => f.respondio).length
    const totMat = filasMateria.length
    const pendMat = totMat - respMat
    const pctMat = calcularPorcentaje(respMat, totMat)

    const porGrupo = new Map<
      string,
      { clave: string; docente: string; total: number; respondieron: number }
    >()
    for (const f of filasMateria) {
      const prev = porGrupo.get(f.crn) ?? {
        clave: f.clave,
        docente: f.docente,
        total: 0,
        respondieron: 0,
      }
      prev.total += 1
      if (f.respondio) prev.respondieron += 1
      porGrupo.set(f.crn, prev)
    }

    const claves = Array.from(new Set(filasMateria.map((f) => f.clave))).join(', ')
    const barraMateria: DatoGraficoParticipacion = {
      nombre: materiaGrafico,
      etiqueta: acortarEtiqueta(materiaGrafico, 18),
      porcentaje: pctMat,
      respondieron: respMat,
      pendientes: pendMat,
      total: totMat,
      tipo: 'materia',
      subtitulo: `Clave: ${claves} · ${porGrupo.size} grupo${porGrupo.size === 1 ? '' : 's'}`,
    }

    const barrasGrupos: DatoGraficoParticipacion[] = Array.from(porGrupo.entries()).map(([crnGrupo, stats]) => ({
      nombre: `${materiaGrafico} — CRN ${crnGrupo}`,
      etiqueta: acortarEtiqueta(`CRN ${crnGrupo}`, 16),
      porcentaje: calcularPorcentaje(stats.respondieron, stats.total),
      respondieron: stats.respondieron,
      pendientes: stats.total - stats.respondieron,
      total: stats.total,
      tipo: 'grupo',
      subtitulo: `Docente: ${stats.docente}`,
    }))

    return {
      datosGrafico:
        barrasGrupos.length > 1
          ? [barraGeneral, barraMateria, ...barrasGrupos.sort((a, b) => b.porcentaje - a.porcentaje)]
          : [barraGeneral, barraMateria],
      resumenGrafico: {
        respondieron: respMat,
        pendientes: pendMat,
        total: totMat,
        porcentaje: pctMat,
      },
    }
  }, [filas, resumen, modoGrafico, carreraGrafico, materiaGrafico])

  const visibles = filas.filter(
    (f) =>
      (crn === 'todas' || f.crn === crn) &&
      (estado === 'todos' || f.respondio === (estado === 'respondio')) &&
      (!texto || f.matricula.toLowerCase().includes(texto) || f.correo.toLowerCase().includes(texto))
  )

  const claseFiltro =
    'px-3 py-2 rounded-xl border border-[#e2e6ef] bg-white text-xs font-semibold text-[#1c2333] focus:border-[#0f766e]'

  return (
    <>
      {/* Tarjetas KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-[#e2e6ef] rounded-2xl p-5 shadow-xs">
          <div className="text-3xl font-extrabold text-[#15803d]">{resumen?.respondieron ?? 0}</div>
          <div className="text-xs font-semibold text-[#5d6678] mt-1">Respondieron</div>
        </div>

        <div className="bg-white border border-[#e2e6ef] rounded-2xl p-5 shadow-xs">
          <div className="text-3xl font-extrabold text-[#b45309]">{resumen?.pendientes ?? 0}</div>
          <div className="text-xs font-semibold text-[#5d6678] mt-1">Pendientes</div>
        </div>

        <div className="bg-white border border-[#e2e6ef] rounded-2xl p-5 shadow-xs">
          <div className="text-3xl font-extrabold text-[#0f766e]">{(resumen?.porcentaje ?? 0).toFixed(1)}%</div>
          <div className="text-xs font-semibold text-[#5d6678] mt-1">% de Participación</div>
        </div>
      </div>

      {/* Gráfico de Índice de Participación Estudiantil por Carrera / Materia */}
      <div className="bg-white border border-[#e2e6ef] rounded-2xl p-5 sm:p-6 shadow-xs mb-8 min-w-0">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 mb-4">
          <div>
            <h2 className="text-lg font-bold text-[#1c2333]">
              Índice de Participación por {modoGrafico === 'carrera' ? 'Carrera' : 'Materia'}
            </h2>
            <p className="text-xs text-[#5d6678]">
              {modoGrafico === 'carrera'
                ? carreraGrafico === 'todas'
                  ? 'Vista general del porcentaje de encuestas contestadas por carrera frente al índice general.'
                  : `Avance de ${carreraGrafico} desglosado por semestre frente al índice general.`
                : materiaGrafico
                ? `Avance de encuestas contestadas en ${materiaGrafico} frente al índice general.`
                : 'Selecciona una materia para visualizar su avance de participación.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
            <div
              className="inline-flex rounded-xl border border-[#e2e6ef] bg-[#f4f6fb] p-1"
              role="group"
              aria-label="Agrupación de participación"
            >
              <button
                type="button"
                onClick={() => setModoGrafico('carrera')}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  modoGrafico === 'carrera'
                    ? 'bg-[#0f766e] text-white shadow-xs'
                    : 'text-[#5d6678] hover:text-[#1c2333]'
                }`}
              >
                Por Carrera
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

            {modoGrafico === 'carrera' ? (
              <select
                aria-label="Seleccionar carrera"
                value={carreraGrafico}
                onChange={(e) => setCarreraGrafico(e.target.value)}
                disabled={carrerasDisponibles.length === 0}
                className="w-full sm:w-56 px-3 py-2 rounded-xl border border-[#e2e6ef] bg-white text-xs font-semibold text-[#1c2333] focus:border-[#0f766e] disabled:opacity-60"
              >
                <option value="todas">Todas las carreras (General)</option>
                {carrerasDisponibles.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            ) : (
              <select
                aria-label="Seleccionar materia de participación"
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

        {/* Banda resumen contextual de la selección actual */}
        {!cargando && datosGrafico.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-4 p-3 rounded-xl bg-[#f4f6fb] border border-[#e2e6ef] text-xs">
            <span className="font-bold text-[#1c2333]">
              {modoGrafico === 'carrera'
                ? carreraGrafico === 'todas'
                  ? 'Resumen General:'
                  : `${carreraGrafico}:`
                : `${materiaGrafico}:`}
            </span>
            <span className="text-[#15803d] font-semibold">
              {resumenGrafico.respondieron} contestadas
            </span>
            <span className="text-[#b45309] font-semibold">
              {resumenGrafico.pendientes} pendientes
            </span>
            <span className="text-[#5d6678]">
              de {resumenGrafico.total} inscripciones
            </span>
            <span className="sm:ml-auto px-2.5 py-0.5 rounded-full bg-[#e3f4f2] text-[#0f766e] font-bold">
              {resumenGrafico.porcentaje.toFixed(1)}% de avance
            </span>
          </div>
        )}

        {cargando ? (
          <div className="h-64 flex items-center justify-center rounded-xl border border-dashed border-[#e2e6ef] bg-[#f4f6fb]/60 text-xs text-[#5d6678]">
            Cargando datos de participación...
          </div>
        ) : datosGrafico.length === 0 ? (
          <div className="h-64 flex items-center justify-center rounded-xl border border-dashed border-[#e2e6ef] bg-[#f4f6fb]/60 text-xs text-[#5d6678] px-4 text-center">
            No hay registros de participación en el ciclo activo para graficar.
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
                      domain={[0, 100]}
                      ticks={[0, 25, 50, 75, 100]}
                      tickFormatter={(v) => `${v}%`}
                      tick={{ fill: '#5d6678', fontSize: 11 }}
                      axisLine={{ stroke: '#e2e6ef' }}
                      tickLine={false}
                    />
                    <Tooltip
                      content={TooltipParticipacion}
                      cursor={{ fill: '#e3f4f2', opacity: 0.45 }}
                    />
                    {resumen && (
                      <ReferenceLine
                        y={resumen.porcentaje}
                        stroke="#0f766e"
                        strokeDasharray="4 4"
                        label={{
                          value: `General (${resumen.porcentaje.toFixed(1)}%)`,
                          fill: '#0f766e',
                          fontSize: 11,
                          position: 'insideTopRight',
                        }}
                      />
                    )}
                    <Bar dataKey="porcentaje" name="Participación (%)" radius={[8, 8, 0, 0]} maxBarSize={54}>
                      {datosGrafico.map((entry, idx) => (
                        <Cell
                          key={`${entry.tipo}-${entry.nombre}-${idx}`}
                          fill={colorBarraParticipacion(entry)}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-3 pt-3 border-t border-[#e2e6ef] text-[11px] text-[#5d6678]">
              <span className="inline-flex items-center gap-1.5 font-medium text-[#1c2333]">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#0f766e]" />
                Índice General
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#0d9488]" />
                Alto (&ge; 80%)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#14b8a6]" />
                Medio (50% – 79%)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#d97706]" />
                Bajo (1% – 49%)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#dc2626]" />
                Sin respuestas (0%)
              </span>
            </div>
          </>
        )}
      </div>

      <div className="bg-white border border-[#e2e6ef] rounded-2xl p-6 shadow-xs mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
          <h2 className="text-lg font-bold text-[#1c2333]">Participación de alumnos</h2>
          <div className="flex gap-2 flex-wrap">
            <select value={crn} onChange={(e) => setCrn(e.target.value)} className={claseFiltro}>
              <option value="todas">Todas las materias</option>
              {materias.map((m) => (
                <option key={m.crn} value={m.crn}>
                  {m.materia} ({m.crn})
                </option>
              ))}
            </select>

            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value as 'todos' | 'respondio' | 'pendiente')}
              className={claseFiltro}
            >
              <option value="todos">Todos</option>
              <option value="respondio">Respondió</option>
              <option value="pendiente">Pendiente</option>
            </select>

            <input
              type="text"
              placeholder="Buscar matrícula o correo..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="px-3.5 py-2 rounded-xl border border-[#e2e6ef] bg-white text-xs w-full sm:w-56 focus:border-[#0f766e]"
            />
          </div>
        </div>

        <p className="text-xs text-[#5d6678] mb-4">
          Solo se muestra si el alumno respondió. Las calificaciones y comentarios son anónimos y no se
          vinculan con el alumno.
        </p>

        {error && (
          <p className="text-sm text-[#dc2626] font-medium bg-[#fee2e2] rounded-xl p-3 mb-4">{error}</p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#e2e6ef] text-[#5d6678] uppercase tracking-wider">
                <th className="py-3 px-3 font-semibold">Matrícula</th>
                <th className="py-3 px-3 font-semibold">Correo</th>
                <th className="py-3 px-3 font-semibold">Materia (CRN)</th>
                <th className="py-3 px-3 font-semibold">Docente</th>
                <th className="py-3 px-3 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e6ef]">
              {visibles.map((f) => (
                <tr key={`${f.matricula}-${f.crn}`} className="hover:bg-[#f4f6fb]/60 transition-colors">
                  <td className="py-3 px-3 font-medium text-[#1c2333]">{f.matricula}</td>
                  <td className="py-3 px-3 text-[#5d6678]">{f.correo}</td>
                  <td className="py-3 px-3 text-[#1c2333]">
                    {f.materia} <span className="text-[#5d6678]">({f.crn})</span>
                  </td>
                  <td className="py-3 px-3 text-[#1c2333]">{f.docente}</td>
                  <td className="py-3 px-3">
                    {f.respondio ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-[#dcfce7] text-[#15803d] text-[11px] font-semibold">
                        Respondió
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-[#fef3c7] text-[#b45309] text-[11px] font-semibold">
                        Pendiente
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {(cargando || visibles.length === 0) && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[#5d6678]">
                    {cargando ? 'Cargando...' : 'No se encontraron registros.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
