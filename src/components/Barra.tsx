export interface BarraProps {
  valor: number
  max?: number
}

// Barra horizontal para mostrar un promedio
export default function Barra({ valor, max = 5 }: BarraProps) {
  const pct = Math.min(100, Math.max(0, Math.round((valor / max) * 100)))
  const redondeado = Math.round(valor * 10) / 10
  
  // En escala de 5: >= 4.2 alto, >= 3.4 medio; en escala de 10: >= 8.5 alto, >= 7.0 medio
  const umbralAlto = max === 10 ? 8.5 : 4.2
  const umbralMedio = max === 10 ? 7.0 : 3.4
  
  const nivelBg = redondeado >= umbralAlto
    ? 'bg-[#bbe5c8] dark:bg-emerald-500/35 text-[#15803d] dark:text-emerald-300'
    : redondeado >= umbralMedio
    ? 'bg-[#fde3b4] dark:bg-amber-500/35 text-[#d97706] dark:text-amber-300'
    : 'bg-[#fbc5c5] dark:bg-red-500/35 text-[#dc2626] dark:text-red-300'

  return (
    <div className="relative h-[26px] bg-[#f4f6fb] dark:bg-slate-800 rounded-lg overflow-hidden border border-[#e2e6ef] dark:border-slate-700 w-full">
      <div
        className={`h-full rounded-lg transition-all duration-300 ${nivelBg}`}
        style={{ width: `${pct}%` }}
      />
      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 font-semibold text-xs text-[#1c2333] dark:text-slate-100">
        {valor.toFixed(1)}
      </span>
    </div>
  )
}
