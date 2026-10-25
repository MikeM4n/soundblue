// Ajustes de la app, guardados en este navegador.
import { useSyncExternalStore } from 'react'
import { youtubeView } from '../player/stage'

const KEY = 'soundblue:ajustes'

export interface Settings {
  hideViewToggle: boolean // ocultar «Canción | Letra» en «Sonando ahora» (queda siempre la carátula)
  dynamicQueue: boolean // Fila Dinámica: la cola nunca baja de 10 (pasan canciones de «Recomendadas»)
}

const DEFAULTS: Settings = { hideViewToggle: false, dynamicQueue: true }

function read(): Settings {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }
  } catch {
    return DEFAULTS
  }
}

let current = read()
const listeners = new Set<() => void>()

export const settings = {
  get: () => current,
  set(next: Partial<Settings>) {
    current = { ...current, ...next }
    // Sin el selector no se podría volver de «Letra»: queda la carátula.
    if (current.hideViewToggle) youtubeView.set('cancion')
    try {
      localStorage.setItem(KEY, JSON.stringify(current))
    } catch {
      /* sin almacenamiento: dura mientras la app esté abierta */
    }
    listeners.forEach((listener) => listener())
  },
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}

export const useSettings = () => useSyncExternalStore(settings.subscribe, settings.get)
