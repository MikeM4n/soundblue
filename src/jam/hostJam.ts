// La Jam que abriste tú (anfitrión). Mientras está activa, por el canal en vivo (live.ts):
// - apenas tus amigos agregan una canción, la pone al final de tu «Siguiente en la cola»;
// - si alguien quita una que agregó (o la devuelve con «Deshacer»), la quita de tu cola (o la devuelve a su lugar);
// - les cuenta qué suena, si está en pausa, qué viene y hasta dónde tomaste sus cambios, para que lo vean en sus teléfonos.
// La música suena solo en tu teléfono, como en una fiesta con un parlante. Tu cola ES la cola compartida: lo que
// agregas o quitas tú (menú «⋮», la búsqueda o la lista de la Jam) también lo ven tus amigos.
import { useSyncExternalStore } from 'react'
import { player, type QueueResult } from '../player/engine'
import type { Track } from '../player/types'
import { showToast } from '../ui/toast'
import { jamApi, JamError, type JamItem, type JamOp, type JamState } from './api'
import { guestJam } from './guestJam'
import { watchJam, type JamWatcher } from './live'

const KEY = 'soundblue:jam'
const PUBLISH_MS = 250 // junta los cambios seguidos (p. ej. varias canciones que llegan juntas) en un solo envío

interface Saved {
  code: string
  token: string
  seen: number // cuántas canciones de la Jam ya pasaron a tu cola
  applied: number // cuántos «quitar»/«deshacer» de la Jam ya se aplicaron a tu cola
}

export interface HostJamState {
  code: string | null
  items: JamItem[] // lo que agregaron tus amigos (sin lo que quitaron)
  starting: boolean
  error: string | null
}

let saved: Saved | null = read()
let state: HostJamState = { code: saved?.code ?? null, items: [], starting: false, error: null }
const listeners = new Set<() => void>()
let watcher: JamWatcher | null = null
let publisher: { publish: () => void; stop: () => void } | null = null
let version = -1
// «Deshacer» de lo que quitaron tus amigos: vuelve a ponerla donde estaba (por videoId, mientras dure la Jam).
const undos = new Map<string, () => void>()

