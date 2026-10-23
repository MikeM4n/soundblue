import { useRef, useState, type MouseEvent, type PointerEvent } from 'react'
import { usePreventTouchMove } from '../../lib/usePreventTouchMove'
import { vibrate } from './trackActions'

interface SwipeOptions {
  onLeft?: () => void // deslizar hacia la izquierda
  onRight?: () => void // deslizar hacia la derecha
  threshold?: number // fracción del ancho que hay que pasar (0.3 = 30 %)
}

interface Gesture {
  pointerId: number
  startX: number
  startY: number
  width: number
  axis: 'x' | 'y' | null
  dx: number
  armed: boolean
}

/**
 * Gesto de deslizar una fila con el dedo. Solo actúa si el movimiento es claramente horizontal y pasa
 * el umbral; si es vertical lo deja al scroll del navegador (la fila usa touch-action: pan-y).
 */
export function useSwipe({ onLeft, onRight, threshold = 0.3 }: SwipeOptions) {
  const gesture = useRef<Gesture | null>(null)
  const swallowClickUntil = useRef(0) // hasta cuándo ignorar el «clic» que algunos navegadores generan al soltar
  const ref = useRef<HTMLDivElement>(null)
  // Con el gesto horizontal en curso, la lista no se desplaza; si es vertical, scroll normal.
  usePreventTouchMove(ref, () => gesture.current?.axis === 'x')
  const [dx, setDx] = useState(0)
  const [armed, setArmed] = useState(false)
  const [active, setActive] = useState(false)

  const reset = () => {
    gesture.current = null
    setDx(0)
    setArmed(false)
    setActive(false)
  }

  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType === 'mouse' || (!onLeft && !onRight)) return // en PC está el menú «⋮»
    gesture.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      width: e.currentTarget.getBoundingClientRect().width,
      axis: null,
      dx: 0,
      armed: false,
    }
  }

  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    const g = gesture.current
    if (!g || e.pointerId !== g.pointerId) return
    const moveX = e.clientX - g.startX
    const moveY = e.clientY - g.startY
    if (!g.axis) {
      if (Math.abs(moveX) < 10 && Math.abs(moveY) < 10) return
      g.axis = Math.abs(moveX) > Math.abs(moveY) * 1.3 ? 'x' : 'y'
      if (g.axis === 'y') {
        gesture.current = null // es scroll vertical: no es un gesto
        return
      }
      e.currentTarget.setPointerCapture(e.pointerId)
      setActive(true)
    }
    // Solo se mueve hacia los lados que tienen acción.
    let next = moveX
    if (next < 0 && !onLeft) next = 0
    if (next > 0 && !onRight) next = 0
    g.dx = next
    const isArmed = Math.abs(next) >= g.width * threshold
    if (isArmed !== g.armed) {
      g.armed = isArmed
      setArmed(isArmed)
    }
    setDx(next)
  }

  const onPointerUp = (e: PointerEvent<HTMLElement>) => {
    const g = gesture.current
    if (!g || e.pointerId !== g.pointerId) return
    // Que soltar no cuente como «tocar». Solo por un instante: si el navegador no genera ese clic,
    // el siguiente toque de verdad debe funcionar.
    if (g.axis === 'x') swallowClickUntil.current = performance.now() + 400
    if (g.armed) {
      vibrate()
      if (g.dx < 0) onLeft?.()
      else onRight?.()
    }
    reset()
  }

  const onPointerCancel = () => reset()

  // Si fue un gesto, el clic que el navegador genera al soltar no debe reproducir la canción.
  const onClickCapture = (e: MouseEvent<HTMLElement>) => {
    if (performance.now() > swallowClickUntil.current) return
    swallowClickUntil.current = 0
    e.preventDefault()
    e.stopPropagation()
  }

  return {
    ref,
    dx,
    armed,
    active,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onClickCapture },
  }
}
