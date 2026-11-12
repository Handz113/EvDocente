import { useState, useEffect, useCallback, type FormEvent, type ReactNode } from 'react'
import Layout from '../../../components/Layout'
import ParticipacionAlumnos from '../../../components/ParticipacionAlumnos'
import GestionInstalaciones from '../../../components/GestionInstalaciones'
import ResultadosInstalaciones from '../../../components/ResultadosInstalaciones'
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
]

interface UsuarioFila extends UsuarioAdmin {
  contrasena?: string
}

interface MateriaFila extends MateriaAdmin {
  clave_unica: string
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

  return (
    <Layout
      titulo="Administración"
      tono="personal"
      pestañas={pestañas}
      activa={activa}
      onPestaña={(id) => {
        setActiva(id)
        setErrorApi('')
        setMensajeInfo('')
      }}
    >
      {errorApi && (
        <div className="mb-4 rounded-xl bg-[#fee2e2] border border-[#fecaca] px-4 py-3 text-xs font-semibold text-[#dc2626]">
          {errorApi}
        </div>
      )}

      {mensajeInfo && (
        <div className="mb-4 rounded-xl bg-[#e3f4f2] border border-[#99f6e4] px-4 py-3 text-xs font-semibold text-[#0f766e]">
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
                <span className="px-2.5 py-0.5 rounded-full bg-[#e3f4f2] text-[#0f766e] text-xs font-semibold">
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
                    v ? 'text-[#15803d]' : 'text-[#dc2626]'
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
          extra={(f) => {
            const esAdminPrincipal = f.numero_cuenta === 'ADMIN001'
            return (
              <button
                disabled={esAdminPrincipal}
                title={
                  esAdminPrincipal
                    ? 'Violación de seguridad: No se puede desactivar la cuenta del administrador principal del sistema.'
                    : undefined
                }
                className={`px-2.5 py-1 rounded-lg border border-[#e2e6ef] text-xs font-semibold text-[#5d6678] ${
                  esAdminPrincipal
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-[#f4f6fb] cursor-pointer'
                }`}
                onClick={() => handleToggleUsuario(f)}
              >
                {f.activo ? 'Desactivar' : 'Activar'}
              </button>
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
                    v ? 'text-[#15803d]' : 'text-[#dc2626]'
                  }`}
                >
                  {v ? 'Activo' : 'Inactivo'}
                </span>
              ),
            },
          ]}
          filas={listaDocentes}
          clave="id_docente"
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
                  <span className="px-2.5 py-0.5 rounded-full bg-[#e7f6ec] text-[#15803d] text-xs font-semibold">
                    Activo
                  </span>
                ) : (
                  <span className="text-[#5d6678] text-xs">Cerrado</span>
                ),
            },
          ]}
          filas={periodos}
          clave="id_ciclo"
          onAgregar={handleAgregarPeriodo}
          extra={(f) =>
            !f.activo && (
              <button
                className="px-2.5 py-1 rounded-lg border border-[#e2e6ef] text-xs font-semibold text-[#0f766e] hover:bg-[#e3f4f2] cursor-pointer"
                onClick={() => handleHabilitarPeriodo(f.id_ciclo)}
              >
                Habilitar
              </button>
            )
          }
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

  const visibles = filas.filter((f) =>
    JSON.stringify(f).toLowerCase().includes(busqueda.toLowerCase())
  )

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
    <div className="bg-white border border-[#e2e6ef] rounded-2xl p-6 shadow-xs mb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <h2 className="text-lg font-bold text-[#1c2333]">{titulo}</h2>
        <div className="flex gap-2 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Buscar registros..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="px-3.5 py-2 rounded-xl border border-[#e2e6ef] bg-white text-xs w-full sm:w-56 focus:border-[#0f766e]"
          />
          <button
            onClick={() => {
              if (!abierto) setNuevo(vacio)
              setAbierto(!abierto)
              setError('')
            }}
            className="px-4 py-2 rounded-xl bg-[#0f766e] hover:bg-[#0c5c56] text-white text-xs font-semibold shadow-xs transition-colors whitespace-nowrap cursor-pointer"
          >
            {abierto ? 'Cancelar' : '+ Agregar'}
          </button>
        </div>
      </div>

      {nota && <p className="text-xs text-[#5d6678] mb-4">{nota}</p>}

      {abierto && (
        <form
          onSubmit={guardar}
          className="p-4 rounded-xl border border-[#e2e6ef] bg-[#f4f6fb] mb-6"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {editables.map((c) => (
              <div key={c.id} className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-[#1c2333]">
                  {c.nombre}
                </label>
                {c.opciones ? (
                  <select
                    value={String(nuevo[c.id] ?? '')}
                    onChange={(e) =>
                      setNuevo({ ...nuevo, [c.id]: e.target.value })
                    }
                    className="px-3 py-2 rounded-xl border border-[#e2e6ef] bg-white text-xs"
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
                    className="px-3 py-2 rounded-xl border border-[#e2e6ef] bg-white text-xs"
                  />
                )}
              </div>
            ))}
          </div>

          {error && <p className="text-xs text-[#dc2626] font-semibold mt-3">{error}</p>}

          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#0f766e] hover:bg-[#0c5c56] text-white text-xs font-semibold shadow-xs cursor-pointer"
            >
              Guardar Registro
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#e2e6ef] text-[#5d6678] uppercase tracking-wider">
              {columnasTabla.map((c) => (
                <th key={c.id} className="py-3 px-3 font-semibold">
                  {c.nombre}
                </th>
              ))}
              <th className="py-3 px-3 text-right font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e2e6ef]">
            {visibles.map((f) => (
              <tr key={String(f[clave])} className="hover:bg-[#f4f6fb]/50 transition-colors">
                {columnasTabla.map((c) => (
                  <td key={c.id} className="py-3 px-3 text-[#1c2333]">
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
                      className="px-2.5 py-1 rounded-lg border border-[#fee2e2] text-xs font-semibold text-[#dc2626] hover:bg-[#fee2e2] cursor-pointer"
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
                  className="py-8 text-center text-[#5d6678]"
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
