// Servidor de las Jams de SoundBlue en Cloudflare (para la versión publicada): un Worker que reparte las peticiones y
// un Durable Object por sala («JamRoom»). Cada sala guarda sus datos en su propia base SQLite (clase SQLite: funciona en
// el plan gratis) y avisa cada cambio por WebSocket con hibernación: mientras nadie cambia nada, el objeto duerme con
// las conexiones abiertas y no gasta. Mismas reglas que el servidor de prueba de Vite (worker/jam-room.ts) y el mismo
// contrato (ver src/jam/api.ts): la app solo necesita VITE_JAM_API con la dirección de este Worker.
// Solo datos de canciones (id de YouTube, título, artista…), nunca audio.
import { DurableObject } from 'cloudflare:workers'
import { handleRoom, newCode, newRoom, publicView, TTL_MS } from './jam-room'

// Solo la app publicada y las pruebas en el PC (npm run dev en 5173 o 5174, npm run preview en 4173). El Worker de
// prueba (jam.staging.wrangler.jsonc) acepta además lo que diga ORIGENES_PRUEBA (los links temporales de TryCloudflare).
const ORIGINS = new Set(['https://mikem4n.github.io', 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:4173'])
const allowed = (origin, env) => ORIGINS.has(origin) || (!!env.ORIGENES_PRUEBA && new RegExp(env.ORIGENES_PRUEBA).test(origin))
const MAX_BODY = 64 * 1024

const corsHeaders = (origin) => ({
  'access-control-allow-origin': origin,
  'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'access-control-allow-headers': 'content-type, x-jam-token, x-jam-guest',
  'access-control-max-age': '86400',
  vary: 'Origin',
})

const reply = (status, data, origin) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...(origin ? corsHeaders(origin) : {}) },
  })

function parseJson(text) {
  if (text.length > MAX_BODY) throw new Error('Petición demasiado grande')
  const parsed = text ? JSON.parse(text) : {}
  return parsed && typeof parsed === 'object' ? parsed : {}
}

const readJson = async (request) => parseJson(await request.text())

/** La sala de un código: siempre el mismo Durable Object. */
const roomFor = (env, code) => env.SALAS.get(env.SALAS.idFromName(code))

export class JamRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env)
    this.room = this.load()
    // «ping» → «pong» sin despertar al objeto (la app lo manda cada 25 s para que la conexión no se corte).
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'))
  }

  load() {
    this.ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS sala (id INTEGER PRIMARY KEY, datos TEXT NOT NULL)')
    const row = this.ctx.storage.sql.exec('SELECT datos FROM sala WHERE id = 1').toArray()[0]
    return row ? JSON.parse(row.datos) : null
  }

  save() {
    this.ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS sala (id INTEGER PRIMARY KEY, datos TEXT NOT NULL)')
    this.ctx.storage.sql.exec('INSERT OR REPLACE INTO sala (id, datos) VALUES (1, ?)', JSON.stringify(this.room))
  }

  /** Crea la sala (lo llama el Worker). null si el código ya estaba en uso: el Worker prueba con otro. */
  async crear(code, host) {
    if (this.room) return null
    this.room = newRoom(code, host)
    this.save()
    await this.ctx.storage.setAlarm(Date.now() + TTL_MS)
    return { code, token: this.room.token }
  }

  async fetch(request) {
    if (!this.room) return reply(404, { error: 'Esta Jam no existe o ya terminó' })
    const [, , ...rest] = new URL(request.url).pathname.split('/').filter(Boolean) // jams, CÓDIGO, …
    if (rest[0] === 'live') return this.live(request)
    let result
    try {
      // El cuerpo se lee siempre antes de responder: si una respuesta (p. ej. un 403) sale sin leerlo, el objeto se cae.
      const body = request.method === 'GET' || request.method === 'HEAD' ? '' : await request.text()
      const caller = { token: request.headers.get('x-jam-token'), guest: request.headers.get('x-jam-guest') }
      result = await handleRoom(this.room, request.method, rest, caller, async () => parseJson(body))
    } catch {
      return reply(400, { error: 'Petición no válida' })
    }
    if (result.ended) await this.end()
    else if (result.changed) {
      this.save()
      this.broadcast({ type: 'state', jam: publicView(this.room) })
    }
    return reply(result.status, result.body)
  }

  /** `/jams/:code/live`: WebSocket con hibernación; recibe el estado al conectar y después de cada cambio. */
  live(request) {
    if (request.headers.get('upgrade')?.toLowerCase() !== 'websocket') return reply(426, { error: 'Usa un WebSocket' })
    const [client, server] = Object.values(new WebSocketPair())
    this.ctx.acceptWebSocket(server)
    server.send(JSON.stringify({ type: 'state', jam: publicView(this.room) }))
    return new Response(null, { status: 101, webSocket: client })
  }

  broadcast(message) {
    const text = JSON.stringify(message)
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(text)
      } catch {
        /* ya se cerró */
      }
    }
  }

  /** El anfitrión la terminó (o caducó): se avisa, se cierran las conexiones y se borra todo. */
  async end() {
    this.broadcast({ type: 'ended' })
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.close(1000, 'La Jam terminó')
      } catch {
        /* ya se cerró */
      }
    }
    this.room = null
    await this.ctx.storage.deleteAlarm()
    await this.ctx.storage.deleteAll()
  }

  /** Una Jam sin actividad se borra a las 12 horas (igual que en el servidor de prueba). */
  async alarm() {
    if (!this.room) return
    if (Date.now() - this.room.updatedAt >= TTL_MS) await this.end()
    else await this.ctx.storage.setAlarm(this.room.updatedAt + TTL_MS)
  }

  webSocketMessage(ws, message) {
    if (message === 'ping') ws.send('pong') // normalmente lo contesta la respuesta automática, sin despertar al objeto
  }

  webSocketClose(ws, code) {
    try {
      ws.close(code, 'Adiós')
    } catch {
      /* ya estaba cerrada (o el código no se puede devolver) */
    }
  }
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('origin') ?? ''
    if (!allowed(origin, env)) return reply(403, { error: 'Origen no permitido' })
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) })
    const [resource, rawCode] = new URL(request.url).pathname.split('/').filter(Boolean)
    if (resource !== 'jams') return reply(404, { error: 'No existe' }, origin)

    if (!rawCode) {
      if (request.method !== 'POST') return reply(405, { error: 'Método no permitido' }, origin)
      const body = await readJson(request).catch(() => ({}))
      for (let tries = 0; tries < 5; tries++) {
        const code = newCode()
        const created = await roomFor(env, code).crear(code, body.host)
        if (created) return reply(201, created, origin)
      }
      return reply(503, { error: 'No se pudo crear la Jam. Intenta otra vez.' }, origin)
    }

    const code = rawCode.toUpperCase()
    if (!/^[A-Z0-9]{6}$/.test(code)) return reply(404, { error: 'Esta Jam no existe o ya terminó' }, origin)
    const response = await roomFor(env, code).fetch(request)
    if (response.status === 101) return response // el WebSocket pasa tal cual
    const headers = new Headers(response.headers)
    for (const [name, value] of Object.entries(corsHeaders(origin))) headers.set(name, value)
    return new Response(response.body, { status: response.status, headers })
  },
}
