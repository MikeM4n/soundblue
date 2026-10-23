import { LoaderCircle, Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward } from 'lucide-react'
import { player } from '../../player/engine'
import { usePlayer } from '../../player/usePlayer'
import { IconButton } from '../ui/IconButton'

const REPEAT_LABEL = {
  off: 'Repetir la cola',
  all: 'Repetir solo esta canción',
  one: 'No repetir',
} as const

/** Aleatorio, anterior, reproducir/pausar, siguiente y repetir. `large` = versión del celular. */
export function TransportControls({ large = false }: { large?: boolean }) {
  const { current, status, shuffle, repeat } = usePlayer()
  const disabled = !current
  const playing = status === 'playing' || status === 'buffering'
  const busy = status === 'loading' || status === 'buffering'
  const icon = large ? 'size-6' : 'size-5'

  return (
    <div className={`flex items-center ${large ? 'gap-5' : 'gap-2'}`}>
      <IconButton label={shuffle ? 'Desactivar aleatorio' : 'Activar aleatorio'} active={shuffle} onClick={() => player.toggleShuffle()} disabled={disabled}>
        <Shuffle className={large ? 'size-5' : 'size-4'} />
      </IconButton>
      <IconButton label="Anterior" onClick={() => player.prev()} disabled={disabled}>
        <SkipBack className={`${icon} fill-current`} />
      </IconButton>
      <button
        type="button"
        aria-label={playing ? 'Pausar' : 'Reproducir'}
        onClick={() => player.toggle()}
        disabled={disabled}
        className={`grid place-items-center rounded-full bg-texto text-fondo transition enabled:hover:scale-105 disabled:opacity-40 ${
          large ? 'size-16' : 'size-9'
        }`}
      >
        {busy ? (
          <LoaderCircle className={`${icon} animate-spin`} />
        ) : playing ? (
          <Pause className={`${icon} fill-current`} />
        ) : (
          <Play className={`${icon} fill-current`} />
        )}
      </button>
      <IconButton label="Siguiente" onClick={() => player.next()} disabled={disabled}>
        <SkipForward className={`${icon} fill-current`} />
      </IconButton>
      <IconButton label={REPEAT_LABEL[repeat]} active={repeat !== 'off'} onClick={() => player.cycleRepeat()} disabled={disabled}>
        {repeat === 'one' ? <Repeat1 className={large ? 'size-5' : 'size-4'} /> : <Repeat className={large ? 'size-5' : 'size-4'} />}
      </IconButton>
    </div>
  )
}
