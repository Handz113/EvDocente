import { Router } from 'express';
import {
  listarUsuarios,
  crearUsuario,
  toggleUsuarioActivo,
  listarDocentesAdmin,
  crearDocente,
  listarMateriasCRN,
  crearMateria,
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
router.get('/docentes', ...soloAdmin, listarDocentesAdmin);
router.post('/docentes', ...soloAdmin, crearDocente);

// 3. Catálogo de Materias y CRN
router.get('/materias', ...soloAdmin, listarMateriasCRN);
router.post('/materias', ...soloAdmin, crearMateria);
router.get('/materias-crn', ...soloAdmin, listarMateriasCRN);
router.post('/materias-crn', ...soloAdmin, crearMateria);

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
