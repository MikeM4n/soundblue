// Temporizador de apagado (menú ⋮ de «Sonando ahora»): a los 15, 30 o 45 minutos la música baja de volumen poco a
// poco durante 5 s y se pausa. Dura mientras la app esté abierta (no se guarda al cerrarla).
import { useSyncExternalStore } from 'react'
import { player } from '../player/engine'

export const SLEEP_OPTIONS = [15, 30, 45] // minutos
const FADE_MS = 5000

let endsAt: number | null = null
let timer: number | undefined
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((listener) => listener())

export const sleepTimer = {
  /** Cuándo se apaga (ms) o null si no hay temporizador. */
  get: () => endsAt,
  start(minutes: number) {
    window.clearTimeout(timer)
    endsAt = Date.now() + minutes * 60_000
    timer = window.setTimeout(() => {
      endsAt = null
      notify()
      void player.fadeOutAndPause(FADE_MS)
    }, minutes * 60_000)
    notify()
  },
  cancel() {
    window.clearTimeout(timer)
    endsAt = null
    notify()
  },
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}

export const useSleepTimer = () => useSyncExternalStore(sleepTimer.subscribe, sleepTimer.get)

/** Minutos que faltan (redondeado hacia arriba), para mostrarlo. */
export const minutesLeft = (end: number) => Math.max(1, Math.ceil((end - Date.now()) / 60_000))
