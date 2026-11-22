import { Router } from 'express';
import {
  descargarReporteDocentePDF,
  descargarReporteCoordinacionPDF,
  descargarReporteCoordinacionExcel,
  descargarReporteCoordinacionCSV,
} from '../controllers/reporteController';
import { verificarToken, verificarRol } from '../middlewares/auth';

const router = Router();

/**
 * GET /api/reportes/docente/me/pdf
 * Exporta en PDF el reporte institucional del docente autenticado en el ciclo activo.
 */
router.get('/docente/me/pdf', verificarToken, verificarRol(['Docente']), descargarReporteDocentePDF);

/**
 * GET /api/reportes/coordinacion/pdf
 * Exporta en PDF el reporte directivo analítico y tabular de coordinación según filtros activos.
 */
router.get(
  '/coordinacion/pdf',
  verificarToken,
  verificarRol(['Coordinador', 'Administrador']),
  descargarReporteCoordinacionPDF
);

/**
 * GET /api/reportes/coordinacion/excel
 * Exporta en formato Excel (.xlsx) los datos filtrados de desempeño docente en coordinación.
 */
router.get(
  '/coordinacion/excel',
  verificarToken,
  verificarRol(['Coordinador', 'Administrador']),
  descargarReporteCoordinacionExcel
);

/**
 * GET /api/reportes/coordinacion/csv
 * Exporta en formato CSV los datos filtrados de desempeño docente en coordinación.
 */
router.get(
  '/coordinacion/csv',
  verificarToken,
  verificarRol(['Coordinador', 'Administrador']),
  descargarReporteCoordinacionCSV
);

export default router;
