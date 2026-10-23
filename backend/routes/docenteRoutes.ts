import { Router } from 'express';
import { listarDocentes, misResultados } from '../controllers/docenteController';
import { verificarToken, verificarRol } from '../middlewares/auth';

const router = Router();

/** GET /api/docentes — catálogo de docentes con sus materias (coordinación y administración) */
router.get('/', verificarToken, verificarRol(['Administrador', 'Coordinador']), listarDocentes);

/** GET /api/docentes/me/resultados — desglose por grupo del docente del token */
router.get('/me/resultados', verificarToken, verificarRol(['Docente']), misResultados);

export default router;
