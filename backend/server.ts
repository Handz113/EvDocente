import express from 'express';
import 'dotenv/config';
import pool from './config/db';
import evaluacionRoutes from './routes/evaluacionRoutes';
import authRoutes from './routes/authRoutes';
import alumnoRoutes from './routes/alumnoRoutes';
import docenteRoutes from './routes/docenteRoutes';
import adminRoutes from './routes/adminRoutes';

const app = express();

// Middleware para poder recibir JSON en el body de las peticiones
app.use(express.json());

// =========================
// RUTAS DE LA API
// =========================
// En desarrollo el frontend (Vite) reenvía /api a este servidor mediante el proxy
// de vite.config.ts, por eso no hace falta configurar CORS.

// Prueba rápida de que el servidor y la base de datos responden
app.get('/api/salud', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ servidor: 'ok', baseDeDatos: 'ok' });
  } catch (error) {
    res.status(503).json({ servidor: 'ok', baseDeDatos: 'sin conexión', detalle: (error as Error).message });
  }
});

// Rutas de autenticación (login, recuperación de contraseñas)
app.use('/api/auth', authRoutes);
app.use('/api/alumno', alumnoRoutes);
app.use('/api/docentes', docenteRoutes);
app.use('/api/evaluaciones', evaluacionRoutes);
app.use('/api/admin', adminRoutes);

// Manejo de rutas no encontradas (404)
app.use((req, res) => {
    res.status(404).json({ mensaje: 'Ruta no encontrada' });
});

// =========================
// INICIO DEL SERVIDOR
// =========================
// BACKEND_PORT para no chocar con PORT, que Vite usa para el frontend
const PORT = process.env.BACKEND_PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor Backend de Evaluación Docente corriendo en http://localhost:${PORT}`);
});
