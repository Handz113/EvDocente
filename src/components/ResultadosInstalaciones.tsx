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
import Barra from './Barra'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from '../router'
import { ErrorAPI } from '../services/evaluacionService'
import {
  DIMENSIONES,
  obtenerResultadosInstalacionesAPI,
  type CicloAPI,
  type ResultadoInstalacion,
} from '../services/instalacionService'

interface Props {
  /** Área del panel, para mandar a su login si la sesión venció */
  area: 'coordinacion' | 'administracion'
  /** Cambia cada vez que el panel pide refrescar los datos (tiempo real). Opcional. */
  refresco?: number
}

interface DatoIndiceInstalacion {
  nombre: string
  etiqueta: string
  promedio: number
  evaluaciones: number
  tipo: 'general' | 'instalacion' | 'dimension'
  subtitulo?: string
}

interface DatoParticipacionInstalacion {
  nombre: string
  etiqueta: string
  evaluaciones: number
  porcentajeTotal: number
  promedio: number | null
  tipo: 'instalacion' | 'categoria'
  subtitulo?: string
}

function acortarEtiqueta(texto: string, max = 16): string {
  return texto.length > max ? `${texto.slice(0, max - 1)}…` : texto
}

function colorBarraIndice(item: DatoIndiceInstalacion): string {
  if (item.tipo === 'general') return '#0f766e'
  if (item.evaluaciones === 0 && item.promedio === 0) return '#cbd5e1'
  if (item.promedio >= 8.5) return '#0d9488'
  if (item.promedio >= 7.0) return '#14b8a6'
  return '#dc2626'
}

function colorBarraParticipacionInst(evaluaciones: number, maximo: number): string {
  if (evaluaciones === 0) return '#cbd5e1'
  const ratio = maximo > 0 ? evaluaciones / maximo : 0
  if (ratio >= 0.75) return '#0f766e'
  if (ratio >= 0.4) return '#0d9488'
  return '#14b8a6'
}

function TooltipIndiceInstalacion({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null
  const item = payload[0]?.payload as DatoIndiceInstalacion | undefined
  if (!item) return null

  const sinDatos = item.evaluaciones === 0 && item.promedio === 0
  const estadoTexto = sinDatos
    ? 'Sin evaluaciones'
    : item.promedio >= 9.0
    ? 'Excelente'
    : item.promedio >= 8.0
    ? 'Bueno'
    : item.promedio >= 7.0
    ? 'Suficiente'
    : 'No Suficiente'

  const estadoClase = sinDatos
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
        <span className="text-[#5d6678]">Índice promedio:</span>
        <strong className="text-sm font-extrabold text-[#0f766e]">{item.promedio.toFixed(2)} / 10</strong>
      </div>
      <div className="flex items-center justify-between gap-4 mt-0.5">
        <span className="text-[#5d6678]">Evaluaciones:</span>
        <span className="font-semibold text-[#1c2333]">{item.evaluaciones}</span>
      </div>
    </div>
  )
}

