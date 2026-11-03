import { Router } from 'express';
import {
  listarInstalaciones,
  crearInstalacion,
  obtenerPreguntasInstalacion,
  agregarPreguntaInstalacion,
  evaluarInstalacion,
  obtenerResultadosInstalacion
} from '../controllers/instalacionController';
import { verificarToken, verificarRol } from '../middlewares/auth';

const router = Router();

// Este router se monta en "/api/instalaciones" en server.ts
const todosLosRoles = ['Alumno', 'Coordinador', 'Administrador'];

router.get('/', verificarToken, verificarRol(todosLosRoles), listarInstalaciones);
router.post('/', verificarToken, verificarRol(['Administrador']), crearInstalacion);

router.get('/:id/preguntas', verificarToken, verificarRol(todosLosRoles), obtenerPreguntasInstalacion);
router.post('/:id/preguntas', verificarToken, verificarRol(['Administrador']), agregarPreguntaInstalacion);

router.post('/:id/evaluaciones', verificarToken, verificarRol(['Alumno']), evaluarInstalacion);
router.get(
  '/:id/resultados',
  verificarToken,
  verificarRol(['Coordinador', 'Administrador']),
  obtenerResultadosInstalacion
);

export default router;