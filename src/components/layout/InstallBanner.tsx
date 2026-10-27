import { useEffect, useState } from 'react'

interface InstallPrompt extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallBanner() {
  const [event, setEvent] = useState<InstallPrompt | null>(null)
  const [dismissed, setDismissed] = useState(false)
  useEffect(() => {
    const installable = (raw: Event) => { raw.preventDefault(); setEvent(raw as InstallPrompt) }
    const installed = () => { setEvent(null); setDismissed(true) }
    window.addEventListener('beforeinstallprompt', installable)
    window.addEventListener('appinstalled', installed)
    return () => { window.removeEventListener('beforeinstallprompt', installable); window.removeEventListener('appinstalled', installed) }
  }, [])
  if (!event || dismissed) return null
  return <aside className="fixed inset-x-3 bottom-[calc(var(--nav-h,0px)+4.5rem)] z-50 mx-auto flex max-w-lg items-center gap-3 rounded-xl bg-tarjeta p-3 shadow-xl"><span className="min-w-0 flex-1 font-semibold">Instala SoundBlue</span><button type="button" onClick={async () => { await event.prompt(); await event.userChoice; setEvent(null) }} className="rounded-full bg-acento px-4 py-2 font-semibold text-white">Instalar</button><button type="button" aria-label="Cerrar" onClick={() => setDismissed(true)} className="rounded-full px-2 py-1 text-texto-sec">×</button></aside>
}
