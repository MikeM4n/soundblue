import { ChevronUp, Heart, Users } from 'lucide-react'
import { useEffect, useRef, useState, useSyncExternalStore, type PointerEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { lyricsOf, type Lyrics } from '../../data/lyrics'
import { useGuestJam } from '../../jam/guestJam'
import { useLibrary } from '../../library/store'
import { useSettings } from '../../lib/settings'
import { usePreventTouchMove } from '../../lib/usePreventTouchMove'
import { openInYouTubeMusic } from '../../lib/youtubeMusicLink'
import { player } from '../../player/engine'
import { sheetState, stageBox, stagePulse, useStageSlot, youtubeView, type YouTubeView } from '../../player/stage'
import { coverSources, type Track } from '../../player/types'
import { onlyInYouTubeMusic } from '../../player/unavailable'
import { usePlayer } from '../../player/usePlayer'
import { inBrowserTab, TAB_SWITCHER_TIP } from '../../lib/tabSwitcherTip'
import { showToast } from '../../ui/toast'
import { TrackMenu } from '../tracks/TrackMenu'
import { toggleFavorite } from '../tracks/trackActions'
import { Cover } from '../ui/Cover'
import { IconButton } from '../ui/IconButton'
import { Backdrop } from './Backdrop'
import { CoverSwipe } from './CoverSwipe'
import { QueuePanel } from './QueuePanel'
import { SeekBar } from './SeekBar'
import { TransportControls } from './TransportControls'

const SLIDE_MS = 300
const INTERACTIVE = 'button, a, input, [role="menu"], [data-queue-panel], [data-lyrics]'

/**
 * «Sonando ahora» en pantalla completa, como Spotify. Sube deslizándose al tocar una canción.
 * Fondo: la imagen de la canción en alta resolución, muy difuminada y oscurecida. Al centro: la carátula
 * nítida o, con «Letra», el reproductor oficial a todo el ancho (16:9, sin nada encima ni recortado: así lo exige
 * YouTube) y la letra debajo, que se desplaza con el dedo.
 * Debajo: título, artista, favorito, progreso y controles. Un toque en el fondo los oculta o muestra.
 * Gestos: hacia abajo = minimizar (si el panel de la cola está cerrado) · hacia arriba = «Próximas en sonar».
 * Ojo: los toques sobre el video los recibe YouTube, así que los gestos se hacen fuera del video.
 */
export function NowPlayingSheet() {
  const { current, contextName, error } = usePlayer()
  const { favorites } = useLibrary()
  const navigate = useNavigate()
  const location = useLocation()
  const videoSlot = useStageSlot('pantalla')
  const video = useSyncExternalStore(stageBox.subscribe, stageBox.get)
  const view = useSyncExternalStore(youtubeView.subscribe, youtubeView.get)
  const { hideViewToggle } = useSettings() // Ajustes: ocultar «Canción | Letra»
  const [shown, setShown] = useState(false) // para la animación de entrada
  const [closing, setClosing] = useState(false)
  const [dragY, setDragY] = useState<number | null>(null)
  const [queueOpen, setQueueOpen] = useState(false)
  const [controlsHidden, setControlsHidden] = useState(false)
  const drag = useRef<{ pointerId: number; startY: number; startX: number; axis: 'x' | 'y' | null; dy: number } | null>(null)
  const showTimer = useRef<number | undefined>(undefined)
  const closeTimer = useRef<number | undefined>(undefined)
  const rootRef = useRef<HTMLDivElement>(null)
  usePreventTouchMove(rootRef, () => drag.current?.axis === 'y')

  // Entrada: empieza abajo y sube.
  useEffect(() => {
    sheetState.set('open')
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)))
    stagePulse.emit()
    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(showTimer.current)
      // Si mientras bajaba ya fuiste a otra pantalla, no se vuelve atrás (te sacaría de donde estás).
      window.clearTimeout(closeTimer.current)
      sheetState.set('closed')
    }
  }, [])

  const close = () => {
    if (closing) return
    setClosing(true)
    sheetState.set('closing')
    stagePulse.emit()
    closeTimer.current = window.setTimeout(() => {
      const background = (location.state as { background?: unknown } | null)?.background
      if (background) navigate(-1)
      else navigate('/', { replace: true })
    }, SLIDE_MS)
  }

  // En el PC, Esc minimiza (o cierra «Próximas en sonar» si está abierta). Si Esc ya cerró un menú, no hace nada más.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      if (queueOpen) setQueueOpen(false)
      else close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // Deslizar: hacia abajo minimiza; hacia arriba abre «Próximas en sonar». La dirección dominante decide.
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (queueOpen || (e.target as Element).closest(INTERACTIVE)) return
    drag.current = { pointerId: e.pointerId, startY: e.clientY, startX: e.clientX, axis: null, dy: 0 }
  }
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || e.pointerId !== d.pointerId) return
    const dy = e.clientY - d.startY
    const dx = e.clientX - d.startX
    if (!d.axis) {
      if (Math.abs(dy) < 8 && Math.abs(dx) < 8) return
      d.axis = Math.abs(dy) > Math.abs(dx) ? 'y' : 'x'
      if (d.axis === 'y') e.currentTarget.setPointerCapture(e.pointerId)
    }
    if (d.axis !== 'y') return
    d.dy = dy
    if (dy > 0) {
      setDragY(dy) // la pantalla sigue al dedo hacia abajo
      stagePulse.emit() // y el video con ella
    }
  }
  const onPointerUp = () => {
    const d = drag.current
    drag.current = null
    if (!d || d.axis !== 'y') return
    setDragY(null)
    if (d.dy > window.innerHeight * 0.18) close()
    else if (d.dy < -60) setQueueOpen(true)
    else stagePulse.emit()
  }

  if (!current) {
    return (
      <div className="fixed inset-x-0 top-0 bottom-[var(--nav-h,0px)] z-30 grid place-items-center bg-fondo p-8 text-center">
        <div>
          <p className="text-lg font-semibold">No hay nada sonando</p>
          <button type="button" onClick={close} className="mt-2 text-acento-texto hover:underline">
            Volver
          </button>
        </div>
      </div>
    )
  }

  const showLyrics = view === 'letra'
  const liked = favorites.some((t) => t.id === current.id)
  // Un toque en el fondo oculta los controles para ver el video o la carátula; vuelven solos a los 5 s.
  const toggleControls = () => {
    window.clearTimeout(showTimer.current)
    setControlsHidden((hidden) => {
      if (!hidden) showTimer.current = window.setTimeout(() => setControlsHidden(false), 5000)
      return !hidden
    })
  }
  const fade = `transition-opacity duration-300 ${controlsHidden ? 'pointer-events-none opacity-0' : 'opacity-100'}`
  // Con el video a la vista, el panel de la cola sube solo hasta debajo del video: no puede taparlo.
  const panelTop = video?.kind === 'pantalla' ? video.top + video.height + 8 : Math.round(window.innerHeight * 0.12)
  const offset = !shown || closing ? '100%' : `${dragY ?? 0}px`

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label="Sonando ahora"
      // Toda la pantalla menos la barra inferior del celular (--nav-h, la publica MobileNav): esa barra sigue a la vista.
      className="fixed inset-x-0 top-0 bottom-[var(--nav-h,0px)] z-30 touch-none overflow-hidden overscroll-contain bg-fondo text-white select-none"
      style={{ transform: `translateY(${offset})`, transition: dragY === null ? `transform ${SLIDE_MS}ms cubic-bezier(.2,.8,.2,1)` : 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClick={(e) => !queueOpen && !(e.target as Element).closest(INTERACTIVE) && toggleControls()}
    >
      <Backdrop track={current} />

      {/* Tres partes: encabezado arriba, controles abajo con ALTO FIJO (título en 2 líneas como máximo) y, en medio,
          el espacio que sobra para la carátula o el video, centrados. Nada entra ni sale del flujo al deslizar o al
          cambiar de canción, así que el conjunto no salta y nunca hay scroll. */}
      <div className="relative mx-auto flex h-full max-w-5xl flex-col pt-[env(safe-area-inset-top)] pb-2">
        <header className={`flex shrink-0 items-center gap-1 px-2 py-2 ${fade}`}>
          {/* Izquierda vacía (del ancho de los dos botones de la derecha, para que el título quede centrado); centro: de
              dónde suena; derecha: Jam y ⋮. Minimizar: deslizar hacia abajo o, en el PC, la tecla Esc. */}
          <span className="w-20 shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1 text-center">
            <p className="text-[11px] font-semibold tracking-wider text-white/70 uppercase">Sonando desde</p>
            <p className="truncate text-sm font-bold">{contextName ?? 'Tu música'}</p>
          </div>
          <JamButton />
          <TrackMenu track={current} />
        </header>

        {/* Centro: la carátula nítida (como Spotify y YouTube Music) o, si eliges «Letra», el reproductor oficial a
            todo el ancho, sin nada encima, y la letra debajo. */}
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3">
          {!hideViewToggle && <ViewToggle view={view} fade={fade} />}
          {showLyrics ? (
            <div className="flex min-h-0 w-full flex-1 flex-col">
              {/* Espacio del video: VideoStage coloca aquí el reproductor oficial. */}
              <div ref={closing ? undefined : videoSlot} className="aspect-video w-full shrink-0" />
              <LyricsPanel track={current} />
            </div>
          ) : (
            // La carátula mide lo que quepa: 82 % del ancho, máx. 26 rem, y nunca más que el alto libre (100cqh).
            <div className="grid min-h-0 w-full flex-1 place-items-center [container-type:size]">
              {/* Deslizar la carátula: izquierda = siguiente, derecha = anterior (o reiniciar si lleva más de 3 s). */}
              <CoverSwipe className="w-[min(82vw,26rem,100cqh)]">
                <Cover seed={current.id} src={coverSources(current, 'large')} eager className="aspect-square w-full rounded-lg shadow-2xl shadow-black/60" />
              </CoverSwipe>
            </div>
          )}
        </div>
        {/* Abajo, alto fijo: aviso de segundo plano, título, artista, progreso, controles y la pista de la cola. */}
        <div className="shrink-0">
          <BackgroundNotice fade={fade} />
          <TrackInfo track={current} liked={liked} fade={fade} error={error} />
          <QueueHint onOpen={() => setQueueOpen(true)} fade={fade} />
        </div>
      </div>

      <QueuePanel open={queueOpen} top={panelTop} onClose={() => setQueueOpen(false)} />
    </div>
  )
}

