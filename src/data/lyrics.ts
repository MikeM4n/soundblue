// Letras para «Sonando ahora» (vista «Letra»). Primero la de YouTube Music (por el mismo intermediario que el catálogo;
// la licencia con Musixmatch o LyricFind y tiene casi todo, también popular, vallenato y salsa). Si no la tiene, la API
// gratuita lyrics.ovh (le llegan solo el artista y el título; no carga ningún script). Se recuerdan durante la sesión.
import type { Track } from '../player/types'
import { ytmLyrics, type YtmLyrics } from './ytmusic'

export type Lyrics = YtmLyrics

const OVH = 'https://api.lyrics.ovh/v1'
const OVH_TIMEOUT_MS = 8000 // a veces tarda mucho o no responde

const memo = new Map<string, Promise<Lyrics | null>>()

/** La letra de `track`, o null si ninguna de las dos la tiene. Si no hay conexión, falla (para reintentar después). */
export function lyricsOf(track: Track): Promise<Lyrics | null> {
  let found = memo.get(track.id)
  if (!found) {
    found = ytmLyrics(track.id)
      .catch(() => null)
      .then((ytm) => ytm ?? fromLyricsOvh(track))
    found.catch(() => memo.delete(track.id))
    memo.set(track.id, found)
  }
  return found
}

async function fromLyricsOvh(track: Track): Promise<Lyrics | null> {
  const artist = track.artist.split(/,| y | & | feat\.? | ft\.? /i)[0].trim()
  const title = track.title.replace(/\s*[([].*?[)\]]/g, '').trim() // sin «(con …)», «(En Vivo)»…
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), OVH_TIMEOUT_MS)
  try {
    const response = await fetch(`${OVH}/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`, { signal: controller.signal })
    if (!response.ok) return null // 404: no la tiene
    const text = String((await response.json())?.lyrics ?? '').trim()
    return text ? { text, source: 'Fuente: lyrics.ovh' } : null
  } catch (error) {
    if (!navigator.onLine) throw error
    return null // no respondió a tiempo: sin letra
  } finally {
    window.clearTimeout(timer)
  }
}
