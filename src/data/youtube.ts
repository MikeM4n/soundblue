// Búsqueda en YouTube con la Data API v3 (oficial), priorizando las pistas de YouTube Music: las que YouTube
// genera para cada canción en el canal «Artista - Topic». Su título ya es el nombre de la canción y su
// descripción trae artistas y álbum («Provided to YouTube by…»). Los demás resultados (videos musicales)
// van aparte y se muestran tal como los da YouTube.
// Cuota: cada búsqueda nueva gasta 101 unidades de las 10 000 diarias de la clave (unas 99 búsquedas al
// día), por eso se guardan las búsquedas recientes.
import type { Track } from '../player/types'

const KEY = import.meta.env.VITE_YT_API_KEY?.trim()
const BASE = 'https://www.googleapis.com/youtube/v3'
const CACHE_KEY = 'soundblue:busquedas-youtube'
const CACHE_MAX = 40
const CACHE_MS = 24 * 60 * 60 * 1000
const TOPIC = / - Topic$/

/** ¿Hay clave? Sin ella, Buscar usa el catálogo de prueba. */
export const youtubeSearchEnabled = !!KEY

/** Se agotó la cuota diaria de la clave. */
export class QuotaError extends Error {}

/** La clave está mal configurada; el mensaje dice qué revisar. */
export class KeyError extends Error {}

// Motivos que da Google cuando la clave no sirve (en errors[].reason o en details[].reason).
const KEY_PROBLEMS: [RegExp, string][] = [
  [/API_KEY_INVALID|keyInvalid/, 'La clave de YouTube no es válida: revisa que esté completa en el archivo .env.'],
  [/SERVICE_DISABLED|accessNotConfigured/, 'La YouTube Data API v3 no está habilitada en tu proyecto de Google Cloud.'],
  [/REFERRER_BLOCKED|ipRefererBlocked/, 'La clave no permite esta dirección: agrégala en «Restricciones de aplicaciones → Sitios web».'],
  [/API_KEY_SERVICE_BLOCKED/, 'La clave no permite la YouTube Data API v3: revísalo en «Restricciones de API».'],
]

export interface YouTubeResults {
  songs: Track[] // pistas de YouTube Music
  videos: Track[] // videos musicales y demás
}

interface ApiVideo {
  id: string
  snippet?: { title?: string; channelTitle?: string; description?: string }
  contentDetails?: { duration?: string }
  status?: { embeddable?: boolean }
}

async function get<T>(path: string, params: Record<string, string>): Promise<T> {
  const response = await fetch(`${BASE}/${path}?${new URLSearchParams({ ...params, key: KEY ?? '' })}`)
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    const reasons = [...(body?.error?.errors ?? []), ...(body?.error?.details ?? [])]
      .map((item: { reason?: string }) => item?.reason ?? '')
      .join(' ')
    if (response.status === 403 && /quota|dailyLimit|rateLimit/i.test(reasons)) throw new QuotaError(reasons)
    const problem = KEY_PROBLEMS.find(([pattern]) => pattern.test(reasons))
    if (problem) throw new KeyError(problem[1])
    throw new Error(`YouTube respondió ${response.status}${reasons ? ` (${reasons})` : ''}`)
  }
  return response.json()
}

/** «PT3M33S» → 213 segundos. */
function seconds(iso: string | undefined): number | undefined {
  const m = iso?.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/)
  if (!m) return undefined
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0) || undefined
}

/**
 * Artistas y álbum de la descripción que YouTube genera para las pistas de YouTube Music:
 * «Provided to YouTube by Sello» · «Canción · Artista · Artista 2» · «Álbum» · «℗ …», separados por líneas vacías.
 */
function musicInfo(description: string | undefined): { artists?: string; album?: string } {
  const lines = (description ?? '').split('\n').map((line) => line.trim()).filter(Boolean)
  const start = lines.findIndex((line) => line.startsWith('Provided to YouTube by'))
  if (start < 0) return {}
  const credits = lines[start + 1]?.split(' · ') ?? []
  const album = lines[start + 2]
  return {
    artists: credits.length > 1 ? credits.slice(1).join(', ') : undefined,
    album: album && !/^(℗|©|Released on:|Auto-generated)/.test(album) ? album : undefined,
  }
}

function toTrack(video: ApiVideo): Track | null {
  const s = video.snippet
  if (!s?.title || video.status?.embeddable === false) return null
  const channel = s.channelTitle ?? ''
  const duration = seconds(video.contentDetails?.duration)
  if (TOPIC.test(channel)) {
    const info = musicInfo(s.description)
    return { id: video.id, title: s.title, artist: info.artists || channel.replace(TOPIC, ''), album: info.album, duration, ytMusic: true }
  }
  return { id: video.id, title: s.title, artist: channel, duration }
}

interface Cached {
  at: number
  results: YouTubeResults
}

function readCache(): Record<string, Cached> {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

function writeCache(query: string, results: YouTubeResults) {
  try {
    const all = { ...readCache(), [query]: { at: Date.now(), results } }
    const recent = Object.entries(all)
      .sort(([, a], [, b]) => b.at - a.at)
      .slice(0, CACHE_MAX)
    localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(recent)))
  } catch {
    /* sin almacenamiento: la búsqueda funciona igual, solo que no se guarda */
  }
}

/** Busca canciones: primero las pistas de YouTube Music, después los videos musicales. */
export async function youtubeSearch(query: string): Promise<YouTubeResults> {
  const cacheKey = query.trim().toLowerCase().replace(/\s+/g, ' ')
  const cached = readCache()[cacheKey]
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.results

  // 1) Buscar (100 unidades): solo videos de la categoría Música que se pueden incrustar y reproducir fuera de YouTube.
  const found = await get<{ items?: { id?: { videoId?: string } }[] }>('search', {
    part: 'id',
    q: query,
    type: 'video',
    videoCategoryId: '10',
    videoEmbeddable: 'true',
    videoSyndicated: 'true',
    maxResults: '25',
  })
  const ids = (found.items ?? []).map((item) => item.id?.videoId).filter((id): id is string => !!id)
  if (!ids.length) return { songs: [], videos: [] }

  // 2) Detalles (1 unidad): descripción completa (artistas y álbum), duración y si se puede incrustar.
  const details = await get<{ items?: ApiVideo[] }>('videos', { part: 'snippet,contentDetails,status', id: ids.join(',') })
  const byId = new Map((details.items ?? []).map((video) => [video.id, video]))
  const seen = new Set<string>()
  const tracks = ids
    .map((id) => byId.get(id))
    .map((video) => (video ? toTrack(video) : null))
    .filter((track): track is Track => {
      if (!track) return false
      // La misma canción subida dos veces (p. ej. sencillo y álbum con el mismo nombre) aparece una sola vez.
      const key = `${track.title}|${track.artist}|${track.album ?? ''}`.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  const results = { songs: tracks.filter((t) => t.ytMusic), videos: tracks.filter((t) => !t.ytMusic) }
  writeCache(cacheKey, results)
  return results
}