/**
 * Aviso de segundo plano (alto fijo de dos líneas, para que nada salte). En una pestaña de Chrome: el truco del selector
 * de pestañas (ℹ️ muestra el texto completo). Instalada: la app intenta reanudar sola lo que YouTube pausó (experimental)
 * y, si no lo logra, queda el ▶ de la notificación.
 */
function BackgroundNotice({ fade }: { fade: string }) {
  const [tab] = useState(inBrowserTab)
  const navigate = useNavigate()
  const { status, pausedOnExit } = usePlayer()
  const help = (
    <Link to="/ayuda" state={{ seccion: 'ayuda-notificacion' }} className="font-semibold text-white/80 underline underline-offset-2">
      Ayuda
    </Link>
  )
  // YouTube la pausó al salir de la app: el respaldo por si la notificación no aparece (lo pulsa el usuario).
  if (pausedOnExit && status === 'paused') {
    return (
      <p className={`mx-6 mt-3 flex h-7 items-center justify-center gap-2 text-center text-[11px] leading-[14px] text-white/70 ${fade}`}>
        <span>YouTube pausó la música al salir.</span>
        <button type="button" onClick={() => player.play()} className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-bold text-black">
          ▶ Reanudar
        </button>
      </p>
    )
  }
  if (tab) {
    const showTip = () =>
      showToast(TAB_SWITCHER_TIP, { label: 'Ayuda', run: () => navigate('/ayuda', { state: { seccion: 'ayuda-truco-pestanas' } }) }, 15000)
    return (
      <p className={`mx-6 mt-3 flex h-7 items-center justify-center gap-1.5 text-center text-[11px] leading-[14px] text-white/55 ${fade}`}>
        <span className="line-clamp-2">💡 Para que no se pause, sal por las pestañas de Chrome (el número arriba) y de ahí a Inicio.</span>
        <button type="button" aria-label="Cómo salir sin que se pause la música" onClick={showTip} className="shrink-0 text-base leading-none">
          ℹ️
        </button>
      </p>
    )
  }
  return (
    <p className={`mx-6 mt-3 line-clamp-2 h-7 text-center text-[11px] leading-[14px] text-white/55 ${fade}`}>
      Al salir se pausa un instante y la app intenta reanudarla sola; si no lo logra, pulsa ▶ en la notificación ({help}).
    </p>
  )
}

