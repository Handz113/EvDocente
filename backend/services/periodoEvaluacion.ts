import { PoolClient } from 'pg';
import pool from '../config/db';

/**
 * Revisa si el periodo de evaluación del ciclo está abierto hoy.
 * Devuelve null si el ciclo está activo y CURRENT_DATE está entre fecha_inicio_eval
 * y fecha_cierre_eval (ambas incluidas). Si no, devuelve el motivo en español.
 * Las fechas se comparan y formatean en PostgreSQL para evitar desfases de zona horaria.
 */
export const motivoPeriodoCerrado = async (
  db: PoolClient | typeof pool,
  idCiclo: number
): Promise<string | null> => {
  const { rows } = await db.query(
    `SELECT nombre,
            activo,
            CURRENT_DATE < fecha_inicio_eval AS antes_de_abrir,
            CURRENT_DATE > fecha_cierre_eval AS despues_de_cerrar,
            to_char(fecha_inicio_eval, 'DD/MM/YYYY') AS inicio,
            to_char(fecha_cierre_eval, 'DD/MM/YYYY') AS cierre
     FROM CicloEscolar
     WHERE id_ciclo = $1`,
    [idCiclo]
  );

  const ciclo = rows[0];
  if (!ciclo) return 'El ciclo escolar de esta evaluación no existe.';

  const nombre = String(ciclo.nombre ?? '').trim();
  const etiqueta = /^ciclo\b/i.test(nombre) ? nombre : `Ciclo ${nombre}`;

  if (!ciclo.activo) {
    return `El ${etiqueta} no está activo, por lo que no se pueden registrar evaluaciones.`;
  }
  if (ciclo.antes_de_abrir) {
    return `El periodo de evaluación del ${etiqueta} abre el ${ciclo.inicio}.`;
  }
  if (ciclo.despues_de_cerrar) {
    return `El periodo de evaluación del ${etiqueta} cerró el ${ciclo.cierre}.`;
  }
  return null;
};
