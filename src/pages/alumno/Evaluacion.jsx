import { useState } from 'react'
import { useParams, useNavigate, Navigate } from 'react-router-dom'
import Layout from '../../components/Layout.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { preguntas, escala, materiaPorCrn, materiasDeAlumno, enviarEvaluacion } from '../../data/mock.js'

export default function Evaluacion() {
  const { crn } = useParams()
  const { usuario } = useAuth()
  const navigate = useNavigate()
  const [respuestas, setRespuestas] = useState({})
  const [comentario, setComentario] = useState('')
  const [error, setError] = useState('')

  const materia = materiaPorCrn(crn)
  const delAlumno = materiasDeAlumno(usuario.matricula).find((m) => m.crn === crn)

  // Excepción: docente/materia no disponible o no inscrita
  if (!materia || !delAlumno) {
    return (
      <Layout titulo="Alumno" tono="alumno">
        <div className="tarjeta vacio">
          <h2>Materia no disponible</h2>
          <p>Esta materia o docente no está disponible para evaluar en este periodo.</p>
          <button className="btn" onClick={() => navigate('/alumno/inicio')}>Volver a mis materias</button>
        </div>
      </Layout>
    )
  }
  if (delAlumno.evaluada) return <Navigate to="/alumno/inicio" replace />

  const contestadas = Object.keys(respuestas).length
  const completa = contestadas === preguntas.length

  const enviar = (e) => {
    e.preventDefault()
    if (!completa) {
      setError('Responde todas las preguntas antes de enviar.')
      return
    }
    try {
      enviarEvaluacion(usuario.matricula, crn, respuestas, comentario)
      navigate('/alumno/listo', { state: { materia: materia.nombre } })
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <Layout titulo="Alumno" tono="alumno">
      <form onSubmit={enviar} style={{ maxWidth: 760, margin: '0 auto' }}>
        <h1>{materia.nombre}</h1>
        <p className="suave">{materia.docente.nombre} · CRN {materia.crn}</p>

        <div className="aviso-anonimo">
          <span>🔒</span>
          <span>Esta evaluación es anónima. El docente solo verá promedios y comentarios del grupo, nunca tu nombre.</span>
        </div>

        <div className="fila-titulo" style={{ marginBottom: 0 }}>
          <span className="ayuda">{contestadas} de {preguntas.length} preguntas</span>
        </div>
        <div className="progreso"><div style={{ width: `${(contestadas / preguntas.length) * 100}%` }} /></div>

        {preguntas.map((p, i) => (
          <div key={p.id} className="tarjeta pregunta">
            <span className="categoria">{i + 1}. {p.categoria}</span>
            <p>{p.texto}</p>
            <div className="escala">
              {escala.map((op) => (
                <label key={op.valor} className={respuestas[p.id] === op.valor ? 'elegida' : ''}>
                  <input
                    type="radio"
                    name={`p${p.id}`}
                    value={op.valor}
                    onChange={() => { setRespuestas({ ...respuestas, [p.id]: op.valor }); setError('') }}
                  />
                  <strong>{op.valor}</strong>
                  <span>{op.etiqueta}</span>
                </label>
              ))}
            </div>
          </div>
        ))}

        <div className="tarjeta campo">
          <label htmlFor="comentario">Comentario (opcional)</label>
          <textarea
            id="comentario" rows={4} maxLength={500}
            value={comentario} onChange={(e) => setComentario(e.target.value)}
            placeholder="¿Qué le recomendarías al docente? Evita escribir tu nombre o datos que te identifiquen."
          />
          <span className="ayuda">{comentario.length}/500</span>
        </div>

        {error && <p className="error">{error}</p>}
        <div className="acciones">
          <button type="button" className="btn btn-fantasma" onClick={() => navigate('/alumno/inicio')}>Cancelar</button>
          <button className="btn" disabled={!completa}>Enviar evaluación</button>
        </div>
        <p className="ayuda" style={{ textAlign: 'right', marginTop: '.5rem' }}>Una vez enviada no se puede modificar.</p>
      </form>
    </Layout>
  )
}
