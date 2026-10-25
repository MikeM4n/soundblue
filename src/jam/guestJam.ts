// La Jam a la que te uniste como invitado (escaneando su código QR o escribiendo su código). Queda guardada en este
// navegador hasta que sales de ella o termina, así que vale en TODA la app, no solo en su página:
// - «⋮ → Agregar a la Jam» (en Buscar, álbumes, playlists…) agrega la canción a la cola compartida, no a la de tu teléfono;
// - lo que suena y lo que viene en el teléfono del anfitrión llega al instante por el canal en vivo (live.ts);
// - puedes quitar (deslizar a la derecha, con «Deshacer») las canciones que agregaste tú, y solo esas.
import { useSyncExternalStore } from 'react'
import { logDuplicate } from '../lib/duplicateLog'
import type { Track } from '../player/types'
import { showToast } from '../ui/toast'
import { isInJam, jamApi, JamError, normalizeCode, readName, type JamState } from './api'
import { watchJam, type JamWatcher } from './live'

const KEY = 'soundblue:jam-invitado'

export interface GuestJamState {
  code: string | null // la Jam en la que estás
  jam: JamState | null // lo último que se supo de ella (null: todavía cargando)
  missing: boolean // ya no existe: terminó, caducó o se reinició el servidor de prueba
  reason: string | null // si no es eso, por qué no se puede usar (p. ej. esta versión no tiene servidor de Jams)
  mine: ReadonlySet<string> // videoIds que agregaste tú (los únicos que puedes quitar)
}

const saved = readSaved()
let state: GuestJamState = { code: saved?.code ?? null, jam: null, missing: false, reason: null, mine: new Set(saved?.mine) }
const listeners = new Set<() => void>()
let watcher: JamWatcher | null = null

function readSaved(): { code: string; mine: string[] } | null {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    const code = normalizeCode(String(value?.code ?? ''))
    return code.length === 6 ? { code, mine: Array.isArray(value.mine) ? value.mine.filter((id: unknown) => typeof id === 'string') : [] } : null
  } catch {
    return null
  }
}

function persist() {
  try {
    if (state.code && !state.missing) localStorage.setItem(KEY, JSON.stringify({ code: state.code, mine: [...state.mine] }))
    else localStorage.removeItem(KEY)
  } catch {
    /* sin almacenamiento: vale mientras la app esté abierta */
  }
}

function set(next: Partial<GuestJamState>) {
  state = { ...state, ...next }
  listeners.forEach((listener) => listener())
}

/** Un estado que llega (del canal en vivo o de una respuesta): nunca uno más viejo que el que ya se ve. */
function receive(code: string, jam: JamState) {
  if (state.code !== code || (state.jam && jam.version < state.jam.version)) return
  set({ jam, missing: false })
}

/** 404: la Jam terminó. 503: esta versión de la app no tiene servidor de Jams (publicada sin VITE_JAM_API). */
const isGone = (error: unknown): error is JamError => error instanceof JamError && (error.status === 404 || error.status === 503)

/** Ya no se puede usar: lo que agregues vuelve a ir a tu cola (su página muestra por qué). */
function markMissing(error: JamError) {
  watcher?.stop()
  watcher = null
  set({ missing: true, reason: error.status === 503 ? error.message : null })
  persist()
}

function follow(code: string) {
  watcher?.stop()
  watcher = watchJam(code, (jam) => receive(code, jam), (error) => state.code === code && markMissing(error))
}

/**
 * Sin la canción: al quitarla desaparece al instante en tu teléfono (el servidor confirma enseguida). Media versión más:
 * un estado viejo que llegue mientras tanto no la vuelve a mostrar, y el del servidor (una versión más) sí reemplaza a este.
 */
function without(jam: JamState, id: string): JamState {
  return {
    ...jam,
    upcoming: jam.upcoming.filter((t) => t.id !== id),
    items: jam.items.map((item) => (item.track.id === id && !item.removed ? { ...item, removed: true } : item)),
    version: jam.version + 0.5,
  }
}

