import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from '../router'
import { ErrorAPI } from '../services/evaluacionService'
import {
  obtenerBitacoraAPI,
  type RegistroBitacora,
  type FiltrosBitacora,
} from '../services/adminService'

const LIMITE_POR_PAGINA = 25

const ETIQUETAS_ACCION: Record<string, string> = {
  LOGIN_EXITOSO: 'Inicio de sesión',
  LOGIN_FALLIDO: 'Acceso fallido',
  SOLICITUD_RESET_PASSWORD: 'Solicitud de recuperación',
  RESET_PASSWORD: 'Restablecer contraseña',
  CREAR: 'Crear',
  ACTUALIZAR: 'Actualizar',
  ACTIVAR: 'Activar',
  DESACTIVAR: 'Desactivar',
  ELIMINAR: 'Eliminar',
  EXPORTAR_REPORTE: 'Exportar reporte',
}

const ETIQUETAS_ENTIDAD: Record<string, string> = {
  Sesion: 'Sesión',
  Usuario: 'Usuario',
  Docente: 'Docente',
  Materia: 'Materia',
  CRN: 'CRN',
  Pregunta: 'Pregunta',
  CicloEscolar: 'Ciclo Escolar',
  Instalacion: 'Instalación',
  Reporte: 'Reporte',
}

const ACCIONES_VERDE = new Set(['LOGIN_EXITOSO', 'CREAR', 'ACTIVAR'])
const ACCIONES_AMBAR = new Set([
  'ACTUALIZAR',
  'EXPORTAR_REPORTE',
  'SOLICITUD_RESET_PASSWORD',
  'RESET_PASSWORD',
])
const ACCIONES_ROJO = new Set(['LOGIN_FALLIDO', 'ELIMINAR', 'DESACTIVAR'])

function claseBadgeAccion(accion: string): string {
  if (ACCIONES_VERDE.has(accion)) {
    return 'bg-[#dcfce7] text-[#15803d] border border-[#bbf7d0] dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30'
  }
  if (ACCIONES_AMBAR.has(accion)) {
    return 'bg-[#fef3c7] text-[#b45309] border border-[#fde68a] dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30'
  }
  if (ACCIONES_ROJO.has(accion)) {
    return 'bg-[#fee2e2] text-[#dc2626] border border-[#fecaca] dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30'
  }
  return 'bg-[#f4f6fb] text-[#5d6678] border border-[#e2e6ef] dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
}

function claseBadgeRol(rol: string | null): string {
  switch (rol) {
    case 'Administrador':
      return 'bg-[#e3f4f2] text-[#0f766e] dark:bg-teal-500/15 dark:text-teal-300'
    case 'Coordinador':
      return 'bg-[#e0f2fe] text-[#0369a1] dark:bg-sky-500/15 dark:text-sky-300'
    case 'Docente':
      return 'bg-[#eef2ff] text-[#3730a3] dark:bg-indigo-500/15 dark:text-indigo-300'
    case 'Alumno':
      return 'bg-[#f3e8ff] text-[#6b21a8] dark:bg-purple-500/15 dark:text-purple-300'
    default:
      return 'bg-[#f4f6fb] text-[#5d6678] dark:bg-slate-800 dark:text-slate-300'
  }
}

function formatearEtiquetaAccion(accion: string): string {
  return ETIQUETAS_ACCION[accion] ?? accion.replace(/_/g, ' ')
}

function formatearEtiquetaEntidad(entidad: string): string {
  return ETIQUETAS_ENTIDAD[entidad] ?? entidad
}

function formatearFechaHora(iso: string): string {
  if (!iso) return '—'
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return iso
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(fecha)
}

/**
 * HU21: Bitácora de Auditoría — consulta de solo lectura e inmutable
 * de accesos, recuperaciones, cambios administrativos y exportaciones.
 */
