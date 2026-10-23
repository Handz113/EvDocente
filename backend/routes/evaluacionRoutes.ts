import { Router } from 'express';
import { 
  crearEvaluacion, 
  obtenerPromedioDocente, 
  calcularDesempenoDocente 
} from '../controllers/evaluacionController';
import { verificarToken, verificarRol, type AuthRequest } from '../middlewares/auth';

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
 * GET /api/evaluaciones/mi-promedio
 * El docente consulta su propio promedio y clasificación (el id sale del token,
 * así un docente no puede consultar a otro).
 */
router.get(
  '/mi-promedio',
  verificarToken,
  verificarRol(['Docente']),
  (req: AuthRequest, res, next) => {
    req.params.docenteId = String(req.user.id);
    return obtenerPromedioDocente(req, res).catch(next);
  }
);

/**
 * GET /api/evaluaciones/promedio/:docenteId
 * Calcula y retorna el promedio aritmético, total de evaluaciones,
 * clasificación de desempeño y estatus de asignación de materias del docente.
 * Restringido a Administradores y Coordinadores.
 * Soporta filtro opcional por ciclo/periodo: ?periodo=... o ?id_ciclo=...
 */
router.get(
  '/promedio/:docenteId',
  verificarToken,
  verificarRol(['Administrador', 'Coordinador']),
  obtenerPromedioDocente
);

/**
 * GET /api/evaluaciones/docente/:id/desempeno
 * Ruta RESTful complementaria para la consulta de desempeño docente.
 * Restringido a Administradores y Coordinadores.
 */
router.get(
  '/docente/:id/desempeno',
  verificarToken,
  verificarRol(['Administrador', 'Coordinador']),
  calcularDesempenoDocente
);

/**
 * GET /api/evaluaciones/docente/:docenteId
 * Ruta RESTful directa para consulta de evaluaciones por ID de docente.
 * Restringido a Administradores y Coordinadores.
 */
router.get(
  '/docente/:docenteId',
  verificarToken,
  verificarRol(['Administrador', 'Coordinador']),
  obtenerPromedioDocente
);

export default router;

