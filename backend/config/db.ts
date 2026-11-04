import { Pool } from 'pg';

// Las variables de entorno se cargan en server.ts con 'dotenv/config'.
// - En la nube (Neon): basta con DATABASE_URL. SSL activo salvo que DB_SSL=false.
// - En local: DB_USER, DB_HOST, DB_NAME, DB_PASSWORD y DB_PORT del .env.
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
    })
  : new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: parseInt(process.env.DB_PORT || '5432', 10),
    });

// Neon cierra las conexiones inactivas: solo se registra el error y el pool
// abre una conexión nueva en la siguiente consulta, sin tumbar el servidor.
pool.on('error', (err) => {
  console.error('Error inesperado en el cliente de la base de datos', err);
});

export default pool;
