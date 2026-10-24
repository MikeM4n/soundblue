// Registro de canciones descartadas por estar repetidas (mismo videoId) al armar la cola: para ver en Ayuda que el
// filtro funciona. Se guarda solo en este navegador (las últimas 30).
import type { Track } from '../player/types'

const KEY = 'soundblue:duplicados'
const MAX = 30

export interface DuplicateEntry {
  at: number
  title: string
  artist: string
  where: string // «lista», «ya estaba en tu cola», «radio», «agregar a la cola»…
}

export function readDuplicateLog(): DuplicateEntry[] {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(saved) ? saved : []
  } catch {
    return []
  }
}

export function logDuplicate(track: Track, where: string) {
  try {
    const entries = [...readDuplicateLog(), { at: Date.now(), title: track.title, artist: track.artist, where }].slice(-MAX)
    localStorage.setItem(KEY, JSON.stringify(entries))
  } catch {
    /* sin almacenamiento: no se registra */
  }
}

export function clearDuplicateLog() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* nada que borrar */
  }
}
