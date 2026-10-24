import { ChevronLeft, Shuffle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { TrackList } from '../components/tracks/TrackList'
import { Chips } from '../components/ui/Chips'
import { IconButton } from '../components/ui/IconButton'
import { MODE_LOOK } from '../components/ui/ModeTiles'
import { PlayButton } from '../components/ui/PlayButton'
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

  const play = (index: number) => {
    open() // primero «Sonando ahora», así el video aparece ya en su sitio
    player.playContext(name, tracks, index, { replaceQueue: true })
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
      <div className="flex items-center gap-3 px-4 pt-2 md:px-6">
        <PlayButton label={`Reproducir ${name}`} onClick={() => tracks.length && play(0)} />
        <IconButton
          label={`Reproducir ${name} en aleatorio`}
          onClick={() => {
            if (!tracks.length) return
            open()
            player.shuffleContext(name, tracks, { replaceQueue: true })
          }}
        >
          <Shuffle className="size-6" />
        </IconButton>
        <p className="min-w-0 text-xs text-texto-sec">Sin covers, sin artistas que sueles saltar y como mucho 2 canciones por artista.</p>
      </div>

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
