import { useState, type FormEvent } from 'react'
import { useParams, useNavigate, Link, Navigate } from '../../router'
import { useAuth } from '../../context/AuthContext'
import { areas } from './areas'

export default function LoginArea() {
  const { area } = useParams<{ area: string }>()
  const info = area ? areas[area] : undefined
  const [usuarioTxt, setUsuarioTxt] = useState('')
  const [contraseña, setContraseña] = useState('demo123')
  const [error, setError] = useState('')
  const { iniciarSesion } = useAuth()
  const navigate = useNavigate()

  if (!info) return <Navigate to="/personal" replace />

  const entrar = (e: FormEvent) => {
    e.preventDefault()
    if (!usuarioTxt.trim() || !contraseña.trim()) {
      setError('Completa tus credenciales de acceso.')
      return
    }

    // Perfilado institucional
    const docenteId = info.id === 'docente' ? (usuarioTxt.trim() || '1') : undefined
    const nombre =
      info.id === 'docente'
        ? `Docente ID ${usuarioTxt.trim()}`
        : info.id === 'coordinacion'
        ? 'Coordinación Académica'
        : 'Administrador General'

    iniciarSesion({
      rol: info.id,
      nombre,
      docenteId,
      token: `jwt_${info.id}_token_demo`,
    })

    navigate(`/personal/${info.id}`)
  }

  return (
    <div className="min-h-screen grid place-items-center p-6 bg-gradient-to-br from-[#e3f4f2] via-[#f4f6fb] to-[#f4f6fb]">
      <form
        onSubmit={entrar}
        className="w-full max-w-[420px] bg-white rounded-2xl p-8 shadow-lg border border-[#e2e6ef]"
      >
        <div className="text-center mb-6">
          <span className="inline-grid place-items-center w-14 h-14 rounded-2xl bg-[#0f766e] text-white font-bold text-2xl mb-3 shadow-md mx-auto">
            {info.icono}
          </span>
          <h1 className="text-2xl font-bold text-[#1c2333]">{info.nombre}</h1>
          <p className="text-sm text-[#5d6678] mt-1">{info.descripcion}</p>
        </div>

        <div className="flex flex-col gap-1.5 mb-4">
          <label htmlFor="usuario" className="text-xs font-semibold text-[#1c2333]">
            {info.campo}
          </label>
          <input
            id="usuario"
            type="text"
            value={usuarioTxt}
            onChange={(e) => setUsuarioTxt(e.target.value)}
            placeholder={`Ej. ${info.ejemplo}`}
            className="w-full px-3.5 py-2.5 rounded-xl border border-[#e2e6ef] bg-white text-sm focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/20 transition-all"
            autoFocus
          />
        </div>

        <div className="flex flex-col gap-1.5 mb-5">
          <label htmlFor="pass" className="text-xs font-semibold text-[#1c2333]">
            Contraseña
          </label>
          <input
            id="pass"
            type="password"
            value={contraseña}
            onChange={(e) => setContraseña(e.target.value)}
            placeholder="••••••••"
            className="w-full px-3.5 py-2.5 rounded-xl border border-[#e2e6ef] bg-white text-sm focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/20 transition-all"
          />
        </div>

        {error && <p className="text-xs text-[#dc2626] font-semibold mb-4 text-center">{error}</p>}

        <button
          type="submit"
          className="w-full py-3 rounded-xl bg-[#0f766e] hover:bg-[#0c5c56] text-white font-semibold text-sm shadow-md transition-all cursor-pointer"
        >
          Entrar como {info.nombre.toLowerCase()}
        </button>

        <p className="text-xs text-[#5d6678] text-center mt-4">
          Demo: usuario <strong className="text-[#1c2333]">{info.ejemplo}</strong> y cualquier contraseña
        </p>

        <div className="text-center mt-5">
          <Link to="/personal" className="text-xs font-semibold text-[#5d6678] hover:text-[#0f766e] transition-colors">
            ← Cambiar de área
          </Link>
        </div>
      </form>
    </div>
  )
}
