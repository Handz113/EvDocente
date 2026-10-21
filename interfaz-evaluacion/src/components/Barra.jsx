// Barra horizontal para mostrar un promedio de 1 a 5
export default function Barra({ valor, max = 5 }) {
  const pct = Math.round((valor / max) * 100)
  const redondeado = Math.round(valor * 10) / 10
  const nivel = redondeado >= 4.2 ? 'alto' : redondeado >= 3.4 ? 'medio' : 'bajo'
  return (
    <div className="barra">
      <div className={`barra-relleno ${nivel}`} style={{ width: `${pct}%` }} />
      <span className="barra-valor">{valor.toFixed(1)}</span>
    </div>
  )
}
