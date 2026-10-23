// Recibe el registro de segundo plano que manda el teléfono (Ayuda → «Enviar registro al PC», solo en desarrollo)
// mientras se prueba con `npm run dev` o `npm run dev:red`, y lo guarda en el PC (diagnostico-telefono.json, fuera
// de git) para revisarlo. Solo escribe ese archivo: no hay forma de leerlo desde afuera.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { resolve } from 'node:path'
import type { Plugin } from 'vite'

const MAX_BYTES = 100_000
const KEEP = 10 // últimos envíos

function handler(file: string) {
  return (req: IncomingMessage, res: ServerResponse) => {
    if (req.method !== 'POST') {
      res.statusCode = 405
      return res.end()
    }
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
      if (body.length > MAX_BYTES) req.destroy()
    })
    req.on('end', () => {
      try {
        const report = { recibido: new Date().toISOString(), ...JSON.parse(body) }
        const previous = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : []
        writeFileSync(file, JSON.stringify([...previous, report].slice(-KEEP), null, 1))
        res.statusCode = 201
      } catch {
        res.statusCode = 400
      }
      res.end()
    })
  }
}

/** Plugin de Vite: atiende /diag-api en `npm run dev` y en `npm run preview`. */
export function diagDevServer(): Plugin {
  let file = 'diagnostico-telefono.json'
  return {
    name: 'soundblue-diag-dev',
    configResolved(config) {
      file = resolve(config.root, 'diagnostico-telefono.json')
    },
    configureServer(server) {
      server.middlewares.use('/diag-api', handler(file))
    },
    configurePreviewServer(server) {
      server.middlewares.use('/diag-api', handler(file))
    },
  }
}
