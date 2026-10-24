// Una sala de Jam: las reglas que comparten el servidor de prueba (server/jamDevServer.ts, con `npm run dev`) y el
// Worker de Cloudflare de la versión publicada (worker/jam.js, un Durable Object por sala). Sin APIs de Node ni de
// Workers, solo datos: así los dos responden igual. Solo se guardan datos de canciones (id de YouTube, título,
// artista…), nunca audio. Rutas y mensajes del WebSocket: ver el comentario de src/jam/api.ts.

export interface JamTrack {
  id: string
  title: string
  artist: string
  album?: string
  duration?: number
  artwork?: string
  ytMusic: true
}

export interface JamItem {
  key: string
  track: JamTrack
  addedBy: string
  at: number
  removed?: boolean // la quitaron: queda en el registro para no mover las posiciones que cuenta el anfitrión (`seen`)
}

/** Un cambio que el teléfono del anfitrión debe aplicar a su cola: quitar una canción o devolverla («Deshacer»). */
export interface JamOp {
  type: 'remove' | 'restore'
  id: string // videoId
  track: JamTrack
  by: string | null // quién la quitó o la devolvió (null: el anfitrión)
}

export interface Room {
  code: string
  token: string // secreto del anfitrión (cabecera x-jam-token)
  host: string
  items: (JamItem & { owner: string })[] // owner: id secreto del invitado que la agregó (cabecera x-jam-guest); no se publica
  ops: JamOp[]
  nowPlaying: JamTrack | null
  playing: boolean
  upcoming: JamTrack[]
  seen: number // cuántas de `items` ya procesó el anfitrión
  applied: number // cuántos de `ops` ya aplicó
  version: number // sube con cada cambio: la app descarta un estado más viejo que el que ya tiene
  updatedAt: number
}

export const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // sin 0/O ni 1/I, que se confunden
export const MAX_ITEMS = 300
export const MAX_OPS = 300
export const TTL_MS = 12 * 3600 * 1000 // una Jam sin actividad se borra a las 12 horas
const REPEAT_MS = 2 * 60 * 1000 // la misma canción no se agrega dos veces seguidas (doble toque)
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/
const GUEST_ID = /^[A-Za-z0-9_-]{16,64}$/

export function newCode(): string {
  return [...crypto.getRandomValues(new Uint8Array(6))].map((byte) => CODE_CHARS[byte % CODE_CHARS.length]).join('')
}

export function newRoom(code: string, host: unknown, now = Date.now()): Room {
  return {
    code,
    token: crypto.randomUUID(),
    host: text(host, 40) || 'Anfitrión',
    items: [],
    ops: [],
    nowPlaying: null,
    playing: false,
    upcoming: [],
    seen: 0,
    applied: 0,
    version: 0,
    updatedAt: now,
  }
}

const text = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '')

/** Solo canciones de YouTube con datos razonables; todo lo demás se descarta. */
export function cleanTrack(raw: unknown): JamTrack | null {
  if (!raw || typeof raw !== 'object') return null
  const t = raw as Record<string, unknown>
  const id = text(t.id, 20)
  const title = text(t.title, 200)
  if (!VIDEO_ID.test(id) || !title) return null
  const artwork = text(t.artwork, 500)
  const duration = typeof t.duration === 'number' && t.duration > 0 && t.duration < 36000 ? Math.round(t.duration) : undefined
  return {
    id,
    title,
    artist: text(t.artist, 200) || 'YouTube Music',
    album: text(t.album, 200) || undefined,
    duration,
    artwork: /^https:\/\/[a-z0-9.-]+\.(googleusercontent|ytimg)\.com\//.test(artwork) ? artwork : undefined,
    ytMusic: true,
  }
}

/** Lo que alguien quitó y el teléfono del anfitrión todavía no sacó de su cola: no se muestra, para que se vea al instante. */
function removing(room: Room): Set<string> {
  const ids = new Set<string>()
  for (const op of room.ops.slice(room.applied)) {
    if (op.type === 'remove') ids.add(op.id)
    else ids.delete(op.id)
  }
  return ids
}

/** Lo que ven todos (sin el token ni los ids de los invitados). */
export function publicView(room: Room) {
  const hidden = removing(room)
  return {
    code: room.code,
    host: room.host,
    items: room.items.map(({ owner: _owner, ...item }) => item),
    ops: room.ops,
    nowPlaying: room.nowPlaying,
    playing: room.playing,
    upcoming: room.upcoming.filter((track) => !hidden.has(track.id)),
    seen: room.seen,
    applied: room.applied,
    version: room.version,
  }
}

export interface Caller {
  token: string | null // cabecera x-jam-token
  guest: string | null // cabecera x-jam-guest
}

export interface Reply {
  status: number
  body: unknown
  changed: boolean // hay que guardar la sala y avisar a todos por el WebSocket
  ended?: boolean // el anfitrión la terminó: se borra y se avisa
}

const fail = (status: number, error: string): Reply => ({ status, body: { error }, changed: false })

function touch(room: Room, now: number) {
  room.updatedAt = now
  room.version++
}

