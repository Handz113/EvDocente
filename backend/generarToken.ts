import jwt from 'jsonwebtoken';
import 'dotenv/config';

const payload = {
    id: 1, // ID del Alumno de prueba en la base de datos
    matricula: 'ALU001',
    rol: 'Alumno'
};

// Usa la misma clave secreta de tu archivo .env
const secret = process.env.JWT_SECRET;
if (!secret) {
    console.error('Error crítico: JWT_SECRET no está definido en el archivo .env.');
    process.exit(1);
}

const token = jwt.sign(payload, secret, { expiresIn: '2h', algorithm: 'HS256' });
console.log('\n=== TU TOKEN DE PRUEBA ===\n');
console.log(token);
console.log('\n==========================\n');