import { useNavigate } from 'react-router-dom'

// Página inicial del demo: elige a qué interfaz entrar.
// En producción, alumnos y personal tendrían cada uno su propia URL.
export default function Bienvenida() {
  const navigate = useNavigate()
  return (
    <div className="pantalla-centro tono-alumno">
      <div className="caja-login ancha">
        <div className="encabezado-login">
          <span className="logo">ED</span>
          <h1>Evaluación Docente</h1>
          <p className="suave">¿Cómo quieres entrar?</p>
        </div>
        <div className="dos-opciones">
          <button className="opcion-grande alumno" onClick={() => navigate('/alumno')}>
            <span className="icono">🎓</span>
            <strong>Soy alumno</strong>
            <p className="suave ayuda">Evalúa a tus profesores de forma anónima</p>
          </button>
          <button className="opcion-grande personal" onClick={() => navigate('/personal')}>
            <span className="icono">🏫</span>
            <strong>Soy personal</strong>
            <p className="suave ayuda">Docentes, coordinación y administración</p>
          </button>
        </div>
      </div>
    </div>
  )
}
