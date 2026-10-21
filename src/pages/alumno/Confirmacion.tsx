import { useLocation, useNavigate } from '../../router'
import Layout from '../../components/Layout'

interface LocationState {
  materia?: string
}

export default function Confirmacion() {
  const { state } = useLocation() as { state?: LocationState }
  const navigate = useNavigate()

  return (
    <Layout titulo="Alumno" tono="alumno">
      <div className="bg-white border border-[#e2e6ef] rounded-2xl p-8 sm:p-12 text-center max-w-lg mx-auto shadow-md my-8">
        <div className="w-16 h-16 rounded-full bg-[#e7f6ec] text-[#15803d] flex items-center justify-center text-3xl font-bold mx-auto mb-5 shadow-xs">
          ✓
        </div>
        <h2 className="text-2xl font-bold text-[#1c2333] mb-2">
          ¡Evaluación enviada exitosamente!
        </h2>
        <p className="text-sm text-[#5d6678] mb-6 leading-relaxed">
          Tus respuestas{state?.materia ? ` correspondientes a la materia "${state.materia}"` : ''} fueron almacenadas de forma confidencial y anónima en la plataforma institucional.
        </p>
        <button
          onClick={() => navigate('/alumno/inicio')}
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#2557d6] hover:bg-[#1f47b2] text-white font-semibold text-xs shadow-md transition-all cursor-pointer"
        >
          Volver a mis materias
        </button>
      </div>
    </Layout>
  )
}
