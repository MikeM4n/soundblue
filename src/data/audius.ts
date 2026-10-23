// Cliente de la API pública de Audius: música libre de artistas independientes, en audio normal.
// No pide clave, solo un nombre de app. Responde con CORS abierto, así que se llama desde el navegador.
import type { Track } from '../player/types'

const BASE = 'https://api.audius.co/v1'
const APP_NAME = 'soundblue'

interface AudiusTrack {
  id: string
  title: string
  duration?: number
  is_streamable?: boolean
  is_stream_gated?: boolean
  is_delete?: boolean
  user?: { name?: string }
  artwork?: { '150x150'?: string; '480x480'?: string; mirrors?: string[] } | null
}

/** La carátula servida desde los otros servidores (espejos) que indica Audius. */
function mirrorsOf(url: string | undefined, mirrors: string[] | undefined): string[] {
  if (!url || !mirrors?.length) return []
  try {
    const { pathname, search } = new URL(url)
    return mirrors.map((host) => `${host.replace(/\/$/, '')}${pathname}${search}`).filter((u) => u !== url)
  } catch {
    return []
  }
}

export const audiusStreamUrl = (id: string) => `${BASE}/tracks/${encodeURIComponent(id)}/stream?app_name=${APP_NAME}`

async function get(path: string): Promise<AudiusTrack[]> {
  const separator = path.includes('?') ? '&' : '?'
  const response = await fetch(`${BASE}${path}${separator}app_name=${APP_NAME}`)
  if (!response.ok) throw new Error(`Audius respondió ${response.status}`)
  const json = await response.json()
  return Array.isArray(json?.data) ? json.data : []
}

// Solo lo que se puede escuchar gratis (sin contenido de pago, borrado o no disponible).
function toTracks(items: AudiusTrack[]): Track[] {
  return items
    .filter((t) => t?.id && !t.is_stream_gated && !t.is_delete && t.is_streamable !== false)
    .map((t) => {
      const artwork = t.artwork?.['480x480'] ?? t.artwork?.['150x150']
      return {
        id: t.id,
        title: t.title || 'Sin título',
        artist: t.user?.name || 'Artista de Audius',
        duration: t.duration,
        source: 'audius' as const,
        artwork,
        artworkMirrors: mirrorsOf(artwork, t.artwork?.mirrors),
      }
    })
}

let trendingCache: Promise<Track[]> | null = null

/** Lo más escuchado esta semana en Audius (se pide una sola vez por sesión). */
export function audiusTrending(limit = 12): Promise<Track[]> {
  trendingCache ??= get(`/tracks/trending?limit=${limit}`).then(toTracks)
  trendingCache.catch(() => (trendingCache = null)) // si falló, se reintenta la próxima vez
  return trendingCache
}

export async function audiusSearch(query: string, limit = 12): Promise<Track[]> {
  return toTracks(await get(`/tracks/search?query=${encodeURIComponent(query)}&limit=${limit}`))
}
