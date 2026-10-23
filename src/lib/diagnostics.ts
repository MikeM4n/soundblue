// Registro de segundo plano, para averiguar EN EL TELÉFONO por qué se detiene la música al bloquear la pantalla:
// anota cuándo se oculta o se muestra la página y qué reporta el reproductor en ese momento (y en qué vista).
// Se guarda solo en este navegador (últimos 80 eventos), se lee en Ayuda y no se envía a ningún lado.
import { player } from '../player/engine'
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

function log(msg: string) {
  events = [...events, { t: Date.now(), msg }].slice(-MAX)
  try {
    localStorage.setItem(KEY, JSON.stringify(events))
  } catch {
    /* sin almacenamiento: el registro dura mientras la app esté abierta */
  }
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
  document.addEventListener('visibilitychange', () =>
    log(document.visibilityState === 'hidden' ? `Página oculta (pantalla apagada u otra app) · ${where()}` : 'Página visible otra vez'),
  )
  window.addEventListener('pagehide', () => log('El navegador guardó la página (pagehide)'))
  document.addEventListener('freeze', () => log('El navegador congeló la página'))
  document.addEventListener('resume', () => log('El navegador reanudó la página'))
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
