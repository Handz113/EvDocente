import { Pool } from 'pg';

// Asegúrate de tener configuradas tus variables de entorno, por ejemplo con 'dotenv'
// import dotenv from 'dotenv';
// dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432', 10),
});

// Evento para capturar errores del cliente en el pool de conexiones
pool.on('error', (err, client) => {
  console.error('Error inesperado en el cliente de la base de datos', err);
  process.exit(-1);
});

export default pool;
