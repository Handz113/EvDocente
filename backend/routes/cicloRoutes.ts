import { Router } from 'express';
import { listarCiclos } from '../controllers/cicloController';
import { verificarToken, verificarRol } from '../middlewares/auth';

const router = Router();

/**
 * GET /api/ciclos
 * Catálogo general de ciclos escolares (activos e históricos).
 * Restringido a Docente, Coordinador y Administrador.
 */
router.get(
  '/',
  verificarToken,
  verificarRol(['Docente', 'Coordinador', 'Administrador']),
  listarCiclos
);

export default router;