function TooltipParticipacionInstalacion({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null
  const item = payload[0]?.payload as DatoParticipacionInstalacion | undefined
  if (!item) return null

  return (
    <div className="bg-white border border-[#e2e6ef] rounded-xl p-3 shadow-md max-w-xs text-xs">
      <div className="flex items-center justify-between gap-3 mb-1">
        <span className="font-bold text-[#1c2333] leading-snug">{item.nombre}</span>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#e3f4f2] text-[#0f766e] shrink-0">
          {item.porcentajeTotal.toFixed(1)}% del total
        </span>
      </div>
      {item.subtitulo && <p className="text-[11px] text-[#5d6678] mb-1.5">{item.subtitulo}</p>}
      <div className="space-y-0.5 pt-1.5 border-t border-[#e2e6ef]">
        <div className="flex items-center justify-between gap-4">
          <span className="text-[#5d6678]">Encuestas contestadas:</span>
          <strong className="text-sm font-extrabold text-[#0f766e]">{item.evaluaciones}</strong>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[#5d6678]">Índice promedio:</span>
          <span className="font-semibold text-[#1c2333]">
            {item.promedio !== null ? `${item.promedio.toFixed(2)} / 10` : 'Sin evaluaciones'}
          </span>
        </div>
      </div>
    </div>
  )
}

/** Resultados anónimos de talleres y laboratorios del ciclo activo. */
export default function ResultadosInstalaciones({ area, refresco = 0 }: Props) {
  const { usuario, cerrarSesion } = useAuth()
  const navigate = useNavigate()
  const [ciclo, setCiclo] = useState<CicloAPI | null>(null)
  const [filas, setFilas] = useState<ResultadoInstalacion[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [seleccionId, setSeleccionId] = useState<number | null>(null)
  const [tipoIndice, setTipoIndice] = useState<string>('todos')
  const [instalacionIndiceId, setInstalacionIndiceId] = useState<string>('todas')
  const [modoParticipacion, setModoParticipacion] = useState<'instalacion' | 'tipo'>('instalacion')
  const [tipoParticipacion, setTipoParticipacion] = useState<string>('todos')

  useEffect(() => {
    // GET /api/instalaciones/resultados — ciclo activo por defecto
    obtenerResultadosInstalacionesAPI(usuario?.token || '')
      .then((data) => {
        setError('')
        setCiclo(data.ciclo)
        setFilas(data.instalaciones)
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
  }, [usuario?.token, refresco])

  const detalle = seleccionId !== null ? filas.find((f) => f.id === seleccionId) : null

  const tiposDisponibles = useMemo(
    () => [...new Set(filas.map((f) => f.tipo).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es')),
    [filas]
  )

  useEffect(() => {
    if (tipoIndice !== 'todos' && !tiposDisponibles.includes(tipoIndice)) {
      setTipoIndice('todos')
    }
    if (tipoParticipacion !== 'todos' && !tiposDisponibles.includes(tipoParticipacion)) {
      setTipoParticipacion('todos')
    }
  }, [tipoIndice, tipoParticipacion, tiposDisponibles])

  const instalacionesPorTipoIndice = useMemo(
    () => filas.filter((f) => tipoIndice === 'todos' || f.tipo === tipoIndice),
    [filas, tipoIndice]
  )

  useEffect(() => {
    if (
      instalacionIndiceId !== 'todas' &&
      !instalacionesPorTipoIndice.some((f) => String(f.id) === instalacionIndiceId)
    ) {
      setInstalacionIndiceId('todas')
    }
  }, [instalacionIndiceId, instalacionesPorTipoIndice])

  const kpisTalleres = useMemo(() => {
    const totalEvaluaciones = filas.reduce((acc, f) => acc + f.totalEvaluaciones, 0)
    const evaluadas = filas.filter((f) => f.totalEvaluaciones > 0 && f.promedio !== null)
    const promedioGeneral =
      totalEvaluaciones > 0
        ? evaluadas.reduce((acc, f) => acc + (f.promedio ?? 0) * f.totalEvaluaciones, 0) / totalEvaluaciones
        : null
    const coberturaPct = filas.length > 0 ? (evaluadas.length / filas.length) * 100 : 0

    return {
      totalEvaluaciones,
      totalInstalaciones: filas.length,
      instalacionesEvaluadas: evaluadas.length,
      promedioGeneral,
      coberturaPct,
    }
  }, [filas])

  const datosIndice = useMemo<DatoIndiceInstalacion[]>(() => {
    if (filas.length === 0) return []

    const general: DatoIndiceInstalacion = {
      nombre: 'Índice General de Talleres',
      etiqueta: 'General',
      promedio: kpisTalleres.promedioGeneral !== null ? Number(kpisTalleres.promedioGeneral.toFixed(2)) : 0,
      evaluaciones: kpisTalleres.totalEvaluaciones,
      tipo: 'general',
      subtitulo: `${kpisTalleres.instalacionesEvaluadas} de ${kpisTalleres.totalInstalaciones} instalaciones evaluadas`,
    }

    if (instalacionIndiceId !== 'todas') {
      const inst = instalacionesPorTipoIndice.find((f) => String(f.id) === instalacionIndiceId)
      if (!inst) return [general]

      const barraInst: DatoIndiceInstalacion = {
        nombre: inst.nombre,
        etiqueta: acortarEtiqueta(inst.nombre, 16),
        promedio: inst.promedio !== null ? Number(inst.promedio.toFixed(2)) : 0,
        evaluaciones: inst.totalEvaluaciones,
        tipo: 'instalacion',
        subtitulo: `${inst.tipo} · Promedio general de la instalación`,
      }

      const barrasDims: DatoIndiceInstalacion[] = DIMENSIONES.map((dim) => {
        const val = inst.porDimension[dim]
        return {
          nombre: `${inst.nombre} — ${dim}`,
          etiqueta: dim,
          promedio: val !== null ? Number(val.toFixed(2)) : 0,
          evaluaciones: val !== null ? inst.totalEvaluaciones : 0,
          tipo: 'dimension',
          subtitulo: `Dimensión: ${dim}`,
        }
      })

      return [general, barraInst, ...barrasDims]
    }

    const barrasInstalaciones: DatoIndiceInstalacion[] = instalacionesPorTipoIndice
      .map((f) => ({
        nombre: f.nombre,
        etiqueta: acortarEtiqueta(f.nombre, 16),
        promedio: f.promedio !== null ? Number(f.promedio.toFixed(2)) : 0,
        evaluaciones: f.totalEvaluaciones,
        tipo: 'instalacion' as const,
        subtitulo: `${f.tipo}${f.activa ? '' : ' · Inactiva'}`,
      }))
      .sort((a, b) => b.promedio - a.promedio)

    return [general, ...barrasInstalaciones]
  }, [filas, kpisTalleres, instalacionesPorTipoIndice, instalacionIndiceId])

  const { datosParticipacion, maximoParticipacion, totalEvaluacionesVista } = useMemo(() => {
    if (filas.length === 0) {
      return {
        datosParticipacion: [] as DatoParticipacionInstalacion[],
        maximoParticipacion: 0,
        totalEvaluacionesVista: 0,
      }
    }

    const totalGlobal = kpisTalleres.totalEvaluaciones

    if (modoParticipacion === 'tipo') {
      const porTipo = new Map<
        string,
        { evaluaciones: number; sumaPonderada: number; totalInst: number; conEval: number }
      >()

      for (const f of filas) {
        const prev = porTipo.get(f.tipo) ?? { evaluaciones: 0, sumaPonderada: 0, totalInst: 0, conEval: 0 }
        prev.totalInst += 1
        prev.evaluaciones += f.totalEvaluaciones
        if (f.promedio !== null && f.totalEvaluaciones > 0) {
          prev.sumaPonderada += f.promedio * f.totalEvaluaciones
          prev.conEval += 1
        }
        porTipo.set(f.tipo, prev)
      }

      const lista: DatoParticipacionInstalacion[] = Array.from(porTipo.entries())
        .map(([tipoNombre, stats]) => ({
          nombre: tipoNombre,
          etiqueta: acortarEtiqueta(tipoNombre, 18),
          evaluaciones: stats.evaluaciones,
          porcentajeTotal:
            totalGlobal > 0 ? Math.round((stats.evaluaciones / totalGlobal) * 1000) / 10 : 0,
          promedio:
            stats.evaluaciones > 0 ? Math.round((stats.sumaPonderada / stats.evaluaciones) * 100) / 100 : null,
          tipo: 'categoria' as const,
          subtitulo: `${stats.conEval} de ${stats.totalInst} instalaciones evaluadas`,
        }))
        .sort((a, b) => b.evaluaciones - a.evaluaciones)

      const maxVal = lista.reduce((m, item) => Math.max(m, item.evaluaciones), 0)
      return {
        datosParticipacion: lista,
        maximoParticipacion: maxVal,
        totalEvaluacionesVista: totalGlobal,
      }
    }

    const filtradas = filas.filter((f) => tipoParticipacion === 'todos' || f.tipo === tipoParticipacion)
    const totalVista = filtradas.reduce((acc, f) => acc + f.totalEvaluaciones, 0)

    const lista: DatoParticipacionInstalacion[] = filtradas
      .map((f) => ({
        nombre: f.nombre,
        etiqueta: acortarEtiqueta(f.nombre, 16),
        evaluaciones: f.totalEvaluaciones,
        porcentajeTotal:
          totalGlobal > 0 ? Math.round((f.totalEvaluaciones / totalGlobal) * 1000) / 10 : 0,
        promedio: f.promedio,
        tipo: 'instalacion' as const,
        subtitulo: `${f.tipo}${f.activa ? '' : ' · Inactiva'}`,
      }))
      .sort((a, b) => b.evaluaciones - a.evaluaciones)

    const maxVal = lista.reduce((m, item) => Math.max(m, item.evaluaciones), 0)
    return {
      datosParticipacion: lista,
      maximoParticipacion: maxVal,
      totalEvaluacionesVista: totalVista,
    }
  }, [filas, kpisTalleres.totalEvaluaciones, modoParticipacion, tipoParticipacion])

  return (
    <>
      {/* KPIs de Talleres y Laboratorios */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-[#e2e6ef] rounded-2xl p-5 shadow-xs">
          <div className="text-3xl font-extrabold text-[#0f766e]">
            {kpisTalleres.promedioGeneral !== null ? kpisTalleres.promedioGeneral.toFixed(1) : 'S/E'}
          </div>
          <div className="text-xs font-semibold text-[#5d6678] mt-1">
            Índice General de Talleres (0 - 10)
          </div>
        </div>

        <div className="bg-white border border-[#e2e6ef] rounded-2xl p-5 shadow-xs">
          <div className="text-3xl font-extrabold text-[#0f766e]">
            {cargando ? '...' : kpisTalleres.totalEvaluaciones}
          </div>
          <div className="text-xs font-semibold text-[#5d6678] mt-1">
            Evaluaciones de Talleres Recibidas
          </div>
        </div>

        <div className="bg-white border border-[#e2e6ef] rounded-2xl p-5 shadow-xs">
          <div className="text-3xl font-extrabold text-[#0f766e]">
            {kpisTalleres.instalacionesEvaluadas} / {kpisTalleres.totalInstalaciones}
          </div>
          <div className="text-xs font-semibold text-[#5d6678] mt-1">
            Instalaciones con Respuestas
          </div>
        </div>

        <div className="bg-white border border-[#e2e6ef] rounded-2xl p-5 shadow-xs">
          <div className="text-3xl font-extrabold text-[#15803d]">
            {kpisTalleres.coberturaPct.toFixed(0)}%
          </div>
          <div className="text-xs font-semibold text-[#5d6678] mt-1">
            Cobertura del Catálogo Evaluado
          </div>
        </div>
      </div>

      {/* Gráficas de Índice y Participación de Talleres y Laboratorios */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Gráfica 1: Índice de Talleres / Dimensiones */}
        <div className="bg-white border border-[#e2e6ef] rounded-2xl p-5 sm:p-6 shadow-xs min-w-0 flex flex-col">
          <div className="flex flex-col gap-3 mb-4">
            <div>
              <h3 className="text-base font-bold text-[#1c2333]">
                Índice de Satisfacción — Talleres y Laboratorios
              </h3>
              <p className="text-xs text-[#5d6678]">
                {instalacionIndiceId === 'todas'
                  ? 'Comparativa del índice general frente a cada instalación (escala 0 - 10).'
                  : 'Desglose por dimensiones (Equipamiento, Disponibilidad, Limpieza) de la instalación seleccionada.'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              {tiposDisponibles.length > 1 && (
                <select
                  aria-label="Filtrar tipo de instalación para índice"
                  value={tipoIndice}
                  onChange={(e) => setTipoIndice(e.target.value)}
                  className="w-full sm:w-44 px-3 py-2 rounded-xl border border-[#e2e6ef] bg-white text-xs font-semibold text-[#1c2333] focus:border-[#0f766e]"
                >
                  <option value="todos">Todos los tipos</option>
                  {tiposDisponibles.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              )}

              <select
                aria-label="Seleccionar taller o laboratorio para índice"
                value={instalacionIndiceId}
                onChange={(e) => setInstalacionIndiceId(e.target.value)}
                disabled={instalacionesPorTipoIndice.length === 0}
                className="w-full sm:flex-1 px-3 py-2 rounded-xl border border-[#e2e6ef] bg-white text-xs font-semibold text-[#1c2333] focus:border-[#0f766e] disabled:opacity-60"
              >
                <option value="todas">Todas las instalaciones (General)</option>
                {instalacionesPorTipoIndice.map((inst) => (
                  <option key={inst.id} value={String(inst.id)}>
                    {inst.nombre} ({inst.tipo})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {cargando ? (
            <div className="h-64 flex items-center justify-center rounded-xl border border-dashed border-[#e2e6ef] bg-[#f4f6fb]/60 text-xs text-[#5d6678]">
              Cargando índice de instalaciones...
            </div>
          ) : datosIndice.length === 0 ? (
            <div className="h-64 flex items-center justify-center rounded-xl border border-dashed border-[#e2e6ef] bg-[#f4f6fb]/60 text-xs text-[#5d6678] px-4 text-center">
              No hay instalaciones registradas para graficar.
            </div>
          ) : (
            <>
              <div className="w-full overflow-x-auto pb-1">
                <div
                  className="w-full h-64 sm:h-72 min-w-0"
                  style={{
                    minWidth: datosIndice.length > 5 ? `${Math.max(460, datosIndice.length * 76)}px` : undefined,
                  }}
                >
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <BarChart data={datosIndice} margin={{ top: 14, right: 12, left: -14, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e6ef" vertical={false} />
                      <XAxis
                        dataKey="etiqueta"
                        tick={{ fill: '#5d6678', fontSize: 11 }}
                        axisLine={{ stroke: '#e2e6ef' }}
                        tickLine={false}
                        interval={0}
                        angle={-15}
                        textAnchor="end"
                        height={52}
                      />
                      <YAxis
                        domain={[0, 10]}
                        ticks={[0, 2, 4, 6, 7, 8, 10]}
                        tick={{ fill: '#5d6678', fontSize: 11 }}
                        axisLine={{ stroke: '#e2e6ef' }}
                        tickLine={false}
                      />
                      <Tooltip
                        content={TooltipIndiceInstalacion}
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
                      <Bar dataKey="promedio" name="Índice (0 - 10)" radius={[8, 8, 0, 0]} maxBarSize={48}>
                        {datosIndice.map((entry, idx) => (
                          <Cell key={`${entry.tipo}-${entry.nombre}-${idx}`} fill={colorBarraIndice(entry)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 pt-3 border-t border-[#e2e6ef] text-[11px] text-[#5d6678]">
                <span className="inline-flex items-center gap-1.5 font-medium text-[#1c2333]">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#0f766e]" />
                  Índice General
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#0d9488]" />
                  Destacado (&ge; 8.5)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#14b8a6]" />
                  Aceptable (7.0 – 8.4)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#dc2626]" />
                  Por mejorar (&lt; 7.0)
                </span>
              </div>
            </>
          )}
        </div>

        {/* Gráfica 2: Participación en Encuestas de Talleres */}
        <div className="bg-white border border-[#e2e6ef] rounded-2xl p-5 sm:p-6 shadow-xs min-w-0 flex flex-col">
          <div className="flex flex-col gap-3 mb-4">
            <div>
              <h3 className="text-base font-bold text-[#1c2333]">
                Participación en Encuestas de Talleres
              </h3>
              <p className="text-xs text-[#5d6678]">
                Evaluaciones anónimas recibidas {modoParticipacion === 'tipo' ? 'agrupadas por tipo de instalación' : 'por cada taller o laboratorio'} en el ciclo activo.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div
                className="inline-flex rounded-xl border border-[#e2e6ef] bg-[#f4f6fb] p-1"
                role="group"
                aria-label="Agrupación de participación en talleres"
              >
                <button
                  type="button"
                  onClick={() => setModoParticipacion('instalacion')}
                  className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    modoParticipacion === 'instalacion'
                      ? 'bg-[#0f766e] text-white shadow-xs'
                      : 'text-[#5d6678] hover:text-[#1c2333]'
                  }`}
                >
                  Por Instalación
                </button>
                <button
                  type="button"
                  onClick={() => setModoParticipacion('tipo')}
                  className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    modoParticipacion === 'tipo'
                      ? 'bg-[#0f766e] text-white shadow-xs'
                      : 'text-[#5d6678] hover:text-[#1c2333]'
                  }`}
                >
                  Por Tipo
                </button>
              </div>

              {modoParticipacion === 'instalacion' && tiposDisponibles.length > 1 && (
                <select
                  aria-label="Filtrar tipo de instalación para participación"
                  value={tipoParticipacion}
                  onChange={(e) => setTipoParticipacion(e.target.value)}
                  className="w-full sm:flex-1 px-3 py-2 rounded-xl border border-[#e2e6ef] bg-white text-xs font-semibold text-[#1c2333] focus:border-[#0f766e]"
                >
                  <option value="todos">Todos los tipos</option>
                  {tiposDisponibles.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {!cargando && datosParticipacion.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3 px-3 py-2 rounded-xl bg-[#f4f6fb] border border-[#e2e6ef] text-xs">
              <span className="text-[#5d6678]">
                Evaluaciones mostradas:{' '}
                <strong className="text-[#1c2333]">{totalEvaluacionesVista}</strong>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#e3f4f2] text-[#0f766e] font-bold">
                {kpisTalleres.instalacionesEvaluadas} de {kpisTalleres.totalInstalaciones} evaluadas
              </span>
            </div>
          )}

          {cargando ? (
            <div className="h-64 flex items-center justify-center rounded-xl border border-dashed border-[#e2e6ef] bg-[#f4f6fb]/60 text-xs text-[#5d6678]">
              Cargando participación en talleres...
            </div>
          ) : datosParticipacion.length === 0 ? (
            <div className="h-64 flex items-center justify-center rounded-xl border border-dashed border-[#e2e6ef] bg-[#f4f6fb]/60 text-xs text-[#5d6678] px-4 text-center">
              No hay instalaciones registradas para graficar.
            </div>
          ) : (
            <>
              <div className="w-full overflow-x-auto pb-1">
                <div
                  className="w-full h-64 sm:h-72 min-w-0"
                  style={{
                    minWidth:
                      datosParticipacion.length > 5
                        ? `${Math.max(460, datosParticipacion.length * 76)}px`
                        : undefined,
                  }}
                >
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <BarChart
                      data={datosParticipacion}
                      margin={{ top: 14, right: 12, left: -14, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e6ef" vertical={false} />
                      <XAxis
                        dataKey="etiqueta"
                        tick={{ fill: '#5d6678', fontSize: 11 }}
                        axisLine={{ stroke: '#e2e6ef' }}
                        tickLine={false}
                        interval={0}
                        angle={-15}
                        textAnchor="end"
                        height={52}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fill: '#5d6678', fontSize: 11 }}
                        axisLine={{ stroke: '#e2e6ef' }}
                        tickLine={false}
                      />
                      <Tooltip
                        content={TooltipParticipacionInstalacion}
                        cursor={{ fill: '#e3f4f2', opacity: 0.45 }}
                      />
                      <Bar
                        dataKey="evaluaciones"
                        name="Evaluaciones recibidas"
                        radius={[8, 8, 0, 0]}
                        maxBarSize={48}
                      >
                        {datosParticipacion.map((entry, idx) => (
                          <Cell
                            key={`${entry.tipo}-${entry.nombre}-${idx}`}
                            fill={colorBarraParticipacionInst(entry.evaluaciones, maximoParticipacion)}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 pt-3 border-t border-[#e2e6ef] text-[11px] text-[#5d6678]">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#0f766e]" />
                  Alta participación
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#0d9488]" />
                  Media
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#14b8a6]" />
                  Inicial
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#cbd5e1]" />
                  Sin respuestas (0)
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="bg-white border border-[#e2e6ef] rounded-2xl p-6 shadow-xs mb-8">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-[#1c2333]">Talleres y laboratorios</h2>
          <p className="text-xs text-[#5d6678]">
            {ciclo ? `${ciclo.nombre}. ` : ''}Promedios en escala de 10. Los resultados son anónimos.
          </p>
        </div>

        {error && (
          <p className="text-sm text-[#dc2626] font-medium bg-[#fee2e2] rounded-xl p-3 mb-4">{error}</p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#e2e6ef] text-[#5d6678] uppercase tracking-wider">
                <th className="py-3 px-3 font-semibold">Instalación</th>
                <th className="py-3 px-3 font-semibold">Evaluaciones</th>
                <th className="py-3 px-3 font-semibold w-40">Promedio</th>
                {DIMENSIONES.map((d) => (
                  <th key={d} className="py-3 px-3 font-semibold w-36">
                    {d}
                  </th>
                ))}
                <th className="py-3 px-3 font-semibold text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e6ef]">
              {filas.map((f) => (
                <tr key={f.id} className="hover:bg-[#f4f6fb]/60 transition-colors">
                  <td className="py-3 px-3">
                    <span className="font-medium text-[#1c2333]">{f.nombre}</span>
                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                      <span className="text-[11px] text-[#5d6678]">
                        {f.tipo}
                        {!f.activa && ' · Inactiva'}
                      </span>
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          f.carrera
                            ? 'bg-[#e3f4f2] text-[#0f766e]'
                            : 'bg-[#f4f6fb] text-[#5d6678]'
                        }`}
                      >
                        {f.carrera || 'General'}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-[#5d6678]">{f.totalEvaluaciones}</td>
                  <td className="py-3 px-3">
                    {f.promedio === null ? (
                      <span className="text-[#5d6678]">Sin evaluaciones</span>
                    ) : (
                      <Barra valor={f.promedio} max={10} />
                    )}
                  </td>
                  {DIMENSIONES.map((d) => (
                    <td key={d} className="py-3 px-3">
                      {f.porDimension[d] === null ? (
                        <span className="text-[#5d6678]">—</span>
                      ) : (
                        <Barra valor={f.porDimension[d] as number} max={10} />
                      )}
                    </td>
                  ))}
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => setSeleccionId(f.id)}
                      className="px-3 py-1 rounded-lg border border-[#e2e6ef] text-[#0f766e] hover:bg-[#e3f4f2] font-semibold transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Ver detalle
                    </button>
                  </td>
                </tr>
              ))}
              {(cargando || filas.length === 0) && (
                <tr>
                  <td colSpan={DIMENSIONES.length + 4} className="py-8 text-center text-[#5d6678]">
                    {cargando ? 'Cargando...' : 'No hay instalaciones registradas.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {detalle && (
        <div className="bg-white border border-[#e2e6ef] rounded-2xl p-6 shadow-md mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-[#1c2333]">{detalle.nombre}</h2>
                <span
                  className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                    detalle.carrera
                      ? 'bg-[#e3f4f2] text-[#0f766e]'
                      : 'bg-[#f4f6fb] text-[#5d6678]'
                  }`}
                >
                  {detalle.carrera || 'General'}
                </span>
              </div>
              <p className="text-xs text-[#5d6678]">
                {detalle.tipo} · {detalle.totalEvaluaciones} evaluaciones
              </p>
            </div>
            <button
              onClick={() => setSeleccionId(null)}
              className="px-3 py-1.5 rounded-lg border border-[#e2e6ef] text-xs font-semibold text-[#5d6678] hover:bg-[#f4f6fb] cursor-pointer"
            >
              Cerrar detalle
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-bold text-[#1c2333] mb-3">Promedio por pregunta</h3>
              {detalle.porPregunta.length === 0 ? (
                <p className="text-xs text-[#5d6678]">Aún no hay respuestas en este ciclo.</p>
              ) : (
                <div className="space-y-3">
                  {detalle.porPregunta.map((p) => (
                    <div key={p.id}>
                      <p className="text-xs text-[#1c2333] mb-1">
                        <span className="font-semibold text-[#0f766e]">{p.dimension}</span> · {p.texto}
                      </p>
                      <Barra valor={p.promedio} max={10} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-bold text-[#1c2333] mb-3">Comentarios anónimos</h3>
              {detalle.comentarios.length === 0 ? (
                <p className="text-xs text-[#5d6678]">Sin comentarios.</p>
              ) : (
                <ul className="space-y-2">
                  {detalle.comentarios.map((c, i) => (
                    <li
                      key={i}
                      className="text-xs text-[#1c2333] p-3 rounded-xl border border-[#e2e6ef] bg-[#f4f6fb]"
                    >
                      “{c}”
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
