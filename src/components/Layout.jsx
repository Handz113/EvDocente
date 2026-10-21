import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { periodoActual } from '../data/mock.js'

// Barra superior + contenido. "tono" cambia el color: alumno (azul) o personal (verde azulado)
export default function Layout({ titulo, tono = 'alumno', pestañas, activa, onPestaña, children }) {
  const { usuario, cerrarSesion } = useAuth()
  const navigate = useNavigate()

  const salir = () => {
    const destino = usuario?.rol === 'alumno' ? '/alumno' : '/personal'
    cerrarSesion()
    navigate(destino)
  }

  return (
    <div className={`app tono-${tono}`}>
      <header className="topbar">
        <div className="topbar-izq">
          <span className="logo">ED</span>
          <div>
            <strong>Evaluación Docente</strong>
            <small>{titulo} · {periodoActual.nombre}</small>
          </div>
        </div>
        <div className="topbar-der">
          <span className="usuario-nombre">{usuario?.nombre}</span>
          <button className="btn btn-fantasma" onClick={salir}>Cerrar sesión</button>
        </div>
      </header>

      {pestañas && (
        <nav className="pestañas">
          {pestañas.map((p) => (
            <button
              key={p.id}
              className={`pestaña ${activa === p.id ? 'activa' : ''}`}
              onClick={() => onPestaña(p.id)}
            >
              {p.nombre}
            </button>
          ))}
        </nav>
      )}

      <main className="contenido">{children}</main>
    </div>
  )
}
