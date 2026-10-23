// Adaptador del reproductor oficial de YouTube (IFrame Player API). Solo usa las funciones documentadas de la API:
// no toca anuncios ni extrae audio. Siempre carga desde YouTube (sin intermediarios ni dominios propios).
import type { BackendEvents, BackendState, LoadOptions, MediaBackend } from './types'

/**
 * De dónde carga el reproductor: www.youtube.com (por defecto) o youtube-nocookie.com (más privado).
 * Comprobado en un Android 10 real con Brave (oct. 2026): al salir de la app YouTube se pausa igual, pero con los
 * filtros de la comunidad de Brave (Ayuda → Brave) el ▶ de la notificación lo reanuda y sigue con la pantalla apagada.
 * Esos filtros solo alcanzan al reproductor si carga desde youtube.com; con nocookie, el ▶ no lo reanudó.
 * Por eso youtube.com es el valor por defecto en todos los navegadores; nocookie solo si el usuario lo elige en la
 * Ayuda. Cambiarlo recarga la app.
 */
const HOST_KEY = 'soundblue:reproductor-youtube'
export type PlayerHost = 'nocookie' | 'youtube'
export const playerHost = {
  get(): PlayerHost {
    try {
      return localStorage.getItem(HOST_KEY) === 'nocookie' ? 'nocookie' : 'youtube'
    } catch {
      return 'youtube'
    }
  },
  set(value: PlayerHost) {
    try {
      localStorage.setItem(HOST_KEY, value)
    } catch {
      /* sin almacenamiento: se queda el de siempre */
    }
  },
  url: () => (playerHost.get() === 'youtube' ? 'https://www.youtube.com' : 'https://www.youtube-nocookie.com'),
}

declare global {
  interface Window {
    YT?: typeof YT
    onYouTubeIframeAPIReady?: () => void
  }
}

const API_URL = 'https://www.youtube.com/iframe_api'
let apiPromise: Promise<typeof YT> | null = null

/** Carga el script oficial de la API una sola vez. */
function loadApi(): Promise<typeof YT> {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  apiPromise ??= new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previous?.()
      resolve(window.YT!)
    }
    const script = document.createElement('script')
    script.src = API_URL
    script.async = true
    script.onerror = () => {
      apiPromise = null
      reject(new Error('No se pudo cargar el reproductor de YouTube'))
    }
    document.head.appendChild(script)
  })
  return apiPromise
}

// Códigos de estado de la API: -1 sin empezar, 0 terminó, 1 sonando, 2 en pausa, 3 cargando, 5 listo.
function mapState(code: number): BackendState {
  switch (code) {
    case 0:
      return 'ended'
    case 1:
      return 'playing'
    case 2:
      return 'paused'
    case 3:
      return 'buffering'
    case 5:
      return 'cued'
    default:
      return 'unstarted'
  }
}

export class YouTubeBackend implements MediaBackend {
  private host: HTMLElement | null = null
  private player: YT.Player | null = null
  private creating: Promise<YT.Player> | null = null
  private readonly events: BackendEvents

  constructor(events: BackendEvents) {
    this.events = events
  }

  /** Elemento donde vivirá el iframe (lo pone VideoStage al montarse). */
  attach(host: HTMLElement) {
    this.host = host
  }

  async load(videoId: string, options: LoadOptions): Promise<void> {
    if (!this.player) {
      const isFirstLoad = !this.creating
      await this.create(videoId, options)
      if (isFirstLoad) return // el reproductor se creó ya con este video
    }
    const params = { videoId, startSeconds: options.start }
    if (options.autoplay) this.player!.loadVideoById(params)
    else this.player!.cueVideoById(params)
  }

  play() {
    this.player?.playVideo()
  }

  pause() {
    this.player?.pauseVideo()
  }

  seek(seconds: number) {
    this.player?.seekTo(seconds, true)
  }

  getTime(): number {
    return this.player?.getCurrentTime() ?? 0
  }

  getDuration(): number {
    return this.player?.getDuration() ?? 0
  }

  setVolume(volume: number, muted: boolean) {
    if (!this.player) return
    this.player.setVolume(Math.round(volume * 100))
    if (muted) this.player.mute()
    else this.player.unMute()
  }

  private create(videoId: string, { autoplay, start }: LoadOptions): Promise<YT.Player> {
    this.creating ??= loadApi().then(
      (api) =>
        new Promise<YT.Player>((resolve, reject) => {
          if (!this.host) return reject(new Error('El reproductor todavía no está en la página'))
          const target = document.createElement('div')
          this.host.replaceChildren(target)
          const player = new api.Player(target, {
            host: playerHost.url(),
            width: '100%',
            height: '100%',
            videoId,
            playerVars: {
              autoplay: autoplay ? 1 : 0,
              start: Math.floor(start),
              enablejsapi: 1, // la API lo pone sola; explícito para que se note que la app controla el reproductor así
              playsinline: 1, // en el celular se reproduce dentro de la app, no a pantalla completa
              controls: 0, // sin la barra de controles de YouTube: se usan los de la app (parámetro oficial)
              disablekb: 1,
              rel: 0, // al terminar, sugerencias solo del mismo canal (igual pasamos de inmediato a la siguiente)
              iv_load_policy: 3, // sin anotaciones sobre el video
              modestbranding: 1, // refuerzo: YouTube lo ignora desde 2023, su logo y enlaces siguen apareciendo
              origin: window.location.origin,
            },
            events: {
              onReady: () => {
                this.player = player
                this.events.onReady()
                if (autoplay) player.playVideo()
                resolve(player)
              },
              onStateChange: (event) => this.events.onState(mapState(event.data)),
              onError: (event) => this.events.onError(event.data),
            },
          })
        }),
    )
    this.creating.catch(() => {
      this.creating = null // permite reintentar si falló la carga
    })
    return this.creating
  }
}
