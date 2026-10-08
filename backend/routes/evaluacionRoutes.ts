import { Router } from 'express';
import { crearEvaluacion } from '../controllers/evaluacionController';
import { verificarToken, verificarRol } from '../middlewares/auth';

const router = Router();

/**
 * POST /api/evaluaciones
 * Protegido por autenticación (verificarToken) 
 * y autorización exclusiva para el rol 'Alumno' (verificarRol)
 */
router.post(
  '/', // Este router se deberá montar en "/api/evaluaciones" en tu app principal
  verificarToken,
  verificarRol(['Alumno']),
  crearEvaluacion
);

export default router;
