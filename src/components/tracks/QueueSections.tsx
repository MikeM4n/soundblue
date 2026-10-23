import { GripVertical } from 'lucide-react'
import type { ReactNode } from 'react'
import { player } from '../../player/engine'
import type { Track } from '../../player/types'
import { usePlayer } from '../../player/usePlayer'
import { showToast } from '../../ui/toast'
import { stableKeys } from './TrackList'
import { TrackRow } from './TrackRow'
import type { RemoveAction } from './trackActions'
import { useDragReorder } from './useDragReorder'

/**
 * «Siguiente en la cola» (las que agregaste) y «Siguiente de: …» (el resto de la lista). Se reordenan
 * arrastrando ≡, se quitan deslizando a la derecha (con Deshacer). La usan la página Cola y el panel
 * que sube en «Sonando ahora».
 */
export function QueueSections({ beforePlay }: { beforePlay?: () => void }) {
  const { queue, upcoming, contextName } = usePlayer()

  const clearQueue = () => {
    const undo = player.clearQueue()
    showToast('Cola vaciada', { label: 'Deshacer', run: undo })
  }

  if (queue.length === 0 && upcoming.length === 0) {
    return <p className="mt-6 px-2 text-sm text-texto-sec">No hay más canciones. Desliza una canción a la izquierda en cualquier lista para agregarla aquí.</p>
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
      {upcoming.length > 0 && (
        <>
          <SectionTitle>Siguiente de: {contextName}</SectionTitle>
          <ReorderableList
            tracks={upcoming}
            onPlay={(i) => {
              beforePlay?.()
              player.jumpToUpcoming(i)
            }}
            onMove={(from, to) => player.moveUpcoming(from, to)}
            remove={(i) => ({ listName: 'la cola', remove: () => player.removeUpcomingAt(i) })}
          />
        </>
      )}
    </>
  )
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mt-6 mb-1 flex items-center justify-between px-2">
      <h2 className="truncate font-bold">{children}</h2>
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
