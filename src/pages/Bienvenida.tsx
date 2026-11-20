import { useNavigate } from '../router'
import BotonTema from '../components/BotonTema'

export default function Bienvenida() {
  const navigate = useNavigate()

  return (
    <div className="relative min-h-screen grid place-items-center p-6 bg-gradient-to-br from-[#e8eefc] via-[#f4f6fb] to-[#f4f6fb] dark:from-slate-950 dark:via-slate-950 dark:to-blue-950/30 transition-colors">
      <div className="fixed top-4 right-4 z-40">
        <BotonTema />
      </div>

      <div className="w-full max-w-[560px] bg-white dark:bg-slate-900 rounded-2xl p-8 sm:p-10 shadow-lg border border-[#e2e6ef] dark:border-slate-800">
        <div className="text-center mb-8">
          <span className="inline-grid place-items-center w-14 h-14 rounded-2xl bg-[#2557d6] dark:bg-blue-600 text-white font-bold text-xl mb-3 shadow-md mx-auto">
            ED
          </span>
          <h1 className="text-2xl font-bold text-[#1c2333] dark:text-slate-100 mb-1">
            Evaluación Docente
          </h1>
          <p className="text-sm text-[#5d6678] dark:text-slate-400">
            ¿Cómo quieres entrar al sistema?
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => navigate('/alumno')}
            className="flex flex-col items-center text-center p-6 rounded-2xl border border-[#e2e6ef] dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-[#2557d6] dark:hover:border-blue-500 hover:shadow-md hover:bg-[#e8eefc]/20 dark:hover:bg-blue-950/40 transition-all cursor-pointer group"
          >
            <span className="text-4xl mb-3 group-hover:scale-110 transition-transform">🎓</span>
            <strong className="text-base font-bold text-[#1c2333] dark:text-slate-100 mb-1">Soy alumno</strong>
            <p className="text-xs text-[#5d6678] dark:text-slate-400">Evalúa a tus profesores de forma anónima y segura</p>
          </button>

          <button
            onClick={() => navigate('/personal')}
            className="flex flex-col items-center text-center p-6 rounded-2xl border border-[#e2e6ef] dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-[#0f766e] dark:hover:border-teal-500 hover:shadow-md hover:bg-[#e3f4f2]/20 dark:hover:bg-teal-950/40 transition-all cursor-pointer group"
          >
            <span className="text-4xl mb-3 group-hover:scale-110 transition-transform">🏫</span>
            <strong className="text-base font-bold text-[#1c2333] dark:text-slate-100 mb-1">Soy personal</strong>
            <p className="text-xs text-[#5d6678] dark:text-slate-400">Docentes, coordinación académica y administración</p>
          </button>
        </div>
      </div>
    </div>
  )
}
