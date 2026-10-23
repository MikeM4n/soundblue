// La Jam que abriste tú (anfitrión). Mientras está activa:
// - cada 3 s mira si tus amigos agregaron canciones y las pone al final de tu «Siguiente en la cola»;
// - les cuenta qué suena y qué viene, para que lo vean en sus teléfonos.
// La música suena solo en tu teléfono, como en una fiesta con un parlante.
import { useSyncExternalStore } from 'react'
import { player } from '../player/engine'
import type { Track } from '../player/types'
import { showToast } from '../ui/toast'
import { jamApi, JamError, type JamItem } from './api'

const KEY = 'soundblue:jam'
const POLL_MS = 3000

interface Saved {
  code: string
  token: string
  seen: number // cuántas canciones de la Jam ya pasaron a tu cola
}

export interface HostJamState {
  code: string | null
  items: JamItem[]
  starting: boolean
  error: string | null
}

let saved: Saved | null = read()
let state: HostJamState = { code: saved?.code ?? null, items: [], starting: false, error: null }
const listeners = new Set<() => void>()
let timer: number | undefined
let stopPublishing: (() => void) | null = null

function read(): Saved | null {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    return value?.code && value?.token ? value : null
  } catch {
    return null
  }
}

function persist() {
  try {
    if (saved) localStorage.setItem(KEY, JSON.stringify(saved))
    else localStorage.removeItem(KEY)
  } catch {
    /* sin almacenamiento: la Jam dura mientras la app esté abierta */
  }
}

function set(next: Partial<HostJamState>) {
  state = { ...state, ...next }
  listeners.forEach((listener) => listener())
}

const asTrack = (item: JamItem): Track => ({ ...item.track, ytMusic: true })

async function poll() {
  if (!saved) return
  try {
    const jam = await jamApi.get(saved.code)
    if (!saved) return
    const fresh = jam.items.slice(saved.seen)
    for (const item of fresh) player.addToQueue(asTrack(item))
    if (fresh.length === 1) showToast(`${fresh[0].addedBy} agregó «${fresh[0].track.title}» a la Jam`)
    else if (fresh.length > 1) showToast(`${fresh.length} canciones nuevas en la Jam`)
    saved = { ...saved, seen: jam.items.length }
    persist()
    set({ items: jam.items, error: null })
  } catch (error) {
    if (error instanceof JamError && error.status === 404) {
      // El servidor ya no la tiene (terminó, caducó o se reinició el servidor de prueba).
      finish()
      showToast('La Jam terminó')
      return
    }
    set({ error: 'Sin conexión con la Jam; reintentando…' })
  }
}

/** Qué suena y qué viene, y una «firma» para saber si cambió. */
function playerSummary() {
  const s = player.getSnapshot()
  const upcoming = [...s.queue, ...s.upcoming].slice(0, 15)
  return { current: s.current, upcoming, signature: [s.current?.id, ...upcoming.map((t) => t.id)].join(',') }
}

/**
 * Cuenta a los invitados qué suena y qué viene, solo cuando cambia y como mucho una vez por segundo.
 * Ojo: mientras suena, el reproductor avisa 4 veces por segundo (el tiempo avanza); esos avisos sin cambios no
 * deben reiniciar la espera, o el envío nunca llegaría a salir.
 */
function startPublishing(code: string, token: string) {
  let sent = '' // la última versión enviada
  let pending: number | undefined
  const publish = () => {
    if (pending !== undefined || playerSummary().signature === sent) return
    pending = window.setTimeout(() => {
      pending = undefined
      const { current, upcoming, signature } = playerSummary() // lo más reciente al momento de enviar
      if (signature === sent) return
      sent = signature
      jamApi.publish(code, token, current, upcoming).catch(() => (sent = '')) // si falló, se reintenta en el próximo cambio
    }, 1000)
  }
  publish()
  const off = player.subscribe(publish)
  return () => {
    off()
    window.clearTimeout(pending)
  }
}

function run() {
  if (!saved) return
  window.clearInterval(timer)
  timer = window.setInterval(poll, POLL_MS)
  stopPublishing?.()
  stopPublishing = startPublishing(saved.code, saved.token)
  void poll()
}

function finish() {
  window.clearInterval(timer)
  timer = undefined
  stopPublishing?.()
  stopPublishing = null
  saved = null
  persist()
  set({ code: null, items: [], error: null })
}

export const hostJam = {
  /** Retoma la Jam si la app se cerró con una abierta. */
  resume() {
    if (saved && timer === undefined) run()
  },
  async start(hostName: string) {
    set({ starting: true, error: null })
    try {
      const { code, token } = await jamApi.create(hostName)
      saved = { code, token, seen: 0 }
      persist()
      set({ code, items: [], starting: false })
      run()
    } catch (error) {
      set({ starting: false, error: error instanceof Error ? error.message : 'No se pudo iniciar la Jam.' })
    }
  },
  async end() {
    const current = saved
    finish()
    if (current) await jamApi.end(current.code, current.token).catch(() => {})
  },
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
  getState: () => state,
}

export const useHostJam = () => useSyncExternalStore(hostJam.subscribe, hostJam.getState)
