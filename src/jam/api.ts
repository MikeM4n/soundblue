// API de las Jams (escuchar en grupo). Al probar la atiende el servidor de Vite (/jam-api, ver server/jamDevServer.ts);
// publicada, el Worker de Cloudflare cuya dirección va en VITE_JAM_API (worker/jam.js, un Durable Object por sala). Los
// dos siguen las mismas reglas (worker/jam-room.ts): se puede cambiar el servidor sin tocar la app.
//
// HTTP, en JSON. Cabeceras: x-jam-token = secreto del anfitrión (lo da «crear»); x-jam-guest = id secreto del invitado
// (al azar, guardado en su navegador; ver guestId): con él puede quitar lo que agregó él.
//   POST   /jams                               { host }              → 201 { code, token }     crea una Jam
//   GET    /jams/:code                                               → 200 JamState            estado público
//   POST   /jams/:code/items                   { track, addedBy }    → 201 { ok, key, jam }    agrega (cualquiera)
//   DELETE /jams/:code/items/:videoId                                → 200 { ok, jam }         quita (anfitrión, o el invitado
//                                                                                             que la agregó)
//   POST   /jams/:code/items/:videoId/restore                        → 200 { ok, jam }         «Deshacer» de quitar
//   PUT    /jams/:code/state   { nowPlaying, playing, upcoming, seen, applied }  → 200        solo el anfitrión
//   DELETE /jams/:code                                               → 200 { ok }              termina (solo el anfitrión)
// Errores: { error } con 400, 403, 404 (la Jam no existe o terminó) o 409 (repetida, llena…).
//
// En vivo: WebSocket en /jams/:code/live (misma dirección base, con ws:// o wss://).
//   servidor → app  {"type":"state","jam":JamState}  al conectar y después de CADA cambio (agregar, quitar, deshacer y
//                                                    lo que publica el anfitrión); `jam.version` sube con cada cambio.
//                   {"type":"ended"}                 el anfitrión la terminó (y se cierra).
//   app → servidor  "ping" cada 25 s → "pong"        mantiene viva la conexión (el Durable Object contesta sin despertarse).
// Si el WebSocket no conecta o se cae, la app pregunta GET /jams/:code cada 3 s y lo reintenta (ver live.ts).
//
// Cómo se arma la cola compartida: el teléfono del anfitrión toma lo agregado (`items` desde `seen`) y lo pone al final
// de su «Siguiente en la cola»; aplica lo quitado y devuelto (`ops` desde `applied`) y publica lo que suena y lo que viene.
// Todos ven `upcoming` más lo agregado que el anfitrión todavía no tomó («En camino»).
import type { Track } from '../player/types'

const BASE = (import.meta.env.VITE_JAM_API?.trim() || '/jam-api').replace(/\/$/, '')

export interface JamItem {
  key: string
  track: Track
  addedBy: string
  at: number
  removed?: boolean // la quitaron (queda en el registro: no mueve las posiciones de `seen`)
}

/** Lo que el teléfono del anfitrión debe aplicar a su cola: quitar una canción o devolverla («Deshacer»). */
export interface JamOp {
  type: 'remove' | 'restore'
  id: string
  track: Track
  by: string | null // quién (null: el anfitrión)
}

export interface JamState {
  code: string
  host: string
  items: JamItem[] // lo que agregaron los invitados, en orden
  ops: JamOp[] // lo que quitaron o devolvieron, en orden
  nowPlaying: Track | null // lo que suena en el teléfono del anfitrión
  playing: boolean // false: la canción está lista pero en pausa (el anfitrión no ha tocado ▶)
  upcoming: Track[] // lo que viene en su cola (sin lo que alguien acaba de quitar)
  seen: number // cuántas de `items` ya pasó el anfitrión a su cola (las demás van en camino)
  applied: number // cuántos de `ops` ya aplicó
  version: number // sube con cada cambio
}

/** Lo que el anfitrión cuenta a sus invitados. */
export interface JamPublished {
  nowPlaying: Track | null
  playing: boolean
  upcoming: Track[]
  seen: number
  applied: number
}