/** Entero dentro de [min, max]; si no vino un entero, se queda como estaba. */
const clampInt = (value: unknown, current: number, min: number, max: number) =>
  Number.isInteger(value) ? Math.min(Math.max(value as number, min), max) : Math.min(current, max)

/** El último de la lista que cumple `test`. */
function lastOf<T>(list: readonly T[], test: (value: T) => boolean): T | undefined {
  for (let i = list.length - 1; i >= 0; i--) if (test(list[i])) return list[i]
  return undefined
}

/**
 * Atiende una petición a una sala que existe. `rest` es la ruta después del código: `[]`, `['items']`,
 * `['items', videoId]`, `['items', videoId, 'restore']` o `['state']`.
 */
export async function handleRoom(
  room: Room,
  method: string,
  rest: string[],
  caller: Caller,
  readBody: () => Promise<Record<string, unknown>>,
  now = Date.now(),
): Promise<Reply> {
  const isHost = caller.token === room.token
  const guest = caller.guest && GUEST_ID.test(caller.guest) ? caller.guest : null
  const [action, id, sub] = rest

  if (!action && method === 'GET') return { status: 200, body: publicView(room), changed: false }
  if (!action && method === 'DELETE') return isHost ? { status: 200, body: { ok: true }, changed: false, ended: true } : fail(403, 'Solo el anfitrión')

  // Agregar: cualquiera con el código. Sin repetidas: ni lo que suena, ni lo que viene, ni lo que va en camino.
  if (action === 'items' && !id && method === 'POST') {
    const body = await readBody()
    const track = cleanTrack(body.track)
    if (!track) return fail(400, 'Canción no válida')
    if (room.items.length >= MAX_ITEMS) return fail(409, 'La Jam ya está llena')
    const view = publicView(room)
    const pending = room.items.slice(room.seen).filter((item) => !item.removed)
    const already = view.nowPlaying?.id === track.id || view.upcoming.some((t) => t.id === track.id) || pending.some((item) => item.track.id === track.id)
    const doubleTap = room.items.some((item) => item.track.id === track.id && !item.removed && now - item.at < REPEAT_MS)
    if (already || doubleTap) return fail(409, 'Esa canción ya está en la Jam')
    const item = { key: crypto.randomUUID(), track, addedBy: text(body.addedBy, 40) || 'Alguien', at: now, owner: guest ?? '' }
    room.items.push(item)
    touch(room, now)
    return { status: 201, body: { ok: true, key: item.key, jam: publicView(room) }, changed: true }
  }

  // Quitar (deslizar a la derecha) y devolverla («Deshacer»): el anfitrión cualquiera; un invitado, solo las que agregó.
  if (action === 'items' && id && (method === 'DELETE' || (sub === 'restore' && method === 'POST'))) {
    if (!VIDEO_ID.test(id)) return fail(400, 'Canción no válida')
    if (!isHost && !guest) return fail(403, 'Solo el anfitrión o quien la agregó')
    if (room.ops.length >= MAX_OPS) return fail(409, 'La Jam tiene demasiados cambios')
    const mine = (item: Room['items'][number]) => isHost || item.owner === guest

    if (method === 'DELETE') {
      if (sub) return fail(405, 'método no permitido')
      const live = room.items.filter((item) => item.track.id === id && !item.removed)
      const own = live.find(mine)
      if (!isHost && !own) return fail(403, 'Solo puedes quitar las canciones que agregaste')
      const track = own?.track ?? publicView(room).upcoming.find((t) => t.id === id)
      if (!track) return fail(404, 'Esa canción ya no está en la Jam')
      for (const item of live) item.removed = true
      room.ops.push({ type: 'remove', id, track, by: isHost ? null : own!.addedBy })
    } else {
      const last = lastOf(room.ops, (op) => op.id === id)
      const item = lastOf(room.items, (it) => it.track.id === id && it.removed === true)
      if (last?.type !== 'remove') return fail(409, 'Esa canción no estaba quitada')
      if (!isHost && !(item && mine(item))) return fail(403, 'Solo puedes devolver las canciones que agregaste')
      if (item) delete item.removed
      room.ops.push({ type: 'restore', id, track: last.track, by: isHost ? null : item!.addedBy })
    }
    touch(room, now)
    return { status: 200, body: { ok: true, jam: publicView(room) }, changed: true }
  }

  // Lo que suena y viene en el teléfono del anfitrión, y hasta dónde procesó lo agregado y lo quitado.
  if (action === 'state' && !id && method === 'PUT') {
    if (!isHost) return fail(403, 'Solo el anfitrión')
    const body = await readBody()
    room.nowPlaying = cleanTrack(body.nowPlaying)
    room.playing = room.nowPlaying !== null && body.playing === true
    room.upcoming = (Array.isArray(body.upcoming) ? body.upcoming : [])
      .slice(0, 20)
      .map(cleanTrack)
      .filter((track): track is JamTrack => track !== null)
    room.seen = clampInt(body.seen, room.seen, 0, room.items.length)
    room.applied = clampInt(body.applied, room.applied, 0, room.ops.length)
    touch(room, now)
    return { status: 200, body: { ok: true }, changed: true }
  }

  return fail(405, 'método no permitido')
}
