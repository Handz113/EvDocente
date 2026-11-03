import { useState, useEffect } from 'react'
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
