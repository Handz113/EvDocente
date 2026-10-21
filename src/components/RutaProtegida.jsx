import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

// Si no hay sesión con el rol correcto, regresa al login que corresponde
export default function RutaProtegida({ rol, children }) {
  const { usuario } = useAuth()
  if (!usuario || usuario.rol !== rol) {
    return <Navigate to={rol === 'alumno' ? '/alumno' : `/personal/${rol}/login`} replace />
  }
  return children
}
