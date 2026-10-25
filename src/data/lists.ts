// Utilidades de listas de canciones que comparten «Para ti», los géneros y la radio.
import type { Track } from '../player/types'
import { artistKey } from './history'

const PER_ARTIST = 2 // como mucho 2 canciones de un mismo artista por estante

/** Todos los artistas de una línea («Bad Bunny, Jhayco y Feid» → 3 claves). */
export const artistKeys = (artist: string) => artist.split(/,| y | & | x | feat\.? | ft\.? /i).map(artistKey).filter(Boolean)

/** Sin repetidas y como mucho `max` por artista (el primero de la línea), en el orden en que vienen. */
export function capPerArtist(tracks: readonly Track[], max = PER_ARTIST, taken: Set<string> = new Set()): Track[] {
  const perArtist = new Map<string, number>()
  return tracks.filter((track) => {
    const key = artistKey(track.artist)
    const used = perArtist.get(key) ?? 0
    if (taken.has(track.id) || used >= max) return false
    taken.add(track.id)
    perArtist.set(key, used + 1)
    return true
  })
}

export function unique<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>()
  return items.filter((item) => !seen.has(item.id) && !!seen.add(item.id))
}

/** Intercala listas: la 1ª de cada una, luego la 2ª… (para no poner todo de un mismo artista seguido). */
export function interleave<T>(lists: T[][]): T[] {
  const out: T[] = []
  for (let i = 0; i < Math.max(0, ...lists.map((l) => l.length)); i++) for (const list of lists) if (list[i]) out.push(list[i])
  return out
}
