import { Check, EllipsisVertical, LoaderCircle, Plus, Search as SearchIcon, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ytmSearch } from '../../data/ytmusic'
import { coverSources, type Track } from '../../player/types'
import { onlyInYouTubeMusic } from '../../player/unavailable'
import { TrackMenu } from '../tracks/TrackMenu'
import { useSwipe } from '../tracks/useSwipe'
import { Cover } from '../ui/Cover'

const SNAP_BACK_MS = 200 // lo que tarda la fila en volver a su lugar: el menú se abre después, junto a su «⋮»

export const jamInputClass =
  'h-12 w-full rounded-full bg-tarjeta px-5 text-texto ring-1 ring-contraste/10 outline-none placeholder:text-texto-sec focus:ring-2 focus:ring-acento'

interface JamSearchProps {
  onAdd: (track: Track) => boolean | Promise<boolean> // true: quedó en la cola compartida
  isIn: (id: string) => boolean // ya suena, viene o va en camino (se marca con ✓ y no se vuelve a agregar)
}

/**
 * «Agrega canciones» dentro de la Jam (anfitrión e invitados): busca canciones y «+» (o deslizarla a la izquierda) la
 * pone al final de la cola compartida; deslizarla a la derecha abre el menú «⋮».
 */
export function JamSearch({ onAdd, isIn }: JamSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ query: string; songs: Track[] } | null>(null)
  const [adding, setAdding] = useState<string | null>(null)
  const [added, setAdded] = useState<ReadonlySet<string>>(new Set())

  // Buscar en YouTube Music (espera a que dejes de escribir).
  useEffect(() => {
    const q = query.trim()
    if (!q) return
    let alive = true
    const timer = window.setTimeout(() => {
      ytmSearch(q)
        // Sin las que ya se sabe que YouTube no deja reproducir aquí (no sonarían en el teléfono del anfitrión).
        .then((found) => alive && setResults({ query: q, songs: found.songs.filter((track) => !onlyInYouTubeMusic.has(track.id)).slice(0, 15) }))
        .catch(() => alive && setResults({ query: q, songs: [] }))
    }, 450)
    return () => {
      alive = false
      window.clearTimeout(timer)
    }
  }, [query])

  const add = async (track: Track) => {
    setAdding(track.id)
    try {
      if (await onAdd(track)) setAdded((prev) => new Set(prev).add(track.id))
    } finally {
      setAdding(null)
    }
  }

  const q = query.trim()
  const songs = q && results?.query === q ? results.songs : null

  return (
    <>
      <label className="relative block">
        <span className="sr-only">Buscar canciones para la Jam</span>
        <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-texto-sec" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Busca canciones"
          enterKeyHint="search"
          className={`${jamInputClass} pl-12 [&::-webkit-search-cancel-button]:hidden`}
        />
      </label>
      {q && !songs && <p className="mt-3 text-sm text-texto-sec">Buscando…</p>}
      {songs && songs.length === 0 && <p className="mt-3 text-sm text-texto-sec">No encontramos «{q}».</p>}
      {songs && songs.length > 0 && (
        <ul className="mt-2">
          {songs.map((track) => (
            <JamSearchRow
              key={track.id}
              track={track}
              done={added.has(track.id) || isIn(track.id)}
              busy={adding !== null}
              adding={adding === track.id}
              onAdd={() => void add(track)}
            />
          ))}
        </ul>
      )}
    </>
  )
}

interface JamSearchRowProps {
  track: Track
  done: boolean // ya está en la Jam
  busy: boolean // se está agregando alguna
  adding: boolean // se está agregando esta
  onAdd: () => void
}

/** Resultado de la búsqueda: deslizar a la izquierda la agrega de una vez (como «+»); a la derecha abre el menú «⋮». */
function JamSearchRow({ track, done, busy, adding, onAdd }: JamSearchRowProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const swipe = useSwipe({
    onLeft: done || busy ? undefined : onAdd,
    onRight: () => window.setTimeout(() => setMenuOpen(true), SNAP_BACK_MS),
  })
  const grow = `size-6 transition-transform ${swipe.armed ? 'scale-125' : ''}`
  return (
    <li className="relative overflow-hidden rounded-md">
      {swipe.dx < 0 && (
        <div className="absolute inset-0 flex items-center justify-end gap-2 bg-acento pr-5 text-sm font-semibold text-white">
          <span>A la Jam</span>
          <Users className={grow} aria-hidden="true" />
        </div>
      )}
      {swipe.dx > 0 && (
        <div className="absolute inset-0 flex items-center justify-start gap-2 bg-tarjeta-claro pl-5 text-sm font-semibold text-texto">
          <EllipsisVertical className={grow} aria-hidden="true" />
          <span>Opciones</span>
        </div>
      )}
      <div
        ref={swipe.ref}
        {...swipe.handlers}
        className="relative flex h-16 touch-pan-y items-center gap-3 bg-panel pr-1 pl-2 select-none hover:bg-tarjeta"
        style={{ transform: `translateX(${swipe.dx}px)`, transition: swipe.active ? 'none' : `transform ${SNAP_BACK_MS}ms ease-out` }}
      >
        <Cover seed={track.id} src={coverSources(track)} className="size-12 shrink-0 rounded" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-texto">{track.title}</span>
          <span className="block truncate text-sm text-texto-sec">{[track.artist, track.album].filter(Boolean).join(' · ')}</span>
        </span>
        <button
          type="button"
          onClick={onAdd}
          disabled={busy || done}
          aria-label={done ? `${track.title} ya está en la Jam` : `Agregar ${track.title} a la Jam`}
          className="grid size-10 shrink-0 place-items-center rounded-full bg-acento text-white transition hover:bg-acento-hover disabled:bg-tarjeta disabled:text-texto-sec"
        >
          {adding ? <LoaderCircle className="size-5 animate-spin" /> : done ? <Check className="size-5" /> : <Plus className="size-5" />}
        </button>
        <TrackMenu track={track} open={menuOpen} onOpenChange={setMenuOpen} />
      </div>
    </li>
  )
}
