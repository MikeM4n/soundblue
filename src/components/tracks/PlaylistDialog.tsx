import { Plus, X } from 'lucide-react'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { library, useLibrary } from '../../library/store'
import { stageBox } from '../../player/stage'
import type { Track } from '../../player/types'
import { showToast } from '../../ui/toast'
import { IconButton } from '../ui/IconButton'

interface PlaylistDialogProps {
  track?: Track // si viene, es «Agregar a playlist»; si no, solo «Nueva playlist»
  onClose: () => void
  onCreated?: (playlistId: string) => void
}

/** Diálogo para agregar una canción a una playlist o crear una nueva. */
export function PlaylistDialog({ track, onClose, onCreated }: PlaylistDialogProps) {
  const { playlists } = useLibrary()
  const [name, setName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const video = useSyncExternalStore(stageBox.subscribe, stageBox.get)
  // Si el video está en la barra de abajo, el diálogo se centra en el espacio que queda encima.
  const reserveBottom = video && video.top > window.innerHeight / 2 ? window.innerHeight - video.top + 8 : undefined

  useEffect(() => {
    if (!track || playlists.length === 0) inputRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, []) // solo al abrir

  const addTo = (playlistId: string, playlistName: string) => {
    if (!track) return
    const added = library.addToPlaylist(playlistId, track)
    showToast(added ? `Agregada a ${playlistName}` : `Ya está en ${playlistName}`)
    onClose()
  }

  const create = () => {
    const playlist = library.createPlaylist(name)
    if (track) {
      library.addToPlaylist(playlist.id, track)
      showToast(`Agregada a ${playlist.name}`)
    } else {
      showToast(`Playlist «${playlist.name}» creada`)
    }
    onClose()
    onCreated?.(playlist.id)
  }

  return createPortal(
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/60 p-4" style={{ paddingBottom: reserveBottom }} onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="playlist-dialog-title"
        className="w-full max-w-sm rounded-xl bg-panel p-4 shadow-2xl ring-1 ring-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 id="playlist-dialog-title" className="text-lg font-bold">
            {track ? 'Agregar a playlist' : 'Nueva playlist'}
          </h2>
          <IconButton label="Cerrar" onClick={onClose}>
            <X className="size-5" />
          </IconButton>
        </div>

        {track && playlists.length > 0 && (
          <ul className="scroll-fino mb-3 max-h-60 overflow-y-auto">
            {playlists.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => addTo(p.id, p.name)}
                  className="flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left hover:bg-tarjeta"
                >
                  <span className="truncate">{p.name}</span>
                  <span className="shrink-0 text-sm text-texto-sec">{p.tracks.length}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (name.trim()) create()
          }}
          className="flex gap-2"
        >
          <label className="sr-only" htmlFor="playlist-name">
            Nombre de la nueva playlist
          </label>
          <input
            id="playlist-name"
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre de la nueva playlist"
            className="h-10 min-w-0 flex-1 rounded-md bg-tarjeta px-3 text-texto ring-1 ring-white/10 outline-none placeholder:text-texto-sec focus:ring-2 focus:ring-acento"
          />
          <button
            type="submit"
            disabled={!name.trim()}
            className="flex h-10 shrink-0 items-center gap-1 rounded-md bg-acento px-3 text-sm font-semibold text-white enabled:hover:bg-acento-hover disabled:opacity-40"
          >
            <Plus className="size-4" aria-hidden="true" />
            Crear
          </button>
        </form>
      </div>
    </div>,
    document.body,
  )
}
