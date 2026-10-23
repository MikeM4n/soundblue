import { ChevronLeft, Shuffle } from 'lucide-react'
import type { ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router'
import { TrackList } from '../components/tracks/TrackList'
import type { RemoveAction } from '../components/tracks/trackActions'
import { Cover } from '../components/ui/Cover'
import { IconButton } from '../components/ui/IconButton'
import { FavoritesCover } from '../components/ui/LibraryItem'
import { PlayButton } from '../components/ui/PlayButton'
import { TEST_LIST_NAME, testList } from '../data/catalog'
import { library, useLibrary } from '../library/store'
import { player } from '../player/engine'
import { coverSources, coverUrl, type Track } from '../player/types'
import { useNowPlaying } from '../player/useNowPlaying'

interface CollectionData {
  kind: string
  name: string
  cover: ReactNode
  tracks: readonly Track[]
  removeAction?: (index: number) => RemoveAction
}

/** Vista de una lista: «Lista de prueba» (álbum), «Tus me gusta» o una playlist tuya. */
export function Collection() {
  const { tipo = '', id = '' } = useParams()
  const navigate = useNavigate()
  const { favorites, playlists } = useLibrary()
  const { open } = useNowPlaying()
  const data = resolve(tipo, id, favorites, playlists)

  if (!data) {
    return (
      <div className="p-8 text-center text-texto-sec">
        Esta lista ya no existe.
        <button type="button" onClick={() => navigate('/biblioteca')} className="ml-1 text-acento-texto hover:underline">
          Ir a Tu biblioteca
        </button>
      </div>
    )
  }

  const count = data.tracks.length
  // Reproducir abre «Sonando ahora» en pantalla completa (antes de reproducir: así el video aparece ya en su sitio).
  const play = (index = 0) => {
    open()
    player.playContext(data.name, data.tracks, index)
  }
  const shuffle = () => {
    open()
    player.shuffleContext(data.name, data.tracks)
  }
  return (
    <div className="pb-10">
      <header className="bg-linear-to-b from-acento/35 to-transparent px-4 pt-4 pb-4 md:px-6">
        <IconButton label="Volver" onClick={() => navigate(-1)} className="-ml-2">
          <ChevronLeft className="size-6" />
        </IconButton>
        <div className="mt-2 flex flex-col items-center gap-4 text-center md:flex-row md:items-end md:text-left">
          {data.cover}
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-wider text-texto-sec uppercase">{data.kind}</p>
            <h1 className="mt-1 text-3xl font-bold break-words md:text-5xl">{data.name}</h1>
            <p className="mt-2 text-sm text-texto-sec">{count === 1 ? '1 canción' : `${count} canciones`}</p>
          </div>
        </div>
        <div className="mt-5 flex items-center gap-3">
          <PlayButton label={`Reproducir ${data.name}`} onClick={() => play()} className={count ? '' : 'pointer-events-none opacity-40'} />
          <IconButton label={`Reproducir ${data.name} en aleatorio`} disabled={!count} onClick={shuffle}>
            <Shuffle className="size-6" />
          </IconButton>
        </div>
      </header>

      {count === 0 ? (
        <p className="px-6 text-texto-sec">Todavía no hay canciones. Usa el menú ⋮ de cualquier canción para agregarlas.</p>
      ) : (
        <TrackList tracks={data.tracks} onPlay={play} removeAction={data.removeAction} />
      )}
    </div>
  )
}

function resolve(tipo: string, id: string, favorites: Track[], playlists: ReturnType<typeof library.get>['playlists']): CollectionData | null {
  const bigCover = 'size-44 shrink-0 rounded-md shadow-2xl shadow-black/50 md:size-52'
  if (tipo === 'prueba') {
    return {
      kind: 'Álbum de prueba',
      name: TEST_LIST_NAME,
      cover: <Cover seed="lista-de-prueba" src={coverUrl(testList[0], 'large')} className={bigCover} />,
      tracks: testList,
    }
  }
  if (tipo === 'favoritos') {
    return {
      kind: 'Playlist',
      name: 'Tus me gusta',
      cover: <FavoritesCover className={bigCover} />,
      tracks: favorites,
      removeAction: (i) => ({ listName: 'Tus me gusta', remove: () => library.removeFavoriteAt(i) }),
    }
  }
  if (tipo === 'playlist') {
    const playlist = playlists.find((p) => p.id === id)
    if (!playlist) return null
    const first = playlist.tracks[0]
    return {
      kind: 'Playlist',
      name: playlist.name,
      cover: <Cover seed={playlist.id} src={first ? coverSources(first, 'large') : undefined} className={bigCover} />,
      tracks: playlist.tracks,
      removeAction: (i) => ({ listName: playlist.name, remove: () => library.removeFromPlaylistAt(playlist.id, i) }),
    }
  }
  return null
}
