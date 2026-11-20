import { useState, useEffect, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from '../router'
import { ErrorAPI } from '../services/evaluacionService'
import {
  DIMENSIONES,
  obtenerCatalogoInstalacionesAPI,
  crearInstalacionAPI,
  actualizarInstalacionAPI,
  crearPreguntaInstalacionAPI,
  actualizarPreguntaInstalacionAPI,
  type Dimension,
  type Instalacion,
  type PreguntaInstalacion,
} from '../services/instalacionService'

const claseInput =
  'px-3 py-2 rounded-xl border border-[#e2e6ef] dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-[#1c2333] dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-[#0f766e] dark:focus:border-teal-500'
const claseBotonPrimario =
  'px-4 py-2 rounded-xl bg-[#0f766e] hover:bg-[#0c5c56] dark:bg-teal-600 dark:hover:bg-teal-500 text-white text-xs font-semibold shadow-xs transition-colors whitespace-nowrap cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed'
const claseBotonSecundario =
  'px-2.5 py-1 rounded-lg border border-[#e2e6ef] dark:border-slate-700 text-xs font-semibold text-[#5d6678] dark:text-slate-300 hover:bg-[#f4f6fb] dark:hover:bg-slate-800 cursor-pointer'

const INSTALACION_VACIA = { nombre: '', tipo: '', descripcion: '' }
const PREGUNTA_VACIA: { idInstalacion: string; dimension: Dimension; texto: string } = {
  idInstalacion: '',
  dimension: 'Equipamiento',
  texto: '',
}

function Estado({ activa }: { activa: boolean }) {
  return (
    <span className={`font-semibold text-xs ${activa ? 'text-[#15803d] dark:text-emerald-400' : 'text-[#dc2626] dark:text-red-400'}`}>
      {activa ? 'Activa' : 'Inactiva'}
    </span>
  )
}

/** Catálogo de talleres y laboratorios conectado a la BD (alta, edición y activar/desactivar). */
export default function GestionInstalaciones() {
  const { usuario, cerrarSesion } = useAuth()
  const navigate = useNavigate()
  const token = usuario?.token || ''

  const [instalaciones, setInstalaciones] = useState<Instalacion[]>([])
  const [preguntas, setPreguntas] = useState<PreguntaInstalacion[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [guardando, setGuardando] = useState(false)

  const [formInst, setFormInst] = useState(INSTALACION_VACIA)
  const [editInstId, setEditInstId] = useState<number | null>(null)
  const [abiertoInst, setAbiertoInst] = useState(false)

  const [formPreg, setFormPreg] = useState(PREGUNTA_VACIA)
  const [editPregId, setEditPregId] = useState<number | null>(null)
  const [abiertoPreg, setAbiertoPreg] = useState(false)
  const [filtro, setFiltro] = useState('todas')

  const manejarError = (err: unknown) => {
    if (err instanceof ErrorAPI && err.status === 401) {
      cerrarSesion()
      navigate('/personal/administracion/login', { replace: true })
      return
    }
    setAviso('')
    setError((err as Error).message)
  }

  const cargar = () =>
    obtenerCatalogoInstalacionesAPI(token)
      .then((data) => {
        setInstalaciones(data.instalaciones)
        setPreguntas(data.preguntas)
      })
      .catch(manejarError)
      .finally(() => setCargando(false))

  useEffect(() => {
    cargar()
  }, [token])

  /** Ejecuta una escritura, muestra el resultado y vuelve a leer el catálogo de la BD. */
  const ejecutar = async (accion: () => Promise<{ mensaje: string }>, alTerminar?: () => void) => {
    setGuardando(true)
    setError('')
    try {
      const { mensaje } = await accion()
      setAviso(mensaje)
      alTerminar?.()
      await cargar()
    } catch (err) {
      manejarError(err)
    } finally {
      setGuardando(false)
    }
  }

  // ---------- Instalaciones ----------
  const guardarInstalacion = (e: FormEvent) => {
    e.preventDefault()
    if (!formInst.nombre.trim() || !formInst.tipo.trim()) {
      setError('El nombre y el tipo de la instalación son obligatorios.')
      return
    }
    const datos = {
      nombre: formInst.nombre.trim(),
      tipo: formInst.tipo.trim(),
      descripcion: formInst.descripcion.trim(),
    }
    ejecutar(
      () =>
        editInstId === null
          ? crearInstalacionAPI(datos, token)
          : actualizarInstalacionAPI(editInstId, datos, token),
      cerrarFormInst
    )
  }

  const editarInstalacion = (i: Instalacion) => {
    setFormInst({ nombre: i.nombre, tipo: i.tipo, descripcion: i.descripcion || '' })
    setEditInstId(i.id)
    setAbiertoInst(true)
  }

  const cerrarFormInst = () => {
    setFormInst(INSTALACION_VACIA)
    setEditInstId(null)
    setAbiertoInst(false)
  }

  // ---------- Preguntas ----------
  const guardarPregunta = (e: FormEvent) => {
    e.preventDefault()
    if (!formPreg.texto.trim()) {
      setError('El texto de la pregunta es obligatorio.')
      return
    }
    const datos = {
      id_instalacion: formPreg.idInstalacion ? Number(formPreg.idInstalacion) : null,
      dimension: formPreg.dimension,
      texto: formPreg.texto.trim(),
    }
    ejecutar(
      () =>
        editPregId === null
          ? crearPreguntaInstalacionAPI(datos, token)
          : actualizarPreguntaInstalacionAPI(editPregId, datos, token),
      cerrarFormPreg
    )
  }

  const editarPregunta = (p: PreguntaInstalacion) => {
    setFormPreg({
      idInstalacion: p.idInstalacion === null ? '' : String(p.idInstalacion),
      dimension: p.dimension,
      texto: p.texto,
    })
    setEditPregId(p.id)
    setAbiertoPreg(true)
  }

  const cerrarFormPreg = () => {
    setFormPreg(PREGUNTA_VACIA)
    setEditPregId(null)
    setAbiertoPreg(false)
  }

  const nombreInstalacion = (id: number | null) =>
    id === null ? 'Todas' : instalaciones.find((i) => i.id === id)?.nombre || `#${id}`

  const preguntasVisibles = preguntas.filter(
    (p) =>
      filtro === 'todas' ||
      (filtro === 'generales' ? p.idInstalacion === null : String(p.idInstalacion) === filtro)
  )

  return (
    <>
      {(error || aviso) && (
        <p
          className={`text-sm font-medium rounded-xl p-3 mb-4 border ${
            error
              ? 'text-[#dc2626] dark:text-red-300 bg-[#fee2e2] dark:bg-red-950/50 border-transparent dark:border-red-800/60'
              : 'text-[#15803d] dark:text-emerald-300 bg-[#e7f6ec] dark:bg-emerald-950/50 border-transparent dark:border-emerald-800/60'
          }`}
        >
          {error || aviso}
        </p>
      )}

      {/* ---------- Instalaciones ---------- */}
      <div className="bg-white dark:bg-slate-900 border border-[#e2e6ef] dark:border-slate-800 rounded-2xl p-6 shadow-xs mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <h2 className="text-lg font-bold text-[#1c2333] dark:text-slate-100">Talleres y laboratorios</h2>
          <button
            onClick={() => (abiertoInst ? cerrarFormInst() : setAbiertoInst(true))}
            className={claseBotonPrimario}
          >
            {abiertoInst ? 'Cancelar' : '+ Agregar instalación'}
          </button>
        </div>
        <p className="text-xs text-[#5d6678] dark:text-slate-400 mb-4">
          Las instalaciones inactivas no aparecen a los alumnos, pero conservan sus resultados.
        </p>

        {abiertoInst && (
          <form onSubmit={guardarInstalacion} className="p-4 rounded-xl border border-[#e2e6ef] dark:border-slate-700 bg-[#f4f6fb] dark:bg-slate-800/70 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-[#1c2333] dark:text-slate-200">Nombre</label>
                <input
                  maxLength={100}
                  value={formInst.nombre}
                  onChange={(e) => setFormInst({ ...formInst, nombre: e.target.value })}
                  className={claseInput}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-[#1c2333] dark:text-slate-200">Tipo</label>
                <input
                  maxLength={50}
                  placeholder="Laboratorio, Taller, Centro de Cómputo..."
                  value={formInst.tipo}
                  onChange={(e) => setFormInst({ ...formInst, tipo: e.target.value })}
                  className={claseInput}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-[#1c2333] dark:text-slate-200">Descripción (opcional)</label>
                <input
                  value={formInst.descripcion}
                  onChange={(e) => setFormInst({ ...formInst, descripcion: e.target.value })}
                  className={claseInput}
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button type="submit" disabled={guardando} className={claseBotonPrimario}>
                {editInstId === null ? 'Guardar instalación' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#e2e6ef] dark:border-slate-800 text-[#5d6678] dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-3 font-semibold">Nombre</th>
                <th className="py-3 px-3 font-semibold">Tipo</th>
                <th className="py-3 px-3 font-semibold">Descripción</th>
                <th className="py-3 px-3 font-semibold">Estado</th>
                <th className="py-3 px-3 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e6ef] dark:divide-slate-800">
              {instalaciones.map((i) => (
                <tr key={i.id} className="hover:bg-[#f4f6fb]/50 dark:hover:bg-slate-800/60 transition-colors">
                  <td className="py-3 px-3 font-medium text-[#1c2333] dark:text-slate-100">{i.nombre}</td>
                  <td className="py-3 px-3 text-[#1c2333] dark:text-slate-200">{i.tipo}</td>
                  <td className="py-3 px-3 text-[#5d6678] dark:text-slate-400">{i.descripcion}</td>
                  <td className="py-3 px-3">
                    <Estado activa={i.activa} />
                  </td>
                  <td className="py-3 px-3 text-right whitespace-nowrap space-x-2">
                    <button onClick={() => editarInstalacion(i)} className={claseBotonSecundario}>
                      Editar
                    </button>
                    <button
                      disabled={guardando}
                      onClick={() => ejecutar(() => actualizarInstalacionAPI(i.id, { activa: !i.activa }, token))}
                      className={claseBotonSecundario}
                    >
                      {i.activa ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
              {(cargando || instalaciones.length === 0) && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[#5d6678] dark:text-slate-400">
                    {cargando ? 'Cargando...' : 'No hay instalaciones registradas.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------- Preguntas ---------- */}
      <div className="bg-white dark:bg-slate-900 border border-[#e2e6ef] dark:border-slate-800 rounded-2xl p-6 shadow-xs mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <h2 className="text-lg font-bold text-[#1c2333] dark:text-slate-100">Preguntas de instalaciones</h2>
          <div className="flex gap-2 flex-wrap">
            <select value={filtro} onChange={(e) => setFiltro(e.target.value)} className={`${claseInput} font-semibold`}>
              <option value="todas">Todas las preguntas</option>
              <option value="generales">Generales (todas las instalaciones)</option>
              {instalaciones.map((i) => (
                <option key={i.id} value={String(i.id)}>
                  Solo {i.nombre}
                </option>
              ))}
            </select>
            <button
              onClick={() => (abiertoPreg ? cerrarFormPreg() : setAbiertoPreg(true))}
              className={claseBotonPrimario}
            >
              {abiertoPreg ? 'Cancelar' : '+ Agregar pregunta'}
            </button>
          </div>
        </div>
        <p className="text-xs text-[#5d6678] dark:text-slate-400 mb-4">
          Las preguntas no se eliminan, solo se desactivan, para no perder las respuestas ya registradas. Escala
          0, 2.5, 5, 7.5 y 10.
        </p>

        {abiertoPreg && (
          <form onSubmit={guardarPregunta} className="p-4 rounded-xl border border-[#e2e6ef] dark:border-slate-700 bg-[#f4f6fb] dark:bg-slate-800/70 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-[#1c2333] dark:text-slate-200">Aplica a</label>
                <select
                  value={formPreg.idInstalacion}
                  onChange={(e) => setFormPreg({ ...formPreg, idInstalacion: e.target.value })}
                  className={claseInput}
                >
                  <option value="">Todas las instalaciones</option>
                  {instalaciones.map((i) => (
                    <option key={i.id} value={String(i.id)}>
                      {i.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-[#1c2333] dark:text-slate-200">Dimensión</label>
                <select
                  value={formPreg.dimension}
                  onChange={(e) => setFormPreg({ ...formPreg, dimension: e.target.value as Dimension })}
                  className={claseInput}
                >
                  {DIMENSIONES.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1 sm:col-span-3">
                <label className="text-[11px] font-semibold text-[#1c2333] dark:text-slate-200">Pregunta</label>
                <input
                  value={formPreg.texto}
                  onChange={(e) => setFormPreg({ ...formPreg, texto: e.target.value })}
                  className={claseInput}
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button type="submit" disabled={guardando} className={claseBotonPrimario}>
                {editPregId === null ? 'Guardar pregunta' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#e2e6ef] dark:border-slate-800 text-[#5d6678] dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-3 font-semibold">Aplica a</th>
                <th className="py-3 px-3 font-semibold">Dimensión</th>
                <th className="py-3 px-3 font-semibold">Pregunta</th>
                <th className="py-3 px-3 font-semibold">Estado</th>
                <th className="py-3 px-3 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e6ef] dark:divide-slate-800">
              {preguntasVisibles.map((p) => (
                <tr key={p.id} className="hover:bg-[#f4f6fb]/50 dark:hover:bg-slate-800/60 transition-colors">
                  <td className="py-3 px-3 text-[#1c2333] dark:text-slate-200">{nombreInstalacion(p.idInstalacion)}</td>
                  <td className="py-3 px-3">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#e3f4f2] dark:bg-teal-500/15 text-[#0f766e] dark:text-teal-300 text-[11px] font-semibold">
                      {p.dimension}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-[#1c2333] dark:text-slate-200">{p.texto}</td>
                  <td className="py-3 px-3">
                    <Estado activa={p.activa} />
                  </td>
                  <td className="py-3 px-3 text-right whitespace-nowrap space-x-2">
                    <button onClick={() => editarPregunta(p)} className={claseBotonSecundario}>
                      Editar
                    </button>
                    <button
                      disabled={guardando}
                      onClick={() =>
                        ejecutar(() => actualizarPreguntaInstalacionAPI(p.id, { activa: !p.activa }, token))
                      }
                      className={claseBotonSecundario}
                    >
                      {p.activa ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
              {(cargando || preguntasVisibles.length === 0) && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[#5d6678] dark:text-slate-400">
                    {cargando ? 'Cargando...' : 'No se encontraron preguntas.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
