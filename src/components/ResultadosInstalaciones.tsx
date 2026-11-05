import { useState, useEffect } from 'react'
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
}

/** Resultados anónimos de talleres y laboratorios del ciclo activo. */
export default function ResultadosInstalaciones({ area }: Props) {
  const { usuario, cerrarSesion } = useAuth()
  const navigate = useNavigate()
  const [ciclo, setCiclo] = useState<CicloAPI | null>(null)
  const [filas, setFilas] = useState<ResultadoInstalacion[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [seleccionId, setSeleccionId] = useState<number | null>(null)

  useEffect(() => {
    // GET /api/instalaciones/resultados — ciclo activo por defecto
    obtenerResultadosInstalacionesAPI(usuario?.token || '')
      .then((data) => {
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
  }, [usuario?.token])

  const detalle = seleccionId !== null ? filas.find((f) => f.id === seleccionId) : null

  return (
    <>
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
                    <span className="block text-[11px] text-[#5d6678]">
                      {f.tipo}
                      {!f.activa && ' · Inactiva'}
                    </span>
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
              <h2 className="text-lg font-bold text-[#1c2333]">{detalle.nombre}</h2>
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
