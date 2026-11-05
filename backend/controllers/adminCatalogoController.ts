import { Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/db';
import { AuthRequest } from '../middlewares/auth';

const ROL_POR_NOMBRE: Record<string, number> = {
  administrador: 1,
  administracion: 1,
  administración: 1,
  coordinador: 2,
  coordinacion: 2,
  coordinación: 2,
  docente: 3,
  alumno: 4,
};

function resolverIdRol(rolInput?: string | number, numeroCuenta?: string): number {
  if (typeof rolInput === 'number' && [1, 2, 3, 4].includes(rolInput)) {
    return rolInput;
  }
  if (typeof rolInput === 'string' && rolInput.trim()) {
    const num = Number(rolInput);
    if ([1, 2, 3, 4].includes(num)) return num;
    const encontrado = ROL_POR_NOMBRE[rolInput.trim().toLowerCase()];
    if (encontrado) return encontrado;
  }
  const cuenta = (numeroCuenta || '').toUpperCase();
  if (cuenta.startsWith('ADMIN')) return 1;
  if (cuenta.startsWith('COORD')) return 2;
  if (cuenta.startsWith('ALU')) return 4;
  return 3; // Por defecto Docente
}

// ============================================================================
// 1. CATÁLOGO DE USUARIOS (Usuario)
// ============================================================================

/**
 * GET /api/admin/usuarios
 * Lista todos los usuarios ordenados por fecha_creacion DESC (o id_usuario DESC si la columna no existe en la tabla).
 */
export const listarUsuarios = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    try {
      const { rows } = await pool.query(
        `SELECT id_usuario, numero_cuenta, correo_institucional, activo, fecha_creacion
         FROM Usuario
         ORDER BY fecha_creacion DESC;`
      );
      res.status(200).json(rows);
      return;
    } catch (dbErr: any) {
      // Fallback si la tabla Usuario en la BD no tiene la columna fecha_creacion
      if (dbErr?.code === '42703' || dbErr?.message?.includes('fecha_creacion')) {
        const { rows } = await pool.query(
          `SELECT u.id_usuario,
                  u.numero_cuenta,
                  u.correo_institucional,
                  u.activo,
                  u.id_rol,
                  r.nombre AS rol,
                  COALESCE(d.nombre || ' ' || d.apellido, r.nombre) AS nombre,
                  CURRENT_TIMESTAMP AS fecha_creacion
           FROM Usuario u
           LEFT JOIN Rol r ON r.id_rol = u.id_rol
           LEFT JOIN Docente d ON d.id_usuario = u.id_usuario
           ORDER BY u.id_usuario DESC;`
        );
        res.status(200).json(rows);
        return;
      }
      throw dbErr;
    }
  } catch (error) {
    console.error('Error al listar usuarios:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor al listar usuarios.' });
  }
};

/**
 * POST /api/admin/usuarios
 * Recibe numero_cuenta, correo_institucional y contrasena (encripta con bcrypt). Inserta en Usuario.
 */
export const crearUsuario = async (req: AuthRequest, res: Response): Promise<void> => {
  const { numero_cuenta, correo_institucional, contrasena, id_rol, rol, area } = req.body ?? {};

  if (!numero_cuenta || !correo_institucional || !contrasena) {
    res.status(400).json({
      mensaje: 'Los campos numero_cuenta, correo_institucional y contrasena son obligatorios.',
    });
    return;
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const hashContrasena = await bcrypt.hash(String(contrasena), salt);
    const rolFinal = resolverIdRol(id_rol ?? rol ?? area, String(numero_cuenta));

    const { rows } = await pool.query(
      `INSERT INTO Usuario (numero_cuenta, correo_institucional, contrasena, id_rol, activo)
       VALUES ($1, $2, $3, $4, TRUE)
       RETURNING id_usuario, numero_cuenta, correo_institucional, id_rol, activo;`,
      [String(numero_cuenta).trim(), String(correo_institucional).trim().toLowerCase(), hashContrasena, rolFinal]
    );

    res.status(201).json(rows[0]);
  } catch (error: any) {
    if (error?.code === '23505') {
      res.status(409).json({
        mensaje: 'Ya existe un usuario con ese número de cuenta o correo institucional.',
      });
      return;
    }
    console.error('Error al crear usuario:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor al crear el usuario.' });
  }
};

/**
 * PATCH /api/admin/usuarios/:id/activo
 * Recibe id por params y activo por body. UPDATE Usuario SET activo = $1 WHERE id_usuario = $2;
 */
