import { Moon, X } from 'lucide-react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { minutesLeft, SLEEP_OPTIONS, sleepTimer, useSleepTimer } from '../../lib/sleepTimer'
import { showToast } from '../../ui/toast'
import { IconButton } from '../ui/IconButton'

/** «Temporizador» (menú ⋮ de «Sonando ahora»): 15, 30 o 45 minutos, o apagarlo. Ver lib/sleepTimer.ts. */
export function SleepTimerDialog({ onClose }: { onClose: () => void }) {
  const endsAt = useSleepTimer()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const choose = (minutes: number) => {
    sleepTimer.start(minutes)
    showToast(`La música se pausará en ${minutes} minutos`)
    onClose()
  }
  const cancel = () => {
    sleepTimer.cancel()
    showToast('Temporizador apagado')
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="temporizador-titulo"
        className="w-full max-w-sm min-w-0 rounded-xl bg-panel p-4 shadow-2xl ring-1 ring-contraste/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <h2 id="temporizador-titulo" className="flex items-center gap-2 text-lg font-bold">
            <Moon className="size-5" aria-hidden="true" />
            Temporizador
          </h2>
          <IconButton label="Cerrar" onClick={onClose}>
            <X className="size-5" />
          </IconButton>
        </div>
        <p className="mb-3 text-sm text-texto-sec">
          {endsAt ? `La música se pausará en ${minutesLeft(endsAt)} min.` : 'Al terminar, la música baja de volumen poco a poco y se pausa.'}
        </p>
        <div className="grid grid-cols-3 gap-2">
          {SLEEP_OPTIONS.map((minutes) => (
            <button key={minutes} type="button" onClick={() => choose(minutes)} className="rounded-lg bg-contraste/10 py-3 font-bold hover:bg-contraste/15">
              {minutes} min
            </button>
          ))}
        </div>
        {endsAt && (
          <button type="button" onClick={cancel} className="mt-3 w-full rounded-lg py-2 text-sm font-semibold text-texto-sec hover:text-texto">
            Apagar temporizador
          </button>
        )}
      </div>
    </div>,
    document.body,
  )
}
