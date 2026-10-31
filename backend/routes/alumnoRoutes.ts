import { Router } from 'express';
import { obtenerMateriasAlumno } from '../controllers/alumnoController';
import { verificarToken, verificarRol } from '../middlewares/auth';

const router = Router();

/** GET /api/alumno/materias — materias inscritas del alumno del token */
router.get('/materias', verificarToken, verificarRol(['Alumno']), obtenerMateriasAlumno);

export default router;
