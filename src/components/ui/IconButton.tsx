import type { ReactNode } from 'react'

interface IconButtonProps {
  label: string // texto para lectores de pantalla y tooltip
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  active?: boolean // para botones que se encienden/apagan (aleatorio, repetir)
  className?: string
}

/** Botón redondo que solo muestra un ícono. */
export function IconButton({ label, children, onClick, disabled, active, className = '' }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`grid place-items-center rounded-full p-2 transition-colors disabled:opacity-40 ${
        active ? 'text-acento hover:text-acento-hover' : 'text-texto-sec enabled:hover:text-texto'
      } ${className}`}
    >
      {children}
    </button>
  )
}