function read(): Saved | null {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    return value?.code && value?.token ? { applied: 0, ...value } : null
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

const asTrack = (track: Track): Track => ({ ...track, ytMusic: true })
const inYourPlayer = (id: string) => player.getSnapshot().current?.id === id || player.isQueued(id)

/** El aviso de una canción nueva, según lo que pasó en tu cola. */
function addedMessage(item: JamItem, result: QueueResult): string {
  const song = `${item.addedBy} agregó «${item.track.title}»`
  // Sin nada sonando, la primera queda lista en pausa (como «Agregar a la cola»): tus amigos la ven «en pausa».
  if (result === 'lista') return `${song}: toca ▶ para que suene`
  if (result === 'repetida') return `${song}, que ya estaba en la cola` // no entra dos veces (queda en el registro de repetidas)
  return `${song} a la Jam`
}

/** Un «quitar» o «deshacer» de la Jam, aplicado a tu cola. */
function apply(op: JamOp) {
  if (op.type === 'remove') {
    const undo = player.removeFromQueue(op.id)
    if (undo) undos.set(op.id, undo)
    if (op.by) showToast(`${op.by} quitó «${op.track.title}» de la Jam`)
    return
  }
  const undo = undos.get(op.id)
  undos.delete(op.id)
  if (undo) undo() // vuelve a su lugar
  else if (!inYourPlayer(op.id)) player.addToQueue(asTrack(op.track)) // no llegó a entrar a tu cola: va al final
}

/** Cada estado de la Jam: toma lo nuevo que agregaron y aplica lo que quitaron o devolvieron. */
function take(jam: JamState) {
  if (!saved || jam.code !== saved.code || jam.version < version) return
  version = jam.version
  const fresh = jam.items.slice(saved.seen).filter((item) => !item.removed)
  const results = fresh.map((item) => player.addToQueue(asTrack(item.track)))
  if (fresh.length === 1) showToast(addedMessage(fresh[0], results[0]))
  else if (fresh.length > 1) showToast(`${fresh.length} canciones nuevas en la Jam${results.includes('lista') ? ': toca ▶ para que suenen' : ''}`)
  const ops = jam.ops.slice(saved.applied)
  ops.forEach(apply)
  const changed = jam.items.length !== saved.seen || jam.ops.length !== saved.applied
  saved = { ...saved, seen: jam.items.length, applied: jam.ops.length }
  persist()
  set({ items: jam.items.filter((item) => !item.removed), error: null })
  // Aunque tu cola no cambie (p. ej. todas estaban repetidas), los invitados deben saber que ya tomaste sus cambios.
  if (changed) publisher?.publish()
}

/** Qué suena (y si está en pausa), qué viene y hasta dónde tomaste los cambios, y una «firma» para saber si cambió. */
function playerSummary() {
  const s = player.getSnapshot()
  const upcoming = [...s.queue, ...s.upcoming].slice(0, 15)
  const playing = s.status === 'playing' || s.status === 'buffering' || s.status === 'loading'
  const seen = saved?.seen ?? 0
  const applied = saved?.applied ?? 0
  return {
    state: { nowPlaying: s.current, playing, upcoming, seen, applied },
    signature: [s.current?.id, playing, seen, applied, ...upcoming.map((t) => t.id)].join(','),
  }
}

/**
 * Cuenta a los invitados qué suena y qué viene, solo cuando cambia (juntando los cambios de un cuarto de segundo).
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
      const { state, signature } = playerSummary() // lo más reciente al momento de enviar
      if (signature === sent) return
      sent = signature
      jamApi.publish(code, token, state).catch(() => (sent = '')) // si falló, se reintenta en el próximo cambio
    }, PUBLISH_MS)
  }
  publish()
  const off = player.subscribe(publish)
  return {
    publish,
    stop() {
      off()
      window.clearTimeout(pending)
    },
  }
}

function gone(error: JamError) {
  // El servidor ya no la tiene (terminó, caducó o se reinició el servidor de prueba).
  finish()
  showToast(error.status === 404 ? 'La Jam terminó' : error.message)
}

function run() {
  if (!saved) return
  publisher?.stop()
  publisher = startPublishing(saved.code, saved.token)
  watcher?.stop()
  version = -1
  watcher = watchJam(saved.code, take, gone)
}

function finish() {
  watcher?.stop()
  watcher = null
  publisher?.stop()
  publisher = null
  undos.clear()
  saved = null
  persist()
  set({ code: null, items: [], error: null })
}

export const hostJam = {
  /** Retoma la Jam si la app se cerró con una abierta. */
  resume() {
    if (saved && !watcher) run()
  },
  async start(hostName: string) {
    set({ starting: true, error: null })
    try {
      const { code, token } = await jamApi.create(hostName)
      guestJam.leave() // abrir tu propia Jam te saca de la de otro
      saved = { code, token, seen: 0, applied: 0 }
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
  /**
   * Quitar de la cola compartida (deslizar a la derecha en la lista de la Jam): el anfitrión puede quitar cualquiera.
   * Devuelve la función de «Deshacer».
   */
  remove(track: Track): () => void {
    const local = player.removeFromQueue(track.id)
    if (local) return local // ya estaba en tu cola: se quita aquí y se publica; «Deshacer» la devuelve a su lugar
    // Todavía «en camino» (tu teléfono no la había tomado): se quita en el servidor.
    const current = saved
    if (!current) return () => {}
    void jamApi.remove(current.code, track.id, current.token).catch((error) => showToast(error instanceof Error ? error.message : 'No se pudo quitar.'))
    return () => void jamApi.restore(current.code, track.id, current.token).catch(() => {})
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
