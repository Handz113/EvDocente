import { type ReactNode } from 'react'
import { useNavigate } from '../router'
import { useAuth } from '../context/AuthContext'
import { PERIODO_ACTUAL } from '../services/evaluacionService'

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

  const tonoColor = tono === 'alumno' ? 'bg-[#2557d6]' : 'bg-[#0f766e]'

  return (
    <div className="min-h-screen bg-[#f4f6fb] text-[#1c2333] flex flex-col">
      {/* Topbar */}
      <header className="sticky top-0 z-30 flex justify-between items-center px-4 sm:px-6 py-3.5 bg-white border-b border-[#e2e6ef] shadow-xs">
        <div className="flex items-center gap-3">
          <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-xs ${tonoColor}`}>
            ED
          </span>
          <div>
            <strong className="block text-sm sm:text-base font-semibold leading-tight text-[#1c2333]">
              Evaluación Docente
            </strong>
            <small className="block text-xs text-[#5d6678]">
              {titulo} · {PERIODO_ACTUAL.nombre}
            </small>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <span className="hidden sm:inline text-sm text-[#5d6678] font-medium">
            {usuario?.nombre}
          </span>
          <button
            onClick={salir}
            className="px-3 py-1.5 rounded-lg border border-[#e2e6ef] text-[#5d6678] hover:text-[#1c2333] hover:bg-[#f4f6fb] text-xs font-semibold transition-all cursor-pointer"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      {/* Tabs navigation */}
      {pestañas && onPestaña && (
        <nav className="flex gap-2 px-4 sm:px-6 bg-white border-b border-[#e2e6ef] overflow-x-auto">
          {pestañas.map((p) => {
            const isActiva = activa === p.id
            const borderActive = tono === 'alumno' ? 'border-[#2557d6] text-[#2557d6]' : 'border-[#0f766e] text-[#0f766e]'
            return (
              <button
                key={p.id}
                onClick={() => onPestaña(p.id)}
                className={`py-3 px-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-all cursor-pointer ${
                  isActiva
                    ? `${borderActive}`
                    : 'border-transparent text-[#5d6678] hover:text-[#1c2333]'
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
