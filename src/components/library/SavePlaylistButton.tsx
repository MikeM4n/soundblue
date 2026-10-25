import { Check, Plus } from 'lucide-react'
import { toggleSavedPlaylist } from '../../library/savedPlaylists'
import { useSavedPlaylist, type SavedPlaylist } from '../../library/store'

/** «+» guarda una playlist de YouTube en Tu biblioteca («Playlists guardadas»); «✓» (ya guardada) la quita. */
export function SavePlaylistButton({ playlist, className = 'size-9' }: { playlist: SavedPlaylist; className?: string }) {
  const saved = useSavedPlaylist(playlist.id)
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? `Quitar «${playlist.title}» de Tu biblioteca` : `Guardar «${playlist.title}» en Tu biblioteca`}
      onClick={() => toggleSavedPlaylist(playlist)}
      className={`grid shrink-0 place-items-center rounded-full transition-colors ${
        saved ? 'bg-acento text-white hover:bg-acento-hover' : 'text-texto ring-2 ring-contraste/40 hover:ring-contraste/70'
      } ${className}`}
    >
      {saved ? <Check className="size-1/2" strokeWidth={3} /> : <Plus className="size-1/2" strokeWidth={2.5} />}
    </button>
  )
}
