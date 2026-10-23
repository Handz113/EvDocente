import { Router } from 'express';
import { solicitarRecuperacion } from '../controllers/authController';

const router = Router();

/**
 * POST /api/auth/recuperar-password
 * Endpoint público para solicitar el enlace de restablecimiento de contraseña.
 * Body esperado: { correo: string } o { correo_institucional: string }
 */
router.post('/recuperar-password', solicitarRecuperacion);

export default router;