export const toggleUsuarioActivo = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = Number(req.params.id);
  const { activo } = req.body ?? {};

  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ mensaje: 'El id del usuario no es válido.' });
    return;
  }

  if (typeof activo !== 'boolean') {
    res.status(400).json({ mensaje: 'El campo activo (boolean) es obligatorio en el body.' });
    return;
  }

  try {
    const checkUser = await pool.query(
      'SELECT numero_cuenta FROM Usuario WHERE id_usuario = $1 LIMIT 1;',
      [id]
    );

    if (checkUser.rowCount === 0) {
      res.status(404).json({ mensaje: 'Usuario no encontrado.' });
      return;
    }

    if (checkUser.rows[0].numero_cuenta === 'ADMIN001') {
      res.status(403).json({
        mensaje:
          'Violación de seguridad: No se puede desactivar la cuenta del administrador principal del sistema.',
      });
      return;
    }

    const { rows, rowCount } = await pool.query(
      `UPDATE Usuario
       SET activo = $1
       WHERE id_usuario = $2
       RETURNING id_usuario, numero_cuenta, correo_institucional, id_rol, activo;`,
      [activo, id]
    );

    if (rowCount === 0) {
      res.status(404).json({ mensaje: 'Usuario no encontrado.' });
      return;
    }

    res.status(200).json(rows[0]);
  } catch (error) {
    console.error('Error al actualizar estado del usuario:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor al actualizar el estado del usuario.' });
  }
};

// ============================================================================
// 2. CATÁLOGO DE DOCENTES (Docente y Usuario)
// ============================================================================

/**
 * GET /api/admin/docentes
 * INNER JOIN entre Docente y Usuario para devolver: id_docente, id_usuario,
 * nombre completo, departamento y estado activo del usuario.
 */
export const listarDocentesAdmin = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { rows } = await pool.query(
      `SELECT d.id_docente,
              d.id_usuario,
              d.nombre,
              d.apellido,
              (d.nombre || ' ' || d.apellido) AS nombre_completo,
              d.departamento,
              u.numero_cuenta,
              u.correo_institucional,
              u.activo
       FROM Docente d
       INNER JOIN Usuario u ON u.id_usuario = d.id_usuario
       ORDER BY d.id_docente ASC;`
    );

    res.status(200).json(rows);
  } catch (error) {
    console.error('Error al listar docentes para administración:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor al listar docentes.' });
  }
};

/**
 * POST /api/admin/docentes
 * Recibe datos, verifica si el usuario existe o lo crea, y luego hace INSERT INTO Docente.
 */
