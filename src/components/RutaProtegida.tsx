import { type ReactNode } from 'react'
import { Navigate } from '../router'
import { useAuth, type RolUsuario } from '../context/AuthContext'

export interface RutaProtegidaProps {
  rol: RolUsuario
  children: ReactNode
}

// Si no hay sesión con el rol correcto, regresa al login correspondiente
export default function RutaProtegida({ rol, children }: RutaProtegidaProps) {
  const { usuario } = useAuth()
  if (!usuario || usuario.rol !== rol) {
    return <Navigate to={rol === 'alumno' ? '/alumno' : `/personal/${rol}/login`} replace />
  }
  return <>{children}</>
}
