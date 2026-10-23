import { LOGO_PATH } from './logo-path'

/** Marca de SoundBlue: ondas de sonido blancas dentro de un círculo azul rey. */
export function LogoMark({ className = 'size-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <circle cx="16" cy="16" r="16" className="fill-acento" />
      <path d={LOGO_PATH} fill="none" stroke="white" strokeWidth="2.75" strokeLinecap="round" />
    </svg>
  )
}

/** Logo completo: marca + nombre. */
export function Logo() {
  return (
    <span className="flex items-center gap-2">
      <LogoMark />
      <span className="text-xl font-bold tracking-tight">SoundBlue</span>
    </span>
  )
}
