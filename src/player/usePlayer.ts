import { useSyncExternalStore } from 'react'
import { player } from './engine'

/** Estado del reproductor para los componentes; se vuelve a dibujar cuando cambia. */
export function usePlayer() {
  return useSyncExternalStore(player.subscribe, player.getSnapshot)
}
