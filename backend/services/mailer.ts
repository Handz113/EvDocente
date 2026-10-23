import nodemailer from 'nodemailer';

/**
 * Transportador de Nodemailer configurado con variables de entorno
 */
export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_PORT === '465', // true para puerto 465 (SSL), false para otros puertos como 587 (TLS)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Envía un correo con el enlace estructurado para restablecer la contraseña.
 * 
 * @param destinatario Correo electrónico al que se enviará la recuperación
 * @param token Token JWT o URL estructurada con el token
 */
export const enviarCorreoRecuperacion = async (
  destinatario: string,
  token: string
): Promise<nodemailer.SentMessageInfo> => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  
  // Si el argumento ya contiene el enlace completo, lo usa directamente; de lo contrario construye el enlace estructurado
  const resetUrl = token.startsWith('http://') || token.startsWith('https://')
    ? token
    : `${frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;

  const remitente = process.env.SMTP_USER 
    ? `"Sistema de Evaluación Docente" <${process.env.SMTP_USER}>`
    : '"Sistema de Evaluación Docente" <no-reply@evaluaciondocente.edu>';

  const mailOptions = {
    from: remitente,
    to: destinatario,
    subject: 'Recuperación de Contraseña - Sistema de Evaluación Docente',
    text: `Hola,\n\nHas solicitado restablecer tu contraseña en el Sistema de Evaluación Docente.\n\nHaz clic en el siguiente enlace o cópialo en tu navegador para continuar:\n${resetUrl}\n\nNota: Este enlace expirará en 15 minutos.\n\nSi no realizaste esta solicitud, puedes ignorar este correo de forma segura.\n`,
    html: `
      <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
        <h2 style="color: #1e293b; text-align: center; margin-bottom: 20px;">Recuperación de Contraseña</h2>
        <p style="color: #475569; font-size: 15px; line-height: 1.6;">
          Hola,
        </p>
        <p style="color: #475569; font-size: 15px; line-height: 1.6;">
          Recibimos una solicitud para restablecer la contraseña asociada a tu cuenta institucional en el <strong>Sistema de Evaluación Docente</strong>.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 15px; display: inline-block;">
            Restablecer Contraseña
          </a>
        </div>
        <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
          Si el botón anterior no funciona, copia y pega la siguiente URL en tu navegador:
          <br />
          <a href="${resetUrl}" style="color: #2563eb; word-break: break-all;">${resetUrl}</a>
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #94a3b8; font-size: 12px; text-align: center; line-height: 1.4;">
          Este enlace es de uso único y tiene una validez de <strong>15 minutos</strong>.<br />
          Si tú no solicitaste este cambio, puedes ignorar este correo sin que afecte la seguridad de tu cuenta.
        </p>
      </div>
    `,
  };

  return await transporter.sendMail(mailOptions);
};
