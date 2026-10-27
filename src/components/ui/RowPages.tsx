import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import type { YtmCard } from '../../data/ytmusic'
import type { Track } from '../../player/types'
import { useRef } from 'react'
import { TrackList } from '../tracks/TrackList'
import { Cover } from './Cover'

const ROWS = 4 // filas por página

const pagesOf = <T,>(items: readonly T[]): T[][] =>
  Array.from({ length: Math.ceil(items.length / ROWS) }, (_, p) => items.slice(p * ROWS, p * ROWS + ROWS))

/** Fila que se desliza de lado, de página en página (como «Selecciones rápidas» de YouTube Music). */
function Pages<T>({ items, render }: { items: readonly T[]; render: (page: T[], start: number) => ReactNode }) {
  const pages = pagesOf(items)
  const ref = useRef<HTMLDivElement>(null)
  const start = useRef<{ x: number; y: number } | null>(null)
  // Una sola página: a todo el ancho; varias: se asoma la siguiente para que se note que hay más.
  const width = pages.length > 1 ? 'w-[88%] max-w-md' : 'w-full max-w-2xl'
  return (
    <div ref={ref} data-swipe-carousel className="sin-scroll flex snap-x snap-mandatory overflow-x-auto pb-2 md:px-2" onTouchStart={(event) => { const touch = event.touches[0]; start.current = { x: touch.clientX, y: touch.clientY } }} onTouchEnd={(event) => {
      const origin = start.current; start.current = null; if (!origin) return
      const touch = event.changedTouches[0]; const dx = touch.clientX - origin.x; const dy = touch.clientY - origin.y
      if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.3) return
      const row = ref.current; if (!row) return
      const rows = [...document.querySelectorAll<HTMLElement>('[data-swipe-carousel]')]; const at = rows.indexOf(row)
      const atEnd = row.scrollLeft + row.clientWidth >= row.scrollWidth - 24
      if (dx < 0 && atEnd) rows[at + 1]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      if (dx > 0 && row.scrollLeft <= 4) rows[at - 1]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }}>
      {pages.map((page, p) => (
        <div key={p} className={`${width} shrink-0 snap-start`}>
          {render(page, p * ROWS)}
        </div>
      ))}
    </div>
  )
}

/**
 * Canciones en lista compacta (carátula pequeña, título, artista y «⋮»), de a 4 por página. Sin gestos de deslizar
 * en las filas: deslizar de lado mueve las páginas; la cola solo cambia con ▶ o con el menú «⋮».
 */
export function TrackPages({ tracks, onPlay }: { tracks: readonly Track[]; onPlay: (index: number) => void }) {
  return <Pages items={tracks} render={(page, start) => <TrackList tracks={page} numbered={false} plain onPlay={(i) => onPlay(start + i)} />} />
}

/** Playlists, álbumes o artistas en lista compacta, de a 4 por página: cada fila abre su página. */
export function CardPages({ cards }: { cards: readonly YtmCard[] }) {
  return (
    <Pages
      items={cards}
      render={(page) => (
        <ul className="px-2 md:px-4">
          {page.map((card) => (
            <li key={card.id}>
              <Link to={`/ytm/${encodeURIComponent(card.id)}`} className="flex h-16 items-center gap-3 rounded-md pr-3 pl-2 hover:bg-tarjeta md:pl-4">
                <Cover seed={card.id} src={card.image} className={`size-12 shrink-0 ${card.kind === 'artist' ? 'rounded-full' : 'rounded'}`} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{card.title}</span>
                  <span className="block truncate text-sm text-texto-sec">{card.subtitle}</span>
                </span>
                <ChevronRight className="size-5 shrink-0 text-texto-sec" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    />
  )
}
