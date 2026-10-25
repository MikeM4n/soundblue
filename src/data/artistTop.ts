// Las canciones más conocidas de un artista, para «Tus artistas» en Inicio: las del estante «Canciones» de su página
// de YouTube Music, que viene ordenado por reproducciones. No gasta cuota: es la API interna de YouTube Music, vía el
// intermediario (no la YouTube Data API). Se guardan 24 h por artista.
// Si YouTube Music falla: la YouTube Data API (solo si hay clave; 101 unidades, también guardada 24 h) y, si tampoco,
// lo último guardado aunque tenga más de 24 h. Nunca un error en pantalla: como mucho, un aviso.
import type { Track } from '../player/types'
import { QuotaError, youtubeSearch, youtubeSearchEnabled } from './youtube'
import { ytmPage, type YtmCard } from './ytmusic'

const KEY = 'soundblue:top-artistas'
const DAY = 24 * 3600 * 1000
const MAX_SAVED = 30 // artistas guardados como mucho (se olvidan los más viejos)
export const TOP_SONGS = 5

export interface SavedTop {
  name: string
  at: number
  tracks: Track[]
  source: 'youtube-music' | 'data-api'
}

export interface ArtistTop {
  tracks: Track[]
  source: 'youtube-music' | 'data-api' | 'guardadas'
  notice?: string // si no se pudieron traer de nuevo
}

export function readTopCache(): Record<string, SavedTop> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}')
  } catch {
    return {}
  }
}

function saveTop(artistId: string, entry: SavedTop) {
  try {
    const recent = Object.entries({ ...readTopCache(), [artistId]: entry })
      .sort(([, a], [, b]) => b.at - a.at)
      .slice(0, MAX_SAVED)
    localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(recent)))
  } catch {
    /* sin almacenamiento: se vuelven a pedir la próxima vez */
  }
}

export function clearTopCache() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* nada que borrar */
  }
}

const simplify = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '')

/** Las canciones más conocidas del artista (hasta 5). */
export async function artistTopSongs(artist: YtmCard): Promise<ArtistTop> {
  const saved = readTopCache()[artist.id]
  if (saved && Date.now() - saved.at < DAY) return { tracks: saved.tracks, source: saved.source }

  try {
    const page = await ytmPage(artist.id)
    const tracks = (page.sections.find((section) => section.tracks.length)?.tracks ?? []).slice(0, TOP_SONGS)
    if (tracks.length) {
      saveTop(artist.id, { name: artist.title, at: Date.now(), tracks, source: 'youtube-music' })
      return { tracks, source: 'youtube-music' }
    }
  } catch {
    /* sigue la siguiente capa */
  }

  let notice: string | undefined
  if (youtubeSearchEnabled) {
    try {
      const wanted = simplify(artist.title)
      const songs = (await youtubeSearch(artist.title)).songs.filter((track) => simplify(track.artist).includes(wanted)).slice(0, TOP_SONGS)
      if (songs.length) {
        saveTop(artist.id, { name: artist.title, at: Date.now(), tracks: songs, source: 'data-api' })
        return { tracks: songs, source: 'data-api' }
      }
    } catch (error) {
      if (error instanceof QuotaError) notice = 'Se acabó la cuota diaria de YouTube: se muestran las canciones guardadas.'
    }
  }

  if (saved) return { tracks: saved.tracks, source: 'guardadas', notice: notice ?? 'El catálogo no respondió: se muestran las canciones guardadas.' }
  return { tracks: [], source: 'guardadas', notice: notice ?? 'No se pudieron cargar sus canciones ahora. Tócalo para ver su página.' }
}
