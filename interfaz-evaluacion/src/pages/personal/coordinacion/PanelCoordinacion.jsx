import { useState } from 'react'
import Layout from '../../../components/Layout.jsx'
import Barra from '../../../components/Barra.jsx'
import { resumenDocentes, preguntas, periodoActual } from '../../../data/mock.js'

export default function PanelCoordinacion() {
  const [area, setArea] = useState('todas')
  const [orden, setOrden] = useState('mayor')
  const [seleccion, setSeleccion] = useState(null)

  const resumen = resumenDocentes()
  const areasDisponibles = [...new Set(resumen.map((r) => r.docente.area))]

  const lista = resumen
    .filter((r) => area === 'todas' || r.docente.area === area)
    .sort((a, b) => (orden === 'mayor' ? b.general - a.general : a.general - b.general))

  const totalRespuestas = lista.reduce((a, r) => a + r.total, 0)
  const promedio = totalRespuestas ? lista.reduce((a, r) => a + r.general * r.total, 0) / totalRespuestas : 0
  const enAtencion = lista.filter((r) => r.general < 3.5).length

  const detalle = seleccion && resumen.find((r) => r.docente.id === seleccion)

  return (
    <Layout titulo="Coordinación" tono="personal">
      <h1>Panel de coordinación</h1>
      <p className="suave">Resultados del periodo {periodoActual.nombre}.</p>

      <div className="kpis">
        <div className="tarjeta kpi"><div className="numero">{promedio.toFixed(1)}</div><div className="etiqueta">Promedio institucional</div></div>
        <div className="tarjeta kpi"><div className="numero">{totalRespuestas}</div><div className="etiqueta">Evaluaciones recibidas</div></div>
        <div className="tarjeta kpi"><div className="numero">{lista.length}</div><div className="etiqueta">Docentes evaluados</div></div>
        <div className="tarjeta kpi"><div className="numero" style={{ color: enAtencion ? 'var(--bajo)' : undefined }}>{enAtencion}</div><div className="etiqueta">Requieren atención (&lt; 3.5)</div></div>
      </div>

      <div className="tarjeta seccion">
        <div className="fila-titulo">
          <h2>Docentes</h2>
          <div className="filtros" style={{ marginBottom: 0 }}>
            <select className="filtro" value={area} onChange={(e) => setArea(e.target.value)}>
              <option value="todas">Todas las áreas</option>
              {areasDisponibles.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <select className="filtro" value={orden} onChange={(e) => setOrden(e.target.value)}>
              <option value="mayor">Mejor promedio primero</option>
              <option value="menor">Menor promedio primero</option>
            </select>
          </div>
        </div>
        <div className="tabla-envoltura">
          <table>
            <thead><tr><th>Docente</th><th>Área</th><th>Grupos</th><th>Respuestas</th><th style={{ width: 200 }}>Promedio</th><th></th></tr></thead>
            <tbody>
              {lista.map((r) => (
                <tr key={r.docente.id}>
                  <td>{r.docente.nombre}</td>
                  <td><span className="chip">{r.docente.area}</span></td>
                  <td>{r.materias.length}</td>
                  <td>{r.total}</td>
                  <td><Barra valor={r.general} /></td>
                  <td><button className="btn btn-chico btn-fantasma" onClick={() => setSeleccion(r.docente.id)}>Ver detalle</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {detalle && (
        <div className="tarjeta seccion">
          <div className="fila-titulo">
            <h2>{detalle.docente.nombre}</h2>
            <button className="btn btn-chico btn-fantasma" onClick={() => setSeleccion(null)}>Cerrar</button>
          </div>
          <div className="rejilla" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
            {detalle.materias.map((m) => (
              <div key={m.materia.crn}>
                <h3>{m.materia.nombre}</h3>
                <p className="ayuda">Grupo {m.materia.grupo} · CRN {m.materia.crn} · {m.total} respuestas</p>
                {m.porPregunta.map((p) => (
                  <div key={p.id} className="fila-barra"><span>{p.categoria}</span><Barra valor={p.promedio} /></div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="tarjeta">
        <h2>Promedio por criterio</h2>
        {preguntas.map((p) => {
          const vals = lista.flatMap((r) => r.materias.map((m) => ({ v: m.porPregunta.find((x) => x.id === p.id).promedio, n: m.total })))
          const n = vals.reduce((a, x) => a + x.n, 0)
          const prom = n ? vals.reduce((a, x) => a + x.v * x.n, 0) / n : 0
          return <div key={p.id} className="fila-barra"><span>{p.categoria}</span><Barra valor={prom} /></div>
        })}
      </div>
    </Layout>
  )
}
