import { AudioWaveform, Search as SearchIcon, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { TrackList } from '../components/tracks/TrackList'
import { YtmCardRow } from '../components/ui/YtmShelf'
import { categories } from '../data/categories'
import { searchCatalog, testList } from '../data/catalog'
import { KeyError, QuotaError, youtubeSearch, youtubeSearchEnabled } from '../data/youtube'
import { ytmSearch, type YtmCard } from '../data/ytmusic'
import { player } from '../player/engine'
import type { Track } from '../player/types'
import { useNowPlaying } from '../player/useNowPlaying'

// Música, en este orden de respaldo:
// 1) YouTube Music (su API interna, ver data/ytmusic.ts): canciones, álbumes y artistas, como en su app.
// 2) Si falla y hay clave: la YouTube Data API oficial (data/youtube.ts).
// 3) Si tampoco: la lista de prueba (lo que coincida o, si nada coincide, la lista entera), con un aviso discreto.

interface MusicResults {
  query: string
  songs: Track[]
  videos: Track[] // solo con la API oficial: videos musicales; con la lista de prueba: sus canciones
  albums: YtmCard[]
  artists: YtmCard[]
  source: 'ytm' | 'api' | 'catalogo'
  notice: string | null // por qué se usó un respaldo
}

const QUOTA_MESSAGE = 'Se acabaron por hoy las búsquedas en YouTube (la clave tiene un límite diario). Vuelve a intentarlo mañana; mientras tanto, la lista de prueba.'

function youtubeErrorMessage(error: unknown): string {
  if (error instanceof QuotaError) return QUOTA_MESSAGE
  if (error instanceof KeyError) return error.message
  return 'No se pudo buscar en YouTube. Revisa tu conexión.'
}

async function searchMusic(query: string): Promise<MusicResults> {
  const empty = { query, songs: [], videos: [], albums: [], artists: [] }
  try {
    return { ...empty, ...(await ytmSearch(query)), source: 'ytm', notice: null }
  } catch {
    const found = searchCatalog(query)
    const catalog = { ...empty, videos: found.length ? found : testList, source: 'catalogo' as const }
    if (!youtubeSearchEnabled) return { ...catalog, notice: 'No se pudo conectar con YouTube Music. Mientras tanto, la lista de prueba.' }
    try {
      const api = await youtubeSearch(query)
      return { ...empty, songs: api.songs, videos: api.videos, source: 'api', notice: null }
    } catch (error) {
      return { ...catalog, notice: youtubeErrorMessage(error) }
    }
  }
}

/** Buscar: canciones, álbumes y artistas de YouTube Music, como en Spotify. */
export function Search() {
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [music, setMusic] = useState<MusicResults | null>(null)
  const { open } = useNowPlaying()

  // Espera a que dejes de escribir antes de buscar.
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), 450)
    return () => window.clearTimeout(timer)
  }, [query])

  useEffect(() => {
    if (!debounced) return
    let alive = true
    searchMusic(debounced).then((results) => alive && setMusic(results))
    return () => {
      alive = false
    }
  }, [debounced])

  const q = query.trim()
  const fromMusic = music?.query === q ? music : null
  const searching = !!q && !fromMusic

  const songs = fromMusic?.songs ?? []
  const videos = fromMusic?.videos ?? []
  const results = [...songs, ...videos] // en este orden sigue sonando al terminar cada una

  const play = (index: number) => {
    open() // primero «Sonando ahora», así el video aparece ya en su sitio
    player.playContext(`Búsqueda «${q}»`, results, index)
  }

  const songsNote = fromMusic?.source === 'api' ? 'YouTube Music · API oficial' : 'YouTube Music'
  const lists = [
    { title: 'Canciones', note: songsNote, tracks: songs, offset: 0 },
    { title: fromMusic?.source === 'catalogo' ? 'Lista de prueba' : 'Videos', note: fromMusic?.source === 'catalogo' ? 'YouTube Music' : 'YouTube', tracks: videos, offset: songs.length },
  ]
  const nothing = !searching && results.length === 0 && !fromMusic?.albums.length && !fromMusic?.artists.length

  return (
    <div className="pt-6 pb-10">
      <div className="px-4 md:px-6">
        <h1 className="text-2xl font-bold md:text-3xl">Buscar</h1>
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault() // Enter busca sin esperar
            setDebounced(q)
          }}
        >
          <label className="relative mt-4 block max-w-xl">
            <span className="sr-only">Buscar canciones, álbumes o artistas</span>
            <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-texto-sec" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="¿Qué quieres escuchar?"
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
        </form>
        <p className="mt-2 text-xs text-texto-sec">Canciones, álbumes y artistas de YouTube Music.</p>
      </div>

      {q ? (
        <div className="mt-2">
          {lists.slice(0, 1).map(({ title, note, tracks, offset }) => tracks.length > 0 && <ResultList key={title} title={title} note={note} tracks={tracks} onPlay={(i) => play(offset + i)} />)}
          {!!fromMusic?.artists.length && (
            <section aria-label="Artistas" className="mt-4">
              <ListTitle title="Artistas" note="YouTube Music" />
              <YtmCardRow cards={fromMusic.artists} />
            </section>
          )}
          {!!fromMusic?.albums.length && (
            <section aria-label="Álbumes" className="mt-4">
              <ListTitle title="Álbumes" note="YouTube Music" />
              <YtmCardRow cards={fromMusic.albums} />
            </section>
          )}
          {lists.slice(1).map(({ title, note, tracks, offset }) => tracks.length > 0 && <ResultList key={title} title={title} note={note} tracks={tracks} onPlay={(i) => play(offset + i)} />)}
          <div className="mt-3 space-y-1 px-4 text-sm text-texto-sec md:px-6">
            {searching && <p>Buscando…</p>}
            {fromMusic?.notice && <p role="status">{fromMusic.notice}</p>}
          </div>
          {nothing && <p className="mt-6 px-4 text-texto-sec md:px-6">No encontramos «{q}».</p>}
        </div>
      ) : (
        <div className="px-4 md:px-6">
          <h2 className="mt-8 mb-4 text-xl font-bold">Explorar todo</h2>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {categories.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setQuery(c.name)}
                  className="relative h-28 w-full overflow-hidden rounded-lg p-4 text-left text-lg font-bold text-white transition hover:brightness-110"
                  style={{ backgroundColor: c.color }}
                >
                  {c.name}
                  <AudioWaveform className="absolute -right-3 -bottom-3 size-20 rotate-[25deg] text-white/25" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function ListTitle({ title, note }: { title: string; note: string }) {
  return (
    <h2 className="flex items-baseline gap-2 px-4 pb-1 text-lg font-bold md:px-6">
      {title}
      <span className="text-xs font-normal text-texto-sec">{note}</span>
    </h2>
  )
}

function ResultList({ title, note, tracks, onPlay }: { title: string; note: string; tracks: Track[]; onPlay: (index: number) => void }) {
  return (
    <section aria-label={title} className="mt-4">
      <ListTitle title={title} note={note} />
      <TrackList tracks={tracks} numbered={false} onPlay={onPlay} />
    </section>
  )
}