export const crearDocente = async (req: AuthRequest, res: Response): Promise<void> => {
  const {
    id_usuario,
    numero_cuenta,
    correo_institucional,
    correo,
    contrasena,
    nombre,
    apellido,
    nombre_completo,
    departamento,
    area,
  } = req.body ?? {};

  const deptoFinal = String(departamento || area || '').trim();
  const nombreRaw = String(nombre_completo || nombre || '').trim();
  let nombreFinal = String(nombre || '').trim();
  let apellidoFinal = String(apellido || '').trim();

  if (!apellidoFinal && nombreRaw) {
    const partes = nombreRaw.split(/\s+/);
    if (partes.length > 1) {
      nombreFinal = partes[0];
      apellidoFinal = partes.slice(1).join(' ');
    } else {
      nombreFinal = partes[0];
      apellidoFinal = '-';
    }
  }

  if (!nombreFinal || !deptoFinal) {
    res.status(400).json({
      mensaje: 'El nombre del docente y el departamento son obligatorios.',
    });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let usuarioId: number | null = id_usuario ? Number(id_usuario) : null;
    const correoFinal = String(correo_institucional || correo || '').trim().toLowerCase();
    const cuentaFinal = String(numero_cuenta || '').trim();

    // 1. Verificar si el usuario ya existe
    if (usuarioId) {
      const userCheck = await client.query(
        'SELECT id_usuario FROM Usuario WHERE id_usuario = $1 LIMIT 1;',
        [usuarioId]
      );
      if (userCheck.rows.length === 0) {
        usuarioId = null;
      }
    }

    if (!usuarioId && (cuentaFinal || correoFinal)) {
      const userCheck = await client.query(
        `SELECT id_usuario
         FROM Usuario
         WHERE ($1 <> '' AND LOWER(numero_cuenta) = LOWER($1))
            OR ($2 <> '' AND LOWER(correo_institucional) = LOWER($2))
         LIMIT 1;`,
        [cuentaFinal, correoFinal]
      );
      if (userCheck.rows.length > 0) {
        usuarioId = userCheck.rows[0].id_usuario;
      }
    }

    // 2. Si el usuario no existe, crearlo con rol Docente (id_rol = 3)
    if (!usuarioId) {
      const nextSeq = await client.query('SELECT COALESCE(MAX(id_usuario), 0) + 1 AS prox FROM Usuario;');
      const proxNum = nextSeq.rows[0].prox;
      const cuentaGenerada = cuentaFinal || `DOC${String(proxNum).padStart(3, '0')}`;
      const correoGenerado =
        correoFinal || `${cuentaGenerada.toLowerCase()}@escuela.edu`;
      const passwordPlana = contrasena ? String(contrasena) : 'demo123';
      const salt = await bcrypt.genSalt(10);
      const hashContrasena = await bcrypt.hash(passwordPlana, salt);

      const nuevoUsuario = await client.query(
        `INSERT INTO Usuario (numero_cuenta, correo_institucional, contrasena, id_rol, activo)
         VALUES ($1, $2, $3, 3, TRUE)
         RETURNING id_usuario;`,
        [cuentaGenerada, correoGenerado, hashContrasena]
      );
      usuarioId = nuevoUsuario.rows[0].id_usuario;
    }

    // 3. Insertar en Docente
    const docenteInsert = await client.query(
      `INSERT INTO Docente (id_usuario, nombre, apellido, departamento)
       VALUES ($1, $2, $3, $4)
       RETURNING id_docente, id_usuario, nombre, apellido, departamento;`,
      [usuarioId, nombreFinal, apellidoFinal, deptoFinal]
    );

    const usuarioDatos = await client.query(
      `SELECT numero_cuenta, correo_institucional, activo
       FROM Usuario
       WHERE id_usuario = $1;`,
      [usuarioId]
    );

    await client.query('COMMIT');

    const d = docenteInsert.rows[0];
    const u = usuarioDatos.rows[0] ?? {};

    res.status(201).json({
      id_docente: d.id_docente,
      id_usuario: d.id_usuario,
      nombre: d.nombre,
      apellido: d.apellido,
      nombre_completo: `${d.nombre} ${d.apellido}`.trim(),
      departamento: d.departamento,
      numero_cuenta: u.numero_cuenta,
      correo_institucional: u.correo_institucional,
      activo: u.activo ?? true,
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    if (error?.code === '23505') {
      res.status(409).json({
        mensaje: 'El usuario o docente ya se encuentra registrado.',
      });
      return;
    }
    console.error('Error al crear docente:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor al crear el docente.' });
  } finally {
    client.release();
  }
};

// ============================================================================
// 3. CATÁLOGO DE MATERIAS Y CRN (Materia, CRN, CicloEscolar)
// ============================================================================

/**
 * GET /api/admin/materias
 * JOIN múltiple para devolver la lista de CRNs con su nombre de materia,
 * docente asignado (si lo hay) y ciclo escolar.
 */
export const listarMateriasCRN = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { rows } = await pool.query(
      `SELECT c.id_crn,
              c.crn,
              m.id_materia,
              m.clave,
              m.nombre AS nombre_materia,
              m.nombre,
              m.creditos,
              d.id_docente,
              CASE
                WHEN d.id_docente IS NOT NULL THEN (d.nombre || ' ' || d.apellido)
                ELSE NULL
              END AS docente_asignado,
              ce.id_ciclo,
              ce.nombre AS ciclo_escolar
       FROM Materia m
       LEFT JOIN CRN c ON c.id_materia = m.id_materia
       LEFT JOIN Docente d ON d.id_docente = c.id_docente
       LEFT JOIN CicloEscolar ce ON ce.id_ciclo = c.id_ciclo
       ORDER BY c.crn ASC NULLS LAST, m.id_materia ASC;`
    );

    res.status(200).json(rows);
  } catch (error) {
    console.error('Error al listar materias y CRN:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor al listar materias y CRN.' });
  }
};

/**
 * POST /api/admin/materias
 * Inserta en la tabla Materia (recibiendo clave, nombre, creditos).
 * Si opcionalmente se envía crn e id_docente, también registra la asignación en CRN.
 */
