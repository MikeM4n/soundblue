// Pantalla flotante (experimental): una ventanita que queda encima de las demás con la carátula, el título, el
// progreso y los controles. Usa Document Picture-in-Picture, que existe en Chrome, Edge y Brave del PC.
// El video de YouTube no puede ir dentro: está en un iframe de otro dominio y la página no puede tocar su <video>
// (por eso no se puede llamar a requestPictureInPicture sobre él). La música sigue sonando en la pestaña de SoundBlue.
// En los navegadores del celular esa API no existe: se avisa con un mensaje.
import { createRoot } from 'react-dom/client'
import { detectPlatform } from '../../lib/platform'
import { coverSources } from '../../player/types'
import { usePlayer } from '../../player/usePlayer'
import { showToast } from '../../ui/toast'
import { Cover } from '../ui/Cover'
import { SeekBar } from './SeekBar'
import { TransportControls } from './TransportControls'

declare global {
  interface Window {
    // Document Picture-in-Picture (Chrome 116+ en el PC); todavía no está en los tipos de TypeScript.
    documentPictureInPicture?: {
      window: Window | null
      requestWindow(options?: { width?: number; height?: number }): Promise<Window>
    }
  }
}

const MOBILE_MESSAGE = 'La pantalla flotante de video no está disponible en este navegador móvil. Usa la notificación o el botón Reanudar.'
const unavailableMessage = () =>
  detectPlatform() === 'pc' ? 'La pantalla flotante no está disponible en este navegador. Prueba con Chrome, Edge o Brave en el PC.' : MOBILE_MESSAGE

/** Lo que se ve en la ventanita: sigue a la canción actual (el motor es el mismo de la pestaña). */
function MiniPlayer() {
  const { current } = usePlayer()
  if (!current) return <p className="p-4 text-sm text-texto-sec">No hay nada sonando.</p>
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center">
      <Cover seed={current.id} src={coverSources(current, 'large')} eager className="aspect-square w-40 rounded-lg shadow-2xl shadow-black/60" />
      <div className="w-full min-w-0">
        <p className="truncate font-bold">{current.title}</p>
        <p className="truncate text-sm text-texto-sec">{current.artist}</p>
      </div>
      <SeekBar />
      <TransportControls />
    </div>
  )
}

/** Copia los estilos de la app a la ventanita (sin eso se vería sin diseño). */
function copyStyles(target: Document) {
  const base = target.createElement('base')
  base.href = document.baseURI // para que las fuentes y las imágenes con dirección relativa carguen
  target.head.append(base)
  for (const sheet of [...document.styleSheets]) {
    try {
      const style = target.createElement('style')
      style.textContent = [...sheet.cssRules].map((rule) => rule.cssText).join('\n')
      target.head.append(style)
    } catch {
      if (!sheet.href) continue
      const link = target.createElement('link')
      link.rel = 'stylesheet'
      link.href = sheet.href
      target.head.append(link)
    }
  }
}

/** Abre la pantalla flotante (o la cierra, si ya está abierta). Si el navegador no puede, avisa. */
export async function toggleFloatingPlayer() {
  const pip = window.documentPictureInPicture
  if (!pip) {
    showToast(unavailableMessage(), undefined, 6000)
    return
  }
  if (pip.window) {
    pip.window.close()
    return
  }
  try {
    const win = await pip.requestWindow({ width: 320, height: 420 })
    copyStyles(win.document)
    win.document.title = 'SoundBlue'
    win.document.body.className = 'm-0 h-screen overflow-hidden bg-fondo text-texto'
    const container = win.document.createElement('div')
    container.className = 'h-full'
    win.document.body.append(container)
    const root = createRoot(container)
    root.render(<MiniPlayer />)
    win.addEventListener('pagehide', () => root.unmount())
  } catch {
    showToast(detectPlatform() === 'pc' ? 'No se pudo abrir la pantalla flotante.' : MOBILE_MESSAGE, undefined, 6000)
  }
}
