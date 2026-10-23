// Controles del sistema: pantalla de bloqueo, notificación y teclas multimedia (Media Session API).
// El sonido sale del iframe de YouTube y cada navegador decide si muestra estos controles o los de YouTube
// (en Android sale la notificación simple del navegador). Las teclas multimedia del PC sí los usan.
// El estado (sonando/en pausa) sigue al reproductor real: si YouTube se pausa solo, la notificación lo muestra; si
// se pulsa ▶ en la notificación, la app reproduce (es una orden del usuario; la app nunca reanuda por su cuenta).
import { sizedArtwork, thumbnail, type Status, type Track } from './types'

interface Controls {
  play(): void
  pause(): void
  next(): void
  prev(): void
  seek(seconds: number): void
  seekBy(delta: number): void
}

const supported = () => typeof navigator !== 'undefined' && 'mediaSession' in navigator

export function setupMediaSession(controls: Controls) {
  if (!supported()) return
  const set = (action: MediaSessionAction, handler: MediaSessionActionHandler) => {
    try {
      navigator.mediaSession.setActionHandler(action, handler)
    } catch {
      /* acción no soportada en este navegador */
    }
  }
  set('play', () => controls.play())
  set('pause', () => controls.pause())
  set('previoustrack', () => controls.prev())
  set('nexttrack', () => controls.next())
  set('seekbackward', (d) => controls.seekBy(-(d.seekOffset ?? 10)))
  set('seekforward', (d) => controls.seekBy(d.seekOffset ?? 10))
  set('seekto', (d) => d.seekTime != null && controls.seek(d.seekTime))
  set('stop', () => controls.pause())
}

/** Recorta al cuadrado la imagen de un video de YouTube (en las pistas de YouTube Music, la portada va al centro). */
function squareCover(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous' // i.ytimg.com permite CORS: así el lienzo se puede exportar
    img.onload = () => {
      const side = Math.min(img.naturalWidth, img.naturalHeight)
      if (side <= 90) return reject(new Error('sin imagen')) // 120×90 = YouTube no tiene esa resolución
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = Math.min(side, 512)
      const sx = (img.naturalWidth - side) / 2
      const sy = (img.naturalHeight - side) / 2
      canvas.getContext('2d')?.drawImage(img, sx, sy, side, side, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.9))
    }
    img.onerror = () => reject(new Error('no cargó'))
    img.src = url
  })
}

// Tamaños de portada que YouTube Music ya tiene listos (los usa en su web); otros tamaños a veces dan 429.
// 544 para Android (pide 512 o más) y 302 para teléfonos más sencillos (256 o más).
const YTM_SIZES = [302, 544]

/** Carátulas cuadradas en varios tamaños: el sistema elige la que mejor le quede. */
function artworkFor(track: Track): MediaImage[] {
  if (track.artwork) return YTM_SIZES.map((px) => ({ src: sizedArtwork(track.artwork!, px), sizes: `${px}x${px}`, type: 'image/jpeg' }))
  return [{ src: thumbnail(track.id, 'hq'), sizes: '480x360', type: 'image/jpeg' }] // enseguida se cambia por un recorte cuadrado
}

let metadataFor: string | null = null

/**
 * Título, artista, álbum y carátula para la pantalla de bloqueo y la notificación. En las pistas de YouTube
 * Music son los datos de la canción (no los del video), con su portada cuadrada; a un video sin portada se le
 * recorta la imagen al cuadrado (512 px). Sin álbum conocido se muestra la lista desde donde suena.
 */
export function updateMetadata(track: Track | null, contextName?: string | null) {
  if (!supported()) return
  metadataFor = track?.id ?? null
  if (!track) {
    navigator.mediaSession.metadata = null
    return
  }
  const info = { title: track.title, artist: track.artist, album: track.album || contextName || 'SoundBlue' }
  navigator.mediaSession.metadata = new MediaMetadata({ ...info, artwork: artworkFor(track) })
  if (track.artwork) return // ya es cuadrada
  squareCover(thumbnail(track.id, 'maxres'))
    .catch(() => squareCover(thumbnail(track.id, 'mq')))
    .then((src) => {
      if (metadataFor !== track.id) return // ya suena otra canción
      navigator.mediaSession.metadata = new MediaMetadata({ ...info, artwork: [{ src, sizes: '512x512', type: 'image/jpeg' }] })
    })
    .catch(() => {
      /* se queda la imagen 16:9 */
    })
}

export function updatePlaybackState(status: Status) {
  if (!supported()) return
  navigator.mediaSession.playbackState =
    status === 'playing' || status === 'buffering' ? 'playing' : status === 'idle' ? 'none' : 'paused'
}

export function updatePosition(duration: number, position: number) {
  if (!supported() || !navigator.mediaSession.setPositionState || !(duration > 0)) return
  try {
    navigator.mediaSession.setPositionState({ duration, playbackRate: 1, position: Math.min(position, duration) })
  } catch {
    /* posición fuera de rango mientras carga */
  }
}
