import { useState, type FormEvent } from 'react'
import { useParams, useNavigate, Link, Navigate } from '../../router'
import { useAuth } from '../../context/AuthContext'
import { areas } from './areas'
import { iniciarSesionAPI } from '../../services/evaluacionService'
import BotonTema from '../../components/BotonTema'

export default function LoginArea() {
  const { area } = useParams<{ area: string }>()
  const info = area ? areas[area] : undefined
  const [usuarioTxt, setUsuarioTxt] = useState('')
  const [contraseña, setContraseña] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const { iniciarSesion } = useAuth()
  const navigate = useNavigate()

  if (!info) return <Navigate to="/personal" replace />

  const entrar = async (e: FormEvent) => {
    e.preventDefault()
    if (!usuarioTxt.trim() || !contraseña.trim()) {
      setError('Completa tus credenciales de acceso.')
      return
    }

    setEnviando(true)
    setError('')
    try {
      // POST /api/auth/login — el backend verifica que la cuenta sea de esta área
      const { token, usuario } = await iniciarSesionAPI(usuarioTxt.trim(), contraseña, info.id)
      iniciarSesion({ ...usuario, token })
      navigate(`/personal/${info.id}`)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="relative min-h-screen grid place-items-center p-6 bg-gradient-to-br from-[#e3f4f2] via-[#f4f6fb] to-[#f4f6fb] dark:from-slate-950 dark:via-slate-950 dark:to-emerald-950/35 transition-colors">
      <div className="fixed top-4 right-4 z-40">
        <BotonTema />
      </div>

      <form
        onSubmit={entrar}
        className="w-full max-w-[420px] bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-lg border border-[#e2e6ef] dark:border-slate-800"
      >
        <div className="text-center mb-6">
          <span className="inline-grid place-items-center w-14 h-14 rounded-2xl bg-[#0f766e] dark:bg-teal-600 text-white font-bold text-2xl mb-3 shadow-md mx-auto">
            {info.icono}
          </span>
          <h1 className="text-2xl font-bold text-[#1c2333] dark:text-slate-100">{info.nombre}</h1>
          <p className="text-sm text-[#5d6678] dark:text-slate-400 mt-1">{info.descripcion}</p>
        </div>

        <div className="flex flex-col gap-1.5 mb-4">
          <label htmlFor="usuario" className="text-xs font-semibold text-[#1c2333] dark:text-slate-200">
            {info.campo}
          </label>
          <input
            id="usuario"
            type="text"
            value={usuarioTxt}
            onChange={(e) => setUsuarioTxt(e.target.value)}
            placeholder={`Ej. ${info.ejemplo}`}
            className="w-full px-3.5 py-2.5 rounded-xl border border-[#e2e6ef] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#1c2333] dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm focus:border-[#0f766e] dark:focus:border-teal-500 focus:ring-2 focus:ring-[#0f766e]/20 dark:focus:ring-teal-500/25 transition-all"
            autoFocus
          />
        </div>

        <div className="flex flex-col gap-1.5 mb-2">
          <label htmlFor="pass" className="text-xs font-semibold text-[#1c2333] dark:text-slate-200">
            Contraseña
          </label>
          <input
            id="pass"
            type="password"
            value={contraseña}
            onChange={(e) => setContraseña(e.target.value)}
            placeholder="••••••••"
            className="w-full px-3.5 py-2.5 rounded-xl border border-[#e2e6ef] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#1c2333] dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm focus:border-[#0f766e] dark:focus:border-teal-500 focus:ring-2 focus:ring-[#0f766e]/20 dark:focus:ring-teal-500/25 transition-all"
          />
        </div>

        <div className="flex justify-end mb-5">
          <Link
            to="/recuperar-password"
            className="text-xs font-medium text-[#0f766e] dark:text-teal-400 hover:text-[#0c5c56] dark:hover:text-teal-300 hover:underline transition-colors"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        {error && <p className="text-xs text-[#dc2626] dark:text-red-400 font-semibold mb-4 text-center">{error}</p>}

        <button
          type="submit"
          disabled={enviando}
          className="w-full py-3 rounded-xl bg-[#0f766e] hover:bg-[#0c5c56] dark:bg-teal-600 dark:hover:bg-teal-500 text-white font-semibold text-sm shadow-md transition-all cursor-pointer disabled:opacity-60"
        >
          {enviando ? 'Entrando...' : `Entrar como ${info.nombre.toLowerCase()}`}
        </button>

        <p className="text-xs text-[#5d6678] dark:text-slate-400 text-center mt-4">
          Prueba: <strong className="text-[#1c2333] dark:text-slate-200">{info.ejemplo}</strong> / <strong className="text-[#1c2333] dark:text-slate-200">demo123</strong>
        </p>

        <div className="text-center mt-5">
          <Link to="/personal" className="text-xs font-semibold text-[#5d6678] dark:text-slate-400 hover:text-[#0f766e] dark:hover:text-teal-400 transition-colors">
            ← Cambiar de área
          </Link>
        </div>
      </form>
    </div>
  )
}
