import { useEffect, type RefObject } from 'react'

/**
 * Mientras un gesto propio está en curso (deslizar una fila, la barra o «Sonando ahora»), evita que el
 * navegador también desplace la página o haga «jalar para recargar». React registra los eventos táctiles
 * como pasivos (no permiten preventDefault), por eso se agrega un listener nativo con { passive: false }.
 * `isMine` decide en cada movimiento: si devuelve false, el scroll normal sigue funcionando.
 */
export function usePreventTouchMove(ref: RefObject<HTMLElement | null>, isMine: () => boolean) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onTouchMove = (e: TouchEvent) => {
      if (e.cancelable && isMine()) e.preventDefault()
    }
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => el.removeEventListener('touchmove', onTouchMove)
  }, [ref]) // isMine lee refs del gesto, así que no hace falta volver a registrar el listener
}
