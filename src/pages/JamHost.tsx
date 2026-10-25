import { Copy, ListPlus, Share2, TriangleAlert, Users } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { HostJamUpcoming } from '../components/jam/JamQueue'
import { jamInputClass as inputClass, JamSearch } from '../components/jam/JamSearch'
import { JamTrackRow } from '../components/jam/JamTrackRow'
import { addToSiguientes } from '../components/tracks/trackActions'
import { QrCode } from '../components/ui/QrCode'
import { joinUrl, normalizeCode, readName, saveName } from '../jam/api'
import { useGuestJam } from '../jam/guestJam'
import { hostJam, useHostJam } from '../jam/hostJam'
import { library } from '../library/store'
import { copyText } from '../lib/clipboard'
import { isPrivateAddress } from '../lib/platform'
import { player } from '../player/engine'
import type { Track } from '../player/types'
import { showToast } from '../ui/toast'

// Tu cola es la cola compartida: lo que agregas desde la búsqueda de la Jam entra al final de tu «Siguiente en la cola»
// (igual que «⋮ → Agregar a la cola») y tus amigos lo ven en «Próximas en sonar».
const addAsHost = (track: Track) => {
  addToSiguientes(track)
  return true
}
const inYourQueue = (id: string) => player.getSnapshot().current?.id === id || player.isQueued(id)

/**
 * Jam, como en Spotify: abres una Jam y tus amigos se unen escaneando el código QR (o escribiendo el código) para
 * agregar canciones a tu cola. La música suena en tu teléfono. También sirve para unirse a la Jam de otra persona.
 */
