import nodemailer from "nodemailer"

/**
 * Transporter de Nodemailer configurado con las credenciales SMTP de las variables de entorno.
 */
export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587,
  secure: process.env.SMTP_PORT === "465",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

/**
 * Envía un correo con el enlace estructurado para restablecer la contraseña.
 * Vigencia del enlace: 15 minutos.
 *
 * @param destinatario Correo electrónico del usuario
 * @param token Token JWT con expiración de 15 minutos
 */
export const enviarCorreoRecuperacion = async (
  destinatario: string,
  token: string,
): Promise<void> => {
  const resetUrl = `http://localhost:8443/reset-password?token=${token}`

  await transporter.sendMail({
    from:
      process.env.SMTP_USER ||
      '"Sistema de Evaluación Docente" <noreply@evaluaciondocente.local>',
    to: destinatario,
    subject: "Recuperación de contraseña - Sistema de Evaluación Docente",
    text: `Has solicitado restablecer tu contraseña.\n\nPuedes hacerlo a través del siguiente enlace:\n${resetUrl}\n\nNota: Este enlace tiene una vigencia de 15 minutos. Si no solicitaste este cambio, puedes ignorar este mensaje.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #2b6cb0;">Recuperación de Contraseña</h2>
        <p>Has solicitado restablecer tu contraseña para acceder al Sistema de Evaluación Docente.</p>
        <p>Para continuar con el proceso, haz clic en el siguiente botón:</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #2b6cb0; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Restablecer contraseña</a>
        </p>
        <p>O copia y pega el siguiente enlace en tu navegador:</p>
        <p style="word-break: break-all;"><a href="${resetUrl}">${resetUrl}</a></p>
        <p style="margin-top: 25px; padding: 10px; background-color: #f7fafc; border-left: 4px solid #ed8936; font-size: 0.9em; color: #4a5568;">
          <strong>Vigencia:</strong> Este enlace tiene una vigencia de 15 minutos. Si no solicitaste este cambio, puedes ignorar este correo con total tranquilidad.
        </p>
      </div>
    `,
  })
}