export default function BitacoraAuditoria() {
  const { usuario, cerrarSesion } = useAuth()
  const navigate = useNavigate()
  const token = usuario?.token || ''

  // Filtros controlados
  const [busquedaInput, setBusquedaInput] = useState('')
  const [busquedaDebounced, setBusquedaDebounced] = useState('')
  const [accion, setAccion] = useState('')
  const [entidad, setEntidad] = useState('')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [pagina, setPagina] = useState(1)
  const [refrescoManual, setRefrescoManual] = useState(0)

  // Datos y estado de consulta
  const [registros, setRegistros] = useState<RegistroBitacora[]>([])
  const [total, setTotal] = useState(0)
  const [totalPaginas, setTotalPaginas] = useState(0)
  const [accionesDisponibles, setAccionesDisponibles] = useState<string[]>([])
  const [entidadesDisponibles, setEntidadesDisponibles] = useState<string[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const solicitudActivaRef = useRef(0)

  // Debounce del buscador para evitar consultas excesivas mientras se escribe
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setBusquedaDebounced(busquedaInput.trim())
      setPagina(1)
    }, 350)
    return () => window.clearTimeout(timer)
  }, [busquedaInput])

  const rangoFechasInvalido = Boolean(fechaInicio && fechaFin && fechaFin < fechaInicio)

  const cargarBitacora = useCallback(async () => {
    if (!token) return
    if (rangoFechasInvalido) {
      setError('La fecha "Hasta" no puede ser anterior a la fecha "Desde".')
      setCargando(false)
      return
    }

    const idSolicitud = ++solicitudActivaRef.current
    setCargando(true)
    setError('')

    const filtros: FiltrosBitacora = {
      busqueda: busquedaDebounced || undefined,
      accion: accion || undefined,
      entidad: entidad || undefined,
      fechaInicio: fechaInicio || undefined,
      fechaFin: fechaFin || undefined,
      pagina,
      limite: LIMITE_POR_PAGINA,
    }

    try {
      const data = await obtenerBitacoraAPI(token, filtros)
      if (idSolicitud !== solicitudActivaRef.current) return

      setRegistros(data.registros)
      setTotal(data.total)
      setTotalPaginas(data.totalPaginas)
      setAccionesDisponibles(data.accionesDisponibles)
      setEntidadesDisponibles(data.entidadesDisponibles)
    } catch (err) {
      if (idSolicitud !== solicitudActivaRef.current) return

      if (err instanceof ErrorAPI && err.status === 401) {
        cerrarSesion()
        navigate('/personal/administracion/login', { replace: true })
        return
      }
      setError((err as Error).message || 'No se pudo cargar la bitácora de auditoría.')
    } finally {
      if (idSolicitud === solicitudActivaRef.current) {
        setCargando(false)
      }
    }
  }, [
    token,
    rangoFechasInvalido,
    busquedaDebounced,
    accion,
    entidad,
    fechaInicio,
    fechaFin,
    pagina,
    cerrarSesion,
    navigate,
  ])

  useEffect(() => {
    cargarBitacora()
  }, [cargarBitacora, refrescoManual])

  const hayFiltrosActivos = Boolean(
    busquedaInput.trim() || accion || entidad || fechaInicio || fechaFin
  )

  const handleLimpiarFiltros = () => {
    setBusquedaInput('')
    setBusquedaDebounced('')
    setAccion('')
    setEntidad('')
    setFechaInicio('')
    setFechaFin('')
    setPagina(1)
    setError('')
  }

  const handleActualizar = () => {
    setBusquedaDebounced(busquedaInput.trim())
    setRefrescoManual((n) => n + 1)
  }

  const inicioMostrado = total === 0 ? 0 : (pagina - 1) * LIMITE_POR_PAGINA + 1
  const finMostrado = total === 0 ? 0 : Math.min(pagina * LIMITE_POR_PAGINA, total)

  const claseControl =
    'w-full px-3 py-2 rounded-xl border border-[#e2e6ef] dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-[#1c2333] dark:text-slate-100 focus:border-[#0f766e] dark:focus:border-teal-500 focus:outline-none'

  return (
    <div className="bg-white dark:bg-slate-900 border border-[#e2e6ef] dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs mb-8">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-[#1c2333] dark:text-slate-100">Bitácora de Auditoría</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-[#e3f4f2] dark:bg-teal-500/15 text-[#0f766e] dark:text-teal-300 text-[11px] font-semibold">
              Solo lectura
            </span>
          </div>
          <p className="text-xs text-[#5d6678] dark:text-slate-400 mt-1">
            Registro cronológico e inmutable de accesos, cambios administrativos y exportaciones de
            reportes del sistema.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleActualizar}
            disabled={cargando}
            className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-[#0f766e] hover:bg-[#0c5c56] dark:bg-teal-600 dark:hover:bg-teal-500 text-white text-xs font-semibold shadow-xs transition-colors whitespace-nowrap cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {cargando ? 'Actualizando...' : 'Actualizar'}
          </button>
          <button
            type="button"
            onClick={handleLimpiarFiltros}
            disabled={!hayFiltrosActivos && pagina === 1}
            className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl border border-[#e2e6ef] dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-[#f4f6fb] dark:hover:bg-slate-800 text-[#5d6678] dark:text-slate-300 hover:text-[#1c2333] dark:hover:text-slate-100 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      {/* Barra superior de filtros */}
      <div className="p-4 rounded-xl border border-[#e2e6ef] dark:border-slate-700 bg-[#f4f6fb] dark:bg-slate-800/70 mb-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          {/* Buscador por usuario o detalle */}
          <div className="sm:col-span-2 lg:col-span-4 flex flex-col gap-1">
            <label
              htmlFor="bitacora-busqueda"
              className="text-[11px] font-semibold text-[#5d6678] dark:text-slate-300"
            >
              Buscar usuario o detalle
            </label>
            <div className="relative">
              <input
                id="bitacora-busqueda"
                type="text"
                placeholder="Cuenta, nombre, correo o detalle..."
                value={busquedaInput}
                onChange={(e) => setBusquedaInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setBusquedaDebounced(busquedaInput.trim())
                    setPagina(1)
                  }
                }}
                className={`${claseControl} ${busquedaInput ? 'pr-8' : ''} placeholder:text-[#5d6678]/70 dark:placeholder:text-slate-500`}
              />
              {busquedaInput && (
                <button
                  type="button"
                  onClick={() => {
                    setBusquedaInput('')
                    setBusquedaDebounced('')
                    setPagina(1)
                  }}
                  aria-label="Limpiar búsqueda"
                  title="Limpiar búsqueda"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full text-[#5d6678] dark:text-slate-400 hover:text-[#1c2333] dark:hover:text-slate-100 hover:bg-[#f4f6fb] dark:hover:bg-slate-800 text-xs font-bold cursor-pointer"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* Selector de Acción */}
          <div className="lg:col-span-2 flex flex-col gap-1">
            <label htmlFor="bitacora-accion" className="text-[11px] font-semibold text-[#5d6678] dark:text-slate-300">
              Acción
            </label>
            <select
              id="bitacora-accion"
              value={accion}
              onChange={(e) => {
                setAccion(e.target.value)
                setPagina(1)
              }}
              className={`${claseControl} font-medium`}
            >
              <option value="">Todas las acciones</option>
              {accionesDisponibles.map((acc) => (
                <option key={acc} value={acc}>
                  {formatearEtiquetaAccion(acc)}
                </option>
              ))}
            </select>
          </div>

          {/* Selector de Entidad */}
          <div className="lg:col-span-2 flex flex-col gap-1">
            <label htmlFor="bitacora-entidad" className="text-[11px] font-semibold text-[#5d6678] dark:text-slate-300">
              Entidad
            </label>
            <select
              id="bitacora-entidad"
              value={entidad}
              onChange={(e) => {
                setEntidad(e.target.value)
                setPagina(1)
              }}
              className={`${claseControl} font-medium`}
            >
              <option value="">Todas las entidades</option>
              {entidadesDisponibles.map((ent) => (
                <option key={ent} value={ent}>
                  {formatearEtiquetaEntidad(ent)}
                </option>
              ))}
            </select>
          </div>

          {/* Fecha Desde */}
          <div className="lg:col-span-2 flex flex-col gap-1">
            <label htmlFor="bitacora-desde" className="text-[11px] font-semibold text-[#5d6678] dark:text-slate-300">
              Desde
            </label>
            <input
              id="bitacora-desde"
              type="date"
              value={fechaInicio}
              max={fechaFin || undefined}
              onChange={(e) => {
                setFechaInicio(e.target.value)
                setPagina(1)
              }}
              className={claseControl}
            />
          </div>

          {/* Fecha Hasta */}
          <div className="lg:col-span-2 flex flex-col gap-1">
            <label htmlFor="bitacora-hasta" className="text-[11px] font-semibold text-[#5d6678] dark:text-slate-300">
              Hasta
            </label>
            <input
              id="bitacora-hasta"
              type="date"
              value={fechaFin}
              min={fechaInicio || undefined}
              onChange={(e) => {
                setFechaFin(e.target.value)
                setPagina(1)
              }}
              className={claseControl}
            />
          </div>
        </div>
      </div>

      {/* Mensaje de error */}
      {error && (
        <div className="mb-4 rounded-xl bg-[#fee2e2] dark:bg-red-950/50 border border-[#fecaca] dark:border-red-800/60 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="text-xs font-semibold text-[#dc2626] dark:text-red-300">{error}</span>
          {!rangoFechasInvalido && (
            <button
              type="button"
              onClick={handleActualizar}
              className="self-start sm:self-auto px-3 py-1 rounded-lg bg-white dark:bg-red-950/80 border border-[#fecaca] dark:border-red-800/70 text-[#dc2626] dark:text-red-200 hover:bg-[#fef2f2] dark:hover:bg-red-900/60 text-xs font-semibold cursor-pointer"
            >
              Reintentar
            </button>
          )}
        </div>
      )}

      {/* Resumen superior de conteo */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 text-xs text-[#5d6678] dark:text-slate-400">
        <span>
          {cargando ? (
            'Consultando registros de auditoría...'
          ) : total > 0 ? (
            <>
              Mostrando{' '}
              <strong className="text-[#1c2333] dark:text-slate-200">
                {inicioMostrado}–{finMostrado}
              </strong>{' '}
              de <strong className="text-[#1c2333] dark:text-slate-200">{total}</strong> registros
            </>
          ) : (
            'Mostrando 0 de 0 registros'
          )}
        </span>
        {totalPaginas > 0 && (
          <span className="text-[11px] font-medium">
            Página <strong className="text-[#1c2333] dark:text-slate-200">{pagina}</strong> de{' '}
            <strong className="text-[#1c2333] dark:text-slate-200">{totalPaginas}</strong>
          </span>
        )}
      </div>

      {/* Tabla de auditoría */}
      <div className="overflow-x-auto rounded-xl border border-[#e2e6ef] dark:border-slate-800">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#f4f6fb] dark:bg-slate-800/70 border-b border-[#e2e6ef] dark:border-slate-800 text-[#5d6678] dark:text-slate-400 uppercase tracking-wider text-[11px]">
              <th className="py-3 px-3 font-semibold whitespace-nowrap">Fecha y Hora</th>
              <th className="py-3 px-3 font-semibold">Usuario</th>
              <th className="py-3 px-3 font-semibold whitespace-nowrap">Acción</th>
              <th className="py-3 px-3 font-semibold whitespace-nowrap">Entidad</th>
              <th className="py-3 px-3 font-semibold">Detalle</th>
              <th className="py-3 px-3 font-semibold whitespace-nowrap">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e2e6ef] dark:divide-slate-800">
            {cargando && registros.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-[#5d6678] dark:text-slate-400">
                  <div className="inline-flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-[#0f766e] dark:border-teal-400 border-t-transparent dark:border-t-transparent animate-spin" />
                    <span>Cargando bitácora de auditoría...</span>
                  </div>
                </td>
              </tr>
            ) : registros.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 px-4 text-center">
                  <p className="text-sm font-semibold text-[#1c2333] dark:text-slate-100">
                    {hayFiltrosActivos
                      ? 'Sin coincidencias para los filtros aplicados'
                      : 'Aún no hay eventos registrados en la bitácora'}
                  </p>
                  <p className="text-xs text-[#5d6678] dark:text-slate-400 mt-1">
                    {hayFiltrosActivos
                      ? 'Intenta ampliar el rango de fechas o limpiar los filtros de búsqueda.'
                      : 'Los inicios de sesión, cambios administrativos y exportaciones aparecerán aquí automáticamente.'}
                  </p>
                  {hayFiltrosActivos && (
                    <button
                      type="button"
                      onClick={handleLimpiarFiltros}
                      className="mt-3 px-3.5 py-1.5 rounded-xl border border-[#0f766e]/30 dark:border-teal-500/40 bg-[#e3f4f2] dark:bg-teal-500/15 hover:bg-[#0f766e] dark:hover:bg-teal-600 text-[#0f766e] dark:text-teal-300 hover:text-white dark:hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Limpiar filtros
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              registros.map((reg) => {
                const nombreVisible =
                  reg.nombre_usuario ||
                  (reg.numero_cuenta ? 'Cuenta no registrada' : 'Sistema / Anónimo')

                return (
                  <tr
                    key={reg.id_bitacora}
                    className={`hover:bg-[#f4f6fb]/60 dark:hover:bg-slate-800/60 transition-colors align-top ${
                      cargando ? 'opacity-60' : ''
                    }`}
                  >
                    {/* Fecha y Hora */}
                    <td className="py-3 px-3 whitespace-nowrap text-[#1c2333] dark:text-slate-200 font-medium">
                      {formatearFechaHora(reg.fecha_hora)}
                    </td>

                    {/* Usuario (nombre + cuenta + rol) */}
                    <td className="py-3 px-3 min-w-[180px]">
                      <div className="font-semibold text-[#1c2333] dark:text-slate-100 leading-snug">
                        {nombreVisible}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {reg.numero_cuenta && (
                          <span className="font-mono text-[11px] text-[#5d6678] dark:text-slate-400">
                            {reg.numero_cuenta}
                          </span>
                        )}
                        {reg.rol && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${claseBadgeRol(
                              reg.rol
                            )}`}
                          >
                            {reg.rol}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Acción */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        title={reg.accion}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${claseBadgeAccion(
                          reg.accion
                        )}`}
                      >
                        {formatearEtiquetaAccion(reg.accion)}
                      </span>
                    </td>

                    {/* Entidad */}
                    <td className="py-3 px-3 whitespace-nowrap text-[#1c2333] dark:text-slate-200">
                      <span className="font-medium">{formatearEtiquetaEntidad(reg.entidad)}</span>
                      {reg.id_entidad && (
                        <span className="ml-1.5 font-mono text-[10px] text-[#5d6678] dark:text-slate-400">
                          #{reg.id_entidad}
                        </span>
                      )}
                    </td>

                    {/* Detalle */}
                    <td className="py-3 px-3 text-[#1c2333] dark:text-slate-200 min-w-[240px] max-w-md leading-relaxed">
                      {reg.detalle || <span className="text-[#5d6678] dark:text-slate-500">—</span>}
                    </td>

                    {/* IP */}
                    <td className="py-3 px-3 whitespace-nowrap font-mono text-[11px] text-[#5d6678] dark:text-slate-400">
                      {reg.ip_origen || '—'}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Controles de paginación y nota de seguridad */}
      <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <span className="text-xs text-[#5d6678] dark:text-slate-400">
          {total > 0 ? (
            <>
              Mostrando{' '}
              <strong className="text-[#1c2333] dark:text-slate-200">
                {inicioMostrado}–{finMostrado}
              </strong>{' '}
              de <strong className="text-[#1c2333] dark:text-slate-200">{total}</strong> registros
            </>
          ) : (
            'Mostrando 0 de 0 registros'
          )}
        </span>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setPagina((p) => Math.max(1, p - 1))}
            disabled={cargando || pagina <= 1}
            className="px-3.5 py-1.5 rounded-xl border border-[#e2e6ef] dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-[#f4f6fb] dark:hover:bg-slate-800 text-xs font-semibold text-[#1c2333] dark:text-slate-100 transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
          >
            Anterior
          </button>
          <span className="px-2 text-xs font-semibold text-[#5d6678] dark:text-slate-400 whitespace-nowrap">
            {totalPaginas > 0 ? `${pagina} / ${totalPaginas}` : '0 / 0'}
          </span>
          <button
            type="button"
            onClick={() => setPagina((p) => (totalPaginas > 0 ? Math.min(totalPaginas, p + 1) : p))}
            disabled={cargando || totalPaginas === 0 || pagina >= totalPaginas}
            className="px-3.5 py-1.5 rounded-xl border border-[#e2e6ef] dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-[#f4f6fb] dark:hover:bg-slate-800 text-xs font-semibold text-[#1c2333] dark:text-slate-100 transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
          >
            Siguiente
          </button>
        </div>
      </div>

      <p className="mt-4 pt-3 border-t border-[#e2e6ef] dark:border-slate-800 text-[11px] text-[#5d6678] dark:text-slate-400">
        Nota de integridad y privacidad: La bitácora es estrictamente inmutable y exclusiva para el
        rol Administrador. Nunca almacena contraseñas, tokens ni calificaciones o respuestas
        individuales de alumnos.
      </p>
    </div>
  )
}
