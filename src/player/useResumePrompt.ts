// Al volver a SoundBlue después de que YouTube pausó la música al salir: un aviso con «▶ Reanudar», por si la
// notificación de Android no apareció. Lo pulsa el usuario; la app nunca reanuda sola.
import { useEffect } from 'react'
import { showToast } from '../ui/toast'
import { player } from './engine'
import { sheetState } from './stage'

export function useResumePrompt() {
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return
      const { pausedOnExit, status } = player.getSnapshot()
      // Con «Sonando ahora» abierta, el botón ya está ahí (en el aviso bajo la carátula).
      if (!pausedOnExit || status !== 'paused' || sheetState.get() === 'open') return
      showToast('YouTube pausó la música al salir de la app', { label: '▶ Reanudar', run: () => player.play() }, 10000)
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])
}