export function JamHost() {
  const jam = useHostJam()
  const guest = useGuestJam()
  const navigate = useNavigate()
  const [name, setName] = useState(readName)
  const [code, setCode] = useState('')

  // Estás en la Jam de otro: «Jam» (Inicio, la cola, la barra lateral) te lleva a esa. Para abrir la tuya, sal de ella.
  if (!jam.code && guest.code && !guest.missing) return <Navigate to={`/jam/${guest.code}`} replace />

  const start = (e: FormEvent) => {
    e.preventDefault()
    saveName(name)
    void hostJam.start(name.trim() || 'Anfitrión')
  }
  const join = (e: FormEvent) => {
    e.preventDefault()
    const clean = normalizeCode(code)
    if (clean.length === 6) navigate(`/jam/${clean}`)
  }

  if (!jam.code) {
    return (
      <div className="mx-auto max-w-xl px-4 pt-8 pb-10">
        <div className="grid size-16 place-items-center rounded-2xl bg-linear-to-br from-acento to-acento-oscuro">
          <Users className="size-8 text-white" aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-3xl font-bold">Jam: escuchen en grupo</h1>
        <p className="mt-2 text-texto-sec">
          Tus amigos escanean un código QR (o escriben un código) desde su celular y agregan canciones a tu cola. La música suena en tu
          teléfono, como en una fiesta.
        </p>
        <form onSubmit={start} className="mt-6 space-y-3">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Tu nombre (lo verán tus amigos)</span>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Por ejemplo: Miguel" className={inputClass} />
          </label>
          <button type="submit" disabled={jam.starting} className="h-12 w-full rounded-full bg-acento font-bold text-white transition hover:bg-acento-hover disabled:opacity-50">
            {jam.starting ? 'Abriendo…' : 'Iniciar Jam'}
          </button>
          {jam.error && (
            <p role="alert" className="text-sm text-red-300">
              {jam.error}
            </p>
          )}
        </form>

        <div className="my-8 h-px bg-white/10" />
        <h2 className="text-lg font-bold">¿Te invitaron a una Jam?</h2>
        <p className="mt-1 text-sm text-texto-sec">Escanea su código QR con la cámara o escribe aquí su código de 6 letras.</p>
        <form onSubmit={join} className="mt-3 flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(normalizeCode(e.target.value))}
            placeholder="Código"
            aria-label="Código de la Jam"
            autoCapitalize="characters"
            className={`${inputClass} font-mono tracking-[0.3em] uppercase`}
          />
          <button type="submit" disabled={code.length !== 6} className="h-12 shrink-0 rounded-full bg-texto px-6 font-bold text-fondo disabled:opacity-40">
            Unirme
          </button>
        </form>
      </div>
    )
  }

  const url = joinUrl(jam.code)
  const copy = async () => showToast((await copyText(url)) ? 'Enlace copiado' : url)
  const share = () => navigator.share?.({ title: 'Únete a mi Jam en SoundBlue', text: `Código: ${jam.code}`, url }).catch(() => {})
  const saveAsPlaylist = () => {
    const playlist = library.createPlaylist(`Jam ${new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}`)
    for (const item of jam.items) library.addToPlaylist(playlist.id, { ...item.track, ytMusic: true })
    showToast(`Guardada como playlist «${playlist.name}»`, { label: 'Ver', run: () => navigate(`/coleccion/playlist/${playlist.id}`) })
  }

  return (
    <div className="mx-auto max-w-xl px-4 pt-8 pb-10 text-center">
      <h1 className="text-3xl font-bold">Tu Jam está abierta</h1>
      <p className="mt-2 text-texto-sec">Que tus amigos escaneen el código con la cámara del celular, o que escriban el código en SoundBlue → Jam.</p>
      {isPrivateAddress() && (
        <p role="alert" className="mt-4 flex items-start gap-2 rounded-lg bg-amber-500/15 p-3 text-left text-sm text-amber-200">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          Estás usando una dirección que solo funciona en este equipo o en tu red ({window.location.host}). Para que tus amigos entren, abre
          SoundBlue desde su link publicado (https://mikem4n.github.io/soundblue/) y vuelve a esta página.
        </p>
      )}
      <QrCode text={url} label={`Código QR para unirse a la Jam ${jam.code}`} className="mx-auto mt-6 size-60 rounded-xl" />
      <p className="mt-4 text-sm text-texto-sec">Código</p>
      <p className="font-mono text-4xl font-bold tracking-[0.3em]">{jam.code}</p>
      <div className="mt-4 flex justify-center gap-2">
        <button type="button" onClick={copy} className="flex items-center gap-2 rounded-full bg-tarjeta px-4 py-2 text-sm font-semibold hover:bg-tarjeta-claro">
          <Copy className="size-4" aria-hidden="true" />
          Copiar enlace
        </button>
        {'share' in navigator && (
          <button type="button" onClick={share} className="flex items-center gap-2 rounded-full bg-tarjeta px-4 py-2 text-sm font-semibold hover:bg-tarjeta-claro">
            <Share2 className="size-4" aria-hidden="true" />
            Compartir
          </button>
        )}
      </div>
      {jam.error && <p className="mt-3 text-sm text-texto-sec">{jam.error}</p>}

      <section className="mt-8 text-left" aria-label="Agregar canciones">
        <h2 className="mb-2 text-lg font-bold">Agrega canciones</h2>
        <JamSearch onAdd={addAsHost} isIn={inYourQueue} />
        <p className="mt-2 text-xs text-texto-sec">Van a tu «Siguiente en la cola», que es la de todos: tus amigos las ven en «Próximas en sonar».</p>
      </section>

      <section className="mt-8 text-left" aria-label="Próximas en sonar">
        <h2 className="text-lg font-bold">Próximas en sonar</h2>
        <p className="mb-1 text-xs text-texto-sec">Desliza una canción a la izquierda para que suene a continuación; a la derecha (o ⋮), opciones como quitarla.</p>
        <HostJamUpcoming />
      </section>

      <section className="mt-8 text-left" aria-label="Agregadas por tus amigos">
        <h2 className="mb-2 text-lg font-bold">Agregadas por tus amigos ({jam.items.length})</h2>
        {jam.items.length === 0 ? (
          <p className="text-sm text-texto-sec">Todavía nada. Cada canción que agreguen entra al final de tu «Siguiente en la cola».</p>
        ) : (
          <ul>
            {[...jam.items].reverse().map((item) => (
              <JamTrackRow key={item.key} track={item.track} detail={`${item.track.artist} · agregó ${item.addedBy}`} />
            ))}
          </ul>
        )}
      </section>

      <div className="mt-8 flex flex-col gap-3">
        {jam.items.length > 0 && (
          <button type="button" onClick={saveAsPlaylist} className="flex h-12 items-center justify-center gap-2 rounded-full bg-tarjeta font-semibold hover:bg-tarjeta-claro">
            <ListPlus className="size-5" aria-hidden="true" />
            Guardar como playlist
          </button>
        )}
        <button type="button" onClick={() => void hostJam.end()} className="h-12 rounded-full font-semibold text-red-300 ring-1 ring-red-300/40 hover:bg-red-500/10">
          Terminar Jam
        </button>
      </div>
    </div>
  )
}
