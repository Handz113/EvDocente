import { useState, useEffect, useCallback, type FormEvent, type ReactNode } from 'react'
import Layout from '../../../components/Layout'
import ParticipacionAlumnos from '../../../components/ParticipacionAlumnos'
import GestionInstalaciones from '../../../components/GestionInstalaciones'
import ResultadosInstalaciones from '../../../components/ResultadosInstalaciones'
import BitacoraAuditoria from '../../../components/BitacoraAuditoria'
import { useAuth } from '../../../context/AuthContext'
import {
  obtenerUsuariosAPI,
  crearUsuarioAPI,
  toggleUsuarioAPI,
  obtenerDocentesAPI,
  crearDocenteAPI,
  eliminarDocenteAPI,
  obtenerMateriasAPI,
  crearMateriaAPI,
  eliminarMateriaAPI,
  obtenerPreguntasAPI,
  crearPreguntaAPI,
  eliminarPreguntaAPI,
  obtenerCiclosAPI,
  crearCicloAPI,
  toggleCicloAPI,
  editarUsuarioAPI,
  editarPeriodoAPI,
  type EditarUsuarioPayload,
  type UsuarioAdmin,
  type DocenteAdmin,
  type MateriaAdmin,
  type PreguntaAdmin,
  type PeriodoAdmin,
} from '../../../services/adminService'

const pestañas = [
  { id: 'usuarios', nombre: 'Usuarios' },
  { id: 'docentes', nombre: 'Docentes' },
  { id: 'materias', nombre: 'Materias / CRN' },
  { id: 'preguntas', nombre: 'Preguntas' },
  { id: 'periodos', nombre: 'Periodos' },
  { id: 'participacion', nombre: 'Participación' },
  { id: 'instalaciones', nombre: 'Talleres y Labs' },
  { id: 'bitacora', nombre: 'Bitácora' },
]

interface UsuarioFila extends UsuarioAdmin {
  contrasena?: string
}

interface MateriaFila extends MateriaAdmin {
  clave_unica: string
}

