// Servidor de Jams para PROBAR con `npm run dev` o `npm run preview`: guarda las Jams en la memoria del PC (se borran
// al cerrar el servidor). Las reglas de cada sala están en worker/jam-room.ts, las mismas del Worker de Cloudflare de la
// versión publicada (worker/jam.js, en VITE_JAM_API). Rutas y mensajes del WebSocket: ver src/jam/api.ts.
//   HTTP       /jam-api/jams…                    crear, ver, agregar, quitar, deshacer, publicar y terminar
//   WebSocket  /jam-api/jams/:code/live          avisa cada cambio al instante (el mismo de Vite: sin dependencias)
import { createHash } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Duplex } from 'node:stream'
import type { Plugin } from 'vite'
import { handleRoom, newCode, newRoom, publicView, TTL_MS, type Room } from '../worker/jam-room'

const jams = new Map<string, Room>()
const sockets = new Map<string, Set<LiveSocket>>() // WebSockets abiertos, por código de sala

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

const header = (req: IncomingMessage, name: string) => {
  const value = req.headers[name]
  return typeof value === 'string' ? value : null
}

/** Avisa a todos los teléfonos conectados a la sala. */
function broadcast(code: string, message: unknown) {
  const text = JSON.stringify(message)
  for (const socket of sockets.get(code) ?? []) socket.send(text)
}

function endRoom(code: string) {
  jams.delete(code)
  broadcast(code, { type: 'ended' })
  for (const socket of sockets.get(code) ?? []) socket.close()
  sockets.delete(code)
}

function purgeOld() {
  const now = Date.now()
  for (const [code, jam] of jams) if (now - jam.updatedAt > TTL_MS) endRoom(code)
}

async function handle(req: IncomingMessage, res: ServerResponse) {
  purgeOld()
  const [resource, rawCode, ...rest] = new URL(req.url ?? '/', 'http://jam').pathname.split('/').filter(Boolean)
  if (resource !== 'jams') return send(res, 404, { error: 'no existe' })
  const method = req.method ?? 'GET'

  if (!rawCode) {
    if (method !== 'POST') return send(res, 405, { error: 'método no permitido' })
    const body = await readJson(req)
    let code = newCode()
    while (jams.has(code)) code = newCode()
    const room = newRoom(code, body.host)
    jams.set(code, room)
    return send(res, 201, { code, token: room.token })
  }

  const room = jams.get(rawCode.toUpperCase())
  if (!room) return send(res, 404, { error: 'Esta Jam no existe o ya terminó' })
  if (rest[0] === 'live') return send(res, 426, { error: 'Usa un WebSocket' })
  const reply = await handleRoom(room, method, rest, { token: header(req, 'x-jam-token'), guest: header(req, 'x-jam-guest') }, () => readJson(req))
  if (reply.ended) endRoom(room.code)
  else if (reply.changed) broadcast(room.code, { type: 'state', jam: publicView(room) })
  send(res, reply.status, reply.body)
}

// ---- WebSocket mínimo (RFC 6455): texto de ida y vuelta, ping/pong y cierre. Basta para probar en el PC. ----

interface LiveSocket {
  send(text: string): void
  close(): void
}

const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'
const MAX_FRAME = 64 * 1024 // la app solo manda «ping»

function acceptWebSocket(req: IncomingMessage, socket: Duplex, onClose: () => void): LiveSocket | null {
  const key = header(req, 'sec-websocket-key')
  if (header(req, 'upgrade')?.toLowerCase() !== 'websocket' || !key) return null
  const accept = createHash('sha1').update(key + WS_GUID).digest('base64')
  socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`)

  let open = true
  const frame = (opcode: number, payload: Buffer) => {
    if (!open || socket.destroyed) return
    const length = payload.length
    let head: Buffer
    if (length < 126) head = Buffer.from([0x80 | opcode, length])
    else if (length < 65536) head = Buffer.from([0x80 | opcode, 126, length >> 8, length & 255])
    else {
      head = Buffer.alloc(10)
      head[0] = 0x80 | opcode
      head[1] = 127
      head.writeBigUInt64BE(BigInt(length), 2)
    }
    socket.write(Buffer.concat([head, payload]))
  }
  const close = () => {
    frame(0x8, Buffer.alloc(0))
    open = false
    socket.end()
  }

  let pending = Buffer.alloc(0)
  socket.on('data', (chunk: Buffer) => {
    pending = Buffer.concat([pending, chunk])
    while (pending.length >= 2) {
      const opcode = pending[0] & 0x0f
      const masked = (pending[1] & 0x80) !== 0
      let length = pending[1] & 0x7f
      let offset = 2
      if (length === 126) {
        if (pending.length < 4) return
        length = pending.readUInt16BE(2)
        offset = 4
      } else if (length === 127) {
        if (pending.length < 10) return
        length = Number(pending.readBigUInt64BE(2))
        offset = 10
      }
      if (length > MAX_FRAME) return socket.destroy()
      const end = offset + (masked ? 4 : 0) + length
      if (pending.length < end) return
      const payload = Buffer.from(pending.subarray(end - length, end))
      if (masked) for (let i = 0; i < payload.length; i++) payload[i] ^= pending[offset + (i % 4)]
      pending = pending.subarray(end)
      if (opcode === 0x8) return close()
      if (opcode === 0x9) frame(0xa, payload) // ping del navegador → pong
      else if (opcode === 0x1 && payload.toString() === 'ping') frame(0x1, Buffer.from('pong')) // el «ping» de la app
    }
  })
  socket.on('close', () => {
    open = false
    onClose()
  })
  socket.on('error', () => socket.destroy())
  return { send: (text) => frame(0x1, Buffer.from(text)), close }
}

/** `/jam-api/jams/:code/live`: se queda abierto y recibe el estado al conectar y después de cada cambio. */
function upgrade(req: IncomingMessage, socket: Duplex) {
  const match = /^\/jam-api\/jams\/([A-Za-z0-9]{6})\/live$/.exec(new URL(req.url ?? '/', 'http://jam').pathname)
  if (!match) return // otra cosa (p. ej. la recarga en caliente de Vite): no es nuestra
  const room = jams.get(match[1].toUpperCase())
  if (!room) {
    socket.end('HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n')
    return
  }
  const set = sockets.get(room.code) ?? new Set<LiveSocket>()
  sockets.set(room.code, set)
  const live = acceptWebSocket(req, socket, () => set.delete(live!))
  if (!live) {
    socket.end('HTTP/1.1 400 Bad Request\r\nContent-Length: 0\r\n\r\n')
    return
  }
  set.add(live)
  live.send(JSON.stringify({ type: 'state', jam: publicView(room) }))
}

/** Plugin de Vite: atiende /jam-api (HTTP y WebSocket) en `npm run dev` y en `npm run preview`. */
export function jamDevServer(): Plugin {
  const middleware = (req: IncomingMessage, res: ServerResponse) => {
    handle(req, res).catch(() => send(res, 400, { error: 'Petición no válida' }))
  }
  return {
    name: 'soundblue-jam-dev',
    configureServer(server) {
      server.middlewares.use('/jam-api', middleware)
      server.httpServer?.on('upgrade', upgrade)
    },
    configurePreviewServer(server) {
      server.middlewares.use('/jam-api', middleware)
      server.httpServer.on('upgrade', upgrade)
    },
  }
}
