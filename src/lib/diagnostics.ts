// Registro de segundo plano, para averiguar EN EL TELÉFONO por qué se detiene la música al bloquear la pantalla:
// anota cuándo se oculta o se muestra la página y qué reporta el reproductor en ese momento (y en qué vista).
// Se guarda solo en este navegador (últimos 80 eventos), se lee en Ayuda y no se envía a ningún lado.
import { AUTO_RESUME_TRIES, player, type AutoResumeEvent } from '../player/engine'
import { sheetState, youtubeView } from '../player/stage'
import type { Status } from '../player/types'
import { playerHost } from '../player/youtube'

const KEY = 'soundblue:diagnostico'
const MAX = 80

export interface DiagnosticEvent {
  t: number
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

// Mientras un intento de reanudación está en curso (del ▶ en silencio hasta que suena o falla), el registro no escribe en
// el almacenamiento: guarda en memoria y escribe todo junto al terminar, para no ocupar al navegador en ese momento.
let held: DiagnosticEvent[] | null = null
let holdTimer: number | undefined

function log(msg: string) {
  const event = { t: Date.now(), msg }
  if (held) held.push(event)
  else save([event])
}

function save(list: DiagnosticEvent[]) {
  events = [...events, ...list].slice(-MAX)
  try {
    localStorage.setItem(KEY, JSON.stringify(events))
  } catch {
    /* sin almacenamiento: el registro dura mientras la app esté abierta */
  }
}

function hold() {
  held ??= []
  window.clearTimeout(holdTimer)
  holdTimer = window.setTimeout(release, 3000) // por si el intento se corta sin avisar
}

function release() {
  window.clearTimeout(holdTimer)
  if (!held) return
  const list = held
  held = null
  save(list)
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

const AUTO_RESUME_LOG: Record<AutoResumeEvent, (attempt: number, seconds: number) => string> = {
  temporizador: (n, s) => `Iniciando temporizador de reanudación (${s}s)... (intento ${n} de ${AUTO_RESUME_TRIES})`,
  play: (_n, s) => `Iniciando Mute-Trick... (silencio + playVideo() tras ${s}s de espera)`,
  exito: () => 'Reanudación exitosa (con la página oculta)',
  fallo: (n) => `Intento ${n} sin éxito: no sonó tras el Mute-Trick`,
}

/** Qué suena y cómo se está viendo, para saber qué combinación mantiene el audio. */
function where(): string {
  const { current } = player.getSnapshot()
  if (!current) return 'sin canción'
  const view = youtubeView.get() === 'video' ? 'vista Video' : 'vista Canción'
  return `YouTube, ${view}, ${sheetState.get() === 'open' ? '«Sonando ahora» abierta' : 'minimizada'}`
}

export function startDiagnostics() {
  if (started) return
  started = true
  log(`App abierta · reproductor de YouTube desde ${playerHost.get() === 'youtube' ? 'youtube.com' : 'youtube-nocookie.com'}`)
  document.addEventListener('visibilitychange', () => {
    release()
    log(document.visibilityState === 'hidden' ? `Página oculta (pantalla apagada u otra app) · ${where()}` : 'Página visible otra vez')
  })
  window.addEventListener('pagehide', () => log('El navegador guardó la página (pagehide)'))
  document.addEventListener('freeze', () => log('El navegador congeló la página'))
  document.addEventListener('resume', () => log('El navegador reanudó la página'))
  player.onAutoResume((event, attempt, delayMs) => {
    if (event === 'exito' || event === 'fallo') release()
    log(AUTO_RESUME_LOG[event](attempt, delayMs / 1000))
    if (event === 'play') hold()
  })
  let last = player.getSnapshot().status
  player.subscribe(() => {
    const { status } = player.getSnapshot()
    if (status === last) return
    last = status
    log(`Reproductor: ${STATUS[status]}${document.visibilityState === 'hidden' ? ' (con la página oculta)' : ''} · ${where()}`)
  })
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
