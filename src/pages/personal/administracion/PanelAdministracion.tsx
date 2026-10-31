import { useState, useEffect, type FormEvent, type ReactNode } from 'react'
import Layout from '../../../components/Layout'
import { useAuth } from '../../../context/AuthContext'
import {
  DOCENTES_CATALOGO,
  MATERIAS_CATALOGO,
  PREGUNTAS_INSTITUCIONALES,
  PERIODO_ACTUAL,
  obtenerAlumnosFaltantesAPI,
  type DocenteResumen,
  type MateriaItem,
  type PreguntaItem,
  type PeriodoItem,
} from '../../../services/evaluacionService'

const pestañas = [
  { id: 'usuarios', nombre: 'Usuarios' },
  { id: 'docentes', nombre: 'Docentes' },
  { id: 'materias', nombre: 'Materias / CRN' },
  { id: 'preguntas', nombre: 'Preguntas' },
  { id: 'periodos', nombre: 'Periodos' },
  { id: 'faltantes', nombre: 'Alumnos Faltantes' },
]

interface UsuarioPersonal {
  usuario: string
  nombre: string
  area: string
  activo: boolean
}

interface AlumnoFaltante {
  id: string
  matricula: string
  nombreAlumno: string
  crnFaltante: string
  nombreMateria: string
}

