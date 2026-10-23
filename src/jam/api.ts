// API de las Jams (escuchar en grupo): al probar la atiende el servidor de Vite (/jam-api, ver
// server/jamDevServer.ts); publicada, la dirección de VITE_JAM_API.
import type { Track } from '../player/types'

const BASE = (import.meta.env.VITE_JAM_API?.trim() || '/jam-api').replace(/\/$/, '')

export interface JamItem {
  key: string
  track: Track
  addedBy: string
  at: number
}

export interface JamState {
  code: string
  host: string
  items: JamItem[] // lo que agregaron todos, en orden
  nowPlaying: Track | null // lo que suena en el teléfono del anfitrión
  upcoming: Track[] // lo que viene en su cola
}

export class JamError extends Error {
  status: number // 0 = sin conexión; 404 = la Jam no existe o terminó
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

/** Solo lo necesario de la canción (sin datos de la cola ni del reproductor). */
const plainTrack = (t: Track) => ({ id: t.id, title: t.title, artist: t.artist, album: t.album, duration: t.duration, artwork: t.artwork })

export const jamApi = {
  create: (host: string) => request<{ code: string; token: string }>('/jams', { method: 'POST', body: JSON.stringify({ host }) }),
  get: (code: string) => request<JamState>(`/jams/${normalizeCode(code)}`),
  add: (code: string, track: Track, addedBy: string) =>
    request<{ ok: true }>(`/jams/${normalizeCode(code)}/items`, { method: 'POST', body: JSON.stringify({ track: plainTrack(track), addedBy }) }),
  publish: (code: string, token: string, nowPlaying: Track | null, upcoming: Track[]) =>
    request<{ ok: true }>(`/jams/${code}/state`, {
      method: 'PUT',
      headers: { 'x-jam-token': token },
      body: JSON.stringify({ nowPlaying: nowPlaying && plainTrack(nowPlaying), upcoming: upcoming.map(plainTrack) }),
    }),
  end: (code: string, token: string) => request<{ ok: true }>(`/jams/${code}`, { method: 'DELETE', headers: { 'x-jam-token': token } }),
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
