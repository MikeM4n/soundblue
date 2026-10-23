import { useNavigate } from 'react-router'
import { useState } from 'react'
import { useLibrary } from '../../library/store'
import { coverSources } from '../../player/types'
import { PlaylistDialog } from '../tracks/PlaylistDialog'
import { Cover } from '../ui/Cover'
import { FavoritesCover, LibraryItem } from '../ui/LibraryItem'

const count = (n: number) => (n === 1 ? '1 canción' : `${n} canciones`)

/** «Tus me gusta», la lista de prueba y tus playlists. La usan la barra lateral y la página Biblioteca. */
export function LibraryList({ coverSize = 'size-12' }: { coverSize?: string }) {
  const { favorites, playlists } = useLibrary()
  return (
    <ul>
      <li>
        <LibraryItem to="/coleccion/favoritos/todas" title="Tus me gusta" subtitle={`Playlist · ${count(favorites.length)}`} cover={<FavoritesCover className={coverSize} />} />
      </li>
      {playlists.map((p) => (
        <li key={p.id}>
          <LibraryItem
            to={`/coleccion/playlist/${p.id}`}
            title={p.name}
            subtitle={`Playlist · ${count(p.tracks.length)}`}
            cover={<Cover seed={p.id} src={p.tracks[0] ? coverSources(p.tracks[0]) : undefined} className={`${coverSize} shrink-0 rounded-md`} />}
          />
        </li>
      ))}
      <li>
        <LibraryItem to="/coleccion/prueba/lista" title="Lista de prueba" subtitle="Álbum · SoundBlue" cover={<Cover seed="lista-de-prueba" className={`${coverSize} shrink-0 rounded-md`} />} />
      </li>
    </ul>
  )
}

/** Hook para el botón «+»: abre el diálogo y, al crear, lleva a la playlist nueva. */
export function useCreatePlaylist() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const dialog = open ? (
    <PlaylistDialog onClose={() => setOpen(false)} onCreated={(id) => navigate(`/coleccion/playlist/${id}`)} />
  ) : null
  return { open: () => setOpen(true), dialog }
}
