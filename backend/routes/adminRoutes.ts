import { Router } from 'express';
import {
  listarUsuarios,
  crearUsuario,
  toggleUsuarioActivo,
  obtenerDocentesAdmin,
  crearDocente,
  eliminarDocente,
  obtenerMateriasCRN,
  crearMateria,
  eliminarMateriaCRN,
  listarPreguntas,
  crearPregunta,
  eliminarPregunta,
  crearCiclo,
  toggleCicloActivo,
} from '../controllers/adminCatalogoController';
import { listarCiclos } from '../controllers/cicloController';
import { verificarToken, verificarRol } from '../middlewares/auth';

const router = Router();
const soloAdmin = [verificarToken, verificarRol(['Administrador'])] as const;

// 1. Catálogo de Usuarios
router.get('/usuarios', ...soloAdmin, listarUsuarios);
router.post('/usuarios', ...soloAdmin, crearUsuario);
router.patch('/usuarios/:id/activo', ...soloAdmin, toggleUsuarioActivo);
router.patch('/usuarios/:id', ...soloAdmin, toggleUsuarioActivo);

// 2. Catálogo de Docentes
router.get('/docentes', ...soloAdmin, obtenerDocentesAdmin);
router.post('/docentes', ...soloAdmin, crearDocente);
router.delete('/docentes/:id', ...soloAdmin, eliminarDocente);

// 3. Catálogo de Materias y CRN
router.get('/materias', ...soloAdmin, obtenerMateriasCRN);
router.post('/materias', ...soloAdmin, crearMateria);
router.delete('/materias/:id', ...soloAdmin, eliminarMateriaCRN);
router.get('/materias-crn', ...soloAdmin, obtenerMateriasCRN);
router.post('/materias-crn', ...soloAdmin, crearMateria);
router.delete('/materias-crn/:id', ...soloAdmin, eliminarMateriaCRN);

// 4. Catálogo de Preguntas Docentes
router.get('/preguntas', ...soloAdmin, listarPreguntas);
router.post('/preguntas', ...soloAdmin, crearPregunta);
router.delete('/preguntas/:id', ...soloAdmin, eliminarPregunta);

// 5. Catálogo de Periodos / Ciclos Escolares (reutiliza listarCiclos para GET)
router.get('/ciclos', ...soloAdmin, listarCiclos);
router.post('/ciclos', ...soloAdmin, crearCiclo);
router.patch('/ciclos/:id/activo', ...soloAdmin, toggleCicloActivo);
router.patch('/ciclos/:id', ...soloAdmin, toggleCicloActivo);

router.get('/periodos', ...soloAdmin, listarCiclos);
router.post('/periodos', ...soloAdmin, crearCiclo);
router.patch('/periodos/:id/activo', ...soloAdmin, toggleCicloActivo);
router.patch('/periodos/:id', ...soloAdmin, toggleCicloActivo);

export default router;
