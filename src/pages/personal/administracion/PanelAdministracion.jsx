import { useState } from 'react'
import Layout from '../../../components/Layout.jsx'
import { personal, docentes, materias, preguntas, periodoActual } from '../../../data/mock.js'

const pestañas = [
  { id: 'usuarios', nombre: 'Usuarios' },
  { id: 'docentes', nombre: 'Docentes' },
  { id: 'materias', nombre: 'Materias / CRN' },
  { id: 'preguntas', nombre: 'Preguntas' },
  { id: 'periodos', nombre: 'Periodos' },
]

const nombresArea = { docente: 'Docente', coordinacion: 'Coordinación', administracion: 'Administración' }

export default function PanelAdministracion() {
  const [activa, setActiva] = useState('usuarios')

  // Copias locales: los cambios viven mientras la página está abierta.
  // Con el backend, cada "guardar" sería un POST/PUT/DELETE a la API.
  const [usuarios, setUsuarios] = useState(personal.map((p) => ({ ...p, activo: true })))
  const [listaDocentes, setListaDocentes] = useState(docentes)
  const [listaMaterias, setListaMaterias] = useState(materias)
  const [listaPreguntas, setListaPreguntas] = useState(preguntas)
  const [periodos, setPeriodos] = useState([
    periodoActual,
    { id: 'P2026-PRI', nombre: 'Primavera 2026', inicio: '2026-04-06', fin: '2026-04-24', activo: false },
  ])

  return (
    <Layout titulo="Administración" tono="personal" pestañas={pestañas} activa={activa} onPestaña={setActiva}>
      {activa === 'usuarios' && (
        <Catalogo
          titulo="Usuarios del personal"
          columnas={[
            { id: 'usuario', nombre: 'Usuario' },
            { id: 'nombre', nombre: 'Nombre' },
            { id: 'area', nombre: 'Área', opciones: Object.keys(nombresArea), mostrar: (v) => <span className="chip">{nombresArea[v]}</span> },
            { id: 'activo', nombre: 'Estado', soloLectura: true, mostrar: (v) => (v ? 'Activo' : 'Inactivo') },
          ]}
          filas={usuarios}
          clave="usuario"
          onAgregar={(f) => setUsuarios([...usuarios, { ...f, activo: true }])}
          extra={(f) => (
            <button className="btn btn-chico btn-fantasma" onClick={() => setUsuarios(usuarios.map((u) => (u.usuario === f.usuario ? { ...u, activo: !u.activo } : u)))}>
              {f.activo ? 'Desactivar' : 'Activar'}
            </button>
          )}
          nota="Los alumnos no se registran aquí: entran con su cuenta del portal escolar."
        />
      )}

      {activa === 'docentes' && (
        <Catalogo
          titulo="Catálogo de docentes"
          columnas={[
            { id: 'id', nombre: 'No. empleado' },
            { id: 'nombre', nombre: 'Nombre' },
            { id: 'area', nombre: 'Área' },
            { id: 'correo', nombre: 'Correo' },
          ]}
          filas={listaDocentes}
          clave="id"
          onAgregar={(f) => setListaDocentes([...listaDocentes, f])}
          onEliminar={(f) => setListaDocentes(listaDocentes.filter((d) => d.id !== f.id))}
        />
      )}

      {activa === 'materias' && (
        <Catalogo
          titulo="Materias y CRN"
          columnas={[
            { id: 'crn', nombre: 'CRN' },
            { id: 'clave', nombre: 'Clave' },
            { id: 'nombre', nombre: 'Materia' },
            { id: 'grupo', nombre: 'Grupo' },
            { id: 'docenteId', nombre: 'Docente', opciones: listaDocentes.map((d) => d.id), mostrar: (v) => listaDocentes.find((d) => d.id === v)?.nombre || v },
          ]}
          filas={listaMaterias}
          clave="crn"
          onAgregar={(f) => setListaMaterias([...listaMaterias, f])}
          onEliminar={(f) => setListaMaterias(listaMaterias.filter((m) => m.crn !== f.crn))}
        />
      )}

      {activa === 'preguntas' && (
        <Catalogo
          titulo="Preguntas del cuestionario"
          columnas={[
            { id: 'categoria', nombre: 'Criterio' },
            { id: 'texto', nombre: 'Pregunta' },
          ]}
          filas={listaPreguntas}
          clave="id"
          onAgregar={(f) => setListaPreguntas([...listaPreguntas, { ...f, id: Date.now() }])}
          onEliminar={(f) => setListaPreguntas(listaPreguntas.filter((p) => p.id !== f.id))}
          nota="Escala de respuesta: 1 (Muy en desacuerdo) a 5 (Muy de acuerdo)."
        />
      )}

      {activa === 'periodos' && (
        <Catalogo
          titulo="Periodos de evaluación"
          columnas={[
            { id: 'id', nombre: 'Clave' },
            { id: 'nombre', nombre: 'Nombre' },
            { id: 'inicio', nombre: 'Inicio', tipo: 'date' },
            { id: 'fin', nombre: 'Fin', tipo: 'date' },
            { id: 'activo', nombre: 'Estado', soloLectura: true, mostrar: (v) => (v ? <span className="chip">Activo</span> : 'Cerrado') },
          ]}
          filas={periodos}
          clave="id"
          onAgregar={(f) => setPeriodos([...periodos, { ...f, activo: false }])}
          extra={(f) => !f.activo && (
            <button className="btn btn-chico btn-fantasma" onClick={() => setPeriodos(periodos.map((p) => ({ ...p, activo: p.id === f.id })))}>
              Activar
            </button>
          )}
          nota="Solo puede haber un periodo activo. Los alumnos solo evalúan dentro de sus fechas."
        />
      )}
    </Layout>
  )
}