/** «Jam»: lleva a tu sala (o a la del amigo en cuya Jam estás) sin buscarla en el menú. */
function JamButton() {
  const navigate = useNavigate()
  const { code } = useGuestJam()
  return (
    <IconButton label="Jam: escuchar en grupo" onClick={() => navigate(code ? `/jam/${code}` : '/jam', { replace: true })} className="text-white">
      <Users className="size-6" />
    </IconButton>
  )
}

/**
 * Letra de la canción (data/lyrics.ts), debajo del video: nunca encima. Se desplaza con el dedo (no minimiza «Sonando
 * ahora») y muestra su fuente, como pide quien la licencia.
 */
function LyricsPanel({ track }: { track: Track }) {
  const [found, setFound] = useState<{ id: string; lyrics: Lyrics | null | 'error' } | null>(null)
  useEffect(() => {
    let alive = true
    lyricsOf(track)
      .then((lyrics) => alive && setFound({ id: track.id, lyrics }))
      .catch(() => alive && setFound({ id: track.id, lyrics: 'error' }))
    return () => {
      alive = false
    }
  }, [track])
  const lyrics = found?.id === track.id ? found.lyrics : undefined
  return (
    <div
      data-lyrics
      aria-label="Letra"
      // Se desvanece arriba y abajo: las líneas no se cortan de golpe.
      className="scroll-fino mt-2 min-h-0 w-full flex-1 touch-pan-y overflow-y-auto overscroll-contain px-6 pt-3 pb-6 text-center [mask-image:linear-gradient(to_bottom,transparent,black_16px,black_calc(100%-32px),transparent)]"
    >
      {lyrics === undefined ? (
        <p className="text-sm text-white/60">Buscando la letra…</p>
      ) : lyrics === 'error' ? (
        <p className="text-sm text-white/60">No se pudo cargar la letra. Revisa tu conexión.</p>
      ) : lyrics === null ? (
        <p className="text-sm text-white/60">No encontramos la letra de esta canción.</p>
      ) : (
        <>
          <p className="text-lg leading-relaxed font-semibold whitespace-pre-line text-white/90">{lyrics.text}</p>
          {lyrics.source && <p className="mt-4 text-xs text-white/50">{lyrics.source}</p>}
        </>
      )}
    </div>
  )
}

