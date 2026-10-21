import { useNavigate } from '../router'

export default function Bienvenida() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen grid place-items-center p-6 bg-gradient-to-br from-[#e8eefc] via-[#f4f6fb] to-[#f4f6fb]">
      <div className="w-full max-w-[560px] bg-white rounded-2xl p-8 sm:p-10 shadow-lg border border-[#e2e6ef]">
        <div className="text-center mb-8">
          <span className="inline-grid place-items-center w-14 h-14 rounded-2xl bg-[#2557d6] text-white font-bold text-xl mb-3 shadow-md mx-auto">
            ED
          </span>
          <h1 className="text-2xl font-bold text-[#1c2333] mb-1">
            Evaluación Docente
          </h1>
          <p className="text-sm text-[#5d6678]">
            ¿Cómo quieres entrar al sistema?
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => navigate('/alumno')}
            className="flex flex-col items-center text-center p-6 rounded-2xl border border-[#e2e6ef] bg-white hover:border-[#2557d6] hover:shadow-md hover:bg-[#e8eefc]/20 transition-all cursor-pointer group"
          >
            <span className="text-4xl mb-3 group-hover:scale-110 transition-transform">🎓</span>
            <strong className="text-base font-bold text-[#1c2333] mb-1">Soy alumno</strong>
            <p className="text-xs text-[#5d6678]">Evalúa a tus profesores de forma anónima y segura</p>
          </button>

          <button
            onClick={() => navigate('/personal')}
            className="flex flex-col items-center text-center p-6 rounded-2xl border border-[#e2e6ef] bg-white hover:border-[#0f766e] hover:shadow-md hover:bg-[#e3f4f2]/20 transition-all cursor-pointer group"
          >
            <span className="text-4xl mb-3 group-hover:scale-110 transition-transform">🏫</span>
            <strong className="text-base font-bold text-[#1c2333] mb-1">Soy personal</strong>
            <p className="text-xs text-[#5d6678]">Docentes, coordinación académica y administración</p>
          </button>
        </div>
      </div>
    </div>
  )
}
