import { EllipsisVertical, ListStart } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { pendingItems, type JamState } from '../../jam/api'
import { guestJam, useGuestJam } from '../../jam/guestJam'
import { hostJam, useHostJam } from '../../jam/hostJam'
import { coverSources, type Track } from '../../player/types'
import { usePlayer } from '../../player/usePlayer'
import { TrackMenu } from '../tracks/TrackMenu'
import { playNext, type RemoveAction } from '../tracks/trackActions'
import { useSwipe } from '../tracks/useSwipe'
import { Cover } from '../ui/Cover'
import { JamTrackRow } from './JamTrackRow'

const SNAP_BACK_MS = 200 // lo que tarda una fila deslizada en volver a su lugar

/** Estado de una fila, a la derecha (siempre visible, aunque el detalle se corte): «Sonando», «En pausa», «En camino». */
function Tag({ children, accent = false }: { children: ReactNode; accent?: boolean }) {
  return <span className={`shrink-0 pr-1 text-xs font-semibold ${accent ? 'text-acento-texto' : 'text-texto-sec'}`}>{children}</span>
}

// Quitar de la Jam, con el aviso de 4 s y «Deshacer» de siempre («⋮ → Eliminar de la Jam»; deslizar a la derecha abre ⋮).
// Invitado: solo las que agregó él (el servidor lo comprueba con su id). Anfitrión: cualquiera.
const guestRemove = (track: Track): RemoveAction => ({
  listName: 'la Jam',
  remove: () => {
    void guestJam.remove(track.id)
    return () => void guestJam.restore(track.id)
  },
})
const hostRemove = (track: Track): RemoveAction => ({ listName: 'la Jam', remove: () => hostJam.remove(track) })

interface JamQueueRowProps {
  track: Track
  detail: string
  tag?: ReactNode
  removeAction?: RemoveAction // «Eliminar de la Jam» en el menú (si puedes quitarla)
  onLeft?: () => void // deslizar a la izquierda (anfitrión: que suene a continuación); sin esto, no se desliza
}

/**
 * Fila de la lista compartida. Como en el resto de la app: deslizar a la IZQUIERDA es la acción rápida (el anfitrión la
 * pone a sonar a continuación; nunca abre un menú) y a la DERECHA abre el menú «⋮», donde está «Eliminar de la Jam».
 */
function JamQueueRow({ track, detail, tag, removeAction, onLeft }: JamQueueRowProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const swipe = useSwipe({
    onLeft,
    // El menú se abre cuando la fila terminó de volver a su lugar (200 ms): así queda junto a su botón «⋮».
    onRight: () => window.setTimeout(() => setMenuOpen(true), SNAP_BACK_MS),
  })
  const grow = `size-6 transition-transform ${swipe.armed ? 'scale-125' : ''}`
  return (
    <li className="relative overflow-hidden rounded-md">
      {swipe.dx < 0 && (
        <div className="absolute inset-0 flex items-center justify-end gap-2 bg-acento pr-5 text-sm font-semibold text-white">
          <span>A continuación</span>
          <ListStart className={grow} aria-hidden="true" />
        </div>
      )}
      {swipe.dx > 0 && (
        <div className="absolute inset-0 flex items-center justify-start gap-2 bg-tarjeta-claro pl-5 text-sm font-semibold text-white">
          <EllipsisVertical className={grow} aria-hidden="true" />
          <span>Opciones</span>
        </div>
      )}
      <div
        ref={swipe.ref}
        {...swipe.handlers}
        className="relative flex h-16 touch-pan-y items-center gap-3 bg-panel pr-1 pl-2 select-none hover:bg-tarjeta"
        style={{ transform: `translateX(${swipe.dx}px)`, transition: swipe.active ? 'none' : `transform ${SNAP_BACK_MS}ms ease-out` }}
      >
        <Cover seed={track.id} src={coverSources(track)} className="size-12 shrink-0 rounded" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-texto">{track.title}</span>
          <span className="block truncate text-sm text-texto-sec">{detail}</span>
        </span>
        {tag}
        <TrackMenu track={track} removeAction={removeAction} open={menuOpen} onOpenChange={setMenuOpen} />
      </div>
    </li>
  )
}

