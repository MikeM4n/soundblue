/** Interruptor encendido/apagado con su nombre y una nota debajo (Ajustes, Fila Dinámica). */
export function Switch({ label, note, checked, onChange, className = '' }: { label: string; note: string; checked: boolean; onChange: (on: boolean) => void; className?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={`flex w-full items-center gap-4 text-left ${className}`}>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{label}</span>
        <span className="block text-sm text-texto-sec">{note}</span>
      </span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-acento' : 'bg-contraste/20'}`} aria-hidden="true">
        <span className={`absolute top-0.5 size-5 rounded-full bg-white transition-all ${checked ? 'left-5.5' : 'left-0.5'}`} />
      </span>
    </button>
  )
}
