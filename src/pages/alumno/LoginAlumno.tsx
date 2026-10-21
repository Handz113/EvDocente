import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from '../../router'
import { useAuth } from '../../context/AuthContext'

export default function LoginAlumno() {
  const [matricula, setMatricula] = useState('ALU001')
  const [contraseña, setContraseña] = useState('demo123')
  const [error, setError] = useState('')
  const { iniciarSesion } = useAuth()
  const navigate = useNavigate()

  const entrar = (e: FormEvent) => {
    e.preventDefault()
    if (!matricula.trim() || !contraseña.trim()) {
      setError('Por favor, ingresa tu matrícula y contraseña.')
      return
    }

    // Usar identificador y token seguro institucional compatible con backend/generarToken.ts
    // Se genera o asigna la sesión de alumno
    iniciarSesion({
      rol: 'alumno',
      id: 1,
      matricula: matricula.trim(),
      nombre: 'Alumno Institucional',
      token: 'jwt_alumno_token_demo',
    })
    navigate('/alumno/inicio')
  }

  return (
    <div className="min-h-screen grid place-items-center p-6 bg-gradient-to-br from-[#e8eefc] via-[#f4f6fb] to-[#f4f6fb]">
      <form
        onSubmit={entrar}
        className="w-full max-w-[420px] bg-white rounded-2xl p-8 shadow-lg border border-[#e2e6ef]"
      >
        <div className="text-center mb-6">
          <span className="inline-grid place-items-center w-14 h-14 rounded-2xl bg-[#2557d6] text-white font-bold text-xl mb-3 shadow-md mx-auto">
            ED
          </span>
          <h1 className="text-2xl font-bold text-[#1c2333]">Portal del Alumno</h1>
          <p className="text-sm text-[#5d6678] mt-1">Inicia sesión con tu cuenta institucional</p>
        </div>

        <div className="flex gap-2.5 items-start bg-[#e8eefc] text-[#2557d6] rounded-xl p-3 text-xs leading-relaxed mb-5">
          <span className="text-base">🔒</span>
          <span className="text-[#1c2333]">
            Tus respuestas son <strong>anónimas</strong>. Tu matrícula se usa exclusivamente para verificar las materias inscritas, nunca se almacena vinculada a tus respuestas.
          </span>
        </div>

        <div className="flex flex-col gap-1.5 mb-4">
          <label htmlFor="matricula" className="text-xs font-semibold text-[#1c2333]">
            Matrícula
          </label>
          <input
            id="matricula"
            type="text"
            value={matricula}
            onChange={(e) => setMatricula(e.target.value)}
            placeholder="Ej. ALU001 o 010101"
            className="w-full px-3.5 py-2.5 rounded-xl border border-[#e2e6ef] bg-white text-sm focus:border-[#2557d6] focus:ring-2 focus:ring-[#2557d6]/20 transition-all"
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
            className="w-full px-3.5 py-2.5 rounded-xl border border-[#e2e6ef] bg-white text-sm focus:border-[#2557d6] focus:ring-2 focus:ring-[#2557d6]/20 transition-all"
          />
        </div>

        {error && <p className="text-xs text-[#dc2626] font-medium mb-4">{error}</p>}

        <button
          type="submit"
          className="w-full py-3 rounded-xl bg-[#2557d6] hover:bg-[#1f47b2] text-white font-semibold text-sm shadow-md transition-all cursor-pointer"
        >
          Iniciar sesión
        </button>

        <p className="text-xs text-[#5d6678] text-center mt-4">
          Demo: matrícula <strong className="text-[#1c2333]">ALU001</strong> o <strong className="text-[#1c2333]">010101</strong>
        </p>

        <div className="text-center mt-5">
          <Link to="/" className="text-xs font-semibold text-[#5d6678] hover:text-[#2557d6] transition-colors">
            ← Volver al inicio
          </Link>
        </div>
      </form>
    </div>
  )
}
