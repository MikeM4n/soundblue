import { ListMusic, Maximize2 } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router'
import { coverUrl, type Track } from '../../player/types'
import { useNowPlaying } from '../../player/useNowPlaying'
import { usePlayer } from '../../player/usePlayer'
import { SeekBar } from '../player/SeekBar'
import { TransportControls } from '../player/TransportControls'
import { VolumeControl } from '../player/VolumeControl'
import { Cover } from '../ui/Cover'
import { IconButton } from '../ui/IconButton'

/** Reproductor fijo de escritorio: lo que suena, controles y volumen. */
export function PlayerBar() {
  const { current } = usePlayer()
  return (
    <footer aria-label="Reproductor" className="hidden h-20 shrink-0 grid-cols-[1fr_minmax(0,2fr)_1fr] items-center gap-4 px-2 lg:grid">
      <NowPlayingInfo track={current} />
      <div className="flex flex-col items-center gap-1">
        <TransportControls />
        <SeekBar className="max-w-xl" />
      </div>
      <ExtraControls />
    </footer>
  )
}

function NowPlayingInfo({ track }: { track: Track | null }) {
  const { open } = useNowPlaying()
  if (!track) {
    return (
      <div className="flex min-w-0 items-center gap-3">
        <div className="size-14 shrink-0 rounded-md bg-tarjeta" aria-hidden="true" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">Nada sonando</p>
          <p className="truncate text-xs text-texto-sec">Elige una canción para empezar</p>
        </div>
      </div>
    )
  }
  return (
    <button type="button" onClick={open} className="flex min-w-0 items-center gap-3 rounded-md text-left" aria-label={`Abrir Sonando ahora: ${track.title}`}>
      <Cover seed={track.id} src={coverUrl(track)} className="size-14 shrink-0 rounded-md" />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium hover:underline">{track.title}</span>
        <span className="block truncate text-xs text-texto-sec">{track.artist}</span>
      </span>
    </button>
  )
}

function ExtraControls() {
  const { current } = usePlayer()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { open } = useNowPlaying()

  return (
    <div className="flex items-center justify-end gap-1">
      <IconButton label="Próximas en sonar" active={pathname === '/cola'} disabled={!current} onClick={() => navigate('/cola')}>
        <ListMusic className="size-4" />
      </IconButton>
      <IconButton label="Sonando ahora en pantalla completa" disabled={!current} onClick={open}>
        <Maximize2 className="size-4" />
      </IconButton>
      <VolumeControl />
    </div>
  )
}
