import { Heart, LoaderCircle, Pause, Play } from 'lucide-react'
import { useSyncExternalStore } from 'react'
import { useLibrary } from '../../library/store'
import { player } from '../../player/engine'
import { sheetState } from '../../player/stage'
import { useNowPlaying } from '../../player/useNowPlaying'
import { usePlayer } from '../../player/usePlayer'
import { toggleFavorite } from '../tracks/trackActions'
import { Backdrop } from './Backdrop'
import { BarCarousel } from './BarCarousel'

/**
 * Barra del reproductor en el celular, como la de Spotify (sin video): carátula, título, artista,
 * favorito, reproducir/pausar y una línea de progreso azul. SOLO aparece al minimizar «Sonando ahora»
 * (o al abrir la app con una canción guardada). Gestos: izquierda = siguiente, derecha = anterior,
 * arriba o tocar = abrir «Sonando ahora».
 */
export function Banner() {
  const { current, status, time, duration } = usePlayer()
  const { favorites } = useLibrary()
  const sheet = useSyncExternalStore(sheetState.subscribe, sheetState.get)
  const { open } = useNowPlaying()
  if (!current || sheet === 'open') return null

  const playing = status === 'playing' || status === 'buffering'
  const busy = status === 'loading' || status === 'buffering'
  const progress = duration > 0 ? Math.min(100, (time / duration) * 100) : 0
  const liked = favorites.some((t) => t.id === current.id)

  return (
    <div className="relative mx-2 mb-1 shrink-0 overflow-hidden rounded-lg bg-elevado text-white lg:hidden">
      <Backdrop track={current} variant="barra" />
      <div className="relative flex items-center gap-1 py-2 pr-1 pl-2">
        <BarCarousel onOpen={open} showCover className="h-10 flex-1" />
        <button
          type="button"
          aria-label={liked ? 'Quitar de favoritos' : 'Agregar a favoritos'}
          aria-pressed={liked}
          onClick={() => toggleFavorite(current)}
          className={`grid size-10 shrink-0 place-items-center rounded-full ${liked ? 'text-acento' : 'text-white'}`}
        >
          <Heart className={`size-5 ${liked ? 'fill-current' : ''}`} />
        </button>
        <button
          type="button"
          aria-label={playing ? 'Pausar' : 'Reproducir'}
          onClick={() => player.toggle()}
          className="grid size-10 shrink-0 place-items-center rounded-full text-white"
        >
          {busy ? <LoaderCircle className="size-6 animate-spin" /> : playing ? <Pause className="size-6 fill-current" /> : <Play className="size-6 fill-current" />}
        </button>
      </div>
      <div className="relative h-0.5 bg-white/15" aria-hidden="true">
        <div className="h-full bg-acento" style={{ width: `${progress}%` }} />
      </div>
    </div>
  )
}