// Tabla reutilizable con formulario para agregar registros
function Catalogo({ titulo, columnas, filas, clave, onAgregar, onEliminar, extra, nota }) {
  const editables = columnas.filter((c) => !c.soloLectura)
  const vacio = Object.fromEntries(editables.map((c) => [c.id, c.opciones ? c.opciones[0] : '']))
  const [nuevo, setNuevo] = useState(vacio)
  const [abierto, setAbierto] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [error, setError] = useState('')

  const visibles = filas.filter((f) => JSON.stringify(f).toLowerCase().includes(busqueda.toLowerCase()))

  const guardar = (e) => {
    e.preventDefault()
    if (editables.some((c) => !String(nuevo[c.id] ?? '').trim())) return setError('Completa todos los campos.')
    if (clave !== 'id' || nuevo.id) {
      if (filas.some((f) => String(f[clave]) === String(nuevo[clave]))) return setError('Ya existe un registro con esa clave.')
    }
    onAgregar(nuevo)
    setNuevo(vacio)
    setAbierto(false)
    setError('')
  }

  return (
    <div className="tarjeta">
      <div className="fila-titulo">
        <h2>{titulo}</h2>
        <div className="filtros" style={{ marginBottom: 0 }}>
          <input className="filtro" placeholder="Buscar…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
            style={{ font: 'inherit', padding: '.6rem .8rem', border: '1px solid var(--borde)', borderRadius: 10 }} />
          <button className="btn" onClick={() => setAbierto(!abierto)}>{abierto ? 'Cancelar' : '+ Agregar'}</button>
        </div>
      </div>
      {nota && <p className="ayuda">{nota}</p>}

      {abierto && (
        <form onSubmit={guardar} className="tarjeta" style={{ background: 'var(--fondo)', boxShadow: 'none', marginBottom: '1rem' }}>
          <div className="rejilla" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            {editables.map((c) => (
              <div key={c.id} className="campo" style={{ marginBottom: 0 }}>
                <label>{c.nombre}</label>
                {c.opciones ? (
                  <select value={nuevo[c.id]} onChange={(e) => setNuevo({ ...nuevo, [c.id]: e.target.value })}>
                    {c.opciones.map((o) => <option key={o} value={o}>{c.mostrar ? textoPlano(c.mostrar(o)) : o}</option>)}
                  </select>
                ) : (
                  <input type={c.tipo || 'text'} value={nuevo[c.id]} onChange={(e) => setNuevo({ ...nuevo, [c.id]: e.target.value })} />
                )}
              </div>
            ))}
          </div>
          {error && <p className="error" style={{ marginTop: '1rem' }}>{error}</p>}
          <button className="btn" style={{ marginTop: '1rem' }}>Guardar</button>
        </form>
      )}

      <div className="tabla-envoltura">
        <table>
          <thead>
            <tr>{columnas.map((c) => <th key={c.id}>{c.nombre}</th>)}<th></th></tr>
          </thead>
          <tbody>
            {visibles.map((f) => (
              <tr key={f[clave]}>
                {columnas.map((c) => <td key={c.id}>{c.mostrar ? c.mostrar(f[c.id]) : f[c.id]}</td>)}
                <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                  {extra && extra(f)}{' '}
                  {onEliminar && <button className="btn btn-chico btn-fantasma" onClick={() => window.confirm('¿Eliminar este registro?') && onEliminar(f)}>Eliminar</button>}
                </td>
              </tr>
            ))}
            {visibles.length === 0 && <tr><td colSpan={columnas.length + 1} className="vacio">Sin resultados</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function textoPlano(nodo) {
  if (typeof nodo === 'string') return nodo
  return nodo?.props?.children ?? ''
}
