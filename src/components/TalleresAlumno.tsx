import { useState, useEffect } from 'react'
import { useNavigate } from '../router'
import { useAuth } from '../context/AuthContext'
import { ErrorAPI } from '../services/evaluacionService'
import { listarInstalacionesAlumnoAPI, type InstalacionAlumno } from '../services/instalacionService'

/** Tarjetas de talleres y laboratorios del ciclo activo (Pendiente / Evaluada). */
export default function TalleresAlumno() {
  const { usuario, cerrarSesion } = useAuth()
  const navigate = useNavigate()
  const [instalaciones, setInstalaciones] = useState<InstalacionAlumno[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    // GET /api/instalaciones — activas y si ya se evaluaron en el ciclo activo
    listarInstalacionesAlumnoAPI(usuario?.token || '')
      .then((data) => setInstalaciones(data.instalaciones))
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

  const hechas = instalaciones.filter((i) => i.evaluada).length

  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold text-[#1c2333] mb-1">Talleres y laboratorios</h2>
      <p className="text-sm text-[#5d6678] mb-4">
        Evalúa el equipamiento, la disponibilidad y la limpieza de las instalaciones que usas.{' '}
        {instalaciones.length > 0 && (
          <span className="font-medium">
            {hechas} de {instalaciones.length} evaluadas.
          </span>
        )}
      </p>

      {cargando && <p className="text-sm text-[#5d6678]">Cargando instalaciones...</p>}
      {error && (
        <p className="text-sm text-[#dc2626] font-medium bg-[#fee2e2] rounded-xl p-3 mb-4">{error}</p>
      )}
      {!cargando && !error && instalaciones.length === 0 && (
        <p className="text-sm text-[#5d6678]">No hay talleres ni laboratorios por evaluar.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {instalaciones.map((i) => (
          <article
            key={i.id}
            className="bg-white border border-[#e2e6ef] rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow"
          >
            <div>
              <span
                className={`inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full mb-3 ${
                  i.evaluada ? 'bg-[#e7f6ec] text-[#15803d]' : 'bg-[#fff4e5] text-[#d97706]'
                }`}
              >
                {i.evaluada ? '✓ Evaluada' : 'Pendiente'}
              </span>
              <h3 className="text-base font-bold text-[#1c2333] mb-1">{i.nombre}</h3>
              <p className="text-xs text-[#5d6678] mb-2 font-mono">{i.tipo}</p>
              {i.descripcion && <p className="text-sm text-[#5d6678] mb-5">{i.descripcion}</p>}
            </div>

            <button
              disabled={i.evaluada}
              onClick={() => navigate(`/alumno/instalacion/${i.id}`)}
              className={`w-full py-2.5 rounded-xl font-semibold text-xs transition-all ${
                i.evaluada
                  ? 'bg-[#e2e6ef] text-[#5d6678] cursor-not-allowed opacity-60'
                  : 'bg-[#2557d6] text-white hover:bg-[#1f47b2] shadow-sm cursor-pointer'
              }`}
            >
              {i.evaluada ? 'Ya evaluada' : 'Evaluar instalación'}
            </button>
          </article>
        ))}
      </div>
    </section>
  )
}
