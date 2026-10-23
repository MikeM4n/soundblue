// Servidor de Jams para PROBAR con `npm run dev` o `npm run preview`: guarda las Jams en la memoria
// del PC (se borran al cerrar el servidor). Publicada, la app usará la misma API en el intermediario de Cloudflare
// (VITE_JAM_API). Solo se guardan datos de canciones (id de YouTube, título, artista…): nunca audio.
//
//   POST   /jam-api/jams                 { host }            → { code, token }   crea una Jam
//   GET    /jam-api/jams/:code                               → estado público
//   POST   /jam-api/jams/:code/items     { track, addedBy }  → agrega una canción (cualquiera con el código)
//   PUT    /jam-api/jams/:code/state     { nowPlaying, upcoming }  (solo el anfitrión: cabecera x-jam-token)
//   DELETE /jam-api/jams/:code                               (solo el anfitrión) termina la Jam
import { randomBytes, randomUUID } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'

interface JamTrack {
  id: string
  title: string
  artist: string
  album?: string
  duration?: number
  artwork?: string
  ytMusic: true
}

interface JamItem {
  key: string
  track: JamTrack
  addedBy: string
  at: number
}

interface Jam {
  code: string
  token: string
  host: string
  items: JamItem[]
  nowPlaying: JamTrack | null
  upcoming: JamTrack[]
  updatedAt: number
}

const jams = new Map<string, Jam>()
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // sin 0/O ni 1/I, que se confunden
const MAX_ITEMS = 300
const TTL_MS = 12 * 3600 * 1000 // una Jam sin actividad se borra a las 12 horas
const REPEAT_MS = 2 * 60 * 1000 // la misma canción no se agrega dos veces seguidas (doble toque)

function newCode(): string {
  let code = ''
  do code = [...randomBytes(6)].map((byte) => CODE_CHARS[byte % CODE_CHARS.length]).join('')
  while (jams.has(code))
  return code
}

const text = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '')

/** Solo canciones de YouTube con datos razonables; todo lo demás se descarta. */
function cleanTrack(raw: unknown): JamTrack | null {
  if (!raw || typeof raw !== 'object') return null
  const t = raw as Record<string, unknown>
  const id = text(t.id, 20)
  const title = text(t.title, 200)
  if (!/^[A-Za-z0-9_-]{11}$/.test(id) || !title) return null
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

const publicView = (jam: Jam) => ({ code: jam.code, host: jam.host, items: jam.items, nowPlaying: jam.nowPlaying, upcoming: jam.upcoming })

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(JSON.stringify(body))
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  let body = ''
  for await (const chunk of req) {
    body += chunk
    if (body.length > 64_000) throw new Error('demasiado grande')
  }
  const parsed = body ? JSON.parse(body) : {}
  return parsed && typeof parsed === 'object' ? parsed : {}
}

function purgeOld() {
  const now = Date.now()
  for (const [code, jam] of jams) if (now - jam.updatedAt > TTL_MS) jams.delete(code)
}

async function handle(req: IncomingMessage, res: ServerResponse) {
  purgeOld()
  const [resource, rawCode, action] = new URL(req.url ?? '/', 'http://jam').pathname.split('/').filter(Boolean)
  if (resource !== 'jams') return send(res, 404, { error: 'no existe' })
  const method = req.method ?? 'GET'

  if (!rawCode) {
    if (method !== 'POST') return send(res, 405, { error: 'método no permitido' })
    const body = await readJson(req)
    const jam: Jam = { code: newCode(), token: randomUUID(), host: text(body.host, 40) || 'Anfitrión', items: [], nowPlaying: null, upcoming: [], updatedAt: Date.now() }
    jams.set(jam.code, jam)
    return send(res, 201, { code: jam.code, token: jam.token })
  }

  const jam = jams.get(rawCode.toUpperCase())
  if (!jam) return send(res, 404, { error: 'Esta Jam no existe o ya terminó' })
  const isHost = req.headers['x-jam-token'] === jam.token

  if (!action && method === 'GET') return send(res, 200, publicView(jam))

  if (action === 'items' && method === 'POST') {
    const body = await readJson(req)
    const track = cleanTrack(body.track)
    if (!track) return send(res, 400, { error: 'Canción no válida' })
    if (jam.items.length >= MAX_ITEMS) return send(res, 409, { error: 'La Jam ya está llena' })
    const now = Date.now()
    if (jam.items.some((item) => item.track.id === track.id && now - item.at < REPEAT_MS)) return send(res, 409, { error: 'Esa canción ya está en la Jam' })
    jam.items.push({ key: randomUUID(), track, addedBy: text(body.addedBy, 40) || 'Alguien', at: now })
    jam.updatedAt = now
    return send(res, 201, { ok: true, count: jam.items.length })
  }

  if (action === 'state' && method === 'PUT') {
    if (!isHost) return send(res, 403, { error: 'Solo el anfitrión' })
    const body = await readJson(req)
    jam.nowPlaying = cleanTrack(body.nowPlaying)
    jam.upcoming = (Array.isArray(body.upcoming) ? body.upcoming : []).slice(0, 20).map(cleanTrack).filter((t): t is JamTrack => !!t)
    jam.updatedAt = Date.now()
    return send(res, 200, { ok: true })
  }

  if (!action && method === 'DELETE') {
    if (!isHost) return send(res, 403, { error: 'Solo el anfitrión' })
    jams.delete(jam.code)
    return send(res, 200, { ok: true })
  }

  return send(res, 405, { error: 'método no permitido' })
}

/** Plugin de Vite: atiende /jam-api en `npm run dev` y en `npm run preview`. */
export function jamDevServer(): Plugin {
  const middleware = (req: IncomingMessage, res: ServerResponse) => {
    handle(req, res).catch(() => send(res, 400, { error: 'Petición no válida' }))
  }
  return {
    name: 'soundblue-jam-dev',
    configureServer(server) {
      server.middlewares.use('/jam-api', middleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use('/jam-api', middleware)
    },
  }
}
