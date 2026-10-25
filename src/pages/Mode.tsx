import { ChevronLeft, Play, Shuffle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { TrackList } from '../components/tracks/TrackList'
import { Chips } from '../components/ui/Chips'
import { IconButton } from '../components/ui/IconButton'
import { MODE_LOOK } from '../components/ui/ModeTiles'
import { MODES, modeTracks } from '../data/genres'
import { player } from '../player/engine'
import type { Track } from '../player/types'
import { useNowPlaying } from '../player/useNowPlaying'

const ALL = 'todo'

/**
 * Modo de ambiente (Rumba, Tomar, Relax): canciones de las playlists de su ambiente (búsquedas como «salsa para
 * fiesta», ver data/genres.ts), con subfiltros («Todo» los mezcla). Tocar una o ▶ reemplaza la cola; al acabarse la
 * lista sigue la cola infinita (la radio de la última, mismo género).
 */
export function ModePage() {
  const { modo } = useParams()
  const navigate = useNavigate()
  const { open } = useNowPlaying()
  const mode = MODES.find((m) => m.key === modo)
  const [filter, setFilter] = useState(ALL)
  const [loaded, setLoaded] = useState<Record<string, Track[] | 'error'>>({})
  const key = `${modo}:${filter}`

  useEffect(() => {
    if (!mode || loaded[key]) return
    let alive = true
    modeTracks(mode, filter === ALL ? null : filter)
      .then((tracks) => alive && setLoaded((all) => ({ ...all, [key]: tracks.length ? tracks : 'error' })))
      .catch(() => alive && setLoaded((all) => ({ ...all, [key]: 'error' })))
    return () => {
      alive = false
    }
  }, [mode, filter, key, loaded])

  if (!mode) return <Navigate to="/" replace />
  const { icon: Icon, gradient } = MODE_LOOK[mode.key]
  const list = loaded[key]
  const tracks = Array.isArray(list) ? list : []
  const filterLabel = mode.filters.find((f) => f.key === filter)?.label
  const name = filterLabel ? `${mode.label} · ${filterLabel}` : mode.label

  // La radio que sigue a la lista es de los géneros del modo (Tomar: popular, ranchera y vallenato).
  const options = { replaceQueue: true, genres: mode.genres }
  const play = (index: number) => {
    open() // primero «Sonando ahora», así el video aparece ya en su sitio
    player.playContext(name, tracks, index, options)
  }

  return (
    <div className="pb-10">
      <header className={`bg-linear-to-b ${gradient} px-4 pt-4 pb-5 md:px-6`}>
        <IconButton label="Volver" onClick={() => navigate(-1)} className="-ml-2 text-white">
          <ChevronLeft className="size-6" />
        </IconButton>
        <div className="mt-2 flex items-end gap-4">
          <div className="grid size-20 shrink-0 place-items-center rounded-lg bg-black/20">
            <Icon className="size-10 text-white" aria-hidden="true" />
          </div>
          <div className="min-w-0 text-white">
            <p className="text-xs font-semibold tracking-wider text-white/80 uppercase">Modo de ambiente</p>
            <h1 className="text-3xl font-bold md:text-5xl">{mode.label}</h1>
            <p className="text-sm text-white/85">{mode.note}</p>
          </div>
        </div>
      </header>

      <div className="mt-4">
        <Chips
          label={`Subfiltros de ${mode.label}`}
          options={[{ key: ALL, label: 'Todo' }, ...mode.filters]}
          value={filter}
          onChange={setFilter}
        />
      </div>
      {/* La acción principal de la pantalla: botón ancho y grande, con «Aleatorio» al lado. */}
      <div className="flex items-center gap-3 px-4 pt-3 md:px-6">
        <button
          type="button"
          disabled={!tracks.length}
          onClick={() => play(0)}
          aria-label={`Reproducir ${name}`}
          className="flex h-14 min-w-0 flex-1 items-center justify-center gap-2 rounded-full bg-acento px-6 text-lg font-bold text-white shadow-lg shadow-acento/30 transition hover:bg-acento-hover active:scale-[.98] disabled:opacity-50 md:max-w-sm"
        >
          <Play className="size-6 shrink-0 fill-current" aria-hidden="true" />
          <span className="truncate">Reproducir {mode.label}</span>
        </button>
        <button
          type="button"
          disabled={!tracks.length}
          onClick={() => {
            open()
            player.shuffleContext(name, tracks, options)
          }}
          aria-label={`Reproducir ${name} en aleatorio`}
          className="flex h-14 shrink-0 items-center gap-2 rounded-full bg-contraste/10 px-5 font-semibold text-texto transition hover:bg-contraste/15 disabled:opacity-50"
        >
          <Shuffle className="size-5" aria-hidden="true" />
          Aleatorio
        </button>
      </div>
      <p className="px-4 pt-2 text-xs text-texto-sec md:px-6">Sin covers, sin artistas que sueles saltar y como mucho 2 canciones por artista.</p>

      {list === undefined && <p className="mt-6 px-4 text-sm text-texto-sec md:px-6">Armando la lista…</p>}
      {list === 'error' && <p className="mt-6 px-4 text-sm text-texto-sec md:px-6">No se pudo armar la lista. Revisa tu conexión y vuelve a intentarlo.</p>}
      {tracks.length > 0 && (
        <div className="mt-3">
          <TrackList key={key} tracks={tracks} numbered={false} onPlay={play} />
        </div>
      )}
    </div>
  )
}
