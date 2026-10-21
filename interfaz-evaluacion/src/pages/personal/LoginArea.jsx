import { useState } from 'react'
import { useParams, useNavigate, Link, Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { personal } from '../../data/mock.js'
import { areas } from './areas.js'

// Página de acceso propia de cada área: /personal/docente/login, etc.
export default function LoginArea() {
  const { area } = useParams()
  const info = areas[area]
  const [usuarioTxt, setUsuarioTxt] = useState('')
  const [contraseña, setContraseña] = useState('')
  const [error, setError] = useState('')
  const { iniciarSesion } = useAuth()
  const navigate = useNavigate()

  if (!info) return <Navigate to="/personal" replace />

  const entrar = (e) => {
    e.preventDefault()
    const cuenta = personal.find((p) => p.usuario.toLowerCase() === usuarioTxt.trim().toLowerCase() && p.area === area)
    if (!cuenta || !contraseña) {
      setError('Datos incorrectos o la cuenta no pertenece a esta área.')
      return
    }
    iniciarSesion({ rol: area, nombre: cuenta.nombre, docenteId: cuenta.docenteId })
    navigate(`/personal/${area}`)
  }

  return (
    <div className="pantalla-centro tono-personal">
      <form className="caja-login" onSubmit={entrar}>
        <div className="encabezado-login">
          <span className="logo" style={{ fontSize: '1.6rem' }}>{info.icono}</span>
          <h1>{info.nombre}</h1>
          <p className="suave">{info.descripcion}</p>
        </div>

        <div className="campo">
          <label htmlFor="usuario">{info.campo}</label>
          <input id="usuario" value={usuarioTxt} onChange={(e) => setUsuarioTxt(e.target.value)} placeholder={`Ej. ${info.ejemplo}`} autoFocus />
        </div>
        <div className="campo">
          <label htmlFor="pass">Contraseña</label>
          <input id="pass" type="password" value={contraseña} onChange={(e) => setContraseña(e.target.value)} placeholder="••••••••" />
        </div>

        {error && <p className="error">{error}</p>}
        <button className="btn btn-bloque">Entrar como {info.nombre.toLowerCase()}</button>
        <p className="ayuda" style={{ marginTop: '1rem', textAlign: 'center' }}>Demo: usuario <strong>{info.ejemplo}</strong> y cualquier contraseña</p>
        <Link to="/personal" className="volver">← Cambiar de área</Link>
      </form>
    </div>
  )
}
