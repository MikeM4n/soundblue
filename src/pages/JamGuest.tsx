import { Users } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { JamNowPlaying, JamUpcoming } from '../components/jam/JamQueue'
import { jamInputClass, JamSearch } from '../components/jam/JamSearch'
import { isInJam, normalizeCode, readName, saveName } from '../jam/api'
import { guestJam, useGuestJam } from '../jam/guestJam'
import { useHostJam } from '../jam/hostJam'
import { showToast } from '../ui/toast'

/**
 * Invitado de una Jam (llega escaneando el código QR o escribiendo el código): ve qué suena en el teléfono del
 * anfitrión y lo que viene, y agrega canciones de YouTube Music a la cola compartida: con la búsqueda de aquí o, desde
 * cualquier lista de la app, con «⋮ → Agregar a la Jam» (sigue en la Jam aunque cambie de página). Aquí no suena nada.
 */
export function JamGuest() {
  const { code: rawCode = '' } = useParams()
  const code = normalizeCode(rawCode)
  const navigate = useNavigate()
  const hosting = useHostJam().code
  const guest = useGuestJam()
  const [name, setName] = useState(readName)
  const [draft, setDraft] = useState(readName)
  const [otherCode, setOtherCode] = useState('')

  // Entrar: desde ahora, en toda la app, lo que agregues va a esta Jam (hasta que salgas o termine).
  useEffect(() => {
    if (!hosting) guestJam.join(code)
  }, [code, hosting])

  if (hosting === code) return <Navigate to="/jam" replace /> // es tu propia Jam
  if (hosting) {
    return (
      <div className="mx-auto max-w-xl px-4 pt-10 pb-10">
        <h1 className="text-2xl font-bold">Tienes tu propia Jam abierta</h1>
        <p className="mt-2 text-texto-sec">
          Para unirte a la Jam {code}, primero termina la tuya ({hosting}).
        </p>
        <Link to="/jam" className="mt-6 inline-block text-acento-texto hover:underline">
          Ir a tu Jam
        </Link>
      </div>
    )
  }

  const mine = guest.code === code ? guest : null
  if (code.length !== 6 || mine?.missing) {
    const tryOther = (e: FormEvent) => {
      e.preventDefault()
      if (normalizeCode(otherCode).length === 6) navigate(`/jam/${normalizeCode(otherCode)}`)
    }
    return (
      <div className="mx-auto max-w-xl px-4 pt-10 pb-10">
        <h1 className="text-2xl font-bold">{mine?.reason ?? 'Esta Jam no existe o ya terminó'}</h1>
        <p className="mt-2 text-texto-sec">Revisa el código ({code || '—'}) o pide uno nuevo.</p>
        <form onSubmit={tryOther} className="mt-4 flex gap-2">
          <input
            value={otherCode}
            onChange={(e) => setOtherCode(normalizeCode(e.target.value))}
            placeholder="Código"
            aria-label="Código de la Jam"
            autoCapitalize="characters"
            className={`${jamInputClass} font-mono tracking-[0.3em] uppercase`}
          />
          <button type="submit" disabled={otherCode.length !== 6} className="h-12 shrink-0 rounded-full bg-texto px-6 font-bold text-fondo disabled:opacity-40">
            Unirme
          </button>
        </form>
        <Link to="/" className="mt-6 inline-block text-acento-texto hover:underline">
          Ir al inicio
        </Link>
      </div>
    )
  }

  const jam = mine?.jam
  if (!jam) return <p className="p-8 text-texto-sec">Entrando a la Jam…</p>

  if (!name) {
    const enter = (e: FormEvent) => {
      e.preventDefault()
      if (!draft.trim()) return
      saveName(draft)
      setName(draft.trim())
    }
    return (
      <form onSubmit={enter} className="mx-auto max-w-xl px-4 pt-10 pb-10">
        <div className="grid size-16 place-items-center rounded-2xl bg-linear-to-br from-acento to-acento-oscuro">
          <Users className="size-8 text-white" aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-2xl font-bold">Jam de {jam.host}</h1>
        <p className="mt-2 text-texto-sec">Vas a poder agregar canciones a su cola. ¿Cómo te llamas?</p>
        <input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={40} placeholder="Tu nombre" aria-label="Tu nombre" className={`${jamInputClass} mt-4`} />
        <button type="submit" disabled={!draft.trim()} className="mt-3 h-12 w-full rounded-full bg-acento font-bold text-white hover:bg-acento-hover disabled:opacity-40">
          Entrar a la Jam
        </button>
      </form>
    )
  }

  // Salir: lo que agregues vuelve a ir a la cola de tu teléfono.
  const leave = () => {
    guestJam.leave()
    showToast('Saliste de la Jam')
    navigate('/')
  }

  return (
    <div className="mx-auto max-w-xl px-4 pt-6 pb-10">
      <header className="flex items-center gap-3">
        <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-linear-to-br from-acento to-acento-oscuro">
          <Users className="size-6 text-white" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold">Jam de {jam.host}</h1>
          <p className="text-sm text-texto-sec">
            Código <span className="font-mono font-semibold tracking-widest text-texto">{jam.code}</span> · la música suena en el teléfono de {jam.host}
          </p>
        </div>
        <button type="button" onClick={leave} className="shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold text-texto-sec ring-1 ring-white/15 hover:text-texto">
          Salir
        </button>
      </header>

      <section aria-label="Sonando ahora" className="mt-6">
        <h2 className="mb-1 text-sm font-semibold tracking-wider text-texto-sec uppercase">Sonando ahora</h2>
        <JamNowPlaying jam={jam} />
      </section>

      <section aria-label="Agregar canciones" className="mt-6">
        <h2 className="mb-2 text-lg font-bold">Agrega canciones</h2>
        <JamSearch onAdd={guestJam.add} isIn={(id) => isInJam(jam, id)} />
        <p className="mt-2 text-xs text-texto-sec">También con ⋮ → «Agregar a la Jam» en cualquier canción de la app.</p>
      </section>

      <section aria-label="Próximas en sonar" className="mt-6">
        <h2 className="text-lg font-bold">Próximas en sonar</h2>
        <p className="mb-1 text-xs text-texto-sec">Desliza a la derecha una canción que agregaste tú para quitarla (con «Deshacer»). ⋮ abre las opciones.</p>
        <JamUpcoming jam={jam} />
      </section>
    </div>
  )
}
