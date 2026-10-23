// Reproductor de las canciones de Audius: un elemento <audio> normal (sigue sonando con la pantalla apagada).
import { audiusStreamUrl } from '../data/audius'
import type { BackendEvents, LoadOptions, MediaBackend } from './types'

export class AudioBackend implements MediaBackend {
  private readonly audio: HTMLAudioElement
  private pendingSeek: number | null = null

  constructor(events: BackendEvents) {
    const audio = new Audio()
    audio.preload = 'auto'
    audio.addEventListener('playing', () => events.onState('playing'))
    audio.addEventListener('pause', () => !audio.ended && events.onState('paused'))
    audio.addEventListener('waiting', () => events.onState('buffering'))
    audio.addEventListener('ended', () => events.onState('ended'))
    audio.addEventListener('loadedmetadata', () => {
      if (this.pendingSeek != null) audio.currentTime = this.pendingSeek
      this.pendingSeek = null
    })
    audio.addEventListener('error', () => {
      if (!audio.getAttribute('src')) return
      // 4 = formato o archivo no disponible → se trata como «no disponible» (salta a la siguiente)
      events.onError(audio.error?.code === 4 ? 100 : 5)
    })
    this.audio = audio
  }

  load(id: string, { autoplay, start }: LoadOptions): Promise<void> {
    this.pendingSeek = start > 0 ? start : null
    this.audio.src = audiusStreamUrl(id)
    if (autoplay) this.play()
    return Promise.resolve()
  }

  play() {
    this.audio.play().catch(() => {
      /* el navegador pidió un toque del usuario: queda en pausa */
    })
  }

  pause() {
    this.audio.pause()
  }

  /** Deja de sonar y libera la conexión (al pasar a una canción de YouTube). */
  stop() {
    if (!this.audio.getAttribute('src')) return
    this.audio.pause()
    this.audio.removeAttribute('src')
    this.audio.load()
  }

  seek(seconds: number) {
    this.audio.currentTime = seconds
  }

  getTime() {
    return this.audio.currentTime || 0
  }

  getDuration() {
    return Number.isFinite(this.audio.duration) ? this.audio.duration : 0
  }

  setVolume(volume: number, muted: boolean) {
    this.audio.volume = volume
    this.audio.muted = muted
  }
}