function normalizarTexto(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export default function PanelAdministracion() {
  const { usuario } = useAuth()
  const token = usuario?.token || ''

  const [activa, setActiva] = useState('usuarios')
  const [errorApi, setErrorApi] = useState('')
  const [mensajeInfo, setMensajeInfo] = useState('')

  const [usuarios, setUsuarios] = useState<UsuarioFila[]>([])
  const [listaDocentes, setListaDocentes] = useState<DocenteAdmin[]>([])
  const [listaMaterias, setListaMaterias] = useState<MateriaFila[]>([])
  const [listaPreguntas, setListaPreguntas] = useState<PreguntaAdmin[]>([])
  const [periodos, setPeriodos] = useState<PeriodoAdmin[]>([])
  // Registro que se está editando (null = formulario de edición cerrado)
  const [usuarioEditando, setUsuarioEditando] = useState<UsuarioFila | null>(null)
  const [periodoEditando, setPeriodoEditando] = useState<PeriodoAdmin | null>(null)
  const [mostrarTodosDocentes, setMostrarTodosDocentes] = useState(false)

  const cargarUsuarios = useCallback(async () => {
    if (!token) return
    try {
      const data = await obtenerUsuariosAPI(token)
      setUsuarios(data)
    } catch (err) {
      setErrorApi((err as Error).message)
    }
  }, [token])

  const cargarDocentes = useCallback(async () => {
    if (!token) return
    try {
      const data = await obtenerDocentesAPI(token)
      setListaDocentes(data)
    } catch (err) {
      setErrorApi((err as Error).message)
    }
  }, [token])

  const cargarMaterias = useCallback(async () => {
    if (!token) return
    try {
      const data = await obtenerMateriasAPI(token)
      setListaMaterias(
        data.map((m) => ({
          ...m,
          clave_unica: m.id_crn ? `crn-${m.id_crn}` : `mat-${m.id_materia}`,
        }))
      )
    } catch (err) {
      setErrorApi((err as Error).message)
    }
  }, [token])

  const cargarPreguntas = useCallback(async () => {
    if (!token) return
    try {
      const data = await obtenerPreguntasAPI(token)
      setListaPreguntas(data)
    } catch (err) {
      setErrorApi((err as Error).message)
    }
  }, [token])

  const cargarPeriodos = useCallback(async () => {
    if (!token) return
    try {
      const data = await obtenerCiclosAPI(token)
      setPeriodos(
        data.map((p) => ({
          ...p,
          fecha_inicio_eval: p.fecha_inicio_eval ? String(p.fecha_inicio_eval).slice(0, 10) : '',
          fecha_cierre_eval: p.fecha_cierre_eval ? String(p.fecha_cierre_eval).slice(0, 10) : '',
        }))
      )
    } catch (err) {
      setErrorApi((err as Error).message)
    }
  }, [token])

  useEffect(() => {
    cargarUsuarios()
    cargarDocentes()
    cargarMaterias()
    cargarPreguntas()
    cargarPeriodos()
  }, [cargarUsuarios, cargarDocentes, cargarMaterias, cargarPreguntas, cargarPeriodos])

  const handleAgregarUsuario = async (nuevo: Partial<UsuarioFila>) => {
    setErrorApi('')
    setMensajeInfo('')
    try {
      await crearUsuarioAPI(
        {
          numero_cuenta: String(nuevo.numero_cuenta || '').trim(),
          correo_institucional: String(nuevo.correo_institucional || '').trim(),
          contrasena: String(nuevo.contrasena || 'demo123'),
          rol: String(nuevo.rol || 'Docente'),
        },
        token
      )
      await cargarUsuarios()
    } catch (err) {
      setErrorApi((err as Error).message)
    }
  }

  const handleToggleUsuario = async (u: UsuarioFila) => {
    if (u.numero_cuenta === 'ADMIN001') return
    setErrorApi('')
    setMensajeInfo('')
    try {
      await toggleUsuarioAPI(u.id_usuario, !u.activo, token)
      await cargarUsuarios()
      await cargarDocentes()
    } catch (err) {
      setErrorApi((err as Error).message)
    }
  }

  const handleAgregarDocente = async (nuevo: Partial<DocenteAdmin>) => {
    setErrorApi('')
    setMensajeInfo('')
    try {
      const nombreCompleto = String(nuevo.nombre_completo || nuevo.nombre || '').trim()
      await crearDocenteAPI(
        {
          numero_cuenta: String(nuevo.numero_cuenta || '').trim() || undefined,
          correo_institucional: String(nuevo.correo_institucional || '').trim() || undefined,
          nombre: nombreCompleto,
          nombre_completo: nombreCompleto,
          departamento: String(nuevo.departamento || '').trim(),
        },
        token
      )
      await cargarDocentes()
      await cargarUsuarios()
    } catch (err) {
      setErrorApi((err as Error).message)
    }
  }

  const handleEliminarDocente = async (docente: DocenteAdmin) => {
    setErrorApi('')
    setMensajeInfo('')
    try {
      const res = await eliminarDocenteAPI(docente.id_docente, token)
      if (res.bajaLogica) {
        setMensajeInfo(res.mensaje)
      }
      await cargarDocentes()
      await cargarUsuarios()
    } catch (err) {
      setErrorApi((err as Error).message)
    }
  }

  const handleAgregarMateria = async (nuevo: Partial<MateriaFila>) => {
    setErrorApi('')
    setMensajeInfo('')
    try {
      await crearMateriaAPI(
        {
          clave: String(nuevo.clave || '').trim(),
          nombre: String(nuevo.nombre || nuevo.nombre_materia || '').trim(),
          creditos: Number(nuevo.creditos ?? 8),
          crn: nuevo.crn ? Number(nuevo.crn) : undefined,
          id_docente: nuevo.id_docente ? Number(nuevo.id_docente) : undefined,
        },
        token
      )
      await cargarMaterias()
    } catch (err) {
      setErrorApi((err as Error).message)
    }
  }

  const handleEliminarMateria = async (materia: MateriaFila) => {
    setErrorApi('')
    setMensajeInfo('')
    try {
      const idObjetivo = materia.id_crn ?? materia.crn ?? materia.id_materia
      await eliminarMateriaAPI(idObjetivo, token)
      await cargarMaterias()
    } catch (err) {
      setErrorApi((err as Error).message)
    }
  }

  const handleAgregarPregunta = async (nuevo: Partial<PreguntaAdmin>) => {
    setErrorApi('')
    setMensajeInfo('')
    try {
      const texto = String(nuevo.texto_pregunta || nuevo.texto || '').trim()
      const dimension = String(nuevo.dimension || 'Evaluación Docente').trim()
      await crearPreguntaAPI(
        {
          texto_pregunta: texto,
          texto,
          dimension,
        },
        token
      )
      await cargarPreguntas()
    } catch (err) {
      setErrorApi((err as Error).message)
    }
  }

  const handleEliminarPregunta = async (pregunta: PreguntaAdmin) => {
    setErrorApi('')
    setMensajeInfo('')
    try {
      await eliminarPreguntaAPI(pregunta.id_pregunta, token)
      await cargarPreguntas()
    } catch (err) {
      setErrorApi((err as Error).message)
    }
  }

  const handleAgregarPeriodo = async (nuevo: Partial<PeriodoAdmin>) => {
    setErrorApi('')
    setMensajeInfo('')
    try {
      await crearCicloAPI(
        {
          nombre: String(nuevo.nombre || '').trim(),
          fecha_inicio_eval: String(nuevo.fecha_inicio_eval || ''),
          fecha_cierre_eval: String(nuevo.fecha_cierre_eval || ''),
          activo: false,
        },
        token
      )
      await cargarPeriodos()
    } catch (err) {
      setErrorApi((err as Error).message)
    }
  }

  const handleHabilitarPeriodo = async (idCiclo: number) => {
    setErrorApi('')
    setMensajeInfo('')
    try {
      await toggleCicloAPI(idCiclo, true, token)
      await cargarPeriodos()
    } catch (err) {
      setErrorApi((err as Error).message)
    }
  }

  const handleEditarUsuario = async (valores: Record<string, string>): Promise<boolean> => {
    if (!usuarioEditando) return false
    setErrorApi('')
    setMensajeInfo('')

    // Solo se envían los campos que cambiaron
    const cambios: EditarUsuarioPayload = {}
    const cuenta = valores.numero_cuenta.trim()
    const correo = valores.correo_institucional.trim()
    if (usuarioEditando.numero_cuenta !== 'ADMIN001' && cuenta !== usuarioEditando.numero_cuenta) {
      cambios.numero_cuenta = cuenta
    }
    if (correo.toLowerCase() !== String(usuarioEditando.correo_institucional || '').toLowerCase()) {
      cambios.correo_institucional = correo
    }
    if (valores.contrasena) cambios.contrasena = valores.contrasena

    if (Object.keys(cambios).length === 0) {
      setMensajeInfo('No hay cambios por guardar.')
      setUsuarioEditando(null)
      return true
    }

    try {
      const actualizado = await editarUsuarioAPI(usuarioEditando.id_usuario, cambios, token)
      setMensajeInfo(`Usuario ${actualizado.numero_cuenta} actualizado correctamente.`)
      setUsuarioEditando(null)
      await cargarUsuarios()
      await cargarDocentes()
      return true
    } catch (err) {
      setErrorApi((err as Error).message)
      return false
    }
  }

  const handleEditarPeriodo = async (valores: Record<string, string>): Promise<boolean> => {
    if (!periodoEditando) return false
    setErrorApi('')
    setMensajeInfo('')
    try {
      const actualizado = await editarPeriodoAPI(
        periodoEditando.id_ciclo,
        {
          nombre: valores.nombre.trim(),
          fecha_inicio_eval: valores.fecha_inicio_eval,
          fecha_cierre_eval: valores.fecha_cierre_eval,
        },
        token
      )
      setMensajeInfo(`Periodo ${actualizado.nombre} actualizado correctamente.`)
      setPeriodoEditando(null)
      await cargarPeriodos()
      return true
    } catch (err) {
      setErrorApi((err as Error).message)
      return false
    }
  }

  const botonEditar = (onClick: () => void) => (
    <button
      className="px-2.5 py-1 rounded-lg border border-[#e2e6ef] dark:border-slate-700 text-xs font-semibold text-[#5d6678] dark:text-slate-300 hover:bg-[#f4f6fb] dark:hover:bg-slate-800 cursor-pointer"
      onClick={onClick}
    >
      Editar
    </button>
  )

  return (
    <Layout
      titulo="Administración"
      tono="personal"
      pestañas={pestañas}
      activa={activa}
      onPestaña={(id) => {
        setActiva(id)
        setUsuarioEditando(null)
        setPeriodoEditando(null)
        setErrorApi('')
        setMensajeInfo('')
      }}
    >
      {errorApi && (
        <div className="mb-4 rounded-xl bg-[#fee2e2] dark:bg-red-950/50 border border-[#fecaca] dark:border-red-800/60 px-4 py-3 text-xs font-semibold text-[#dc2626] dark:text-red-300">
          {errorApi}
        </div>
      )}

      {mensajeInfo && (
        <div className="mb-4 rounded-xl bg-[#e3f4f2] dark:bg-teal-950/50 border border-[#99f6e4] dark:border-teal-800/60 px-4 py-3 text-xs font-semibold text-[#0f766e] dark:text-teal-300">
          {mensajeInfo}
        </div>
      )}

      {activa === 'usuarios' && (
        <Catalogo<UsuarioFila>
          titulo="Usuarios de Gestión y Personal"
          columnas={[
            { id: 'numero_cuenta', nombre: 'Cuenta' },
            { id: 'correo_institucional', nombre: 'Correo Institucional', tipo: 'email' },
            {
              id: 'rol',
              nombre: 'Perfil / Rol',
              opciones: ['Docente', 'Coordinador', 'Administrador', 'Alumno'],
              mostrar: (v) => (
                <span className="px-2.5 py-0.5 rounded-full bg-[#e3f4f2] dark:bg-teal-500/15 text-[#0f766e] dark:text-teal-300 text-xs font-semibold">
                  {String(v || 'Usuario')}
                </span>
              ),
            },
            {
              id: 'contrasena',
              nombre: 'Contraseña Inicial',
              tipo: 'password',
              ocultarEnTabla: true,
            },
            {
              id: 'activo',
              nombre: 'Estado',
              soloLectura: true,
              mostrar: (v) => (
                <span
                  className={`font-semibold text-xs ${
                    v ? 'text-[#15803d] dark:text-emerald-400' : 'text-[#dc2626] dark:text-red-400'
                  }`}
                >
                  {v ? 'Activo' : 'Inactivo'}
                </span>
              ),
            },
          ]}
          filas={usuarios}
          clave="numero_cuenta"
          onAgregar={handleAgregarUsuario}
          encabezado={
            usuarioEditando && (
              <FormularioEdicion
                key={usuarioEditando.id_usuario}
                titulo={`Editar usuario ${usuarioEditando.numero_cuenta}`}
                campos={[
                  {
                    id: 'numero_cuenta',
                    etiqueta: 'Cuenta',
                    bloqueado: usuarioEditando.numero_cuenta === 'ADMIN001',
                    ayuda:
                      usuarioEditando.numero_cuenta === 'ADMIN001'
                        ? 'La cuenta del administrador principal no se puede cambiar.'
                        : undefined,
                  },
                  { id: 'correo_institucional', etiqueta: 'Correo', tipo: 'email' },
                  {
                    id: 'contrasena',
                    etiqueta: 'Nueva contraseña (opcional)',
                    tipo: 'password',
                    opcional: true,
                    ayuda: 'Déjala vacía para conservar la actual',
                  },
                ]}
                valoresIniciales={{
                  numero_cuenta: usuarioEditando.numero_cuenta,
                  correo_institucional: usuarioEditando.correo_institucional || '',
                  contrasena: '',
                }}
                onCancelar={() => setUsuarioEditando(null)}
                onGuardar={handleEditarUsuario}
              />
            )
          }
          extra={(f) => {
            const esAdminPrincipal = f.numero_cuenta === 'ADMIN001'
            return (
              <>
              {botonEditar(() => {
                setPeriodoEditando(null)
                setUsuarioEditando(f)
              })}
              <button
                disabled={esAdminPrincipal}
                title={
                  esAdminPrincipal
                    ? 'Violación de seguridad: No se puede desactivar la cuenta del administrador principal del sistema.'
                    : undefined
                }
                className={`px-2.5 py-1 rounded-lg border border-[#e2e6ef] dark:border-slate-700 text-xs font-semibold text-[#5d6678] dark:text-slate-300 ${
                  esAdminPrincipal
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-[#f4f6fb] dark:hover:bg-slate-800 cursor-pointer'
                }`}
                onClick={() => handleToggleUsuario(f)}
              >
                {f.activo ? 'Desactivar' : 'Activar'}
              </button>
              </>
            )
          }}
          nota="Nota de seguridad: Los alumnos se autentican mediante credenciales institucionales de matrícula."
        />
      )}

      {activa === 'docentes' && (
        <Catalogo<DocenteAdmin>
          titulo="Catálogo Institucional de Docentes"
          columnas={[
            { id: 'id_docente', nombre: 'ID', soloLectura: true },
            { id: 'numero_cuenta', nombre: 'No. Empleado / Cuenta' },
            { id: 'nombre_completo', nombre: 'Nombre Completo' },
            { id: 'departamento', nombre: 'Departamento' },
            { id: 'correo_institucional', nombre: 'Correo Institucional', tipo: 'email' },
            {
              id: 'activo',
              nombre: 'Estado',
              soloLectura: true,
              mostrar: (v) => (
                <span
                  className={`font-semibold text-xs ${
                    v ? 'text-[#15803d] dark:text-emerald-400' : 'text-[#dc2626] dark:text-red-400'
                  }`}
                >
                  {v ? 'Activo' : 'Inactivo'}
                </span>
              ),
            },
          ]}
          filas={listaDocentes}
          clave="id_docente"
          placeholderBusqueda="Buscar docente, depto. o cuenta..."
          camposBusqueda={[
            'nombre_completo',
            'nombre',
            'apellido',
            'departamento',
            'numero_cuenta',
            'correo_institucional',
          ]}
          limiteColapsado={10}
          mostrarTodos={mostrarTodosDocentes}
          onToggleMostrarTodos={() => setMostrarTodosDocentes((prev) => !prev)}
          onAgregar={handleAgregarDocente}
          onEliminar={handleEliminarDocente}
        />
      )}

      {activa === 'materias' && (
        <Catalogo<MateriaFila>
          titulo="Asignaturas y Cursos (CRN)"
          columnas={[
            {
              id: 'crn',
              nombre: 'CRN',
              tipo: 'number',
              mostrar: (v) => (v ? String(v) : 'Sin CRN'),
            },
            { id: 'clave', nombre: 'Clave' },
            { id: 'nombre', nombre: 'Asignatura' },
            { id: 'creditos', nombre: 'Créditos', tipo: 'number' },
            {
              id: 'id_docente',
              nombre: 'Docente Asignado',
              opciones: listaDocentes.map((d) => String(d.id_docente)),
              mostrar: (v) =>
                listaDocentes.find((d) => String(d.id_docente) === String(v))?.nombre_completo ||
                (v ? String(v) : 'Sin asignar'),
            },
          ]}
          filas={listaMaterias}
          clave="clave_unica"
          onAgregar={handleAgregarMateria}
          onEliminar={handleEliminarMateria}
        />
      )}

      {activa === 'preguntas' && (
        <Catalogo<PreguntaAdmin>
          titulo="Reactivos del Cuestionario Institucional"
          columnas={[
            { id: 'id_pregunta', nombre: 'No.', soloLectura: true },
            { id: 'dimension', nombre: 'Criterio Pedagógico' },
            { id: 'texto_pregunta', nombre: 'Reactivo / Pregunta' },
          ]}
          filas={listaPreguntas}
          clave="id_pregunta"
          onAgregar={handleAgregarPregunta}
          onEliminar={handleEliminarPregunta}
          nota="Las respuestas se califican en escala institucional normalizada (0, 2.5, 5.0, 7.5, 10.0)."
        />
      )}

      {activa === 'periodos' && (
        <Catalogo<PeriodoAdmin>
          titulo="Ciclos Escolares y Periodos de Evaluación"
          columnas={[
            { id: 'id_ciclo', nombre: 'Clave / ID', soloLectura: true },
            { id: 'nombre', nombre: 'Nombre del Ciclo' },
            { id: 'fecha_inicio_eval', nombre: 'Fecha Apertura', tipo: 'date' },
            { id: 'fecha_cierre_eval', nombre: 'Fecha Cierre', tipo: 'date' },
            {
              id: 'activo',
              nombre: 'Estado',
              soloLectura: true,
              mostrar: (v) =>
                v ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-[#e7f6ec] dark:bg-emerald-500/15 text-[#15803d] dark:text-emerald-300 text-xs font-semibold">
                    Activo
                  </span>
                ) : (
                  <span className="text-[#5d6678] dark:text-slate-400 text-xs">Cerrado</span>
                ),
            },
          ]}
          filas={periodos}
          clave="id_ciclo"
          onAgregar={handleAgregarPeriodo}
          encabezado={
            periodoEditando && (
              <FormularioEdicion
                key={periodoEditando.id_ciclo}
                titulo={`Editar periodo ${periodoEditando.nombre}`}
                campos={[
                  { id: 'nombre', etiqueta: 'Nombre' },
                  { id: 'fecha_inicio_eval', etiqueta: 'Fecha Apertura', tipo: 'date' },
                  {
                    id: 'fecha_cierre_eval',
                    etiqueta: 'Fecha Cierre',
                    tipo: 'date',
                    ayuda: 'Después de esta fecha los alumnos ya no pueden evaluar',
                  },
                ]}
                valoresIniciales={{
                  nombre: periodoEditando.nombre,
                  fecha_inicio_eval: periodoEditando.fecha_inicio_eval,
                  fecha_cierre_eval: periodoEditando.fecha_cierre_eval,
                }}
                onCancelar={() => setPeriodoEditando(null)}
                onGuardar={handleEditarPeriodo}
              />
            )
          }
          extra={(f) => (
            <>
              {botonEditar(() => {
                setUsuarioEditando(null)
                setPeriodoEditando(f)
              })}
              {!f.activo && (
                <button
                  className="px-2.5 py-1 rounded-lg border border-[#e2e6ef] dark:border-slate-700 text-xs font-semibold text-[#0f766e] dark:text-teal-400 hover:bg-[#e3f4f2] dark:hover:bg-teal-950/60 cursor-pointer"
                  onClick={() => handleHabilitarPeriodo(f.id_ciclo)}
                >
                  Habilitar
                </button>
              )}
            </>
          )}
          nota="Solo puede haber un ciclo activo simultáneo para capturas de evaluación docente."
        />
      )}

      {/* Datos de la BD: solo lectura, sin agregar/eliminar */}
      {activa === 'participacion' && <ParticipacionAlumnos area="administracion" />}

      {/* Talleres y laboratorios: catálogo en la BD y resultados */}
      {activa === 'instalaciones' && (
        <>
          <GestionInstalaciones />
          <ResultadosInstalaciones area="administracion" />
        </>
      )}

      {/* Bitácora de auditoría: solo lectura e inmutable (HU21) */}
      {activa === 'bitacora' && <BitacoraAuditoria />}
    </Layout>
  )
}

interface ColumnaConfig<T> {
  id: keyof T & string
  nombre: string
  tipo?: string
  opciones?: string[]
  soloLectura?: boolean
  ocultarEnTabla?: boolean
  mostrar?: (valor: any) => ReactNode
}

interface CatalogoProps<T> {
  titulo: string
  columnas: ColumnaConfig<T>[]
  filas: T[]
  clave: keyof T & string
  onAgregar: (item: Partial<T>) => void
  onEliminar?: (item: T) => void
  extra?: (item: T) => ReactNode
  nota?: string
  /** Contenido que se muestra justo arriba de la tabla (p. ej. el formulario de edición) */
  encabezado?: ReactNode
  /** Texto placeholder personalizado del buscador */
  placeholderBusqueda?: string
  /** Campos específicos a evaluar en el buscador (insensible a mayúsculas y acentos) */
  camposBusqueda?: (keyof T & string)[]
  /** Si se define, colapsa el listado inicialmente a N registros tras filtrar */
  limiteColapsado?: number
  /** Estado controlado para expandir/colapsar el listado */
  mostrarTodos?: boolean
  onToggleMostrarTodos?: () => void
}

function Catalogo<T extends Record<string, any>>({
  titulo,
  columnas,
  filas,
  clave,
  onAgregar,
  onEliminar,
  extra,
  nota,
  encabezado,
  placeholderBusqueda = 'Buscar registros...',
  camposBusqueda,
  limiteColapsado,
  mostrarTodos = false,
  onToggleMostrarTodos,
}: CatalogoProps<T>) {
  const editables = columnas.filter((c) => !c.soloLectura)
  const columnasTabla = columnas.filter((c) => !c.ocultarEnTabla)
  const vacio = Object.fromEntries(
    editables.map((c) => [c.id, c.opciones ? c.opciones[0] : ''])
  ) as Partial<T>

  const [nuevo, setNuevo] = useState<Partial<T>>(vacio)
  const [abierto, setAbierto] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [error, setError] = useState('')

  const terminoBusqueda = normalizarTexto(busqueda)

  const filtrados = filas.filter((f) => {
    if (!terminoBusqueda) return true
    if (camposBusqueda && camposBusqueda.length > 0) {
      return camposBusqueda.some((campo) =>
        normalizarTexto(String(f[campo] ?? '')).includes(terminoBusqueda)
      )
    }
    return normalizarTexto(JSON.stringify(f)).includes(terminoBusqueda)
  })

  const colapsable = Boolean(limiteColapsado && limiteColapsado > 0 && onToggleMostrarTodos)
  const visibles =
    colapsable && !mostrarTodos && limiteColapsado
      ? filtrados.slice(0, limiteColapsado)
      : filtrados

  const guardar = (e: FormEvent) => {
    e.preventDefault()
    if (editables.some((c) => !String(nuevo[c.id] ?? '').trim())) {
      setError('Por favor, completa todos los campos requeridos.')
      return
    }

    if (nuevo[clave] !== undefined && String(nuevo[clave]).trim() !== '') {
      if (filas.some((f) => String(f[clave]) === String(nuevo[clave]))) {
        setError('Ya existe un registro con ese identificador.')
        return
      }
    }

    onAgregar(nuevo)
    setNuevo(vacio)
    setAbierto(false)
    setError('')
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-[#e2e6ef] dark:border-slate-800 rounded-2xl p-6 shadow-xs mb-8">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4">
        <div>
          <h2 className="text-lg font-bold text-[#1c2333] dark:text-slate-100">{titulo}</h2>
          {colapsable && filtrados.length > 0 && (
            <p className="text-xs text-[#5d6678] dark:text-slate-400 mt-0.5">
              Mostrando <strong className="text-[#1c2333] dark:text-slate-200">{visibles.length}</strong> de{' '}
              <strong className="text-[#1c2333] dark:text-slate-200">{filtrados.length}</strong> registros
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              aria-label={placeholderBusqueda}
              placeholder={placeholderBusqueda}
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className={`w-full px-3.5 py-2 ${
                busqueda ? 'pr-8' : ''
              } rounded-xl border border-[#e2e6ef] dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-[#1c2333] dark:text-slate-100 placeholder:text-[#5d6678]/70 dark:placeholder:text-slate-500 focus:border-[#0f766e] dark:focus:border-teal-500 focus:outline-none`}
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda('')}
                aria-label="Limpiar búsqueda"
                title="Limpiar búsqueda"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full text-[#5d6678] dark:text-slate-400 hover:text-[#1c2333] dark:hover:text-slate-100 hover:bg-[#f4f6fb] dark:hover:bg-slate-700 text-xs font-bold cursor-pointer"
              >
                ×
              </button>
            )}
          </div>
          {colapsable && limiteColapsado && filtrados.length > limiteColapsado && (
            <button
              type="button"
              onClick={onToggleMostrarTodos}
              className="w-full sm:w-auto px-3.5 py-2 rounded-xl border border-[#0f766e]/30 dark:border-teal-500/40 bg-[#e3f4f2] dark:bg-teal-500/15 hover:bg-[#0f766e] dark:hover:bg-teal-600 text-[#0f766e] dark:text-teal-300 hover:text-white dark:hover:text-white text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
            >
              {mostrarTodos
                ? `Mostrar menos (${limiteColapsado})`
                : `Ver todos (${filtrados.length})`}
            </button>
          )}
          <button
            onClick={() => {
              if (!abierto) setNuevo(vacio)
              setAbierto(!abierto)
              setError('')
            }}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#0f766e] hover:bg-[#0c5c56] dark:bg-teal-600 dark:hover:bg-teal-500 text-white text-xs font-semibold shadow-xs transition-colors whitespace-nowrap cursor-pointer"
          >
            {abierto ? 'Cancelar' : '+ Agregar'}
          </button>
        </div>
      </div>

      {nota && <p className="text-xs text-[#5d6678] dark:text-slate-400 mb-4">{nota}</p>}

      {abierto && (
        <form
          onSubmit={guardar}
          className="p-4 rounded-xl border border-[#e2e6ef] dark:border-slate-700 bg-[#f4f6fb] dark:bg-slate-800/70 mb-6"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {editables.map((c) => (
              <div key={c.id} className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-[#1c2333] dark:text-slate-200">
                  {c.nombre}
                </label>
                {c.opciones ? (
                  <select
                    value={String(nuevo[c.id] ?? '')}
                    onChange={(e) =>
                      setNuevo({ ...nuevo, [c.id]: e.target.value })
                    }
                    className="px-3 py-2 rounded-xl border border-[#e2e6ef] dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-[#1c2333] dark:text-slate-100 focus:border-[#0f766e] dark:focus:border-teal-500"
                  >
                    {c.opciones.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={c.tipo || 'text'}
                    value={String(nuevo[c.id] ?? '')}
                    onChange={(e) =>
                      setNuevo({ ...nuevo, [c.id]: e.target.value })
                    }
                    className="px-3 py-2 rounded-xl border border-[#e2e6ef] dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-[#1c2333] dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-[#0f766e] dark:focus:border-teal-500"
                  />
                )}
              </div>
            ))}
          </div>

          {error && <p className="text-xs text-[#dc2626] dark:text-red-400 font-semibold mt-3">{error}</p>}

          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#0f766e] hover:bg-[#0c5c56] dark:bg-teal-600 dark:hover:bg-teal-500 text-white text-xs font-semibold shadow-xs cursor-pointer"
            >
              Guardar Registro
            </button>
          </div>
        </form>
      )}

      {encabezado}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#e2e6ef] dark:border-slate-800 text-[#5d6678] dark:text-slate-400 uppercase tracking-wider">
              {columnasTabla.map((c) => (
                <th key={c.id} className="py-3 px-3 font-semibold">
                  {c.nombre}
                </th>
              ))}
              <th className="py-3 px-3 text-right font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e2e6ef] dark:divide-slate-800">
            {visibles.map((f) => (
              <tr key={String(f[clave])} className="hover:bg-[#f4f6fb]/50 dark:hover:bg-slate-800/60 transition-colors">
                {columnasTabla.map((c) => (
                  <td key={c.id} className="py-3 px-3 text-[#1c2333] dark:text-slate-200">
                    {c.mostrar ? c.mostrar(f[c.id]) : String(f[c.id] ?? '')}
                  </td>
                ))}
                <td className="py-3 px-3 text-right whitespace-nowrap space-x-2">
                  {extra && extra(f)}
                  {onEliminar && (
                    <button
                      onClick={() =>
                        window.confirm('¿Confirmas eliminar este registro?') &&
                        onEliminar(f)
                      }
                      className="px-2.5 py-1 rounded-lg border border-[#fee2e2] dark:border-red-900/60 text-xs font-semibold text-[#dc2626] dark:text-red-400 hover:bg-[#fee2e2] dark:hover:bg-red-950/60 cursor-pointer"
                    >
                      Eliminar
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {visibles.length === 0 && (
              <tr>
                <td
                  colSpan={columnasTabla.length + 1}
                  className="py-8 text-center text-[#5d6678] dark:text-slate-400"
                >
                  No se encontraron registros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

interface CampoEdicion {
  id: string
  etiqueta: string
  tipo?: string
  bloqueado?: boolean
  opcional?: boolean
  ayuda?: string
}

interface FormularioEdicionProps {
  titulo: string
  campos: CampoEdicion[]
  valoresIniciales: Record<string, string>
  onCancelar: () => void
  /** Devuelve true si se guardó; los errores del backend los muestra el panel con setErrorApi */
  onGuardar: (valores: Record<string, string>) => Promise<boolean>
}

/** Formulario reutilizable para editar un registro existente, con los estilos del panel. */
function FormularioEdicion({
  titulo,
  campos,
  valoresIniciales,
  onCancelar,
  onGuardar,
}: FormularioEdicionProps) {
  const [valores, setValores] = useState<Record<string, string>>(valoresIniciales)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    if (campos.some((c) => !c.opcional && !c.bloqueado && !String(valores[c.id] ?? '').trim())) {
      setError('Por favor, completa todos los campos requeridos.')
      return
    }
    setError('')
    setGuardando(true)
    try {
      await onGuardar(valores)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form onSubmit={enviar} className="p-4 rounded-xl border border-[#e2e6ef] dark:border-slate-700 bg-[#f4f6fb] dark:bg-slate-800/70 mb-6">
      <h3 className="text-sm font-bold text-[#1c2333] dark:text-slate-100 mb-3">{titulo}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {campos.map((c) => (
          <div key={c.id} className="flex flex-col gap-1">
            <label htmlFor={`editar-${c.id}`} className="text-[11px] font-semibold text-[#1c2333] dark:text-slate-200">
              {c.etiqueta}
            </label>
            <input
              id={`editar-${c.id}`}
              type={c.tipo || 'text'}
              value={valores[c.id] ?? ''}
              disabled={c.bloqueado}
              autoComplete={c.tipo === 'password' ? 'new-password' : undefined}
              onChange={(e) => setValores({ ...valores, [c.id]: e.target.value })}
              className={`px-3 py-2 rounded-xl border border-[#e2e6ef] dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-[#1c2333] dark:text-slate-100 focus:border-[#0f766e] dark:focus:border-teal-500 ${
                c.bloqueado ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            />
            {c.ayuda && <p className="text-[11px] text-[#5d6678] dark:text-slate-400">{c.ayuda}</p>}
          </div>
        ))}
      </div>

      {error && <p className="text-xs text-[#dc2626] dark:text-red-400 font-semibold mt-3">{error}</p>}

      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancelar}
          className="px-5 py-2 rounded-xl border border-[#e2e6ef] dark:border-slate-700 bg-white dark:bg-slate-900 text-[#5d6678] dark:text-slate-300 text-xs font-semibold hover:bg-[#f4f6fb] dark:hover:bg-slate-800 cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={guardando}
          className="px-5 py-2 rounded-xl bg-[#0f766e] hover:bg-[#0c5c56] dark:bg-teal-600 dark:hover:bg-teal-500 text-white text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {guardando ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  )
}
