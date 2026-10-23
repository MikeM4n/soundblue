// Aviso de versión nueva: compara la versión con la que se abrió la app con la publicada (version.json, que se pide
// siempre a la red). Se revisa al abrir y cada vez que vuelves a la app. Si hay una más nueva y no está sonando nada,
// la app se recarga sola (una vez por versión); si está sonando, ofrece «Actualizar» para no cortar la música.
import { player } from '../player/engine'
import { showToast } from '../ui/toast'

const RELOADED_KEY = 'soundblue:recargada-por-version'

async function publishedVersion(): Promise<string | null> {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}version.json`, { cache: 'no-store' })
    if (!response.ok) return null
    const data: unknown = await response.json()
    const version = (data as { version?: unknown } | null)?.version
    return typeof version === 'string' ? version : null
  } catch {
    return null // sin conexión o sin version.json (al probar con `npm run dev`)
  }
}

let offered = ''
let started = false

async function checkForUpdate() {
  const latest = await publishedVersion()
  if (!latest || latest === __APP_VERSION__) return
  const { status, pausedOnExit } = player.getSnapshot()
  const busy = status === 'playing' || status === 'buffering' || pausedOnExit
  let reloadedFor: string | null = null
  try {
    reloadedFor = sessionStorage.getItem(RELOADED_KEY)
  } catch {
    /* sin almacenamiento: no se recarga sola, solo se ofrece el botón */
    reloadedFor = latest
  }
  // Una sola recarga automática por versión: si después de recargar sigue llegando la vieja, solo se ofrece el botón.
  if (!busy && reloadedFor !== latest) {
    try {
      sessionStorage.setItem(RELOADED_KEY, latest)
    } catch {
      /* igual se recarga una vez */
    }
    window.location.reload()
    return
  }
  if (offered === latest) return
  offered = latest
  showToast('Hay una versión nueva de SoundBlue', { label: 'Actualizar', run: () => window.location.reload() }, 15000)
}

export function startUpdateChecks() {
  if (started) return
  started = true
  void checkForUpdate()
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void checkForUpdate()
  })
}
