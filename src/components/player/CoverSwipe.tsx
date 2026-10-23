import { useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { player } from '../../player/engine'
import { vibrate } from '../tracks/trackActions'

const MIN_DX = 60 // px mínimos para que cuente
const MAX_MS = 600 // un arrastre más lento no es un «swipe»…
const FAR = 0.4 // …salvo que se lleve la carátula más del 40 % de su ancho (claramente intencional)
const OUT_MS = 180

type Phase = 'idle' | 'drag' | 'out' | 'enter'

/**
 * Carátula de «Sonando ahora» que se desliza como en Spotify: izquierda = siguiente; derecha = anterior
 * (o reinicia la canción si lleva más de 3 s). Solo existe en la vista «Canción»: sobre el video los toques
 * son del reproductor de YouTube. Un deslizamiento vertical lo sigue manejando «Sonando ahora» (minimizar o cola).
 */
export function CoverSwipe({ children, className = '' }: { children: ReactNode; className?: string }) {
  const [dx, setDx] = useState(0)
  const [phase, setPhase] = useState<Phase>('idle')
  const box = useRef<HTMLDivElement>(null)
  const gesture = useRef<{ id: number; x: number; y: number; t: number; axis: 'x' | 'y' | null; dx: number } | null>(null)
  const swallowClickUntil = useRef(0)

  // Solo con la canción activa sonando o en pausa, y si hay a dónde ir.
  const canGo = (direction: 'next' | 'prev') => {
    const s = player.getSnapshot()
    if (s.status !== 'playing' && s.status !== 'paused' && s.status !== 'buffering') return false
    return direction === 'next' ? !!s.nextTrack : s.time > 3 || !!s.prevTrack
  }

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (phase === 'out' || !e.isPrimary) return
    gesture.current = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), axis: null, dx: 0 }
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current
    if (!g || e.pointerId !== g.id) return
    const moveX = e.clientX - g.x
    const moveY = e.clientY - g.y
    if (!g.axis) {
      if (Math.abs(moveX) < 8 && Math.abs(moveY) < 8) return
      g.axis = Math.abs(moveX) > Math.abs(moveY) * 1.5 ? 'x' : 'y'
      if (g.axis === 'x') {
        e.currentTarget.setPointerCapture(e.pointerId)
        setPhase('drag')
      }
    }
    if (g.axis !== 'x') return // vertical: lo maneja «Sonando ahora»
    g.dx = moveX
    setDx(moveX)
  }

  const onPointerEnd = (cancelled: boolean) => {
    const g = gesture.current
    gesture.current = null
    if (!g || g.axis !== 'x') return
    swallowClickUntil.current = performance.now() + 400 // que el toque final no oculte los controles
    const width = box.current?.offsetWidth ?? 300
    const direction = g.dx < 0 ? 'next' : 'prev'
    const quick = performance.now() - g.t <= MAX_MS
    const far = Math.abs(g.dx) > width * FAR
    if (cancelled || Math.abs(g.dx) < MIN_DX || !(quick || far) || !canGo(direction)) {
      setPhase('idle') // no alcanzó: vuelve a su sitio
      setDx(0)
      return
    }
    vibrate()
    const sign = direction === 'next' ? -1 : 1
    setPhase('out')
    setDx(sign * (width + 80))
    window.setTimeout(() => {
      if (direction === 'next') player.next()
      else player.prev()
      // La nueva carátula entra desde el lado contrario.
      setPhase('enter')
      setDx(-sign * width * 0.5)
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          setPhase('idle')
          setDx(0)
        }),
      )
    }, OUT_MS)
  }

  const width = box.current?.offsetWidth ?? 300
  const progress = Math.min(1, Math.abs(dx) / width)
  const transition = phase === 'drag' || phase === 'enter' ? 'none' : phase === 'out' ? `transform ${OUT_MS}ms ease-in, opacity ${OUT_MS}ms ease-in` : 'transform 250ms cubic-bezier(.2,.8,.2,1), opacity 250ms'

  return (
    <div
      ref={box}
      data-cover-swipe
      className={`select-none ${className}`}
      style={{
        transform: `translateX(${dx}px) rotate(${Math.max(-8, Math.min(8, dx / 25))}deg) scale(${1 - progress * 0.05})`,
        opacity: phase === 'out' || phase === 'enter' ? 0.4 : 1,
        transition,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={() => onPointerEnd(false)}
      onPointerCancel={() => onPointerEnd(true)}
      onClickCapture={(e) => {
        if (performance.now() < swallowClickUntil.current) e.stopPropagation()
      }}
    >
      {children}
    </div>
  )
}
