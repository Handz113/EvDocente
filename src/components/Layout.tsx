import { type ReactNode } from 'react'
import { useNavigate } from '../router'
import { useAuth } from '../context/AuthContext'
import { PERIODO_ACTUAL } from '../services/evaluacionService'
import BotonTema from './BotonTema'

export interface PestanaItem {
  id: string
  nombre: string
}

export interface LayoutProps {
  titulo: string
  tono?: 'alumno' | 'personal'
  pestañas?: PestanaItem[]
  activa?: string
  onPestaña?: (id: string) => void
  children: ReactNode
}

export default function Layout({
  titulo,
  tono = 'alumno',
  pestañas,
  activa,
  onPestaña,
  children,
}: LayoutProps) {
  const { usuario, cerrarSesion } = useAuth()
  const navigate = useNavigate()

  const salir = () => {
    const destino = usuario?.rol === 'alumno' ? '/alumno' : '/personal'
    cerrarSesion()
    navigate(destino)
  }

  const tonoColor = tono === 'alumno' ? 'bg-[#2557d6] dark:bg-blue-600' : 'bg-[#0f766e] dark:bg-teal-600'

  return (
    <div className="min-h-screen bg-[#f4f6fb] dark:bg-slate-950 text-[#1c2333] dark:text-slate-100 flex flex-col transition-colors">
      {/* Topbar */}
      <header className="sticky top-0 z-30 flex justify-between items-center px-4 sm:px-6 py-3.5 bg-white dark:bg-slate-900 border-b border-[#e2e6ef] dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-xs ${tonoColor}`}>
            ED
          </span>
          <div>
            <strong className="block text-sm sm:text-base font-semibold leading-tight text-[#1c2333] dark:text-slate-100">
              Evaluación Docente
            </strong>
            <small className="block text-xs text-[#5d6678] dark:text-slate-400">
              {titulo} · {PERIODO_ACTUAL.nombre}
            </small>
          </div>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3">
          <span className="hidden sm:inline text-sm text-[#5d6678] dark:text-slate-300 font-medium">
            {usuario?.nombre}
          </span>
          <BotonTema />
          <button
            onClick={salir}
            className="px-3 py-1.5 rounded-lg border border-[#e2e6ef] dark:border-slate-700 text-[#5d6678] dark:text-slate-300 hover:text-[#1c2333] dark:hover:text-slate-100 hover:bg-[#f4f6fb] dark:hover:bg-slate-800 text-xs font-semibold transition-all cursor-pointer"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      {/* Tabs navigation */}
      {pestañas && onPestaña && (
        <nav className="flex gap-2 px-4 sm:px-6 bg-white dark:bg-slate-900 border-b border-[#e2e6ef] dark:border-slate-800 overflow-x-auto">
          {pestañas.map((p) => {
            const isActiva = activa === p.id
            const borderActive =
              tono === 'alumno'
                ? 'border-[#2557d6] text-[#2557d6] dark:border-blue-400 dark:text-blue-400'
                : 'border-[#0f766e] text-[#0f766e] dark:border-teal-400 dark:text-teal-400'
            return (
              <button
                key={p.id}
                onClick={() => onPestaña(p.id)}
                className={`py-3 px-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-all cursor-pointer ${
                  isActiva
                    ? `${borderActive}`
                    : 'border-transparent text-[#5d6678] dark:text-slate-400 hover:text-[#1c2333] dark:hover:text-slate-200'
                }`}
              >
                {p.nombre}
              </button>
            )
          })}
        </nav>
      )}

      {/* Main Content Area */}
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 flex-1">
        {children}
      </main>
    </div>
  )
}
