// Al volver a SoundBlue después de que YouTube pausó la música al salir: un aviso con «▶ Reanudar», por si la
// auto‑reanudación no lo logró. Al volver, la app ya da ▶ sola a los 0,3 s: el aviso solo sale si a los 2 s sigue en pausa.
import { useEffect } from 'react'
import { showToast } from '../ui/toast'
import { player } from './engine'
import { sheetState } from './stage'

const PROMPT_AFTER_MS = 2000

export function useResumePrompt() {
  useEffect(() => {
    let timer: number | undefined
    const onVisibility = () => {
      window.clearTimeout(timer)
      if (document.visibilityState !== 'visible') return
      timer = window.setTimeout(() => {
        const { pausedOnExit, status } = player.getSnapshot()
        // Con «Sonando ahora» abierta, el botón ya está ahí (en el aviso bajo la carátula).
        if (!pausedOnExit || status !== 'paused' || sheetState.get() === 'open') return
        showToast('YouTube pausó la música al salir de la app', { label: '▶ Reanudar', run: () => player.play() }, 10000)
      }, PROMPT_AFTER_MS)
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])
}
