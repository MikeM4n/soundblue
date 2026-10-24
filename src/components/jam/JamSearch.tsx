import { Check, LoaderCircle, Plus, Search as SearchIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ytmSearch } from '../../data/ytmusic'
import type { Track } from '../../player/types'
import { JamTrackRow } from './JamTrackRow'

export const jamInputClass =
  'h-12 w-full rounded-full bg-tarjeta px-5 text-texto ring-1 ring-white/10 outline-none placeholder:text-texto-sec focus:ring-2 focus:ring-acento'

interface JamSearchProps {
  onAdd: (track: Track) => boolean | Promise<boolean> // true: quedó en la cola compartida
  isIn: (id: string) => boolean // ya suena, viene o va en camino (se marca con ✓ y no se vuelve a agregar)
}

/**
 * «Agrega canciones» dentro de la Jam (anfitrión e invitados): busca en YouTube Music y «+» la pone al final de la cola
 * compartida.
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
        .then((found) => alive && setResults({ query: q, songs: found.songs.slice(0, 15) }))
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
          placeholder="Busca en YouTube Music"
          enterKeyHint="search"
          className={`${jamInputClass} pl-12 [&::-webkit-search-cancel-button]:hidden`}
        />
      </label>
      {q && !songs && <p className="mt-3 text-sm text-texto-sec">Buscando…</p>}
      {songs && songs.length === 0 && <p className="mt-3 text-sm text-texto-sec">No encontramos «{q}».</p>}
      {songs && songs.length > 0 && (
        <ul className="mt-2">
          {songs.map((track) => {
            const done = added.has(track.id) || isIn(track.id)
            return (
              <JamTrackRow
                key={track.id}
                track={track}
                detail={[track.artist, track.album].filter(Boolean).join(' · ')}
                action={
                  <button
                    type="button"
                    onClick={() => void add(track)}
                    disabled={adding !== null || done}
                    aria-label={done ? `${track.title} ya está en la Jam` : `Agregar ${track.title} a la Jam`}
                    className="grid size-10 shrink-0 place-items-center rounded-full bg-acento text-white transition hover:bg-acento-hover disabled:bg-tarjeta disabled:text-texto-sec"
                  >
                    {adding === track.id ? <LoaderCircle className="size-5 animate-spin" /> : done ? <Check className="size-5" /> : <Plus className="size-5" />}
                  </button>
                }
              />
            )
          })}
        </ul>
      )}
    </>
  )
}
