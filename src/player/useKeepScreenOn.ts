// «Pantalla encendida»: mientras suena música y SoundBlue está a la vista, el teléfono no apaga la pantalla solo
// (Screen Wake Lock API, la misma que usan las apps de video). Es una opción: gasta más batería.
// No sirve al salir a la pantalla de inicio o a otra app: ahí el navegador oculta la página y lo suelta.
import { useEffect, useSyncExternalStore } from 'react'
import { usePlayer } from './usePlayer'

const KEY = 'soundblue:pantalla-encendida'
const listeners = new Set<() => void>()
let on = read()

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export const keepScreenOn = {
  get: () => on,
  set(value: boolean) {
    on = value
    try {
      localStorage.setItem(KEY, value ? '1' : '0')
    } catch {
      /* sin almacenamiento: vale mientras la app esté abierta */
    }
    listeners.forEach((listener) => listener())
  },
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
  supported: () => typeof navigator !== 'undefined' && 'wakeLock' in navigator,
}

/** Pide al teléfono no apagar la pantalla mientras suena (si la opción está activa). */
export function useKeepScreenOn() {
  const enabled = useSyncExternalStore(keepScreenOn.subscribe, keepScreenOn.get)
  const { status } = usePlayer()
  const playing = status === 'playing' || status === 'buffering'

  useEffect(() => {
    if (!enabled || !playing || !keepScreenOn.supported()) return
    let lock: WakeLockSentinel | null = null
    let done = false
    const acquire = async () => {
      if (done || lock || document.visibilityState !== 'visible') return
      try {
        lock = await navigator.wakeLock.request('screen')
        lock.addEventListener('release', () => (lock = null))
        if (done) void lock.release()
      } catch {
        /* el teléfono no lo permite ahora (p. ej. ahorro de batería): la pantalla se apaga como siempre */
      }
    }
    // El navegador lo suelta al ocultarse la página; al volver a verla se pide otra vez.
    const onVisibility = () => void acquire()
    void acquire()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      done = true
      document.removeEventListener('visibilitychange', onVisibility)
      void lock?.release()
    }
  }, [enabled, playing])
}
