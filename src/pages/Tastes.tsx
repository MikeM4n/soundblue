import { Check, Search as SearchIcon, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { Cover } from '../components/ui/Cover'
import { readTastes, saveTastes, skipTastes, starterArtists } from '../data/tastes'
import { ytmSearchArtists, ytmSimilarArtists, type YtmCard } from '../data/ytmusic'
import { sizedArtwork } from '../player/types'

const SUGGESTED = 3 // como en Spotify: con 3 o más artistas las recomendaciones salen mejor

/**
 * «¿Qué artistas te gustan?»: sale la primera vez que abres la app (y en Tu biblioteca → «Cambiar tus artistas»).
 * Al elegir uno aparecen al lado otros parecidos, como en YouTube Music. Con lo que elijas, Inicio arma «Para ti».
 */
export function Tastes() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState<YtmCard[]>(() => readTastes()?.artists ?? [])
  const [artists, setArtists] = useState<YtmCard[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ query: string; artists: YtmCard[] } | null>(null)
  const expanded = useRef(new Set<string>()) // artistas cuyos parecidos ya se agregaron

  useEffect(() => {
    let alive = true
    starterArtists()
      .then((list) => alive && setArtists(withoutRepeats([...(readTastes()?.artists ?? []), ...list])))
      .catch(() => alive && setFailed(true))
    return () => {
      alive = false
    }
  }, [])

  // Buscar cualquier artista (espera a que dejes de escribir).
  useEffect(() => {
    const q = query.trim()
    if (!q) return
    let alive = true
    const timer = window.setTimeout(() => {
      ytmSearchArtists(q)
        .then((found) => alive && setResults({ query: q, artists: found.slice(0, 12) }))
        .catch(() => alive && setResults({ query: q, artists: [] }))
    }, 450)
    return () => {
      alive = false
      window.clearTimeout(timer)
    }
  }, [query])

  const isOn = (card: YtmCard) => selected.some((artist) => artist.id === card.id)

  const toggle = (card: YtmCard) => {
    if (isOn(card)) {
      setSelected((list) => list.filter((artist) => artist.id !== card.id))
      return
    }
    setSelected((list) => [...list, card])
    setArtists((list) => (list && !list.some((artist) => artist.id === card.id) ? [card, ...list] : list)) // si vino de la búsqueda
    if (expanded.current.has(card.id)) return
    expanded.current.add(card.id)
    ytmSimilarArtists(card.id)
      .then((similar) =>
        setArtists((list) => {
          if (!list) return list
          const present = new Set(list.map((artist) => artist.id))
          const extra = similar.filter((artist) => !present.has(artist.id)).slice(0, 4)
          const at = list.findIndex((artist) => artist.id === card.id)
          return [...list.slice(0, at + 1), ...extra, ...list.slice(at + 1)]
        }),
      )
      .catch(() => {})
  }

  const finish = () => {
    saveTastes(selected)
    navigate('/', { replace: true })
  }
  const skip = () => {
    skipTastes()
    navigate('/', { replace: true })
  }

  const q = query.trim()
  const shown = q ? (results?.query === q ? results.artists : null) : artists

  return (
    <div className="px-4 pt-8 md:px-6">
      <h1 className="text-3xl font-bold md:text-4xl">¿Qué artistas te gustan?</h1>
      <p className="mt-2 text-texto-sec">
        Elige {SUGGESTED} o más y te recomendaremos música. Al tocar uno aparecen otros parecidos; tócalo otra vez para quitarlo.
      </p>

      <label className="relative mt-5 block max-w-xl">
        <span className="sr-only">Buscar un artista</span>
        <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-texto-sec" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Busca un artista"
          enterKeyHint="search"
          className="h-12 w-full rounded-full bg-tarjeta pr-11 pl-12 text-texto ring-1 ring-white/10 outline-none placeholder:text-texto-sec focus:ring-2 focus:ring-acento [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button
            type="button"
            aria-label="Borrar búsqueda"
            onClick={() => setQuery('')}
            className="absolute top-1/2 right-3 grid size-7 -translate-y-1/2 place-items-center rounded-full text-texto-sec hover:text-texto"
          >
            <X className="size-4" />
          </button>
        )}
      </label>

      {failed && !q && <p className="mt-8 text-texto-sec">No se pudo conectar con YouTube Music. Puedes omitir este paso y elegir después.</p>}
      {!shown && !failed && <p className="mt-8 text-texto-sec">{q ? 'Buscando…' : 'Cargando artistas…'}</p>}
      {shown && shown.length === 0 && <p className="mt-8 text-texto-sec">No encontramos «{q}».</p>}
      {shown && shown.length > 0 && (
        <ul className="mt-6 grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 lg:grid-cols-6" aria-label={q ? 'Resultados' : 'Artistas'}>
          {shown.map((card) => {
            const on = isOn(card)
            return (
              <li key={card.id}>
                <button type="button" aria-pressed={on} onClick={() => toggle(card)} className="group w-full text-center">
                  <span className="relative block">
                    <Cover
                      seed={card.id}
                      // Más nítida a 226 px; si Google no la da en ese tamaño (a veces responde 429), la original.
                      src={card.image ? [sizedArtwork(card.image, 226), card.image] : undefined}
                      className={`aspect-square w-full rounded-full transition ${on ? 'ring-4 ring-acento' : 'group-hover:opacity-90'}`}
                    />
                    {on && (
                      <span className="absolute right-0 bottom-0 grid size-8 place-items-center rounded-full bg-acento text-white shadow-lg" aria-hidden="true">
                        <Check className="size-5" />
                      </span>
                    )}
                  </span>
                  <span className="mt-2 block truncate text-sm font-semibold">{card.title}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {/* Acciones siempre a la vista, al pie de la pantalla. */}
      <div className="sticky bottom-0 -mx-4 mt-6 flex items-center justify-between gap-3 bg-linear-to-t from-fondo via-fondo/95 to-transparent px-4 pt-8 pb-4 md:-mx-6 md:px-6">
        <button type="button" onClick={skip} className="rounded-full px-4 py-2 font-semibold text-texto-sec hover:text-texto">
          Omitir
        </button>
        <button
          type="button"
          onClick={finish}
          disabled={selected.length === 0}
          className="rounded-full bg-acento px-6 py-3 font-bold text-white transition hover:bg-acento-hover disabled:opacity-40"
        >
          {selected.length ? `Listo (${selected.length})` : 'Elige artistas'}
        </button>
      </div>
    </div>
  )
}

function withoutRepeats(list: YtmCard[]): YtmCard[] {
  const seen = new Set<string>()
  return list.filter((card) => !seen.has(card.id) && !!seen.add(card.id))
}
