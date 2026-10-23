import { Info, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { BRAVE_LINKS, braveIntentUrl, detectPlatform, isBraveBrowser, type Platform } from '../../lib/platform'

const CLOSED_KEY = 'soundblue:aviso-brave-cerrado'
const SHIELDS_CLOSED_KEY = 'soundblue:consejo-shields-cerrado'

function wasClosed(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

function rememberClosed(key: string) {
  try {
    localStorage.setItem(key, '1')
  } catch {
    /* sin almacenamiento disponible: el aviso volverá a salir la próxima vez */
  }
}

// Fuera de Brave: invitación a abrir la app en Brave. Dentro de Brave: consejo de Shields.
type Notice = { kind: 'brave'; platform: Platform } | { kind: 'shields' }

// Botón según el dispositivo: en Android abre esta página en Brave; en iPhone/iPad, App Store.
const BUTTONS: Record<Exclude<Platform, 'pc'>, { label: string; href: () => string }> = {
  android: { label: 'Abrir en Brave', href: braveIntentUrl },
  ios: { label: 'Descargar Brave', href: () => BRAVE_LINKS.appStore },
}

/**
 * Aviso discreto. Fuera de Brave invita a abrir la app en Brave; dentro de Brave sugiere Shields en «Agresivo».
 * Solo informa (la app funciona igual en cualquier navegador) y cada aviso, una vez cerrado, no vuelve.
 */
export function BraveBanner() {
  const [notice, setNotice] = useState<Notice | null>(null) // null = no mostrar

  useEffect(() => {
    let active = true
    isBraveBrowser().then((brave) => {
      if (!active) return
      if (!brave && !wasClosed(CLOSED_KEY)) setNotice({ kind: 'brave', platform: detectPlatform() })
      if (brave && !wasClosed(SHIELDS_CLOSED_KEY)) setNotice({ kind: 'shields' })
    })
    return () => {
      active = false
    }
  }, [])

  if (!notice) return null

  const close = () => {
    rememberClosed(notice.kind === 'brave' ? CLOSED_KEY : SHIELDS_CLOSED_KEY)
    setNotice(null)
  }
  const platform = notice.kind === 'brave' ? notice.platform : null
  const button = platform && platform !== 'pc' ? BUTTONS[platform] : null

  return (
    <div role="note" className="flex shrink-0 items-center gap-3 bg-tarjeta px-4 py-2 text-sm text-texto-sec lg:rounded-lg">
      <Info className="size-4 shrink-0 text-acento-texto" aria-hidden="true" />
      <p className="flex-1">
        {notice.kind === 'shields' ? (
          <>
            Consejo: con Shields en «Agresivo», Brave bloquea más anuncios de YouTube.{' '}
            <Link to="/ayuda" className="font-medium text-acento-texto underline-offset-2 hover:underline">
              Ver cómo
            </Link>
          </>
        ) : platform === 'pc' ? (
          <>
            Para escuchar con menos anuncios,{' '}
            <a href={BRAVE_LINKS.pc} target="_blank" rel="noopener noreferrer" className="font-medium text-acento-texto underline-offset-2 hover:underline">
              abre SoundBlue en Brave
            </a>
          </>
        ) : (
          'Para escuchar con menos anuncios, abre SoundBlue en Brave'
        )}
      </p>
      {button && (
        <a
          href={button.href()}
          target={platform === 'ios' ? '_blank' : undefined}
          rel="noopener noreferrer"
          className="shrink-0 rounded-full bg-acento px-3 py-1.5 text-xs font-bold text-white hover:bg-acento-hover"
        >
          {button.label}
        </a>
      )}
      <button
        type="button"
        onClick={close}
        aria-label="Cerrar aviso"
        className="shrink-0 rounded-full p-1 transition-colors hover:bg-white/10 hover:text-texto"
      >
        <X className="size-4" />
      </button>
    </div>
  )
}
