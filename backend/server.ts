import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import 'dotenv/config';
import pool from './config/db';
import evaluacionRoutes from './routes/evaluacionRoutes';
import authRoutes from './routes/authRoutes';
import alumnoRoutes from './routes/alumnoRoutes';
import docenteRoutes from './routes/docenteRoutes';
import cicloRoutes from './routes/cicloRoutes';
import participacionRoutes from './routes/participacionRoutes';
import instalacionRoutes from './routes/instalacionRoutes';
import adminRoutes from './routes/adminRoutes';

if (!process.env.JWT_SECRET) {
  console.error('Error crítico de seguridad: JWT_SECRET no está definido en las variables de entorno.');
  process.exit(1);
}

const app = express();
app.disable('x-powered-by');

// Middleware para poder recibir JSON en el body de las peticiones (acotado a 16kb)
app.use(express.json({ limit: '16kb' }));

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
    console.error(error);
    res.status(503).json({ servidor: 'ok', baseDeDatos: 'sin conexión' });
  }
});

// Rutas de autenticación (login, recuperación de contraseñas)
app.use('/api/auth', authRoutes);
app.use('/api/alumno', alumnoRoutes);
app.use('/api/docentes', docenteRoutes);
app.use('/api/evaluaciones', evaluacionRoutes);
app.use('/api/ciclos', cicloRoutes);
app.use('/api/participacion', participacionRoutes);
app.use('/api/instalaciones', instalacionRoutes);
app.use('/api/admin', adminRoutes);

// =========================
// FRONTEND COMPILADO (producción)
// =========================
// Si existe dist/ (npm run build), este mismo servidor entrega la app de React.
// Cualquier ruta que no empiece con /api devuelve index.html para que el router
// del frontend resuelva /alumno/inicio, /personal/..., etc. En local, sin dist/,
// no cambia nada: el frontend lo sirve Vite.
const carpetaDist = path.resolve(process.cwd(), 'dist');
const indexHtml = path.join(carpetaDist, 'index.html');
if (fs.existsSync(indexHtml)) {
    app.use(express.static(carpetaDist));
    // Express 5 ya no acepta '*': se usa una expresión regular que excluye /api
    app.get(/^(?!\/api).*/, (_req, res) => {
        res.sendFile(indexHtml);
    });
}

// Manejo de rutas no encontradas (404)
app.use((req, res) => {
    res.status(404).json({ mensaje: 'Ruta no encontrada' });
});

// =========================
// INICIO DEL SERVIDOR
// =========================
// BACKEND_PORT para no chocar con PORT, que Vite usa para el frontend en local.
// En Render no se define BACKEND_PORT y se usa el PORT que asigna la plataforma.
const PORT = process.env.BACKEND_PORT || process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor Backend de Evaluación Docente corriendo en http://localhost:${PORT}`);
});
