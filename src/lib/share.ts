// «Compartir» (menú ⋮): una imagen con la carátula, el título y el artista (dibujada en un <canvas>) y un enlace que abre
// la canción en SoundBlue (#/cancion/:id). Con la función de compartir del celular (navigator.share) si existe; si no
// puede mandar imágenes, solo el texto y el enlace; sin ninguna, copia el enlace.
import { coverSources, type Track } from '../player/types'
import { showToast } from '../ui/toast'
import { copyText } from './clipboard'

const WIDTH = 1080
const HEIGHT = 1350
const COVER_WAIT_MS = 2500 // compartir tiene que llegar pronto después del toque (el navegador lo exige)

/** Enlace a la canción dentro de SoundBlue. */
export const songLink = (track: Track) => `${location.origin}${location.pathname}#/cancion/${encodeURIComponent(track.id)}`

export async function shareTrack(track: Track) {
  const url = songLink(track)
  const text = `«${track.title}» de ${track.artist}. Escúchala en SoundBlue`
  try {
    const image = await shareImage(track).catch(() => null)
    if (image && navigator.canShare?.({ files: [image] })) {
      await navigator.share({ files: [image], title: track.title, text: `${text}: ${url}` })
      return
    }
    if (navigator.share) {
      await navigator.share({ title: track.title, text, url })
      return
    }
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') return // cerraste la ventana de compartir
  }
  const copied = await copyText(`${text}: ${url}`)
  showToast(copied ? 'Enlace copiado: pégalo donde quieras' : 'No se pudo compartir en este navegador')
}

/** La tarjeta para compartir (PNG): carátula grande sobre su versión difuminada, título, artista y «SoundBlue». */
async function shareImage(track: Track): Promise<File> {
  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const ctx = canvas.getContext('2d')!
  const cover = await firstImage(coverSources(track, 'large'))

  // Fondo: la carátula difuminada y oscurecida (o un degradado azul si no se pudo cargar).
  const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT)
  gradient.addColorStop(0, '#2b4fc2')
  gradient.addColorStop(1, '#05070f')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, WIDTH, HEIGHT)
  if (cover) {
    ctx.filter = 'blur(60px) brightness(0.55)'
    ctx.drawImage(cover, -200, -200, WIDTH + 400, HEIGHT + 400)
    ctx.filter = 'none'
  }
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  // Carátula con esquinas redondeadas.
  const size = 780
  const x = (WIDTH - size) / 2
  const y = 150
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(x, y, size, size, 36)
  ctx.clip()
  if (cover) {
    // El cuadrado del centro (como la carátula en la app): una miniatura de video 16:9 no se estira.
    const side = Math.min(cover.naturalWidth, cover.naturalHeight)
    ctx.drawImage(cover, (cover.naturalWidth - side) / 2, (cover.naturalHeight - side) / 2, side, side, x, y, size, size)
  } else {
    ctx.fillStyle = '#4169e1'
    ctx.fillRect(x, y, size, size)
  }
  ctx.restore()

  // Título (hasta 2 líneas) y artista.
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.font = '800 64px "Inter Variable", system-ui, sans-serif'
  const lines = wrap(ctx, track.title, WIDTH - 160).slice(0, 2)
  lines.forEach((line, i) => ctx.fillText(line, WIDTH / 2, y + size + 110 + i * 76))
  ctx.font = '500 44px "Inter Variable", system-ui, sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.75)'
  ctx.fillText(ellipsis(ctx, track.artist, WIDTH - 160), WIDTH / 2, y + size + 110 + lines.length * 76 + 20)
  ctx.font = '700 36px "Inter Variable", system-ui, sans-serif'
  ctx.fillStyle = '#9db4ff'
  ctx.fillText('SoundBlue', WIDTH / 2, HEIGHT - 60)

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('No se pudo crear la imagen')
  return new File([blob], 'soundblue.png', { type: 'image/png' })
}

/** La primera de las carátulas que cargue a tiempo (o null: la tarjeta sale con el degradado azul). */
async function firstImage(sources: string[]): Promise<HTMLImageElement | null> {
  const deadline = Date.now() + COVER_WAIT_MS
  for (const src of sources) {
    const left = deadline - Date.now()
    if (left <= 0) break
    const img = await loadImage(src, left).catch(() => null)
    if (img && img.naturalWidth > 120) return img // la miniatura de 120 px de YouTube es «no hay imagen»
  }
  return null
}

/** Carga una imagen que se pueda dibujar y exportar (la carátula tiene que permitir CORS). */
function loadImage(src: string, wait: number): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    const timer = window.setTimeout(() => reject(new Error('La carátula tardó demasiado')), wait)
    img.onload = () => {
      window.clearTimeout(timer)
      resolve(img)
    }
    img.onerror = () => {
      window.clearTimeout(timer)
      reject(new Error('No se pudo cargar la carátula'))
    }
    img.src = src
  })
}

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word
    if (ctx.measureText(next).width <= max || !line) line = next
    else {
      lines.push(line)
      line = word
    }
  }
  if (line) lines.push(line)
  if (lines.length > 2) lines[1] = ellipsis(ctx, `${lines[1]} ${lines.slice(2).join(' ')}`, max)
  return lines.map((l) => ellipsis(ctx, l, max))
}

function ellipsis(ctx: CanvasRenderingContext2D, text: string, max: number): string {
  if (ctx.measureText(text).width <= max) return text
  let cut = text
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > max) cut = cut.slice(0, -1)
  return `${cut.trimEnd()}…`
}
