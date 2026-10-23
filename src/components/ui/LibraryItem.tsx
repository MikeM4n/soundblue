import { Heart } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'

interface LibraryItemProps {
  to: string
  title: string
  subtitle: string
  cover: ReactNode
}

/** Elemento de «Tu biblioteca»: portada pequeña, nombre y tipo. */
export function LibraryItem({ to, title, subtitle, cover }: LibraryItemProps) {
  return (
    <Link to={to} className="flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors hover:bg-tarjeta">
      {cover}
      <span className="min-w-0">
        <span className="block truncate">{title}</span>
        <span className="block truncate text-sm text-texto-sec">{subtitle}</span>
      </span>
    </Link>
  )
}

/** Portada de «Tus me gusta»: degradado azul con un corazón. */
export function FavoritesCover({ className = 'size-12' }: { className?: string }) {
  return (
    <span className={`grid shrink-0 place-items-center rounded-md bg-linear-135 from-acento to-indigo-800 ${className}`}>
      <Heart className="size-1/3 fill-white text-white" aria-hidden="true" />
    </span>
  )
}
