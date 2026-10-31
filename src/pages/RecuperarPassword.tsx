import { useState, type FormEvent } from "react"
import { Link } from "../router"

export default function RecuperarPassword() {
  const [correo, setCorreo] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [exito, setExito] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!correo.trim()) {
      setError("Por favor, ingresa tu correo institucional.")
      return
    }

    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/auth/recuperar-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo: correo.trim() }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error(
            "No se encontró ninguna cuenta asociada a este correo institucional.",
          )
        } else if (res.status === 400) {
          throw new Error(data.mensaje || "El correo ingresado no es válido.")
        } else {
          throw new Error(
            data.mensaje ||
              "Error en el servidor al procesar la solicitud. Intenta más tarde.",
          )
        }
      }

      setExito(true)
    } catch (err: any) {
      if (err.name === "TypeError" || err.message?.includes("fetch")) {
        setError(
          "No se pudo establecer conexión con el servidor. Verifica que el servicio esté activo.",
        )
      } else {
        setError(
          err.message ||
            "Ocurrió un error inesperado al procesar la solicitud.",
        )
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid place-items-center p-6 bg-gradient-to-br from-[#e8eefc] via-[#f4f6fb] to-[#f4f6fb]">
      <div className="w-full max-w-[420px] bg-white rounded-2xl p-8 shadow-lg border border-[#e2e6ef]">
        {exito ? (
          <div className="text-center">
            <span className="inline-grid place-items-center w-14 h-14 rounded-2xl bg-[#ecfdf5] text-[#059669] font-bold text-2xl mb-4 shadow-sm mx-auto border border-[#a7f3d0]">
              ✓
            </span>
            <h1 className="text-2xl font-bold text-[#1c2333] mb-2">
              ¡Revisa tu correo!
            </h1>
            <p className="text-sm text-[#5d6678] mb-5 leading-relaxed">
              Hemos enviado un enlace de recuperación a:{" "}
              <strong className="text-[#1c2333] block break-all mt-1">
                {correo}
              </strong>
            </p>

            <div className="bg-[#f0f9ff] text-[#0369a1] rounded-xl p-3.5 text-xs text-left mb-6 border border-[#bae6fd] leading-relaxed">
              <p className="font-semibold mb-1">⏱ Vigencia del enlace:</p>
              <p>
                Por tu seguridad, el enlace expirará en{" "}
                <strong>15 minutos</strong>. Si no lo encuentras en tu bandeja
                principal, recuerda revisar la carpeta de spam o correo no
                deseado.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Link
                to="/"
                className="w-full py-3 rounded-xl bg-[#2557d6] hover:bg-[#1f47b2] text-white font-semibold text-sm shadow-md transition-all text-center"
              >
                Volver al inicio de sesión
              </Link>
              <button
                type="button"
                onClick={() => {
                  setExito(false)
                  setCorreo("")
                  setError("")
                }}
                className="text-xs font-semibold text-[#5d6678] hover:text-[#2557d6] transition-colors py-1 cursor-pointer"
              >
                ¿No era tu correo? Intentar de nuevo
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="text-center mb-6">
              <span className="inline-grid place-items-center w-14 h-14 rounded-2xl bg-[#2557d6] text-white font-bold text-xl mb-3 shadow-md mx-auto">
                ✉
              </span>
              <h1 className="text-2xl font-bold text-[#1c2333]">
                Recuperar Contraseña
              </h1>
              <p className="text-sm text-[#5d6678] mt-1">
                Ingresa tu correo institucional registrado para recibir un
                enlace de restablecimiento.
              </p>
            </div>

            <div className="flex flex-col gap-1.5 mb-5">
              <label
                htmlFor="correo"
                className="text-xs font-semibold text-[#1c2333]"
              >
                Correo institucional
              </label>
              <input
                id="correo"
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="ejemplo@escuela.edu"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#e2e6ef] bg-white text-sm focus:border-[#2557d6] focus:ring-2 focus:ring-[#2557d6]/20 transition-all"
                autoFocus
                required
              />
            </div>

            {error && (
              <div className="bg-[#fef2f2] border border-[#fecaca] text-[#dc2626] rounded-xl p-3 text-xs font-medium mb-5">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#2557d6] hover:bg-[#1f47b2] text-white font-semibold text-sm shadow-md transition-all cursor-pointer disabled:opacity-60 mb-5"
            >
              {loading ? "Enviando enlace..." : "Enviar enlace de recuperación"}
            </button>

            <div className="text-center">
              <Link
                to="/"
                className="text-xs font-semibold text-[#5d6678] hover:text-[#2557d6] transition-colors"
              >
                ← Volver al inicio de sesión
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