/** Para los errores de quitar/devolver/agregar: si la Jam ya no existe, se sale; si no, se avisa y se vuelve a pedir el estado. */
function failed(error: unknown, fallback: string) {
  if (isGone(error)) {
    markMissing(error)
    showToast(error.status === 404 ? 'Esa Jam ya terminó' : error.message)
    return
  }
  showToast(error instanceof Error ? error.message : fallback)
  watcher?.refresh()
}

export const guestJam = {
  /** Retoma la Jam si la app se cerró estando en una. */
  resume() {
    if (state.code && !state.missing && !watcher) follow(state.code)
  },
  /** Entras (o vuelves) a la Jam de este código. */
  join(rawCode: string) {
    const code = normalizeCode(rawCode)
    if (code.length !== 6) return
    if (code === state.code && !state.missing && watcher) return watcher.refresh()
    const same = code === state.code
    set({ code, jam: same ? state.jam : null, missing: false, reason: null, mine: same ? state.mine : new Set() })
    persist()
    follow(code)
  },
  /** Sales de la Jam: lo que agregues vuelve a ir a la cola de tu teléfono. */
  leave() {
    watcher?.stop()
    watcher = null
    set({ code: null, jam: null, missing: false, reason: null, mine: new Set() })
    persist()
  },
  /** ¿Estás en una Jam que sigue abierta? */
  isActive: () => state.code !== null && !state.missing,
  /** ¿La agregaste tú? (solo esas se pueden quitar) */
  isMine: (id: string) => state.mine.has(id),
  /**
   * Agrega la canción al final de la cola compartida (la del teléfono del anfitrión). Sin repetidas: si ya suena, viene
   * o va en camino, no se agrega otra vez. Devuelve si quedó en la Jam.
   */
  async add(track: Track): Promise<boolean> {
    const code = state.code
    if (!code || state.missing) return false
    if (state.jam && isInJam(state.jam, track.id)) {
      logDuplicate(track, 'agregar a la Jam')
      showToast('Ya está en la Jam')
      return true
    }
    try {
      const { jam } = await jamApi.add(code, track, readName())
      set({ mine: new Set(state.mine).add(track.id) })
      persist()
      receive(code, jam) // todos la ven ya en «Próximas en sonar» («En camino» hasta que el anfitrión la tome)
      showToast(`Agregada a la Jam${jam.host ? ` de ${jam.host}` : ''}: «${track.title}»`)
      return true
    } catch (error) {
      failed(error, 'No se pudo agregar.')
      return false
    }
  },
  /** Quita una canción que agregaste tú (el aviso con «Deshacer» lo muestra quien llama: ver jamRemoveAction). */
  async remove(id: string) {
    const code = state.code
    if (!code || state.missing) return
    const before = state.jam
    const optimistic = before && without(before, id)
    if (optimistic) set({ jam: optimistic })
    try {
      const { jam } = await jamApi.remove(code, id)
      receive(code, jam)
    } catch (error) {
      if (state.jam === optimistic) set({ jam: before }) // no se pudo: vuelve a verse
      failed(error, 'No se pudo quitar.')
    }
  },
  /** «Deshacer»: la devuelve a la cola compartida (el anfitrión la pone donde estaba). */
  async restore(id: string) {
    const code = state.code
    if (!code || state.missing) return
    try {
      const { jam } = await jamApi.restore(code, id)
      receive(code, jam)
    } catch (error) {
      failed(error, 'No se pudo devolver.')
    }
  },
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
  getState: () => state,
}

export const useGuestJam = () => useSyncExternalStore(guestJam.subscribe, guestJam.getState)

/** Solo si estás en una Jam (sin redibujar con cada actualización de la Jam): para el menú «⋮» y las filas. */
export const useInGuestJam = () => useSyncExternalStore(guestJam.subscribe, guestJam.isActive)
