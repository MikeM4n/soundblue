/** Fichas para elegir una opción (género, subfiltro de un modo…), en una fila que se desliza de lado. */
export function Chips({ label, options, value, onChange }: { label: string; options: readonly { key: string; label: string }[]; value: string; onChange: (key: string) => void }) {
  return (
    <div role="group" aria-label={label} className="sin-scroll mb-2 flex gap-2 overflow-x-auto px-4 md:px-6">
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          aria-pressed={value === option.key}
          onClick={() => onChange(option.key)}
          className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
            value === option.key ? 'bg-contraste text-inverso' : 'bg-contraste/10 text-texto hover:bg-contraste/15'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