/** «Canción | Letra»: carátula, o el reproductor oficial con la letra debajo. La música sigue igual al cambiar. */
function ViewToggle({ view, fade }: { view: YouTubeView; fade: string }) {
  const options: [YouTubeView, string][] = [
    ['cancion', 'Canción'],
    ['letra', 'Letra'],
  ]
  return (
    <div role="group" aria-label="Qué ver" className={`flex h-9 shrink-0 rounded-full bg-black/40 p-1 text-sm font-semibold ${fade}`}>
      {options.map(([value, label]) => (
        <button
          key={value}
          type="button"
          aria-pressed={view === value}
          onClick={() => youtubeView.set(value)}
          className={`rounded-full px-4 py-1 transition-colors ${view === value ? 'bg-white text-black' : 'text-white/80 hover:text-white'}`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

/**
 * Título (máx. 2 líneas, alto reservado para 2), artista, álbum o aviso de error (siempre una línea), favorito,
 * barra de progreso y controles. Su alto no cambia entre canciones.
 */
function TrackInfo({ track, liked, fade, error }: { track: Track; liked: boolean; fade: string; error: string | null }) {
  const onlyInYtm = useSyncExternalStore(onlyInYouTubeMusic.subscribe, onlyInYouTubeMusic.get).has(track.id)
  return (
    <div className={`px-6 pt-2 lg:px-10 ${fade}`}>
      <div className="flex items-end gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex h-[3.5rem] items-end">
            <h1 className="line-clamp-2 text-2xl leading-7 font-bold break-words">{track.title}</h1>
          </div>
          <p className="truncate text-texto-sec">{track.artist}</p>
          {error && onlyInYtm ? (
            // YouTube no la deja sonar fuera de sus apps: se ofrece abrirla en YouTube Music (en una línea, como el resto).
            <p role="alert" aria-label={error} className="flex items-center gap-2 text-xs">
              <span className="truncate text-red-300">No disponible aquí</span>
              <button type="button" onClick={() => openInYouTubeMusic(track.id)} className="shrink-0 font-semibold text-white underline underline-offset-2">
                Abrir en YouTube Music
              </button>
            </p>
          ) : error ? (
            <p role="alert" className="truncate text-xs text-red-300">
              {error}
            </p>
          ) : (
            <p className="h-4 truncate text-xs text-white/50">{track.album}</p>
          )}
        </div>
        <IconButton label={liked ? 'Quitar de favoritos' : 'Agregar a favoritos'} active={liked} onClick={() => toggleFavorite(track)} className={liked ? '' : 'text-white'}>
          <Heart className={`size-7 ${liked ? 'fill-current' : ''}`} />
        </IconButton>
      </div>
      <div className="mt-3">
        <SeekBar />
      </div>
      <div className="mt-2 flex justify-center">
        <TransportControls large />
      </div>
    </div>
  )
}

/** Pista del gesto para abrir la cola (también se puede tocar, para quien no usa gestos). */
function QueueHint({ onOpen, fade }: { onOpen: () => void; fade: string }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`mx-auto mt-3 flex items-center gap-1 text-xs font-semibold tracking-wide text-white/60 uppercase ${fade}`}
    >
      <ChevronUp className="size-4" aria-hidden="true" />
      Desliza hacia arriba: próximas en sonar
    </button>
  )
}
