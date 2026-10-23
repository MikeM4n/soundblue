import { useEffect, useRef } from 'react'
import { player } from '../../player/engine'
import { stageBox, stagePulse, stageSlots } from '../../player/stage'
import { usePlayer } from '../../player/usePlayer'

// El ÚNICO reproductor de YouTube de la app. Vive siempre en este mismo elemento (moverlo en la página
// lo recargaría y cortaría la música): lo que cambia es su posición y tamaño, que siguen al espacio
// marcado por «Sonando ahora» (pantalla completa) o por el panel del PC.
// Cuando se ve, va entero y sin nada encima (por eso va por encima de todo, z-50). Al minimizar en el
// celular no hay espacio para el video: se oculta y la canción SIGUE sonando (decisión del dueño de la
// app, aunque YouTube pide que su reproductor esté a la vista mientras suena).

const MOVE = 'top 300ms ease, left 300ms ease, width 300ms ease, height 300ms ease, border-radius 300ms ease'

export function VideoStage() {
  const stageRef = useRef<HTMLDivElement>(null)
  const hostRef = useRef<HTMLDivElement>(null)
  const { current, status } = usePlayer()
  const active = !!current && status !== 'idle' && status !== 'standby'

  useEffect(() => {
    if (hostRef.current) player.youtube.attach(hostRef.current)
  }, [])

  useEffect(() => {
    const stage = stageRef.current!
    if (!active) {
      stage.style.visibility = 'hidden'
      stageBox.set(null)
      return
    }

    let frame = 0
    let until = 0
    let lastSlot: HTMLElement | null = null
    let animateUntil = 0

    const apply = () => {
      const now = performance.now()
      const slot = stageSlots.pick()
      if (!slot) {
        // Sin espacio a la vista (minimizado): el video se oculta, pero nada se pausa.
        stage.style.visibility = 'hidden'
        stageBox.set(null)
        return
      }
      // Al pasar de un espacio a otro (pantalla ↔ barra), el video se desliza y cambia de tamaño.
      if (slot.el !== lastSlot) {
        if (lastSlot) animateUntil = now + 320
        lastSlot = slot.el
      }
      const r = slot.el.getBoundingClientRect()
      stage.style.transition = now < animateUntil ? MOVE : 'none'
      stage.style.visibility = 'visible'
      stage.style.top = `${r.top}px`
      stage.style.left = `${r.left}px`
      stage.style.width = `${r.width}px`
      stage.style.height = `${r.height}px`
      stage.style.borderRadius = getComputedStyle(slot.el).borderRadius
      const box = stageBox.get()
      if (!box || box.kind !== slot.kind || box.top !== r.top || box.left !== r.left || box.width !== r.width || box.height !== r.height) {
        stageBox.set({ kind: slot.kind, top: r.top, left: r.left, width: r.width, height: r.height })
      }
    }

    // Se sigue al espacio cuadro a cuadro solo mientras algo se mueve.
    const loop = () => {
      apply()
      if (performance.now() < until) frame = requestAnimationFrame(loop)
    }
    const follow = (ms: number) => {
      until = Math.max(until, performance.now() + ms)
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(loop)
    }

    follow(700)
    const offSlots = stageSlots.subscribe(() => follow(700))
    const offPulse = stagePulse.subscribe(() => follow(700))
    const onLayout = () => follow(150)
    window.addEventListener('resize', onLayout)
    document.addEventListener('scroll', onLayout, true)
    const check = window.setInterval(() => follow(50), 1000) // por si algo se movió sin avisar
    return () => {
      cancelAnimationFrame(frame)
      offSlots()
      offPulse()
      window.removeEventListener('resize', onLayout)
      document.removeEventListener('scroll', onLayout, true)
      window.clearInterval(check)
    }
  }, [active])

  return (
    <div
      ref={stageRef}
      role="region"
      aria-label="Video de YouTube"
      className="fixed z-50 overflow-hidden overscroll-none"
      style={{ visibility: 'hidden', top: 0, left: 0, width: 320, height: 200 }}
    >
      {/* Aquí la API de YouTube crea su iframe. */}
      <div ref={hostRef} className="size-full [&>iframe]:size-full" />
    </div>
  )
}
