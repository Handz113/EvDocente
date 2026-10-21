import { useNavigate, Link } from '../../router'
import { areas } from './areas'

export default function LoginPersonal() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen grid place-items-center p-6 bg-gradient-to-br from-[#e3f4f2] via-[#f4f6fb] to-[#f4f6fb]">
      <div className="w-full max-w-[540px] bg-white rounded-2xl p-8 shadow-lg border border-[#e2e6ef]">
        <div className="text-center mb-6">
          <span className="inline-grid place-items-center w-14 h-14 rounded-2xl bg-[#0f766e] text-white font-bold text-xl mb-3 shadow-md mx-auto">
            ED
          </span>
          <h1 className="text-2xl font-bold text-[#1c2333]">Acceso de Personal</h1>
          <p className="text-sm text-[#5d6678] mt-1">Selecciona tu área para continuar</p>
        </div>

        <div className="grid gap-3">
          {Object.values(areas).map((a) => (
            <button
              key={a.id}
              onClick={() => navigate(`/personal/${a.id}/login`)}
              className="flex items-center gap-4 p-4 rounded-xl border border-[#e2e6ef] bg-white hover:border-[#0f766e] hover:bg-[#e3f4f2]/40 transition-all text-left cursor-pointer group shadow-xs"
            >
              <span className="w-11 h-11 rounded-xl flex items-center justify-center bg-[#e3f4f2] text-[#0f766e] text-xl flex-shrink-0 group-hover:scale-105 transition-transform">
                {a.icono}
              </span>
              <span className="flex-1 min-w-0">
                <strong className="block text-sm font-bold text-[#1c2333]">{a.nombre}</strong>
                <small className="block text-xs text-[#5d6678]">{a.descripcion}</small>
              </span>
              <span className="text-[#5d6678] text-lg font-bold group-hover:translate-x-1 transition-transform">
                ›
              </span>
            </button>
          ))}
        </div>

        <div className="text-center mt-6">
          <Link to="/" className="text-xs font-semibold text-[#5d6678] hover:text-[#0f766e] transition-colors">
            ← Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  )
}
