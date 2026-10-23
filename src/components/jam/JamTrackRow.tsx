import type { ReactNode } from 'react'
import { coverSources, type Track } from '../../player/types'
import { Cover } from '../ui/Cover'

/** Fila de canción en la Jam: portada, título, una línea de detalle y, si hace falta, un botón a la derecha. */
export function JamTrackRow({ track, detail, action }: { track: Track; detail?: string; action?: ReactNode }) {
  return (
    <li className="flex h-16 items-center gap-3 rounded-md px-2 hover:bg-tarjeta">
      <Cover seed={track.id} src={coverSources(track)} className="size-12 shrink-0 rounded" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-texto">{track.title}</span>
        <span className="block truncate text-sm text-texto-sec">{detail ?? track.artist}</span>
      </span>
      {action}
    </li>
  )
}
