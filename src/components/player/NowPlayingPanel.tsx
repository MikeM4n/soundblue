import { Heart, Maximize2 } from 'lucide-react'
import { useSyncExternalStore } from 'react'
import { Link } from 'react-router'
import { useLibrary } from '../../library/store'
import { player } from '../../player/engine'
import { sheetState } from '../../player/stage'
import { coverSources } from '../../player/types'
import { useNowPlaying } from '../../player/useNowPlaying'
import { usePlayer } from '../../player/usePlayer'
import { toggleFavorite } from '../tracks/trackActions'
import { Cover } from '../ui/Cover'
import { IconButton } from '../ui/IconButton'
import { Backdrop } from './Backdrop'

/** PC: panel derecho de «Sonando ahora» cuando la pantalla completa está minimizada (como Spotify de escritorio). */
export function NowPlayingPanel() {
  const { current, queue, upcoming } = usePlayer()
  const sheet = useSyncExternalStore(sheetState.subscribe, sheetState.get)
  const { favorites } = useLibrary()
  const { open } = useNowPlaying()
  if (!current || sheet === 'open') return null

  // Siempre la carátula: el video de YouTube no se muestra en ninguna parte (suena oculto).
  const liked = favorites.some((t) => t.id === current.id)
  const next = [...queue, ...upcoming].slice(0, 4)

  return (
    <aside aria-label="Sonando ahora" className="relative hidden w-[380px] shrink-0 overflow-hidden rounded-lg text-white lg:flex">
      <Backdrop track={current} />
      <div className="scroll-fino relative flex min-h-0 flex-1 flex-col overflow-y-auto p-3">
        <header className="mb-3 flex items-center justify-between">
          <p className="font-bold">Sonando ahora</p>
          <IconButton label="Pantalla completa" onClick={open} className="text-white">
            <Maximize2 className="size-4" />
          </IconButton>
        </header>
        <Cover seed={current.id} src={coverSources(current, 'large')} eager className="aspect-square w-full shrink-0 rounded-lg shadow-xl" />
        <div className="mt-4 flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xl font-bold">{current.title}</p>
            <p className="truncate text-white/75">{current.artist}</p>
          </div>
          <IconButton label={liked ? 'Quitar de favoritos' : 'Agregar a favoritos'} active={liked} onClick={() => toggleFavorite(current)} className={liked ? '' : 'text-white'}>
            <Heart className={`size-5 ${liked ? 'fill-current' : ''}`} />
          </IconButton>
        </div>

        <div className="mt-5 rounded-lg bg-black/30 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="font-bold">Próximas en sonar</p>
            <Link to="/cola" className="text-sm text-white/75 hover:underline">
              Ver todo
            </Link>
          </div>
          {next.length === 0 ? (
            <p className="text-sm text-white/70">No hay más canciones.</p>
          ) : (
            <ol className="space-y-1">
              {next.map((track, i) => (
                <li key={`${i}-${track.id}`}>
                  <button
                    type="button"
                    onClick={() => (i < queue.length ? player.jumpToQueue(i) : player.jumpToUpcoming(i - queue.length))}
                    className="flex w-full items-center gap-3 rounded-md p-1.5 text-left hover:bg-white/10"
                  >
                    <Cover seed={track.id} src={coverSources(track)} className="size-10 shrink-0 rounded" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm">{track.title}</span>
                      <span className="block truncate text-xs text-white/70">{track.artist}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </aside>
  )
}
