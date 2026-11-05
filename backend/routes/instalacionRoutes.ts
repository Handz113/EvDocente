import { Router } from 'express';
import {
  listarInstalacionesAlumno,
  obtenerPreguntasInstalacion,
  crearEvaluacionInstalacion,
  obtenerResultadosInstalaciones,
  obtenerCatalogo,
  crearInstalacion,
  actualizarInstalacion,
  crearPregunta,
  actualizarPregunta,
} from '../controllers/instalacionController';
import { verificarToken, verificarRol } from '../middlewares/auth';

const router = Router();

// Las rutas fijas van antes de /:id para que Express no las tome como un id

/** GET /api/instalaciones/resultados[?id_ciclo=] — resultados anónimos por instalación */
router.get('/resultados', verificarToken, verificarRol(['Coordinador', 'Administrador']), obtenerResultadosInstalaciones);

/** GET /api/instalaciones/catalogo — instalaciones y preguntas, incluidas inactivas */
router.get('/catalogo', verificarToken, verificarRol(['Administrador']), obtenerCatalogo);

/** POST /api/instalaciones/preguntas — alta de pregunta (id_instalacion null = todas) */
router.post('/preguntas', verificarToken, verificarRol(['Administrador']), crearPregunta);

/** PATCH /api/instalaciones/preguntas/:id — editar o activar/desactivar (nunca se borran) */
router.patch('/preguntas/:id', verificarToken, verificarRol(['Administrador']), actualizarPregunta);

/** GET /api/instalaciones — instalaciones activas y si el alumno ya las evaluó en el ciclo activo */
router.get('/', verificarToken, verificarRol(['Alumno']), listarInstalacionesAlumno);

/** POST /api/instalaciones — alta de instalación */
router.post('/', verificarToken, verificarRol(['Administrador']), crearInstalacion);

/** PATCH /api/instalaciones/:id — editar o activar/desactivar instalación */
router.patch('/:id', verificarToken, verificarRol(['Administrador']), actualizarInstalacion);

/** GET /api/instalaciones/:id/preguntas — cuestionario de la instalación para el alumno */
router.get('/:id/preguntas', verificarToken, verificarRol(['Alumno']), obtenerPreguntasInstalacion);

/** POST /api/instalaciones/:id/evaluacion — el alumno envía su evaluación */
router.post('/:id/evaluacion', verificarToken, verificarRol(['Alumno']), crearEvaluacionInstalacion);

export default router;