/** Lo que suena en el teléfono del anfitrión, o «En pausa» si la canción está lista pero todavía nadie tocó ▶. */
export function JamNowPlaying({ jam }: { jam: JamState }) {
  const track = jam.nowPlaying
  if (!track) return <p className="text-sm text-texto-sec">Todavía no suena nada.</p>
  return (
    <>
      <ul>
        <JamTrackRow track={track} action={jam.playing ? <Tag accent>Sonando</Tag> : <Tag>En pausa</Tag>} />
      </ul>
      {!jam.playing && <p className="px-2 text-xs text-texto-sec">Está lista en el teléfono de {jam.host}: suena cuando toque ▶.</p>}
    </>
  )
}

const EMPTY = <p className="text-sm text-texto-sec">Nada en la cola todavía: ¡agrega la primera!</p>

/**
 * «Próximas en sonar» de la Jam, como la ve un invitado: lo que viene en la cola del anfitrión y, al final, lo recién
 * agregado que su teléfono todavía no tomó («En camino»). Todos ven al instante lo que agrega o quita cualquiera.
 */
export function JamUpcoming({ jam }: { jam: JamState }) {
  const addedBy = new Map(jam.items.filter((item) => !item.removed).map((item) => [item.track.id, item.addedBy])) // quién agregó cada una
  const removable = (track: Track) => (guestJam.isMine(track.id) ? guestRemove(track) : undefined)
  const rows = [
    ...jam.upcoming.map((track, i) => ({ key: `${i}-${track.id}`, track, pending: false })),
    ...pendingItems(jam).map((item) => ({ key: item.key, track: item.track, pending: true })),
  ]
  if (rows.length === 0) return EMPTY
  return (
    <ul>
      {rows.map(({ key, track, pending }) => (
        <JamQueueRow
          key={key}
          track={track}
          detail={addedBy.has(track.id) ? `${track.artist} · agregó ${addedBy.get(track.id)}` : track.artist}
          tag={pending ? <Tag>En camino</Tag> : undefined}
          removeAction={removable(track)}
        />
      ))}
    </ul>
  )
}

/** «Próximas en sonar» de tu Jam (anfitrión): tu cola, que es la de todos. Puedes quitar cualquiera. */
export function HostJamUpcoming() {
  const { queue, upcoming } = usePlayer()
  const { items } = useHostJam()
  const addedBy = new Map(items.map((item) => [item.track.id, item.addedBy]))
  const rows = [...queue, ...upcoming].slice(0, 15) // lo mismo que ven tus amigos
  if (rows.length === 0) return EMPTY
  return (
    <ul>
      {rows.map((track, i) => (
        <JamQueueRow
          key={`${i}-${track.id}`}
          track={track}
          detail={addedBy.has(track.id) ? `${track.artist} · agregó ${addedBy.get(track.id)}` : track.artist}
          removeAction={hostRemove(track)}
          onLeft={() => playNext(track)}
        />
      ))}
    </ul>
  )
}

/** En «Próximas en sonar» cuando estás en la Jam de otro: la cola compartida, que suena en el teléfono del anfitrión. */
export function GuestJamQueue() {
  const { code, jam, missing } = useGuestJam()
  if (!code || missing) return null
  return (
    <section aria-label="Cola de la Jam" className="px-2">
      <div className="mt-6 mb-1 flex items-center justify-between gap-3">
        <h2 className="truncate font-bold">Jam de {jam?.host ?? '…'}</h2>
        <Link to={`/jam/${code}`} className="shrink-0 text-sm text-acento-texto hover:underline">
          Abrir la Jam
        </Link>
      </div>
      {jam ? (
        <>
          <JamNowPlaying jam={jam} />
          <JamUpcoming jam={jam} />
        </>
      ) : (
        <p className="text-sm text-texto-sec">Entrando a la Jam…</p>
      )}
    </section>
  )
}
