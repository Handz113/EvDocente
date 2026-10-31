import { Router } from 'express';
import { obtenerAlumnosFaltantes } from '../controllers/adminController';
import { verificarToken, verificarRol } from '../middlewares/auth';

const router = Router();

/**
 * GET /api/admin/faltantes
 * Lista de alumnos que aún no han completado la evaluación de sus materias asignadas.
 * Protegido: Requiere autenticación y rol 'Administrador'.
 */
router.get('/faltantes', verificarToken, verificarRol(['Administrador']), obtenerAlumnosFaltantes);

export default router;
