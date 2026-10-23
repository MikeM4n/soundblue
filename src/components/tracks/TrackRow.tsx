import { AudioLines, ListEnd, Trash } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { formatDuration } from '../../lib/format'
import { coverSources, sourceLabel, type Track } from '../../player/types'
import { Cover } from '../ui/Cover'
import { TrackMenu } from './TrackMenu'
import { addToSiguientes, removeWithUndo, type RemoveAction } from './trackActions'
import { useSwipe } from './useSwipe'

export interface TrackRowProps {
  track: Track
  onPlay: () => void
  position?: number // número a la izquierda (listas con encabezado)
  isCurrent?: boolean
  isPlaying?: boolean
  duration?: number
  removeAction?: RemoveAction // deslizar a la derecha / «Eliminar de…»; sin esto, a la derecha no pasa nada
  trailing?: ReactNode // p. ej. el asa para reordenar en la cola
  style?: CSSProperties
}

/**
 * Fila de canción como en Spotify: portada pequeña, título, artista y menú «⋮».
 * En el celular: deslizar a la izquierda la agrega a siguientes; a la derecha la elimina de esta lista.
 */
export function TrackRow({ track, onPlay, position, isCurrent, isPlaying, duration, removeAction, trailing, style }: TrackRowProps) {
  const swipe = useSwipe({
    onLeft: () => addToSiguientes(track),
    onRight: removeAction ? () => removeWithUndo(removeAction) : undefined,
  })
  const shownDuration = duration ?? track.duration

  return (
    <li className="relative overflow-hidden rounded-md" style={style}>
      {/* Fondo que aparece mientras se desliza */}
      {swipe.dx < 0 && (
        <div className="absolute inset-0 flex items-center justify-end gap-2 bg-acento pr-5 text-sm font-semibold text-white">
          <span>Siguientes</span>
          <ListEnd className={`size-6 transition-transform ${swipe.armed ? 'scale-125' : ''}`} aria-hidden="true" />
        </div>
      )}
      {swipe.dx > 0 && (
        <div className="absolute inset-0 flex items-center justify-start gap-2 bg-red-600 pl-5 text-sm font-semibold text-white">
          <Trash className={`size-6 transition-transform ${swipe.armed ? 'scale-125' : ''}`} aria-hidden="true" />
          <span>Eliminar</span>
        </div>
      )}

      <div
        ref={swipe.ref}
        {...swipe.handlers}
        className="group relative flex h-16 touch-pan-y items-center gap-3 bg-panel pr-1 pl-2 select-none hover:bg-tarjeta md:pl-4"
        style={{ transform: `translateX(${swipe.dx}px)`, transition: swipe.active ? 'none' : 'transform 200ms ease-out' }}
      >
        {position !== undefined && (
          <span className="hidden w-6 shrink-0 text-center text-texto-sec tabular-nums md:block" aria-hidden="true">
            {isPlaying ? <AudioLines className="mx-auto size-4 text-acento-texto" /> : <span className={isCurrent ? 'text-acento-texto' : ''}>{position}</span>}
          </span>
        )}
        <button type="button" onClick={onPlay} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-label={`Reproducir ${track.title}, de ${track.artist}`}>
          <Cover seed={track.id} src={coverSources(track)} className="size-12 shrink-0 rounded" />
          <span className="min-w-0">
            <span className={`flex items-center gap-1.5 truncate ${isCurrent ? 'text-acento-texto' : 'text-texto'}`}>
              {isPlaying && <AudioLines className="size-3.5 shrink-0 md:hidden" aria-hidden="true" />}
              <span className="truncate">{track.title}</span>
            </span>
            <span className="flex items-center gap-1.5 text-sm text-texto-sec">
              <span className="shrink-0 rounded bg-white/10 px-1 text-[10px] leading-4 font-semibold tracking-wide uppercase">
                {sourceLabel(track)}
              </span>
              <span className="truncate">
                {track.artist}
                {track.album && ` · ${track.album}`}
              </span>
            </span>
          </span>
        </button>
        {shownDuration ? <span className="hidden w-12 shrink-0 text-right text-sm text-texto-sec tabular-nums md:block">{formatDuration(shownDuration)}</span> : null}
        <TrackMenu track={track} removeAction={removeAction} />
        {trailing}
      </div>
    </li>
  )
}