export class JamError extends Error {
  status: number // 0 = sin conexión; 404 = la Jam no existe o terminó; 503 = esta versión no tiene servidor de Jams
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${BASE}${path}`, { ...init, headers: { 'content-type': 'application/json', ...init.headers } })
  } catch {
    throw new JamError('No se pudo conectar. Revisa tu conexión.', 0)
  }
  const body = await response.json().catch(() => null)
  // Sin respuesta de Jam (p. ej. la página de error de GitHub Pages): falta el servidor de Jams en esta versión.
  if (!response.ok && body === null) throw new JamError('Jam todavía no funciona en esta versión: le falta su servidor.', 503)
  if (!response.ok) throw new JamError(body?.error ?? 'Algo salió mal con la Jam.', response.status)
  return body as T
}

/** «k7p-9qd» → «K7P9QD». */
export const normalizeCode = (code: string) => code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)

/**
 * Las que alguien agregó y el teléfono del anfitrión todavía no pasó a su cola (lo hace apenas se entera, y solo con
 * la app abierta): se muestran ya, «en camino», para que todos las vean al instante.
 */
export function pendingItems(jam: JamState): JamItem[] {
  const shown = new Set([jam.nowPlaying?.id, ...jam.upcoming.map((t) => t.id)])
  return jam.items.slice(jam.seen).filter((item) => !item.removed && !shown.has(item.track.id))
}

/** ¿Ya suena, viene o va en camino en la Jam? (mismo videoId: cero repetidas, como en la cola) */
export const isInJam = (jam: JamState, id: string) =>
  jam.nowPlaying?.id === id || jam.upcoming.some((t) => t.id === id) || pendingItems(jam).some((item) => item.track.id === id)

/** Solo lo necesario de la canción (sin datos de la cola ni del reproductor). */
const plainTrack = (t: Track) => ({ id: t.id, title: t.title, artist: t.artist, album: t.album, duration: t.duration, artwork: t.artwork })

// Tu id de invitado: al azar y guardado en este navegador. El servidor lo guarda (sin mostrarlo) con lo que agregas,
// y solo con él se puede quitar eso. getRandomValues funciona también sin https (p. ej. en la red local).
const GUEST_KEY = 'soundblue:jam-id'
let guest: string | null = null
export function guestId(): string {
  if (guest) return guest
  try {
    const saved = localStorage.getItem(GUEST_KEY)
    if (saved && /^[a-f0-9]{32}$/.test(saved)) return (guest = saved)
  } catch {
    /* sin almacenamiento: vale mientras la app esté abierta */
  }
  guest = [...crypto.getRandomValues(new Uint8Array(16))].map((byte) => byte.toString(16).padStart(2, '0')).join('')
  try {
    localStorage.setItem(GUEST_KEY, guest)
  } catch {
    /* ídem */
  }
  return guest
}

/** Quién pide quitar o devolver: el anfitrión (su token) o el invitado (su id). */
const who = (token?: string): Record<string, string> => (token ? { 'x-jam-token': token } : { 'x-jam-guest': guestId() })

export const jamApi = {
  create: (host: string) => request<{ code: string; token: string }>('/jams', { method: 'POST', body: JSON.stringify({ host }) }),
  get: (code: string) => request<JamState>(`/jams/${normalizeCode(code)}`),
  add: (code: string, track: Track, addedBy: string) =>
    request<{ ok: true; key: string; jam: JamState }>(`/jams/${normalizeCode(code)}/items`, {
      method: 'POST',
      headers: who(),
      body: JSON.stringify({ track: plainTrack(track), addedBy }),
    }),
  remove: (code: string, id: string, token?: string) =>
    request<{ ok: true; jam: JamState }>(`/jams/${normalizeCode(code)}/items/${encodeURIComponent(id)}`, { method: 'DELETE', headers: who(token) }),
  restore: (code: string, id: string, token?: string) =>
    request<{ ok: true; jam: JamState }>(`/jams/${normalizeCode(code)}/items/${encodeURIComponent(id)}/restore`, { method: 'POST', headers: who(token) }),
  publish: (code: string, token: string, { nowPlaying, playing, upcoming, seen, applied }: JamPublished) =>
    request<{ ok: true }>(`/jams/${code}/state`, {
      method: 'PUT',
      headers: { 'x-jam-token': token },
      body: JSON.stringify({ nowPlaying: nowPlaying && plainTrack(nowPlaying), playing, upcoming: upcoming.map(plainTrack), seen, applied }),
    }),
  end: (code: string, token: string) => request<{ ok: true }>(`/jams/${code}`, { method: 'DELETE', headers: { 'x-jam-token': token } }),
}

/** Dirección del WebSocket de la sala: la misma base, con ws:// o wss://. */
export function liveUrl(code: string): string {
  const url = new URL(`${BASE}/jams/${normalizeCode(code)}/live`, window.location.href)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  return url.toString()
}

// Tu nombre en las Jams («Ana agregó…»), recordado en este navegador.
const NAME_KEY = 'soundblue:nombre'
export function readName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? ''
  } catch {
    return ''
  }
}
export function saveName(name: string) {
  try {
    localStorage.setItem(NAME_KEY, name.trim().slice(0, 40))
  } catch {
    /* sin almacenamiento: se vuelve a preguntar */
  }
}

/** Dirección para unirse: la misma app, en la página de la Jam (la del código QR). */
export const joinUrl = (code: string) => `${window.location.origin}${window.location.pathname}#/jam/${code}`
