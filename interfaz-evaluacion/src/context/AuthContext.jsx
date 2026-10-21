import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

// Sesión simulada. Con el backend aquí se guardaría el token que regrese el login.
export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null) // { rol, nombre, ... }

  const iniciarSesion = (datos) => setUsuario(datos)
  const cerrarSesion = () => setUsuario(null)

  return (
    <AuthContext.Provider value={{ usuario, iniciarSesion, cerrarSesion }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
