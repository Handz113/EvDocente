import { useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { materiasDeAlumno, periodoActual } from '../../data/mock.js'

export default function InicioAlumno() {
  const { usuario } = useAuth()
  const navigate = useNavigate()
  const lista = materiasDeAlumno(usuario.matricula)
  const hechas = lista.filter((m) => m.evaluada).length
  const pct = lista.length ? Math.round((hechas / lista.length) * 100) : 0

  return (
    <Layout titulo="Alumno" tono="alumno">
      <section className="seccion">
        <h1>Tus materias</h1>
        <p className="suave">
          Evalúa a cada docente del periodo <strong>{periodoActual.nombre}</strong>. Tienes hasta el {formatoFecha(periodoActual.fin)}.
        </p>
        <div className="fila-titulo" style={{ marginBottom: 0 }}>
          <span className="ayuda">{hechas} de {lista.length} evaluaciones completadas</span>
          <span className="ayuda">{pct}%</span>
        </div>
        <div className="progreso"><div style={{ width: `${pct}%` }} /></div>
      </section>

      <div className="rejilla">
        {lista.map((m) => (
          <article key={m.crn} className="tarjeta materia">
            <span className={`etiqueta-estado ${m.evaluada ? 'lista' : 'pendiente'}`}>
              {m.evaluada ? '✓ Evaluada' : 'Pendiente'}
            </span>
            <h3>{m.nombre}</h3>
            <span className="crn">CRN {m.crn} · Grupo {m.grupo}</span>
            <span className="docente">{m.docente.nombre}</span>
            <button className="btn" disabled={m.evaluada} onClick={() => navigate(`/alumno/evaluar/${m.crn}`)}>
              {m.evaluada ? 'Ya evaluaste' : 'Evaluar'}
            </button>
          </article>
        ))}
      </div>
    </Layout>
  )
}

function formatoFecha(iso) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })
}
