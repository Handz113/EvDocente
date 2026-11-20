import { useState, useEffect } from 'react'
import { useNavigate } from '../../router'
import Layout from '../../components/Layout'
import TalleresAlumno from '../../components/TalleresAlumno'
import { useAuth } from '../../context/AuthContext'
import {
  obtenerMateriasAlumnoAPI,
  ErrorAPI,
  type MateriaItem,
  type PeriodoItem,
} from '../../services/evaluacionService'

export default function InicioAlumno() {
  const { usuario, cerrarSesion } = useAuth()
  const navigate = useNavigate()
  const [materias, setMaterias] = useState<MateriaItem[]>([])
  const [periodo, setPeriodo] = useState<PeriodoItem | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    // GET /api/alumno/materias — materias inscritas y si ya fueron evaluadas
    obtenerMateriasAlumnoAPI(usuario?.token || '')
      .then((data) => {
        setMaterias(data.materias)
        setPeriodo(data.periodo)
      })
      .catch((err) => {
        if (err instanceof ErrorAPI && err.status === 401) {
          cerrarSesion()
          navigate('/alumno', { replace: true })
          return
        }
        setError(err.message)
      })
      .finally(() => setCargando(false))
  }, [usuario?.token])

  const hechas = materias.filter((m) => m.evaluada).length
  const total = materias.length
  const pct = total ? Math.round((hechas / total) * 100) : 0

  return (
    <Layout titulo="Alumno" tono="alumno">
      <section className="mb-8">
        <h1 className="text-2xl font-bold text-[#1c2333] dark:text-slate-100 mb-1">Tus materias inscritas</h1>
        <p className="text-sm text-[#5d6678] dark:text-slate-400 mb-4">
          {periodo ? (
            <>
              Evalúa a cada docente del periodo <strong className="text-[#1c2333] dark:text-slate-200">{periodo.nombre}</strong>. Tienes hasta el {formatoFecha(periodo.fin)}.
            </>
          ) : (
            'Evalúa a cada docente del periodo actual.'
          )}
        </p>

        <div className="flex justify-between items-center text-xs text-[#5d6678] dark:text-slate-400 font-medium mb-1.5">
          <span>{hechas} de {total} evaluaciones completadas</span>
          <span>{pct}%</span>
        </div>
        <div className="h-2 w-full bg-[#e2e6ef] dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#2557d6] dark:bg-blue-500 rounded-full transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </section>

      {cargando && <p className="text-sm text-[#5d6678] dark:text-slate-400">Cargando tus materias...</p>}
      {error && (
        <p className="text-sm text-[#dc2626] dark:text-red-300 font-medium bg-[#fee2e2] dark:bg-red-950/50 border border-transparent dark:border-red-800/60 rounded-xl p-3 mb-4">{error}</p>
      )}
      {!cargando && !error && materias.length === 0 && (
        <p className="text-sm text-[#5d6678] dark:text-slate-400">No tienes materias inscritas en el periodo activo.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {materias.map((m) => (
          <article
            key={m.crn}
            className="bg-white dark:bg-slate-900 border border-[#e2e6ef] dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow"
          >
            <div>
              <span
                className={`inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full mb-3 ${
                  m.evaluada
                    ? 'bg-[#e7f6ec] text-[#15803d] dark:bg-emerald-500/15 dark:text-emerald-300'
                    : 'bg-[#fff4e5] text-[#d97706] dark:bg-amber-500/15 dark:text-amber-300'
                }`}
              >
                {m.evaluada ? '✓ Evaluada' : 'Pendiente'}
              </span>
              <h3 className="text-base font-bold text-[#1c2333] dark:text-slate-100 mb-1">{m.nombre}</h3>
              <p className="text-xs text-[#5d6678] dark:text-slate-400 mb-2 font-mono">
                CRN {m.crn} · Clave {m.clave}
              </p>
              <p className="text-sm font-medium text-[#1c2333] dark:text-slate-200 mb-5">
                👨‍🏫 {m.docente?.nombre || 'Docente asignado'}
              </p>
            </div>

            <button
              disabled={m.evaluada}
              onClick={() => navigate(`/alumno/evaluar/${m.crn}`, { state: { materia: m } })}
              className={`w-full py-2.5 rounded-xl font-semibold text-xs transition-all ${
                m.evaluada
                  ? 'bg-[#e2e6ef] text-[#5d6678] dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed opacity-70'
                  : 'bg-[#2557d6] dark:bg-blue-600 text-white hover:bg-[#1f47b2] dark:hover:bg-blue-500 shadow-sm cursor-pointer'
              }`}
            >
              {m.evaluada ? 'Ya evaluada' : 'Evaluar docente'}
            </button>
          </article>
        ))}
      </div>

      {/* Módulo Talleres y Laboratorios */}
      <TalleresAlumno />
    </Layout>
  )
}

function formatoFecha(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
