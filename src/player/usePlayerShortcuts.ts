import { useEffect } from 'react'
import { player } from './engine'

/**
 * En el PC: flecha derecha = siguiente; flecha izquierda = anterior (o reiniciar si lleva más de 3 s), como el
 * deslizamiento de la carátula. No actúan donde las flechas ya hacen algo: al escribir, en la barra de progreso
 * o el volumen, ni en los menús.
 */
export function usePlayerShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || e.defaultPrevented) return
      const target = e.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"], [role="slider"], [role="menu"]')) return
      if (!player.getSnapshot().current) return
      e.preventDefault()
      if (e.key === 'ArrowRight') player.next()
      else player.prev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
