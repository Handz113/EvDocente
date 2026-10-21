import { createContext, useContext, useState, type ReactNode } from 'react'

export type RolUsuario = 'alumno' | 'docente' | 'coordinacion' | 'administracion'

export interface UsuarioAutenticado {
  rol: RolUsuario
  id?: number | string
  matricula?: string
  nombre: string
  docenteId?: string
  token?: string
}

interface AuthContextType {
  usuario: UsuarioAutenticado | null
  iniciarSesion: (datos: UsuarioAutenticado) => void
  cerrarSesion: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioAutenticado | null>(() => {
    try {
      const stored = localStorage.getItem('ev_usuario')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  const iniciarSesion = (datos: UsuarioAutenticado) => {
    setUsuario(datos)
    try {
      localStorage.setItem('ev_usuario', JSON.stringify(datos))
    } catch {
      // Ignorar fallos de localStorage en entornos restringidos
    }
  }

  const cerrarSesion = () => {
    setUsuario(null)
    try {
      localStorage.removeItem('ev_usuario')
    } catch {
      // Ignorar
    }
  }

  return (
    <AuthContext.Provider value={{ usuario, iniciarSesion, cerrarSesion }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider')
  }
  return context
}
