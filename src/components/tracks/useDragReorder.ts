import { useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'

interface Drag {
  from: number
  dy: number
  height: number
}

/**
 * Reordenar una lista arrastrando el asa (≡). También con teclado: con el asa enfocada,
 * flecha arriba/abajo mueve la canción.
 * El asa espera a ver la dirección: si el dedo va hacia arriba o abajo, reordena; si va de lado, lo deja pasar al gesto
 * de deslizar la fila (en el celular, deslizar a la izquierda suele empezar justo en el borde derecho, donde está ≡).
 */
export function useDragReorder(count: number, onMove: (from: number, to: number) => void) {
  const [drag, setDrag] = useState<Drag | null>(null)
  const start = useRef<{ x: number; y: number; pointerId: number; from: number; height: number; axis: 'x' | 'y' | null }>({
    x: 0,
    y: 0,
    pointerId: -1,
    from: 0,
    height: 64,
    axis: null,
  })

  const target = (d: Drag) => Math.max(0, Math.min(count - 1, d.from + Math.round(d.dy / d.height)))

  const handleProps = (index: number) => ({
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      e.preventDefault()
      const row = e.currentTarget.closest('li')
      e.currentTarget.setPointerCapture(e.pointerId)
      start.current = { x: e.clientX, y: e.clientY, pointerId: e.pointerId, from: index, height: row?.getBoundingClientRect().height || 64, axis: null }
    },
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      const s = start.current
      if (e.pointerId !== s.pointerId || s.axis === 'x') return // de lado: lo maneja la fila
      const dy = e.clientY - s.y
      if (!s.axis) {
        const dx = e.clientX - s.x
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
        s.axis = Math.abs(dy) >= Math.abs(dx) ? 'y' : 'x'
        if (s.axis === 'x') return
      }
      e.stopPropagation() // hacia arriba o abajo: es reordenar, no deslizar la fila
      setDrag({ from: s.from, dy, height: s.height })
    },
    onPointerUp: (e: PointerEvent<HTMLElement>) => {
      const axis = start.current.axis
      start.current.pointerId = -1
      if (axis !== 'y' || !drag) return
      e.stopPropagation()
      const to = target(drag)
      setDrag(null)
      if (to !== drag.from) onMove(drag.from, to)
    },
    onPointerCancel: () => {
      start.current.pointerId = -1
      setDrag(null)
    },
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      if (e.key === 'ArrowUp' && index > 0) onMove(index, index - 1)
      else if (e.key === 'ArrowDown' && index < count - 1) onMove(index, index + 1)
      else return
      e.preventDefault()
    },
    style: { touchAction: 'none' } as CSSProperties,
  })

  /** Estilo de cada fila: la que se arrastra sigue al dedo y las demás le abren espacio. */
  const rowStyle = (index: number): CSSProperties | undefined => {
    if (!drag) return undefined
    if (index === drag.from) {
      return { transform: `translateY(${drag.dy}px)`, zIndex: 10, boxShadow: '0 8px 24px rgb(0 0 0 / 0.5)' }
    }
    const to = target(drag)
    const shift =
      drag.from < to && index > drag.from && index <= to ? -drag.height : drag.from > to && index >= to && index < drag.from ? drag.height : 0
    return { transform: `translateY(${shift}px)`, transition: 'transform 150ms ease-out' }
  }

  return { handleProps, rowStyle, draggingIndex: drag?.from ?? null }
}
