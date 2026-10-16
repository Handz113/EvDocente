import { Router } from 'express';
import { 
  crearEvaluacion, 
  obtenerPromedioDocente, 
  calcularDesempenoDocente 
} from '../controllers/evaluacionController';
import { verificarToken, verificarRol } from '../middlewares/auth';

const router = Router();

/**
 * POST /api/evaluaciones
 * Protegido por autenticación (verificarToken) 
 * y autorización exclusiva para el rol 'Alumno' (verificarRol)
 */
router.post(
  '/', // Este router se monta en "/api/evaluaciones" en server.ts
  verificarToken,
  verificarRol(['Alumno']),
  crearEvaluacion
);

/**
 * GET /api/evaluaciones/promedio/:docenteId
 * Calcula y retorna el promedio aritmético, total de evaluaciones,
 * clasificación de desempeño y estatus de asignación de materias del docente.
 * Soporta filtro opcional por ciclo/periodo: ?periodo=... o ?id_ciclo=...
 */
router.get(
  '/promedio/:docenteId',
  verificarToken,
  obtenerPromedioDocente
);

/**
 * GET /api/evaluaciones/docente/:id/desempeno
 * Ruta RESTful complementaria para la consulta de desempeño docente
 */
router.get(
  '/docente/:id/desempeno',
  verificarToken,
  calcularDesempenoDocente
);

/**
 * GET /api/evaluaciones/docente/:docenteId
 * Ruta RESTful directa para consulta de evaluaciones por ID de docente
 */
router.get(
  '/docente/:docenteId',
  verificarToken,
  obtenerPromedioDocente
);

export default router;

