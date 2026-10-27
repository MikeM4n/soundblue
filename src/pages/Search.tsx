import { AudioWaveform, Search as SearchIcon, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { SavePlaylistButton } from '../components/library/SavePlaylistButton'
import { TrackList } from '../components/tracks/TrackList'
import { Cover } from '../components/ui/Cover'
import { YtmCardRow } from '../components/ui/YtmShelf'
import { categories } from '../data/categories'
import { INDEX_GENRES } from '../data/genres'
import { favoriteGenres } from '../data/favoriteGenres'
import { genreIndex, genresOf } from '../data/genreIndex'
import { createRadio } from '../data/radio'
import { KeyError, QuotaError, youtubeSearch, youtubeSearchEnabled } from '../data/youtube'
import { ytmSearch, type YtmCard } from '../data/ytmusic'
import { player } from '../player/engine'
import type { Track } from '../player/types'
import { useNowPlaying } from '../player/useNowPlaying'

// Música, en este orden de respaldo:
// 1) YouTube Music (su API interna, ver data/ytmusic.ts): canciones, álbumes, artistas y playlists, como en su app.
// 2) Si falla y hay clave: la YouTube Data API oficial (data/youtube.ts).
// Si ambas fuentes fallan, se muestra un aviso sin inventar resultados.

interface MusicResults {
  query: string
  songs: Track[]
  videos: Track[] // videos musicales de la API oficial
  albums: YtmCard[]
  artists: YtmCard[]
  playlists: YtmCard[] // con «+» para guardarlas en Tu biblioteca
  source: 'ytm' | 'api'
  notice: string | null // por qué se usó un respaldo
}

const QUOTA_MESSAGE = 'Se acabaron por hoy las búsquedas en YouTube. Vuelve a intentarlo mañana.'

function youtubeErrorMessage(error: unknown): string {
  if (error instanceof QuotaError) return QUOTA_MESSAGE
  if (error instanceof KeyError) return error.message
  return 'No se pudo buscar en YouTube. Revisa tu conexión.'
}

async function searchMusic(query: string): Promise<MusicResults> {
  const empty = { query, songs: [], videos: [], albums: [], artists: [], playlists: [] }
  let result: MusicResults
  try {
    result = { ...empty, ...(await ytmSearch(query)), source: 'ytm', notice: null }
  } catch {
    if (!youtubeSearchEnabled) return { ...empty, source: 'ytm', notice: 'No se pudo conectar con el catálogo. Revisa tu conexión.' }
    try {
      const api = await youtubeSearch(query)
      result = { ...empty, songs: api.songs, videos: api.videos, source: 'api', notice: null }
    } catch (error) {
      return { ...empty, source: 'api', notice: youtubeErrorMessage(error) }
    }
  }
  const selected = favoriteGenres.get()
  if (!selected.length) return result
  const index = await genreIndex().catch(() => null)
  if (!index) return { ...empty, source: result.source, notice: 'No se pudieron aplicar tus géneros favoritos. Vuelve a intentarlo.' }
  const fits = (artist: string, title = '') => [...genresOf({ id: '', artist, title }, index)].some((genre) => selected.includes(genre))
  return { ...result, songs: result.songs.filter((track) => fits(track.artist, track.title)), videos: result.videos.filter((track) => fits(track.artist, track.title)), artists: result.artists.filter((card) => fits(card.title)), albums: result.albums.filter((card) => fits(card.subtitle.split('•').at(-1) ?? '')), playlists: result.playlists.filter((card) => selected.some((genre) => INDEX_GENRES[genre].match.test(card.title))) }
}

/** Buscar: canciones, álbumes, artistas y playlists (que se pueden guardar con «+») de YouTube Music, como en Spotify. */
export function Search() {
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [music, setMusic] = useState<MusicResults | null>(null)
  const { open } = useNowPlaying()

  // Espera a que dejes de escribir antes de buscar.
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), 400)
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

  // Suena la elegida y después su radio (mismo artista y mismo género o parecido; ver data/radio.ts). Antes seguían los
  // demás resultados de la búsqueda, que solo comparten palabras con lo que escribiste (covers, otras canciones).
  const play = (index: number) => {
    const track = results[index]
    if (!track) return
    open() // primero «Sonando ahora», así el video aparece ya en su sitio
    player.playRadio(`Radio de «${track.title}»`, track, createRadio(track))
  }

  const lists = [
    { title: 'Canciones', tracks: songs, offset: 0 },
    { title: 'Videos', tracks: videos, offset: songs.length },
  ]
  const nothing = !searching && results.length === 0 && !fromMusic?.albums.length && !fromMusic?.artists.length && !fromMusic?.playlists.length

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
              className="h-12 w-full rounded-full bg-tarjeta pr-11 pl-12 text-texto ring-1 ring-contraste/10 outline-none placeholder:text-texto-sec focus:ring-2 focus:ring-acento [&::-webkit-search-cancel-button]:hidden"
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
        <p className="mt-2 text-xs text-texto-sec">Canciones, álbumes, artistas y playlists.</p>
      </div>

      {q ? (
        <div className="mt-2">
          {lists.slice(0, 1).map(({ title, tracks, offset }) => tracks.length > 0 && <ResultList key={title} title={title} tracks={tracks} onPlay={(i) => play(offset + i)} />)}
          {!!fromMusic?.artists.length && (
            <section aria-label="Artistas" className="mt-4">
              <ListTitle title="Artistas" />
              <YtmCardRow cards={fromMusic.artists} />
            </section>
          )}
          {!!fromMusic?.albums.length && (
            <section aria-label="Álbumes" className="mt-4">
              <ListTitle title="Álbumes" />
              <YtmCardRow cards={fromMusic.albums} />
            </section>
          )}
          {!!fromMusic?.playlists.length && (
            <section aria-label="Playlists" className="mt-4">
              <ListTitle title="Playlists" />
              <PlaylistResults cards={fromMusic.playlists} />
            </section>
          )}
          {lists.slice(1).map(({ title, tracks, offset }) => tracks.length > 0 && <ResultList key={title} title={title} tracks={tracks} onPlay={(i) => play(offset + i)} />)}
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

function ListTitle({ title }: { title: string }) {
  return <h2 className="px-4 pb-1 text-lg font-bold md:px-6">{title}</h2>
}

/** Playlists encontradas: tocarla abre su página; «+» la guarda en Tu biblioteca («Playlists guardadas»). */
function PlaylistResults({ cards }: { cards: readonly YtmCard[] }) {
  return (
    <ul className="px-2 md:px-4">
      {cards.map((card) => (
        <li key={card.id} className="flex items-center gap-2 pr-2">
          <Link to={`/ytm/${encodeURIComponent(card.id)}`} className="flex h-16 min-w-0 flex-1 items-center gap-3 rounded-md pl-2 hover:bg-tarjeta md:pl-4">
            <Cover seed={card.id} src={card.image} className="size-12 shrink-0 rounded" />
            <span className="min-w-0">
              <span className="block truncate">{card.title}</span>
              <span className="block truncate text-sm text-texto-sec">{card.subtitle || 'Playlist'}</span>
            </span>
          </Link>
          <SavePlaylistButton playlist={{ id: card.id, title: card.title, subtitle: card.subtitle, image: card.image }} />
        </li>
      ))}
    </ul>
  )
}

function ResultList({ title, tracks, onPlay }: { title: string; tracks: Track[]; onPlay: (index: number) => void }) {
  return (
    <section aria-label={title} className="mt-4">
      <ListTitle title={title} />
      <TrackList tracks={tracks} numbered={false} onPlay={onPlay} />
    </section>
  )
}
