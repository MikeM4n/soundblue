import { GripVertical } from 'lucide-react'
import type { ReactNode } from 'react'
import type { QueueGroup } from '../../data/radio'
import { player } from '../../player/engine'
import type { Track } from '../../player/types'
import { usePlayer } from '../../player/usePlayer'
import { showToast } from '../../ui/toast'
import { stableKeys } from './TrackList'
import { TrackRow } from './TrackRow'
import type { RemoveAction } from './trackActions'
import { useDragReorder } from './useDragReorder'

/** Tramos seguidos de «Próximas» que van bajo el mismo encabezado (la lista elegida o un bloque de la radio). */
interface Run {
  start: number // índice en `upcoming`
  tracks: Track[]
  group: QueueGroup | null
}

function runsOf(upcoming: readonly Track[], groups: readonly (QueueGroup | null)[]): Run[] {
  const runs: Run[] = []
  upcoming.forEach((track, i) => {
    const group = groups[i] ?? null
    const last = runs.at(-1)
    if (last && last.group?.kind === group?.kind && last.group?.seed === group?.seed) last.tracks.push(track)
    else runs.push({ start: i, tracks: [track], group })
  })
  return runs
}

/**
 * «Siguiente en la cola» (las que agregaste) y lo que sigue de la lista, con un encabezado por bloque: «Siguiente de: …»
 * (la lista que elegiste), «Recomendadas basadas en esta canción» y «Nuevas para ti» (las que agrega la radio). Se
 * reordenan arrastrando ≡ dentro de cada bloque, se quitan deslizando a la derecha o con «⋮» (con Deshacer; la radio
 * repone para que siempre haya 10). La usan la página Cola y el panel que sube en «Sonando ahora».
 */
export function QueueSections({ beforePlay }: { beforePlay?: () => void }) {
  const { queue, upcoming, upcomingGroups, contextName } = usePlayer()

  const clearQueue = () => {
    const undo = player.clearQueue()
    showToast('Cola vaciada', { label: 'Deshacer', run: undo })
  }

  if (queue.length === 0 && upcoming.length === 0) {
    return <p className="mt-6 px-2 text-sm text-texto-sec">No hay más canciones. Usa «⋮ → Agregar a la cola» en cualquier canción para agregarla aquí.</p>
  }

  return (
    <>
      {queue.length > 0 && (
        <>
          <SectionTitle
            action={
              <button type="button" onClick={clearQueue} className="shrink-0 text-sm text-texto-sec hover:text-texto">
                Vaciar cola
              </button>
            }
          >
            Siguiente en la cola
          </SectionTitle>
          <ReorderableList
            tracks={queue}
            onPlay={(i) => {
              beforePlay?.()
              player.jumpToQueue(i)
            }}
            onMove={(from, to) => player.moveQueue(from, to)}
            remove={(i) => ({ listName: 'la cola', remove: () => player.removeQueueAt(i) })}
          />
        </>
      )}
      {runsOf(upcoming, upcomingGroups).map(({ start, tracks, group }) => (
        <section key={`${start}-${tracks[0].id}`} aria-label={group ? GROUP_TITLE[group.kind] : `Siguiente de: ${contextName}`}>
          {group ? (
            <SectionTitle note={group.kind === 'nuevas' ? 'Nunca sonaron aquí, del mismo género' : `A partir de ${group.seed}`}>{GROUP_TITLE[group.kind]}</SectionTitle>
          ) : (
            <SectionTitle>Siguiente de: {contextName}</SectionTitle>
          )}
          <ReorderableList
            tracks={tracks}
            onPlay={(i) => {
              beforePlay?.()
              player.jumpToUpcoming(start + i)
            }}
            onMove={(from, to) => player.moveUpcoming(start + from, start + to)}
            remove={(i) => ({ listName: 'la cola', remove: () => player.removeUpcomingAt(start + i) })}
          />
        </section>
      ))}
    </>
  )
}

const GROUP_TITLE: Record<QueueGroup['kind'], string> = {
  recomendadas: 'Recomendadas basadas en esta canción',
  nuevas: 'Nuevas para ti',
}

export function SectionTitle({ children, action, note }: { children: ReactNode; action?: ReactNode; note?: string }) {
  return (
    <div className="mt-6 mb-1 flex items-center justify-between gap-2 px-2">
      <div className="min-w-0">
        <h2 className="truncate font-bold">{children}</h2>
        {note && <p className="truncate text-xs text-texto-sec">{note}</p>}
      </div>
      {action}
    </div>
  )
}

interface ReorderableListProps {
  tracks: readonly Track[]
  onPlay: (index: number) => void
  onMove: (from: number, to: number) => void
  remove: (index: number) => RemoveAction
}

function ReorderableList({ tracks, onPlay, onMove, remove }: ReorderableListProps) {
  const { handleProps, rowStyle } = useDragReorder(tracks.length, onMove)
  const keys = stableKeys(tracks)
  return (
    <ol>
      {tracks.map((track, i) => (
        <TrackRow
          key={keys[i]}
          track={track}
          onPlay={() => onPlay(i)}
          removeAction={remove(i)}
          style={rowStyle(i)}
          trailing={
            <button
              type="button"
              aria-label={`Mover ${track.title} (arrastra, o usa las flechas)`}
              className="grid size-10 shrink-0 cursor-grab place-items-center rounded-full text-texto-sec hover:text-texto active:cursor-grabbing"
              {...handleProps(i)}
            >
              <GripVertical className="size-5" />
            </button>
          }
        />
      ))}
    </ol>
  )
}
