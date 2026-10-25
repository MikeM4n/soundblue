// Letras para «Sonando ahora» (vista «Letra», tipo karaoke). Con TIEMPOS, para resaltar la línea que se canta:
// 1. YouTube Music (la de su app de Android: sincronizada con esa misma grabación; Musixmatch o LyricFind).
// 2. LRCLib (lrclib.net, gratuita, formato LRC): la versión cuya duración más se parece a la canción. Puede ser de otra
//    grabación (en «Lluvia» de Eddie Santiago iba 13 s adelantada), por eso va segunda.
// Sin tiempos, solo el texto: la de YouTube Music (web) y, si no, lyrics.ovh. A LRCLib y lyrics.ovh les llegan solo el
// artista, el título y la duración; no cargan ningún script. Se recuerdan durante la sesión.
import type { Track } from '../player/types'
import { ytmLyrics, ytmTimedLyrics, type TimedLine } from './ytmusic'

export type { TimedLine }

export interface Lyrics {
  lines: TimedLine[] | null // con tiempos (karaoke); null: solo el texto
  text: string
  source: string // «Fuente: Musixmatch»
}

const LRCLIB = 'https://lrclib.net/api'
const OVH = 'https://api.lyrics.ovh/v1'
const TIMEOUT_MS = 8000 // a veces tardan mucho o no responden
const SAME_LENGTH_S = 4 // de LRCLib sirve la versión que dura lo mismo (± 4 s)

const memo = new Map<string, Promise<Lyrics | null>>()

/** La letra de `track` (con tiempos si se puede), o null si nadie la tiene. Sin conexión falla (para reintentar). */
export function lyricsOf(track: Track, duration?: number): Promise<Lyrics | null> {
  let found = memo.get(track.id)
  if (!found) {
    const seconds = duration || track.duration
    found = firstOf([
      () => ytmTimedLyrics(track.id).then((timed) => timed && { lines: timed.lines, text: textOf(timed.lines), source: timed.source }),
      () => fromLrclib(track, seconds),
      () => ytmLyrics(track.id).then((plain) => plain && { lines: null, ...plain }),
      () => fromLyricsOvh(track),
    ])
    found.catch(() => memo.delete(track.id))
    memo.set(track.id, found)
  }
  return found
}

/** La primera fuente que tenga la letra. Si todas fallaron por falta de conexión, falla (no es «no hay letra»). */
async function firstOf(sources: (() => Promise<Lyrics | null>)[]): Promise<Lyrics | null> {
  for (const source of sources) {
    const lyrics = await source().catch(() => null)
    if (lyrics) return lyrics
  }
  if (!navigator.onLine) throw new Error('Sin conexión')
  return null
}

const textOf = (lines: TimedLine[]) => lines.map((line) => line.text).join('\n')

const artistOf = (track: Track) => track.artist.split(/,| y | & | feat\.? | ft\.? /i)[0].trim()
const titleOf = (track: Track) => track.title.replace(/\s*[([].*?[)\]]/g, '').trim() // sin «(con …)», «(En Vivo)»…

async function getJson(url: string): Promise<unknown> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const response = await fetch(url, { signal: controller.signal })
    return response.ok ? await response.json() : null
  } finally {
    window.clearTimeout(timer)
  }
}

interface LrclibEntry {
  duration?: number
  syncedLyrics?: string | null
}

/** «[01:02.50] texto» → líneas con su segundo (una línea puede llevar varias marcas de tiempo). */
export function parseLrc(lrc: string): TimedLine[] {
  const lines: TimedLine[] = []
  for (const row of lrc.split('\n')) {
    const stamps = [...row.matchAll(/\[(\d+):(\d+(?:\.\d+)?)\]/g)]
    const text = row.replace(/\[[^\]]*\]/g, '').trim()
    for (const [, min, sec] of stamps) lines.push({ time: Number(min) * 60 + Number(sec), text })
  }
  return lines.sort((a, b) => a.time - b.time)
}

async function fromLrclib(track: Track, duration?: number): Promise<Lyrics | null> {
  const query = { artist_name: artistOf(track), track_name: titleOf(track) }
  const fits = (entry: LrclibEntry | null) => !!entry?.syncedLyrics && (!duration || !entry.duration || Math.abs(entry.duration - duration) <= SAME_LENGTH_S)
  let entry = (await getJson(`${LRCLIB}/get?${new URLSearchParams({ ...query, ...(duration ? { duration: String(Math.round(duration)) } : {}) })}`)) as LrclibEntry | null
  if (!fits(entry)) {
    const found = ((await getJson(`${LRCLIB}/search?${new URLSearchParams(query)}`)) ?? []) as LrclibEntry[]
    entry = found.filter(fits).sort((a, b) => Math.abs((a.duration ?? 0) - (duration ?? 0)) - Math.abs((b.duration ?? 0) - (duration ?? 0)))[0] ?? null
  }
  const lines = entry?.syncedLyrics ? parseLrc(entry.syncedLyrics) : []
  return lines.length ? { lines, text: textOf(lines), source: 'Fuente: LRCLib' } : null
}

async function fromLyricsOvh(track: Track): Promise<Lyrics | null> {
  const json = (await getJson(`${OVH}/${encodeURIComponent(artistOf(track))}/${encodeURIComponent(titleOf(track))}`)) as { lyrics?: string } | null
  const text = String(json?.lyrics ?? '').trim()
  return text ? { lines: null, text, source: 'Fuente: lyrics.ovh' } : null
}
