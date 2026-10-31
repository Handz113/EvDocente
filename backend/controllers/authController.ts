import { Request, Response } from "express"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import pool from "../config/db"
import { enviarCorreoRecuperacion } from "../services/mailer"

// El frontend maneja las áreas en minúsculas; la BD usa los nombres de la tabla Rol.
const AREA_A_ROL: Record<string, string> = {
  alumno: "Alumno",
  docente: "Docente",
  coordinacion: "Coordinador",
  administracion: "Administrador",
}

/**
 * POST /api/auth/login
 * Body: { usuario, contrasena, area }
 *  - usuario: número de cuenta (ALU001, DOC001...) o correo institucional
 *  - area: 'alumno' | 'docente' | 'coordinacion' | 'administracion'
 * Responde con un JWT cuyo payload es el que ya esperan los middlewares:
 *   { id_usuario, id, rol }  (id = id_alumno o id_docente según el rol)
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  const { usuario, contrasena, area } = req.body ?? {}

  if (!usuario || !contrasena || !area) {
    res
      .status(400)
      .json({ mensaje: "Se requieren usuario, contraseña y área." })
    return
  }

  const rolEsperado = AREA_A_ROL[String(area)]
  if (!rolEsperado) {
    res.status(400).json({ mensaje: "Área no válida." })
    return
  }

  const secret = process.env.JWT_SECRET
  if (!secret) {
    console.error("JWT_SECRET no está definido en las variables de entorno.")
    res.status(500).json({ mensaje: "Error interno del servidor." })
    return
  }

  try {
    const { rows } = await pool.query(
      `SELECT u.id_usuario, u.numero_cuenta, u.contrasena, u.activo, r.nombre AS rol,
              a.id_alumno, d.id_docente, d.nombre AS docente_nombre, d.apellido AS docente_apellido
       FROM Usuario u
       INNER JOIN Rol r ON r.id_rol = u.id_rol
       LEFT JOIN Alumno a ON a.id_usuario = u.id_usuario
       LEFT JOIN Docente d ON d.id_usuario = u.id_usuario
       WHERE LOWER(u.numero_cuenta) = LOWER($1) OR LOWER(u.correo_institucional) = LOWER($1)
       LIMIT 1`,
      [String(usuario).trim()],
    )

    const user = rows[0]
    // Mismo mensaje para usuario inexistente o contraseña incorrecta (no revelar cuál falló)
    const valida = user
      ? await bcrypt.compare(String(contrasena), user.contrasena)
      : false
    if (!user || !valida) {
      res.status(401).json({ mensaje: "Usuario o contraseña incorrectos." })
      return
    }

    if (!user.activo) {
      res.status(403).json({
        mensaje: "La cuenta está desactivada. Contacta a administración.",
      })
      return
    }

    if (user.rol !== rolEsperado) {
      res
        .status(403)
        .json({ mensaje: `Esta cuenta no pertenece al área de ${area}.` })
      return
    }

    const id =
      user.rol === "Alumno"
        ? user.id_alumno
        : user.rol === "Docente"
          ? user.id_docente
          : user.id_usuario

    const token = jwt.sign(
      { id_usuario: user.id_usuario, id, rol: user.rol },
      secret,
      {
        expiresIn: "2h",
      },
    )

    const nombre =
      user.rol === "Docente"
        ? `${user.docente_nombre} ${user.docente_apellido}`
        : user.rol === "Alumno"
          ? "Alumno"
          : user.rol === "Coordinador"
            ? "Coordinación Académica"
            : "Administración"

    res.json({
      token,
      usuario: {
        rol: area,
        id,
        matricula: user.numero_cuenta,
        nombre,
        docenteId: user.rol === "Docente" ? String(user.id_docente) : undefined,
      },
    })
  } catch (error) {
    console.error("Error en login:", error)
    res
      .status(500)
      .json({ mensaje: "Error interno del servidor al iniciar sesión." })
  }
}

/**
 * POST /api/auth/recuperar-password
 * Body: { correo }
 * Extrae el correo, valida su existencia en la tabla Usuario de PostgreSQL.
 * Si no existe, devuelve HTTP 404.
 * Si existe, genera un JWT temporal con expiración de 15 minutos ({ expiresIn: '15m' }),
 * llama a enviarCorreoRecuperacion(correo, token) y devuelve HTTP 200.
 */
export const solicitarRecuperacion = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { correo } = req.body ?? {}

  if (!correo || typeof correo !== "string" || !correo.trim()) {
    res.status(400).json({ mensaje: "El correo electrónico es requerido." })
    return
  }

  const correoLimpio = correo.trim().toLowerCase()

  try {
    let user: any = null

    try {
      const result = await pool.query(
        "SELECT id_usuario, correo_institucional FROM Usuario WHERE LOWER(correo_institucional) = $1 LIMIT 1",
        [correoLimpio],
      )
      user = result.rows[0]
    } catch (dbErr: any) {
      // Fallback si la columna se llama correo en lugar de correo_institucional
      if (dbErr?.message && dbErr.message.includes("correo_institucional")) {
        const result = await pool.query(
          "SELECT id_usuario, correo FROM Usuario WHERE LOWER(correo) = $1 LIMIT 1",
          [correoLimpio],
        )
        user = result.rows[0]
      } else {
        throw dbErr
      }
    }

    if (!user) {
      res.status(404).json({ mensaje: "Usuario no encontrado." })
      return
    }

    const secret = process.env.JWT_SECRET || "secret"
    const token = jwt.sign(
      {
        id_usuario: user.id_usuario,
        correo: user.correo_institucional || user.correo || correoLimpio,
        accion: "recuperar-password",
      },
      secret,
      { expiresIn: "15m" },
    )

    await enviarCorreoRecuperacion(correoLimpio, token)

    res
      .status(200)
      .json({ mensaje: "Correo de recuperación enviado con éxito." })
  } catch (error) {
    console.error("Error en solicitarRecuperacion:", error)
    res.status(500).json({
      mensaje:
        "Error interno del servidor al procesar la recuperación de contraseña.",
    })
  }
}
