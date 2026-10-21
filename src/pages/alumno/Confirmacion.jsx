import { useLocation, useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout.jsx'

export default function Confirmacion() {
  const { state } = useLocation()
  const navigate = useNavigate()
  return (
    <Layout titulo="Alumno" tono="alumno">
      <div className="tarjeta exito" style={{ maxWidth: 520, margin: '2rem auto' }}>
        <div className="icono-ok">✓</div>
        <h2>¡Gracias por tu evaluación!</h2>
        <p className="suave">
          Tus respuestas{state?.materia ? ` de ${state.materia}` : ''} se guardaron de forma anónima.
        </p>
        <button className="btn" onClick={() => navigate('/alumno/inicio')}>Volver a mis materias</button>
      </div>
    </Layout>
  )
}
