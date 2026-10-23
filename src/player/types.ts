export type Source = 'youtube' | 'audius'

/** Una canción: un video de YouTube o una pista de Audius. */
export interface Track {
  id: string // id del video de YouTube (p. ej. "60ItHLz5WEA") o de la pista de Audius
  title: string
  artist: string
  artistId?: string // id del (primer) artista en YouTube Music, para «Para ti»
  album?: string // álbum, si se conoce (pistas de YouTube Music)
  duration?: number // segundos, si se conoce
  source?: Source // si falta, es de YouTube (así se guardaron las primeras canciones)
  ytMusic?: boolean // pista de YouTube Music (canal «Artista - Topic»): su imagen es la portada del álbum
  artwork?: string // carátula: la de Audius o la portada cuadrada de YouTube Music (si no, la imagen del video)
  artworkMirrors?: string[] // la misma carátula en otros servidores de Audius, por si el primero falla
}

export const sourceOf = (track: Track): Source => track.source ?? 'youtube'

/** Etiqueta discreta de la fuente, por transparencia. */
export const sourceLabel = (track: Track): string =>
  sourceOf(track) === 'audius' ? 'Audius' : track.ytMusic ? 'YouTube Music' : 'YouTube'

export type Repeat = 'off' | 'all' | 'one'

/**
 * Estado del reproductor. 'standby' = se restauró la sesión anterior pero la canción aún no se cargó
 * (no se reproduce nada solo al abrir la app).
 */
export type Status = 'idle' | 'standby' | 'loading' | 'playing' | 'paused' | 'buffering' | 'ended' | 'error'

/** Estados que reportan los reproductores, ya traducidos. */
export type BackendState = 'unstarted' | 'cued' | 'playing' | 'paused' | 'buffering' | 'ended'

export interface LoadOptions {
  autoplay: boolean
  start: number // segundos
}

export interface BackendEvents {
  onReady(): void
  onState(state: BackendState): void
  onError(code: number): void
}

/** Lo que el motor necesita de un reproductor (YouTube o audio de Audius). */
export interface MediaBackend {
  load(id: string, options: LoadOptions): Promise<void>
  play(): void
  pause(): void
  seek(seconds: number): void
  getTime(): number
  getDuration(): number
  setVolume(volume: number, muted: boolean): void
}

/** Miniatura oficial del video (servida por YouTube). 'maxres' = 1280×720, no existe en todos los videos. */
export function thumbnail(videoId: string, quality: 'mq' | 'hq' | 'maxres' = 'hq'): string {
  return `https://i.ytimg.com/vi/${videoId}/${quality}default.jpg`
}

/**
 * Imagen de la canción: carátula de Audius o imagen de YouTube. En las pistas de YouTube Music la portada
 * va al centro de una imagen 16:9 ('mq' y 'maxres'; 'hq' agrega franjas negras arriba y abajo), así que
 * recortada al cuadrado (object-cover) queda la portada exacta.
 */
export function coverUrl(track: Track, size: 'small' | 'large' = 'small'): string | undefined {
  if (sourceOf(track) === 'audius') return track.artwork
  if (track.artwork) return sizedArtwork(track.artwork, size === 'small' ? 120 : 544)
  if (size === 'small') return thumbnail(track.id, 'mq')
  return thumbnail(track.id, track.ytMusic ? 'maxres' : 'hq')
}

/** La imagen y sus alternativas, en orden: si una no carga, se prueba la siguiente. */
export function coverSources(track: Track, size: 'small' | 'large' = 'small'): string[] {
  if (sourceOf(track) === 'youtube') {
    // La portada en el tamaño pedido y, si Google no la da así (a veces responde 429), la original.
    const art = track.artwork ? [...new Set([sizedArtwork(track.artwork, size === 'small' ? 120 : 544), track.artwork])] : []
    // Alta resolución si existe; maxres y mq vienen sin franjas negras.
    return size === 'large' ? [...art, thumbnail(track.id, 'maxres'), thumbnail(track.id, 'mq')] : [...art, thumbnail(track.id, 'mq')]
  }
  return [...(track.artwork ? [track.artwork] : []), ...(track.artworkMirrors ?? [])]
}

/** Portada de YouTube Music en el tamaño pedido (sus direcciones llevan el tamaño: «…=w120-h120-l90-rj»). */
export function sizedArtwork(url: string, px: number): string {
  return url.replace(/=w\d+-h\d+/, `=w${px}-h${px}`)
}

export const isTrack = (t: unknown): t is Track =>
  typeof t === 'object' && t !== null && typeof (t as Track).id === 'string' && typeof (t as Track).title === 'string'

/** Id corto y único (crypto.randomUUID no existe sin HTTPS, p. ej. al probar en la red local). */
export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
