import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { buscarAlumno } from '../../data/mock.js'

export default function LoginAlumno() {
  const [matricula, setMatricula] = useState('')
  const [contraseña, setContraseña] = useState('')
  const [error, setError] = useState('')
  const { iniciarSesion } = useAuth()
  const navigate = useNavigate()

  const entrar = (e) => {
    e.preventDefault()
    const alumno = buscarAlumno(matricula.trim())
    if (!alumno || !contraseña) {
      setError('Matrícula o contraseña incorrecta.')
      return
    }
    iniciarSesion({ rol: 'alumno', matricula: alumno.matricula, nombre: alumno.nombre })
    navigate('/alumno/inicio')
  }

  return (
    <div className="pantalla-centro tono-alumno">
      <form className="caja-login" onSubmit={entrar}>
        <div className="encabezado-login">
          <span className="logo">ED</span>
          <h1>Portal del alumno</h1>
          <p className="suave">Inicia sesión con tu cuenta del portal escolar</p>
        </div>

        <div className="aviso-anonimo">
          <span>🔒</span>
          <span>Tus respuestas son <strong>anónimas</strong>. Tu matrícula solo se usa para saber qué materias tienes, nunca se guarda junto a tus respuestas.</span>
        </div>

        <div className="campo">
          <label htmlFor="matricula">Matrícula</label>
          <input id="matricula" value={matricula} onChange={(e) => setMatricula(e.target.value)} placeholder="Ej. 010101" autoFocus />
        </div>
        <div className="campo">
          <label htmlFor="pass">Contraseña</label>
          <input id="pass" type="password" value={contraseña} onChange={(e) => setContraseña(e.target.value)} placeholder="••••••••" />
        </div>

        {error && <p className="error">{error}</p>}
        <button className="btn btn-bloque">Entrar</button>
        <p className="ayuda" style={{ marginTop: '1rem', textAlign: 'center' }}>Demo: matrícula <strong>010101</strong> y cualquier contraseña</p>
        <Link to="/" className="volver">← Volver</Link>
      </form>
    </div>
  )
}