export const crearMateria = async (req: AuthRequest, res: Response): Promise<void> => {
  const { clave, nombre, creditos, crn, id_docente, id_ciclo } = req.body ?? {};

  if (!clave || !nombre || creditos === undefined || creditos === null || creditos === '') {
    res.status(400).json({
      mensaje: 'Los campos clave, nombre y creditos son obligatorios.',
    });
    return;
  }

  const creditosNum = Number(creditos);
  if (Number.isNaN(creditosNum) || creditosNum < 0) {
    res.status(400).json({ mensaje: 'El campo creditos debe ser un número válido.' });
    return;
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO Materia (clave, nombre, creditos)
       VALUES ($1, $2, $3)
       RETURNING id_materia, clave, nombre, creditos;`,
      [String(clave).trim().toUpperCase(), String(nombre).trim(), creditosNum]
    );

    const materiaCreada = rows[0];

    // Si además se proporcionan datos de CRN y docente, se crea la asignación en CRN
    if (crn && id_docente) {
      let cicloId = id_ciclo ? Number(id_ciclo) : null;
      if (!cicloId) {
        const cicloActivo = await pool.query(
          'SELECT id_ciclo FROM CicloEscolar WHERE activo = TRUE ORDER BY id_ciclo DESC LIMIT 1;'
        );
        cicloId = cicloActivo.rows[0]?.id_ciclo ?? 1;
      }

      const crnInsert = await pool.query(
        `INSERT INTO CRN (id_docente, id_materia, id_ciclo, crn)
         VALUES ($1, $2, $3, $4)
         RETURNING id_crn, crn, id_docente, id_ciclo;`,
        [Number(id_docente), materiaCreada.id_materia, cicloId, Number(crn)]
      );

      res.status(201).json({
        ...materiaCreada,
        nombre_materia: materiaCreada.nombre,
        ...crnInsert.rows[0],
      });
      return;
    }

    res.status(201).json({
      ...materiaCreada,
      nombre_materia: materiaCreada.nombre,
    });
  } catch (error: any) {
    if (error?.code === '23505') {
      res.status(409).json({
        mensaje: 'Ya existe una materia con esa clave o CRN.',
      });
      return;
    }
    console.error('Error al crear materia:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor al crear la materia.' });
  }
};

// ============================================================================
// 4. CATÁLOGO DE PREGUNTAS DOCENTES (Pregunta)
// ============================================================================

/**
 * GET /api/admin/preguntas
 * SELECT * FROM Pregunta ORDER BY id_pregunta ASC;
 */
export const listarPreguntas = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { rows } = await pool.query('SELECT * FROM Pregunta ORDER BY id_pregunta ASC;');

    const preguntasNormalizadas = rows.map((r) => ({
      ...r,
      texto: r.texto ?? r.texto_pregunta,
      texto_pregunta: r.texto_pregunta ?? r.texto,
      dimension: r.dimension ?? 'Evaluación Docente',
    }));

    res.status(200).json(preguntasNormalizadas);
  } catch (error) {
    console.error('Error al listar preguntas:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor al listar las preguntas.' });
  }
};

/**
 * POST /api/admin/preguntas
 * INSERT INTO Pregunta (texto_pregunta, dimension) VALUES (...)
 * Con fallback automático al esquema (numero, texto, activa) de sql/carga_inicial.sql.
 */
export const crearPregunta = async (req: AuthRequest, res: Response): Promise<void> => {
  const { texto_pregunta, texto, dimension, categoria, numero } = req.body ?? {};
  const textoFinal = String(texto_pregunta ?? texto ?? '').trim();
  const dimensionFinal = String(dimension ?? categoria ?? 'General').trim();

  if (!textoFinal) {
    res.status(400).json({ mensaje: 'El texto de la pregunta es obligatorio.' });
    return;
  }

  try {
    try {
      const { rows } = await pool.query(
        `INSERT INTO Pregunta (texto_pregunta, dimension)
         VALUES ($1, $2)
         RETURNING *;`,
        [textoFinal, dimensionFinal]
      );
      const fila = rows[0];
      res.status(201).json({
        ...fila,
        texto: fila.texto ?? fila.texto_pregunta,
        texto_pregunta: fila.texto_pregunta ?? fila.texto,
        dimension: fila.dimension ?? dimensionFinal,
      });
      return;
    } catch (dbErr: any) {
      // Fallback si la tabla Pregunta tiene las columnas (numero, texto, activa) de carga_inicial.sql
      if (dbErr?.code === '42703') {
        const numQuery = await pool.query(
          'SELECT COALESCE(MAX(numero), 0) + 1 AS siguiente FROM Pregunta;'
        );
        const numeroFinal = numero ? Number(numero) : Number(numQuery.rows[0].siguiente);

        const { rows } = await pool.query(
          `INSERT INTO Pregunta (numero, texto, activa)
           VALUES ($1, $2, TRUE)
           RETURNING *;`,
          [numeroFinal, textoFinal]
        );
        const fila = rows[0];
        res.status(201).json({
          ...fila,
          texto: fila.texto,
          texto_pregunta: fila.texto,
          dimension: dimensionFinal,
        });
        return;
      }
      throw dbErr;
    }
  } catch (error: any) {
    if (error?.code === '23505') {
      res.status(409).json({ mensaje: 'Ya existe una pregunta con ese número.' });
      return;
    }
    console.error('Error al crear pregunta:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor al crear la pregunta.' });
  }
};

/**
 * DELETE /api/admin/preguntas/:id
 * DELETE FROM Pregunta WHERE id_pregunta = $1;
 * Maneja errores de llave foránea si la pregunta ya tiene respuestas asociadas.
 */
export const eliminarPregunta = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ mensaje: 'El id de la pregunta no es válido.' });
    return;
  }

  try {
    const { rowCount } = await pool.query(
      'DELETE FROM Pregunta WHERE id_pregunta = $1;',
      [id]
    );

    if (rowCount === 0) {
      res.status(404).json({ mensaje: 'Pregunta no encontrada.' });
      return;
    }

    res.status(200).json({ mensaje: 'Pregunta eliminada correctamente.' });
  } catch (error: any) {
    // 23503 = foreign_key_violation en PostgreSQL
    if (error?.code === '23503') {
      res.status(409).json({
        mensaje:
          'No se puede eliminar la pregunta porque ya cuenta con respuestas registradas en evaluaciones.',
      });
      return;
    }
    console.error('Error al eliminar pregunta:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor al eliminar la pregunta.' });
  }
};

// ============================================================================
// 5. CATÁLOGO DE PERIODOS / CICLOS ESCOLARES (CicloEscolar)
// ============================================================================

/**
 * POST /api/admin/ciclos
 * INSERT INTO CicloEscolar (nombre, fecha_inicio_eval, fecha_cierre_eval, activo)
 */
export const crearCiclo = async (req: AuthRequest, res: Response): Promise<void> => {
  const { nombre, fecha_inicio_eval, fecha_cierre_eval, inicio, fin, activo } = req.body ?? {};

  const fechaInicio = fecha_inicio_eval || inicio;
  const fechaCierre = fecha_cierre_eval || fin;
  const esActivo = Boolean(activo ?? false);

  if (!nombre || !fechaInicio || !fechaCierre) {
    res.status(400).json({
      mensaje: 'Los campos nombre, fecha_inicio_eval y fecha_cierre_eval son obligatorios.',
    });
    return;
  }

  try {
    if (esActivo) {
      await pool.query('UPDATE CicloEscolar SET activo = FALSE;');
    }

    const { rows } = await pool.query(
      `INSERT INTO CicloEscolar (nombre, fecha_inicio_eval, fecha_cierre_eval, activo)
       VALUES ($1, $2, $3, $4)
       RETURNING id_ciclo, nombre, fecha_inicio_eval, fecha_cierre_eval, activo;`,
      [String(nombre).trim(), fechaInicio, fechaCierre, esActivo]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Error al crear ciclo escolar:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor al crear el ciclo escolar.' });
  }
};

/**
 * PATCH /api/admin/ciclos/:id/activo
 * Al marcar un ciclo como activo = TRUE, primero hace UPDATE CicloEscolar SET activo = FALSE;
 * a toda la tabla para garantizar que solo exista un ciclo activo a la vez, y luego actualiza el específico.
 */
export const toggleCicloActivo = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = Number(req.params.id);
  const activo = req.body?.activo !== undefined ? Boolean(req.body.activo) : true;

  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ mensaje: 'El id del ciclo escolar no es válido.' });
    return;
  }

  try {
    if (activo) {
      await pool.query('UPDATE CicloEscolar SET activo = FALSE;');
    }

    const { rows, rowCount } = await pool.query(
      `UPDATE CicloEscolar
       SET activo = $1
       WHERE id_ciclo = $2
       RETURNING id_ciclo, nombre, fecha_inicio_eval, fecha_cierre_eval, activo;`,
      [activo, id]
    );

    if (rowCount === 0) {
      res.status(404).json({ mensaje: 'Ciclo escolar no encontrado.' });
      return;
    }

    res.status(200).json(rows[0]);
  } catch (error) {
    console.error('Error al actualizar el estado del ciclo escolar:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor al actualizar el ciclo escolar.' });
  }
};
