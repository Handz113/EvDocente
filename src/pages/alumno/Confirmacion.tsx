import { useLocation, useNavigate } from '../../router'
import Layout from '../../components/Layout'

interface LocationState {
  materia?: string
  instalacion?: string
}

export default function Confirmacion() {
  const { state } = useLocation() as { state?: LocationState }
  const navigate = useNavigate()

  return (
    <Layout titulo="Alumno" tono="alumno">
      <div className="bg-white dark:bg-slate-900 border border-[#e2e6ef] dark:border-slate-800 rounded-2xl p-8 sm:p-12 text-center max-w-lg mx-auto shadow-md my-8">
        <div className="w-16 h-16 rounded-full bg-[#e7f6ec] dark:bg-emerald-500/15 text-[#15803d] dark:text-emerald-400 border border-transparent dark:border-emerald-500/30 flex items-center justify-center text-3xl font-bold mx-auto mb-5 shadow-xs">
          ✓
        </div>
        <h2 className="text-2xl font-bold text-[#1c2333] dark:text-slate-100 mb-2">
          ¡Evaluación enviada exitosamente!
        </h2>
        <p className="text-sm text-[#5d6678] dark:text-slate-400 mb-6 leading-relaxed">
          Tus respuestas
          {state?.instalacion
            ? ` sobre la instalación "${state.instalacion}"`
            : state?.materia
              ? ` correspondientes a la materia "${state.materia}"`
              : ''}{' '}
          fueron almacenadas de forma confidencial y anónima en la plataforma institucional.
        </p>
        <button
          onClick={() => navigate('/alumno/inicio')}
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#2557d6] hover:bg-[#1f47b2] dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-semibold text-xs shadow-md transition-all cursor-pointer"
        >
          {state?.instalacion ? 'Volver al inicio' : 'Volver a mis materias'}
        </button>
      </div>
    </Layout>
  )
}