export default function PanelAdministracion() {
  const { usuario } = useAuth()
  const [activa, setActiva] = useState('usuarios')

  const [usuarios, setUsuarios] = useState<UsuarioPersonal[]>([
    { usuario: 'DOC001', nombre: 'Juan Pérez', area: 'Docente', activo: true },
    { usuario: 'COORD001', nombre: 'Coordinación Sistemas', area: 'Coordinación', activo: true },
    { usuario: 'ADMIN001', nombre: 'Administrador del Sistema', area: 'Administración', activo: true },
  ])

  const [listaDocentes, setListaDocentes] = useState<DocenteResumen[]>(DOCENTES_CATALOGO)
  const [listaMaterias, setListaMaterias] = useState<MateriaItem[]>(MATERIAS_CATALOGO)
  const [listaPreguntas, setListaPreguntas] = useState<PreguntaItem[]>(PREGUNTAS_INSTITUCIONALES)
  const [periodos, setPeriodos] = useState<PeriodoItem[]>([
    PERIODO_ACTUAL,
    { id: '2', nombre: 'Ciclo 2026-1', inicio: '2026-02-01', fin: '2026-06-30', activo: false },
  ])

  const [listaFaltantes, setListaFaltantes] = useState<AlumnoFaltante[]>([])
  const [cargandoFaltantes, setCargandoFaltantes] = useState(false)
  const [errorFaltantes, setErrorFaltantes] = useState('')

  useEffect(() => {
    if (activa !== 'faltantes') return

    const cargarFaltantes = async () => {
      const token = usuario?.token
      if (!token) {
        setErrorFaltantes('Inicia sesión con credenciales de Administrador (ADMIN001 / demo123) para sincronizar con la base de datos.')
        return
      }

      setCargandoFaltantes(true)
      setErrorFaltantes('')
      try {
        const data = await obtenerAlumnosFaltantesAPI(token)
        const mapeados: AlumnoFaltante[] = data.faltantes.map((f, idx) => ({
          id: `${f.matricula}-${f.crnFaltante}-${idx}`,
          matricula: f.matricula,
          nombreAlumno: f.nombreAlumno,
          crnFaltante: String(f.crnFaltante),
          nombreMateria: f.nombreMateria,
        }))
        setListaFaltantes(mapeados)
      } catch (err: any) {
        console.error('Error al cargar alumnos faltantes:', err)
        setErrorFaltantes(err.message || 'Error al obtener alumnos faltantes de la base de datos.')
      } finally {
        setCargandoFaltantes(false)
      }
    }

    cargarFaltantes()
  }, [activa, usuario?.token])

  return (
    <Layout
      titulo="Administración"
      tono="personal"
      pestañas={pestañas}
      activa={activa}
      onPestaña={setActiva}
    >
      {activa === 'usuarios' && (
        <Catalogo<UsuarioPersonal>
          titulo="Usuarios de Gestión y Personal"
          columnas={[
            { id: 'usuario', nombre: 'Cuenta' },
            { id: 'nombre', nombre: 'Nombre Completo' },
            {
              id: 'area',
              nombre: 'Perfil / Rol',
              opciones: ['Docente', 'Coordinación', 'Administración'],
              mostrar: (v) => (
                <span className="px-2.5 py-0.5 rounded-full bg-[#e3f4f2] text-[#0f766e] text-xs font-semibold">
                  {String(v)}
                </span>
              ),
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
          clave="usuario"
          onAgregar={(f) => setUsuarios([...usuarios, { ...(f as UsuarioPersonal), activo: true }])}
          extra={(f) => (
            <button
              className="px-2.5 py-1 rounded-lg border border-[#e2e6ef] text-xs font-semibold text-[#5d6678] hover:bg-[#f4f6fb] cursor-pointer"
              onClick={() =>
                setUsuarios(
                  usuarios.map((u) =>
                    u.usuario === f.usuario ? { ...u, activo: !u.activo } : u
                  )
                )
              }
            >
              {f.activo ? 'Desactivar' : 'Activar'}
            </button>
          )}
          nota="Nota de seguridad: Los alumnos se autentican mediante credenciales institucionales de matrícula."
        />
      )}

      {activa === 'docentes' && (
        <Catalogo<DocenteResumen>
          titulo="Catálogo Institucional de Docentes"
          columnas={[
            { id: 'id', nombre: 'No. Empleado' },
            { id: 'nombre', nombre: 'Nombre' },
            { id: 'area', nombre: 'Departamento' },
            { id: 'correo', nombre: 'Correo Institucional' },
          ]}
          filas={listaDocentes}
          clave="id"
          onAgregar={(f) => setListaDocentes([...listaDocentes, f as DocenteResumen])}
          onEliminar={(f) => setListaDocentes(listaDocentes.filter((d) => d.id !== f.id))}
        />
      )}

      {activa === 'materias' && (
        <Catalogo<MateriaItem>
          titulo="Asignaturas y Cursos (CRN)"
          columnas={[
            { id: 'crn', nombre: 'CRN' },
            { id: 'clave', nombre: 'Clave' },
            { id: 'nombre', nombre: 'Asignatura' },
            { id: 'grupo', nombre: 'Grupo' },
            {
              id: 'docenteId',
              nombre: 'Docente Asignado',
              opciones: listaDocentes.map((d) => d.id),
              mostrar: (v) =>
                listaDocentes.find((d) => d.id === v)?.nombre || String(v),
            },
          ]}
          filas={listaMaterias}
          clave="crn"
          onAgregar={(f) => setListaMaterias([...listaMaterias, f as MateriaItem])}
          onEliminar={(f) => setListaMaterias(listaMaterias.filter((m) => m.crn !== f.crn))}
        />
      )}

      {activa === 'preguntas' && (
        <Catalogo<PreguntaItem>
          titulo="Reactivos del Cuestionario Institucional"
          columnas={[
            { id: 'categoria', nombre: 'Criterio Pedagógico' },
            { id: 'texto', nombre: 'Reactivo / Pregunta' },
          ]}
          filas={listaPreguntas}
          clave="id"
          onAgregar={(f) =>
            setListaPreguntas([
              ...listaPreguntas,
              { ...(f as PreguntaItem), id: Date.now() },
            ])
          }
          onEliminar={(f) =>
            setListaPreguntas(listaPreguntas.filter((p) => p.id !== f.id))
          }
          nota="Las respuestas se califican en escala institucional normalizada (0, 2.5, 5.0, 7.5, 10.0)."
        />
      )}

      {activa === 'periodos' && (
        <Catalogo<PeriodoItem>
          titulo="Ciclos Escolares y Periodos de Evaluación"
          columnas={[
            { id: 'id', nombre: 'Clave / ID' },
            { id: 'nombre', nombre: 'Nombre del Ciclo' },
            { id: 'inicio', nombre: 'Fecha Apertura', tipo: 'date' },
            { id: 'fin', nombre: 'Fecha Cierre', tipo: 'date' },
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
          clave="id"
          onAgregar={(f) =>
            setPeriodos([...periodos, { ...(f as PeriodoItem), activo: false }])
          }
          extra={(f) =>
            !f.activo && (
              <button
                className="px-2.5 py-1 rounded-lg border border-[#e2e6ef] text-xs font-semibold text-[#0f766e] hover:bg-[#e3f4f2] cursor-pointer"
                onClick={() =>
                  setPeriodos(
                    periodos.map((p) => ({ ...p, activo: p.id === f.id }))
                  )
                }
              >
                Habilitar
              </button>
            )
          }
          nota="Solo puede haber un ciclo activo simultáneo para capturas de evaluación docente."
        />
      )}

      {activa === 'faltantes' && (
        <div>
          {errorFaltantes && (
            <div className="p-3.5 mb-4 rounded-xl bg-[#fee2e2] border border-[#fecaca] text-[#dc2626] text-xs font-semibold">
              {errorFaltantes}
            </div>
          )}
          {cargandoFaltantes && listaFaltantes.length === 0 ? (
            <div className="bg-white border border-[#e2e6ef] rounded-2xl p-8 text-center text-xs text-[#5d6678] shadow-xs mb-8">
              Cargando alumnos faltantes desde la base de datos...
            </div>
          ) : (
            <Catalogo<AlumnoFaltante>
              titulo="Alumnos con Evaluaciones Pendientes (Base de Datos Real)"
              columnas={[
                { id: 'matricula', nombre: 'Matrícula' },
                { id: 'nombreAlumno', nombre: 'Nombre del Alumno' },
                {
                  id: 'crnFaltante',
                  nombre: 'CRN Faltante',
                  mostrar: (v) => (
                    <span className="px-2.5 py-0.5 rounded-full bg-[#fef3c7] text-[#b45309] text-xs font-semibold">
                      {String(v)}
                    </span>
                  ),
                },
                { id: 'nombreMateria', nombre: 'Materia' },
              ]}
              filas={listaFaltantes}
              clave="id"
              onAgregar={(f) =>
                setListaFaltantes([
                  ...listaFaltantes,
                  { ...(f as AlumnoFaltante), id: String(Date.now()) },
                ])
              }
              onEliminar={(f) =>
                setListaFaltantes(listaFaltantes.filter((item) => item.id !== f.id))
              }
              nota="Datos en tiempo real desde PostgreSQL: Lista de alumnos inscritos en asignaturas del ciclo escolar activo que aún no registran evaluación docente."
            />
          )}
        </div>
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

    if (clave !== 'id' || nuevo.id) {
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
            onClick={() => setAbierto(!abierto)}
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
              {columnas.map((c) => (
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
                {columnas.map((c) => (
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
                  colSpan={columnas.length + 1}
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
