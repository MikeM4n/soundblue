// Historial de escucha (en este navegador): qué canciones sonaron, cuántas veces y cuándo. Alimenta «Para ti».
// Una canción cuenta como escuchada a los 30 s (o al terminar, si es más corta), como en Spotify.
// Se guarda en localStorage, como el resto de la biblioteca: son pocos datos (máx. 400 canciones).
import { isTrack, type Track } from '../player/types'

const KEY = 'soundblue:historial'
const MAX = 400

export interface ListenEntry {
  track: Track
  count: number // veces escuchada (30 s o más)
  last: number // última vez que empezó a sonar (ms)
}

let entries: ListenEntry[] = read()
const listeners = new Set<() => void>()

function read(): ListenEntry[] {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(saved) ? saved.filter((e) => isTrack(e?.track) && typeof e.count === 'number' && typeof e.last === 'number') : []
  } catch {
    return []
  }
}

function commit(next: ListenEntry[], notify: boolean) {
  entries = next.sort((a, b) => b.last - a.last).slice(0, MAX)
  try {
    localStorage.setItem(KEY, JSON.stringify(entries))
  } catch {
    /* sin almacenamiento: el historial dura mientras la app esté abierta */
  }
  if (notify) listeners.forEach((listener) => listener())
}

/** Solo lo que sirve para recomendar (sin datos del reproductor). */
const plain = (t: Track): Track => ({ id: t.id, title: t.title, artist: t.artist, artistId: t.artistId, album: t.album, duration: t.duration, ytMusic: t.ytMusic, artwork: t.artwork })

export const listening = {
  /** Empezó a sonar: se anota la hora (para no repetirla en «Para ti» durante 24 h). */
  started(track: Track) {
    const found = entries.find((e) => e.track.id === track.id)
    commit([{ track: plain(track), count: found?.count ?? 0, last: Date.now() }, ...entries.filter((e) => e !== found)], false)
  },
  /** Se escuchó de verdad (30 s o hasta el final): suma una reproducción y avisa para recalcular «Para ti». */
  counted(track: Track) {
    const found = entries.find((e) => e.track.id === track.id)
    commit([{ track: plain(track), count: (found?.count ?? 0) + 1, last: found?.last ?? Date.now() }, ...entries.filter((e) => e !== found)], true)
  },
  entries: () => entries,
  /** Ids de lo que empezó a sonar en las últimas `ms` (por defecto, 24 h). */
  playedWithin(ms = 24 * 3600 * 1000): Set<string> {
    const since = Date.now() - ms
    return new Set(entries.filter((e) => e.last >= since).map((e) => e.track.id))
  },
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}
