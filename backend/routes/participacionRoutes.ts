import { Router } from 'express';
import { obtenerParticipacion } from '../controllers/adminController';
import { verificarToken, verificarRol } from '../middlewares/auth';

const router = Router();

/** GET /api/participacion — alumnos inscritos y si ya respondieron (coordinación y administración) */
router.get('/', verificarToken, verificarRol(['Coordinador', 'Administrador']), obtenerParticipacion);

export default router;
