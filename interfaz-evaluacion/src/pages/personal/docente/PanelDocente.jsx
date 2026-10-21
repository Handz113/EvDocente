import { useState } from 'react'
import Layout from '../../../components/Layout.jsx'
import Barra from '../../../components/Barra.jsx'
import { useAuth } from '../../../context/AuthContext.jsx'
import { materias, resultadosPorCrn, MIN_RESPUESTAS_PARA_MOSTRAR } from '../../../data/mock.js'

export default function PanelDocente() {
  const { usuario } = useAuth()
  const misGrupos = materias.filter((m) => m.docenteId === usuario.docenteId)
  const [crn, setCrn] = useState(misGrupos[0]?.crn)
  const grupo = misGrupos.find((m) => m.crn === crn)
  const res = crn ? resultadosPorCrn(crn) : null

  const todos = misGrupos.map((m) => resultadosPorCrn(m.crn))
  const totalRespuestas = todos.reduce((a, r) => a + r.total, 0)
  const promedioGeneral = totalRespuestas ? todos.reduce((a, r) => a + r.general * r.total, 0) / totalRespuestas : 0

  return (
    <Layout titulo="Docente" tono="personal">
      <h1>Mis resultados</h1>
      <p className="suave">Solo ves promedios y comentarios del grupo. Las respuestas no tienen nombre ni matrícula.</p>

      <div className="kpis">
        <div className="tarjeta kpi"><div className="numero">{promedioGeneral.toFixed(1)}</div><div className="etiqueta">Promedio general (de 5)</div></div>
        <div className="tarjeta kpi"><div className="numero">{totalRespuestas}</div><div className="etiqueta">Evaluaciones recibidas</div></div>
        <div className="tarjeta kpi"><div className="numero">{misGrupos.length}</div><div className="etiqueta">Grupos este periodo</div></div>
      </div>

      <div className="fila-titulo">
        <h2>Resultados por grupo</h2>
        <select className="filtro" value={crn} onChange={(e) => setCrn(e.target.value)}>
          {misGrupos.map((m) => <option key={m.crn} value={m.crn}>{m.nombre} · Grupo {m.grupo} (CRN {m.crn})</option>)}
        </select>
      </div>

      {res && res.total < MIN_RESPUESTAS_PARA_MOSTRAR ? (
        <div className="tarjeta vacio">
          Aún no hay suficientes evaluaciones en este grupo ({res.total}). Los resultados se muestran a partir de {MIN_RESPUESTAS_PARA_MOSTRAR} para proteger el anonimato.
        </div>
      ) : res && (
        <div className="rejilla" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
          <div className="tarjeta">
            <h3>{grupo.nombre}</h3>
            <p className="suave ayuda">{res.total} respuestas · promedio {res.general.toFixed(2)}</p>
            {res.porPregunta.map((p) => (
              <div key={p.id} className="fila-barra"><span>{p.categoria}</span><Barra valor={p.promedio} /></div>
            ))}
          </div>
          <div className="tarjeta" style={{ maxHeight: 420, overflowY: 'auto' }}>
            <h3>Comentarios ({res.comentarios.length})</h3>
            {res.comentarios.length === 0 && <p className="suave">Sin comentarios.</p>}
            {res.comentarios.map((c, i) => <div key={i} className="comentario">“{c}”</div>)}
          </div>
        </div>
      )}
    </Layout>
  )
}
