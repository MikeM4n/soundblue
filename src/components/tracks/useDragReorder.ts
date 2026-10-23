import { useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'

interface Drag {
  from: number
  dy: number
  height: number
}

/**
 * Reordenar una lista arrastrando el asa (≡). También con teclado: con el asa enfocada,
 * flecha arriba/abajo mueve la canción.
 */
export function useDragReorder(count: number, onMove: (from: number, to: number) => void) {
  const [drag, setDrag] = useState<Drag | null>(null)
  const start = useRef({ y: 0, pointerId: -1 })

  const target = (d: Drag) => Math.max(0, Math.min(count - 1, d.from + Math.round(d.dy / d.height)))

  const handleProps = (index: number) => ({
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      e.preventDefault()
      e.stopPropagation() // que no empiece el gesto de deslizar la fila
      const row = e.currentTarget.closest('li')
      e.currentTarget.setPointerCapture(e.pointerId)
      start.current = { y: e.clientY, pointerId: e.pointerId }
      setDrag({ from: index, dy: 0, height: row?.getBoundingClientRect().height || 64 })
    },
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      if (!drag || e.pointerId !== start.current.pointerId) return
      e.stopPropagation()
      setDrag({ ...drag, dy: e.clientY - start.current.y })
    },
    onPointerUp: (e: PointerEvent<HTMLElement>) => {
      if (!drag) return
      e.stopPropagation()
      const to = target(drag)
      setDrag(null)
      if (to !== drag.from) onMove(drag.from, to)
    },
    onPointerCancel: () => setDrag(null),
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
