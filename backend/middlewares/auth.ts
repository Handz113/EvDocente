import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extender la interfaz Request para incluir los datos del usuario decodificados del token
export interface AuthRequest extends Request {
  user?: any;
}

/**
 * Middleware para verificar la validez del token JWT en la cabecera de la solicitud.
 */
export const verificarToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ mensaje: 'No se proporcionó un token de autenticación o el formato es inválido.' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET;
    
    if (!secret) {
      console.error('JWT_SECRET no está definido en las variables de entorno.');
      res.status(500).json({ mensaje: 'Error interno del servidor.' });
      return;
    }

    const decoded = jwt.verify(token, secret);
    req.user = decoded; // Guardamos la info decodificada en req.user
    next();
  } catch (error) {
    res.status(401).json({ mensaje: 'Token inválido o expirado.' });
  }
};

/**
 * Middleware para verificar si el usuario tiene uno de los roles permitidos.
 * Debe utilizarse después de verificarToken.
 * 
 * @param rolesPermitidos Arreglo de strings con los roles que tienen acceso (ej. ['admin', 'docente'])
 */
export const verificarRol = (rolesPermitidos: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user || !req.user.rol) {
        res.status(403).json({ mensaje: 'No se pudo identificar el rol del usuario.' });
        return;
      }

      if (!rolesPermitidos.includes(req.user.rol)) {
        res.status(403).json({ mensaje: 'No tienes los permisos necesarios para acceder a este recurso.' });
        return;
      }

      next();
    } catch (error) {
      res.status(500).json({ mensaje: 'Error al verificar los permisos del usuario.' });
    }
  };
};
