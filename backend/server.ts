import express from 'express';
import 'dotenv/config';
// Importa las rutas que te generó Antigravity IDE
// Asegúrate de que la ruta coincida con el nombre exacto del archivo generado
import evaluacionRoutes from './routes/evaluacionRoutes';

const app = express();

// Middleware para poder recibir JSON en el body de las peticiones
app.use(express.json());

// =========================
// RUTAS DE LA API
// =========================
app.use('/api/evaluaciones', evaluacionRoutes);

// Manejo de rutas no encontradas (404)
app.use((req, res) => {
    res.status(404).json({ mensaje: 'Ruta no encontrada' });
});

// =========================
// INICIO DEL SERVIDOR
// =========================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor Backend de Evaluación Docente corriendo en http://localhost:${PORT}`);
});