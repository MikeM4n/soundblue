import { Play } from 'lucide-react'

interface PlayButtonProps {
  label: string
  onClick?: () => void
  className?: string
}

/** Botón circular de reproducir, en azul rey con ícono blanco (contraste 4.7:1). */
export function PlayButton({ label, onClick, className = '' }: PlayButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`grid size-12 place-items-center rounded-full bg-acento text-white shadow-lg shadow-black/40 transition hover:scale-105 hover:bg-acento-hover ${className}`}
    >
      <Play className="size-5 fill-current" />
    </button>
  )
}
