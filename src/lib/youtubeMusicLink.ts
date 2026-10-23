// Abrir una canción en la app de YouTube Music (para las que YouTube no deja reproducir fuera de sus apps).
import { detectPlatform } from './platform'

export const youtubeMusicUrl = (videoId: string) => `https://music.youtube.com/watch?v=${encodeURIComponent(videoId)}`

/**
 * En Android abre la app de YouTube Music (si no está instalada, la página web); en el PC, la página web.
 * Siempre en otra pestaña o app: SoundBlue sigue abierta.
 */
export function openInYouTubeMusic(videoId: string) {
  const web = youtubeMusicUrl(videoId)
  const url =
    detectPlatform() === 'android'
      ? `intent://music.youtube.com/watch?v=${encodeURIComponent(videoId)}#Intent;scheme=https;package=com.google.android.apps.youtube.music;S.browser_fallback_url=${encodeURIComponent(web)};end`
      : web
  window.open(url, '_blank', 'noopener')
}
