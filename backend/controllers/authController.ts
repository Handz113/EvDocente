import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import pool from '../config/db';
import { enviarCorreoRecuperacion } from '../services/mailer';

/**
 * Controlador para solicitar la recuperación de contraseña.
 * Verifica la existencia del correo institucional en la base de datos,
 * genera un token JWT temporal (15 min) y envía el correo con el enlace estructurado.
 */
export const solicitarRecuperacion = async (req: Request, res: Response): Promise<void> => {
  const { correo, correo_institucional, email } = req.body;
  const inputEmail = correo || correo_institucional || email;

  if (!inputEmail || typeof inputEmail !== 'string' || !inputEmail.trim()) {
    res.status(400).json({
      mensaje: 'El correo electrónico institucional es requerido.'
    });
    return;
  }

  const emailNormalizado = inputEmail.trim().toLowerCase();

  try {
    // 1. Verificar existencia del usuario en la tabla Usuario
    const query = `
      SELECT id_usuario, correo_institucional, activo 
      FROM Usuario 
      WHERE LOWER(correo_institucional) = $1
    `;
    const result = await pool.query(query, [emailNormalizado]);

    if (result.rows.length === 0) {
      res.status(404).json({
        mensaje: 'No se encontró una cuenta registrada con el correo institucional proporcionado.'
      });
      return;
    }

    const usuario = result.rows[0];

    if (usuario.activo === false) {
      res.status(403).json({
        mensaje: 'La cuenta se encuentra inactiva. Contacta al administrador del sistema.'
      });
      return;
    }

    // 2. Generar JWT firmado con validez estricta de 15 minutos
    const secret = process.env.JWT_SECRET || 'super_secreto_para_firmar_tokens_123';
    const payload = {
      id_usuario: usuario.id_usuario,
      correo: usuario.correo_institucional,
      tipo: 'recuperacion_password'
    };

    const token = jwt.sign(payload, secret, { expiresIn: '15m' });

    // 3. Estructurar el enlace de recuperación y enviar correo
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;

    await enviarCorreoRecuperacion(usuario.correo_institucional, resetUrl);

    res.status(200).json({
      mensaje: 'Enlace de recuperación generado y enviado exitosamente al correo institucional.',
      expiraEn: '15 minutos'
    });
  } catch (error: any) {
    console.error('Error en solicitarRecuperacion:', error);
    res.status(500).json({
      mensaje: 'Error interno del servidor al procesar la recuperación de contraseña.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
