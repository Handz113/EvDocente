import { useState, type FormEvent } from "react"
import { Link, useLocation } from "../router"
import BotonTema from "../components/BotonTema"

export default function ResetPassword() {
  const location = useLocation()
  const searchParams = new URLSearchParams(
    location.search || window.location.search,
  )
  const token = searchParams.get("token")

  const [nuevaContrasena, setNuevaContrasena] = useState("")
  const [confirmarContrasena, setConfirmarContrasena] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [tokenExpirado, setTokenExpirado] = useState(false)
  const [exito, setExito] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!token) {
      setError(
        "No se encontró el token de seguridad. Solicita un nuevo enlace.",
      )
      setTokenExpirado(true)
      return
    }

    if (nuevaContrasena.trim().length < 6) {
      setError("La nueva contraseña debe contener al menos 6 caracteres.")
      return
    }

    if (nuevaContrasena !== confirmarContrasena) {
      setError(
        "Las contraseñas no coinciden. Por favor, asegúrate de que sean iguales.",
      )
      return
    }

    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          nuevaContrasena: nuevaContrasena.trim(),
        }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        if (res.status === 401 || res.status === 400) {
          setTokenExpirado(true)
          throw new Error(
            data.mensaje ||
              "El enlace de recuperación ha expirado o es inválido. Por favor, solicita uno nuevo.",
          )
        } else {
          throw new Error(
            data.mensaje ||
              "Ocurrió un error en el servidor al restablecer tu contraseña. Intenta nuevamente.",
          )
        }
      }

      setExito(true)
    } catch (err: any) {
      if (err.name === "TypeError" || err.message?.includes("fetch")) {
        setError(
          "No se pudo establecer conexión con el servidor. Verifica que el backend esté activo.",
        )
      } else {
        setError(
          err.message || "Error inesperado al restablecer la contraseña.",
        )
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen grid place-items-center p-6 bg-gradient-to-br from-[#e8eefc] via-[#f4f6fb] to-[#f4f6fb] dark:from-slate-950 dark:via-slate-950 dark:to-blue-950/30 transition-colors">
      <div className="fixed top-4 right-4 z-40">
        <BotonTema />
      </div>

      <div className="w-full max-w-[420px] bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-lg border border-[#e2e6ef] dark:border-slate-800">
        {!token ? (
          <div className="text-center">
            <span className="inline-grid place-items-center w-14 h-14 rounded-2xl bg-[#fef2f2] dark:bg-red-950/60 text-[#dc2626] dark:text-red-400 font-bold text-2xl mb-4 shadow-sm mx-auto border border-[#fecaca] dark:border-red-800/60">
              ⚠
            </span>
            <h1 className="text-2xl font-bold text-[#1c2333] dark:text-slate-100 mb-2">
              Enlace incompleto
            </h1>
            <p className="text-sm text-[#5d6678] dark:text-slate-400 mb-6 leading-relaxed">
              No se detectó un token de recuperación válido en la dirección web.
              Por favor solicita un nuevo correo de restablecimiento.
            </p>
            <Link
              to="/recuperar-password"
              className="w-full inline-block py-3 rounded-xl bg-[#2557d6] hover:bg-[#1f47b2] dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-semibold text-sm shadow-md transition-all text-center"
            >
              Solicitar nuevo enlace
            </Link>
          </div>
        ) : tokenExpirado ? (
          <div className="text-center">
            <span className="inline-grid place-items-center w-14 h-14 rounded-2xl bg-[#fff7ed] dark:bg-orange-950/60 text-[#ea580c] dark:text-orange-400 font-bold text-2xl mb-4 shadow-sm mx-auto border border-[#fed7aa] dark:border-orange-800/60">
              ⏱
            </span>
            <h1 className="text-2xl font-bold text-[#1c2333] dark:text-slate-100 mb-2">
              Enlace expirado
            </h1>
            <p className="text-sm text-[#5d6678] dark:text-slate-400 mb-6 leading-relaxed">
              {error ||
                "El enlace de recuperación ya no es válido o superó los 15 minutos de vigencia."}
            </p>
            <div className="flex flex-col gap-3">
              <Link
                to="/recuperar-password"
                className="w-full py-3 rounded-xl bg-[#2557d6] hover:bg-[#1f47b2] dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-semibold text-sm shadow-md transition-all text-center"
              >
                Solicitar otro enlace
              </Link>
              <Link
                to="/"
                className="text-xs font-semibold text-[#5d6678] dark:text-slate-400 hover:text-[#2557d6] dark:hover:text-blue-400 transition-colors py-1"
              >
                ← Volver al inicio de sesión
              </Link>
            </div>
          </div>
        ) : exito ? (
          <div className="text-center">
            <span className="inline-grid place-items-center w-14 h-14 rounded-2xl bg-[#ecfdf5] dark:bg-emerald-950/60 text-[#059669] dark:text-emerald-400 font-bold text-2xl mb-4 shadow-sm mx-auto border border-[#a7f3d0] dark:border-emerald-800/60">
              ✓
            </span>
            <h1 className="text-2xl font-bold text-[#1c2333] dark:text-slate-100 mb-2">
              ¡Contraseña actualizada!
            </h1>
            <p className="text-sm text-[#5d6678] dark:text-slate-400 mb-6 leading-relaxed">
              Tu contraseña ha sido restablecida exitosamente. Ahora puedes
              ingresar al sistema con tus nuevas credenciales.
            </p>
            <Link
              to="/"
              className="w-full inline-block py-3 rounded-xl bg-[#2557d6] hover:bg-[#1f47b2] dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-semibold text-sm shadow-md transition-all text-center"
            >
              Ir al inicio de sesión
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="text-center mb-6">
              <span className="inline-grid place-items-center w-14 h-14 rounded-2xl bg-[#2557d6] dark:bg-blue-600 text-white font-bold text-xl mb-3 shadow-md mx-auto">
                🔑
              </span>
              <h1 className="text-2xl font-bold text-[#1c2333] dark:text-slate-100">
                Restablecer Contraseña
              </h1>
              <p className="text-sm text-[#5d6678] dark:text-slate-400 mt-1">
                Ingresa y confirma tu nueva contraseña de acceso.
              </p>
            </div>

            <div className="flex flex-col gap-1.5 mb-4">
              <label
                htmlFor="nueva"
                className="text-xs font-semibold text-[#1c2333] dark:text-slate-200"
              >
                Nueva contraseña
              </label>
              <input
                id="nueva"
                type="password"
                value={nuevaContrasena}
                onChange={(e) => setNuevaContrasena(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#e2e6ef] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#1c2333] dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm focus:border-[#2557d6] dark:focus:border-blue-500 focus:ring-2 focus:ring-[#2557d6]/20 dark:focus:ring-blue-500/25 transition-all"
                autoFocus
                required
              />
            </div>

            <div className="flex flex-col gap-1.5 mb-5">
              <label
                htmlFor="confirmar"
                className="text-xs font-semibold text-[#1c2333] dark:text-slate-200"
              >
                Confirmar nueva contraseña
              </label>
              <input
                id="confirmar"
                type="password"
                value={confirmarContrasena}
                onChange={(e) => setConfirmarContrasena(e.target.value)}
                placeholder="Repite tu nueva contraseña"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#e2e6ef] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#1c2333] dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm focus:border-[#2557d6] dark:focus:border-blue-500 focus:ring-2 focus:ring-[#2557d6]/20 dark:focus:ring-blue-500/25 transition-all"
                required
              />
            </div>

            {error && (
              <div className="bg-[#fef2f2] dark:bg-red-950/50 border border-[#fecaca] dark:border-red-800/60 text-[#dc2626] dark:text-red-300 rounded-xl p-3 text-xs font-medium mb-5">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#2557d6] hover:bg-[#1f47b2] dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-semibold text-sm shadow-md transition-all cursor-pointer disabled:opacity-60 mb-5"
            >
              {loading ? "Restableciendo..." : "Guardar nueva contraseña"}
            </button>

            <div className="text-center">
              <Link
                to="/"
                className="text-xs font-semibold text-[#5d6678] dark:text-slate-400 hover:text-[#2557d6] dark:hover:text-blue-400 transition-colors"
              >
                ← Cancelar y volver al inicio
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
