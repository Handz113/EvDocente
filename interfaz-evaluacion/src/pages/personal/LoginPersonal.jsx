import { useNavigate, Link } from 'react-router-dom'
import { areas } from './areas.js'

// Recuadro con las opciones de área. Cada una abre su propia página de acceso.
export default function LoginPersonal() {
  const navigate = useNavigate()
  return (
    <div className="pantalla-centro tono-personal">
      <div className="caja-login">
        <div className="encabezado-login">
          <span className="logo">ED</span>
          <h1>Acceso de personal</h1>
          <p className="suave">Selecciona tu área para continuar</p>
        </div>

        <div className="opciones-area">
          {Object.values(areas).map((a) => (
            <button key={a.id} className="opcion-area" onClick={() => navigate(`/personal/${a.id}/login`)}>
              <span className="icono">{a.icono}</span>
              <span>
                <strong>{a.nombre}</strong>
                <small>{a.descripcion}</small>
              </span>
              <span className="flecha">›</span>
            </button>
          ))}
        </div>

        <Link to="/" className="volver">← Volver</Link>
      </div>
    </div>
  )
}
