import { Volume1, Volume2, VolumeX } from 'lucide-react'
import { player } from '../../player/engine'
import { usePlayer } from '../../player/usePlayer'
import { IconButton } from '../ui/IconButton'

/** Botón de silencio y control deslizante de volumen. */
export function VolumeControl() {
  const { volume, muted } = usePlayer()
  const level = muted ? 0 : volume
  const Icon = level === 0 ? VolumeX : level < 0.5 ? Volume1 : Volume2

  return (
    <div className="flex items-center gap-1">
      <IconButton label={muted ? 'Activar sonido' : 'Silenciar'} onClick={() => player.toggleMute()}>
        <Icon className="size-4" />
      </IconButton>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={level}
        onChange={(e) => player.setVolume(Number(e.target.value))}
        aria-label="Volumen"
        aria-valuetext={`${Math.round(level * 100)} %`}
        className="h-1 w-24 cursor-pointer accent-acento"
      />
    </div>
  )
}
