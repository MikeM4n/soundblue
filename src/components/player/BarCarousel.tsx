import { useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'
import { usePreventTouchMove } from '../../lib/usePreventTouchMove'
import { player } from '../../player/engine'
import { coverSources, type Track } from '../../player/types'
import { usePlayer } from '../../player/usePlayer'
import { vibrate } from '../tracks/trackActions'
import { Cover } from '../ui/Cover'

const THRESHOLD = 0.3 // fracción del ancho para cambiar de canción
const SLIDE_MS = 180

// idle: quieto · drag: siguiendo el dedo · settle: vuelve a su lugar (o rebota) · commit: sale hacia un lado
// reset: se cambia de canción sin animación
type Phase = 'idle' | 'drag' | 'settle' | 'commit' | 'reset'

interface Gesture {
  pointerId: number
  startX: number
  startY: number
  width: number
  axis: 'x' | 'y' | null
  dx: number
  dy: number
}

interface BarCarouselProps {
  onOpen: () => void // tocar o deslizar hacia arriba
  showCover: boolean // carátula pequeña a la izquierda del título
  className?: string
}

/**
 * Título y artista de la barra, como un carrusel: deslizar a la izquierda = siguiente, a la derecha =
 * anterior (se asoma la canción con su portada); hacia arriba o tocar = abrir «Sonando ahora».
 */
export function BarCarousel({ onOpen, showCover, className = '' }: BarCarouselProps) {
  const { current, nextTrack, prevTrack } = usePlayer()
  const [dx, setDx] = useState(0)
  const [phase, setPhase] = useState<Phase>('idle')
  const gesture = useRef<Gesture | null>(null)
  const swallowClickUntil = useRef(0) // ignora solo el «clic» inmediato al soltar un gesto
  const ref = useRef<HTMLDivElement>(null)
  usePreventTouchMove(ref, () => !!gesture.current?.axis) // la barra no hace scroll: todo gesto es de la app
  if (!current) return null

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (phase === 'commit' || phase === 'reset') return
    gesture.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, width: e.currentTarget.offsetWidth, axis: null, dx: 0, dy: 0 }
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current
    if (!g || e.pointerId !== g.pointerId) return
    const moveX = e.clientX - g.startX
    const moveY = e.clientY - g.startY
    if (!g.axis) {
      if (Math.abs(moveX) < 8 && Math.abs(moveY) < 8) return
      // La dirección dominante decide: horizontal = cambiar canción; vertical = abrir.
      g.axis = Math.abs(moveX) > Math.abs(moveY) ? 'x' : 'y'
      e.currentTarget.setPointerCapture(e.pointerId)
      setPhase('drag')
    }
    if (g.axis === 'y') {
      g.dy = moveY
      return
    }
    // Sin canción hacia ese lado: se mueve con resistencia y luego rebota.
    const blocked = (moveX < 0 && !nextTrack) || (moveX > 0 && !prevTrack)
    g.dx = blocked ? moveX * 0.25 : moveX
    setDx(g.dx)
  }

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current
    gesture.current = null
    if (!g || e.pointerId !== g.pointerId || !g.axis) return // fue un toque: lo maneja onClick
    swallowClickUntil.current = performance.now() + 400
    if (g.axis === 'y') {
      setPhase('idle')
      if (g.dy < -40) onOpen()
      return
    }
    const direction = g.dx < 0 ? 'next' : 'prev'
    const available = direction === 'next' ? nextTrack : prevTrack
    if (!available || Math.abs(g.dx) < g.width * THRESHOLD) {
      setPhase('settle')
      setDx(0)
      return
    }
    setPhase('commit')
    setDx(direction === 'next' ? -g.width : g.width)
    window.setTimeout(() => {
      setPhase('reset')
      if (direction === 'next') player.next()
      else player.previous()
      setDx(0)
      vibrate()
      requestAnimationFrame(() => requestAnimationFrame(() => setPhase('idle')))
    }, SLIDE_MS)
  }

  const onPointerCancel = () => {
    gesture.current = null
    setPhase('settle')
    setDx(0)
  }

  const onClick = () => {
    if (performance.now() < swallowClickUntil.current) {
      swallowClickUntil.current = 0
      return
    }
    onOpen()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Enter' && e.key !== ' ') return
    e.preventDefault()
    onOpen()
  }

  const animated = phase === 'settle' || phase === 'commit'
  const slide = (offset: string): CSSProperties => ({
    transform: `translateX(calc(${offset} + ${dx}px))`,
    transition: animated ? `transform ${SLIDE_MS}ms ease-out` : 'none',
  })

  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      aria-label={`Abrir Sonando ahora: ${current.title}, de ${current.artist}`}
      className={`relative min-w-0 touch-none overflow-hidden overscroll-contain select-none ${className}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onClick={onClick}
      onKeyDown={onKeyDown}
    >
      <CarouselTrack key={`actual-${current.id}`} track={current} showCover={showCover} style={slide('0%')} />
      {dx < 0 && nextTrack && <CarouselTrack key={`siguiente-${nextTrack.id}`} track={nextTrack} showCover style={slide('100%')} />}
      {dx > 0 && prevTrack && <CarouselTrack key={`anterior-${prevTrack.id}`} track={prevTrack} showCover style={slide('-100%')} />}
    </div>
  )
}

function CarouselTrack({ track, showCover, style }: { track: Track; showCover: boolean; style: CSSProperties }) {
  return (
    <div className="absolute inset-0 flex items-center gap-3" style={style} aria-hidden="true">
      {showCover && <Cover seed={track.id} src={coverSources(track)} eager className="size-10 shrink-0 rounded" />}
      <span className="min-w-0">
        {/* Barra delgada: una línea. Barra con video: hay espacio para dos. */}
        <span className={`text-sm font-semibold ${showCover ? 'block truncate' : 'line-clamp-2'}`}>{track.title}</span>
        <span className="block truncate text-xs text-white/75">{track.artist}</span>
      </span>
    </div>
  )
}
