// Registro de segundo plano, para averiguar EN EL TELÉFONO por qué se detiene la música al bloquear la pantalla:
// anota cuándo se oculta o se muestra la página y qué reporta el reproductor en ese momento (y en qué vista).
// Cada línea lleva los milisegundos de performance.now() y lo que dice el navegador (visibilityState / hidden), para
// comparar al milisegundo una prueba manual (selector de pestañas) con una automática.
// Se guarda solo en este navegador (últimos 150 eventos), se lee en Ayuda y no se envía a ningún lado.
import { player, type AutoResumeEvent } from '../player/engine'
import { sheetState, youtubeView } from '../player/stage'
import type { Status } from '../player/types'
import { playerHost } from '../player/youtube'

const KEY = 'soundblue:diagnostico'
const MAX = 150

export interface DiagnosticEvent {
  t: number // hora del reloj (Date.now)
  p?: number // milisegundos desde que se abrió la página (performance.now)
  v?: string // lo que reportaba el navegador: «visibilityState/hidden»
  msg: string
}

let events: DiagnosticEvent[] = read()
let started = false

function read(): DiagnosticEvent[] {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(saved) ? saved : []
  } catch {
    return []
  }
}

function log(msg: string, p = performance.now()) {
  const v = `${document.visibilityState}/${document.hidden}`
  events = [...events, { t: Date.now(), p, v, msg }].slice(-MAX)
  try {
    localStorage.setItem(KEY, JSON.stringify(events))
  } catch {
    /* sin almacenamiento: el registro dura mientras la app esté abierta */
  }
}

const clock = (t: number) => new Date(t).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

/** Una línea del registro: «03:41:20 p. m. [123456.789 ms] [hidden/true] Página oculta…». */
export function formatEvent(event: DiagnosticEvent): string {
  const ms = event.p === undefined ? '' : ` [${event.p.toFixed(3)} ms]`
  const vis = event.v ? ` [${event.v}]` : ''
  return `${clock(event.t)}${ms}${vis}  ${event.msg}`
}

const STATUS: Record<Status, string> = {
  playing: 'sonando',
  paused: 'en pausa',
  buffering: 'cargando',
  loading: 'cargando',
  ended: 'terminó',
  error: 'error',
  idle: 'sin canción',
  standby: 'lista para sonar',
}

const AUTO_RESUME_LOG: Record<AutoResumeEvent, (detail: string) => string> = {
  ocultar: (d) => `${d}: silencio + playVideo()`,
  pausa: (d) => `player.pauseVideo() detectado: ${d}`,
  play: (d) => `Iniciando playVideo() con Mute-Trick (${d})`,
  exito: (d) => `Reproducción confirmada con la página oculta (${d})`,
  volumen: () => 'Volumen devuelto (unMute)',
  volver: () => 'De vuelta en la app: estaba en pausa por haber salido, ▶ automático',
  abrir: () => 'App abierta: la última canción sonaba al cerrar, ▶ automático',
}

/** Qué suena y cómo se está viendo, para saber qué combinación mantiene el audio. */
function where(): string {
  const { current } = player.getSnapshot()
  if (!current) return 'sin canción'
  const view = youtubeView.get() === 'video' ? 'vista Video' : 'vista Canción'
  return `YouTube, ${view}, ${sheetState.get() === 'open' ? '«Sonando ahora» abierta' : 'minimizada'}`
}

// Prueba (para comparar con el «selector de pestañas»): mientras la página está oculta, un temporizador inofensivo cuenta
// cada 250 ms en memoria, por si mantener el JavaScript ocupado retrasa que Android lo frene. No hay garantía de que lo
// evite; sirve para medirlo: si entre dos cuentas pasa más de 1,5 s, anota cuánto estuvo detenido el JavaScript, y al
// volver anota cuántas cuentas hubo (si el navegador lo frenó a ~1 por segundo, se nota ahí).
const KEEP_ALIVE_MS = 250
let keepAlive: number | undefined
let ticks = 0
let lastTick = 0
let hiddenSince = 0

function startKeepAlive() {
  stopKeepAlive(false)
  ticks = 0
  lastTick = hiddenSince = performance.now()
  keepAlive = window.setInterval(() => {
    const now = performance.now()
    if (now - lastTick > 1500) log(`El JavaScript estuvo detenido ${Math.round(now - lastTick)} ms (Android o Chrome lo frenó)`, now)
    lastTick = now
    ticks++
  }, KEEP_ALIVE_MS)
}

function stopKeepAlive(report = true) {
  if (keepAlive === undefined) return
  window.clearInterval(keepAlive)
  keepAlive = undefined
  if (!report) return
  const seconds = (performance.now() - hiddenSince) / 1000
  log(`Temporizador de prueba (cada ${KEEP_ALIVE_MS} ms): ${ticks} cuentas en ${seconds.toFixed(1)} s oculta (sin frenos serían ${Math.floor((seconds * 1000) / KEEP_ALIVE_MS)})`)
}

export function startDiagnostics() {
  if (started) return
  started = true
  log(`App abierta · reproductor de YouTube desde ${playerHost.get() === 'youtube' ? 'youtube.com' : 'youtube-nocookie.com'}`)
  // En la fase de captura de window: se anota antes que cualquier otra reacción de la app, con la hora exacta del evento.
  window.addEventListener(
    'visibilitychange',
    (event) => {
      if (document.visibilityState === 'hidden') {
        log(`visibilitychange: hidden (pantalla apagada u otra app) · ${where()}`, event.timeStamp)
        startKeepAlive()
      } else {
        log('visibilitychange: visible (página visible otra vez)', event.timeStamp)
        stopKeepAlive()
      }
    },
    true,
  )
  window.addEventListener('pagehide', (event) => log('El navegador guardó la página (pagehide)', event.timeStamp))
  document.addEventListener('freeze', (event) => log('El navegador congeló la página (freeze)', event.timeStamp))
  document.addEventListener('resume', (event) => log('El navegador reanudó la página (resume)', event.timeStamp))
  player.onAutoResume((event, detail) => log(AUTO_RESUME_LOG[event](detail)))
  let last = player.getSnapshot().status
  player.subscribe(() => {
    const { status } = player.getSnapshot()
    if (status === last) return
    last = status
    const msg = status === 'playing' ? 'Reproductor: sonando (reproducción confirmada)' : `Reproductor: ${STATUS[status]}`
    log(`${msg}${document.visibilityState === 'hidden' ? ' (con la página oculta)' : ''} · ${where()}`)
  })
}

/** Separa las pruebas en el registro: «Prueba manual iniciada» (selector de pestañas) o «Prueba automática iniciada». */
export function markTest(kind: 'manual' | 'automática') {
  log(`——— Prueba ${kind} iniciada ———`)
}

export const readDiagnostics = () => events

export function clearDiagnostics() {
  events = []
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* nada que borrar */
  }
}
