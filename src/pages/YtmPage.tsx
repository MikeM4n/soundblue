import { ChevronLeft, Radio, Shuffle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { TrackList } from '../components/tracks/TrackList'
import { startRadio } from '../components/tracks/trackActions'
import { Cover } from '../components/ui/Cover'
import { IconButton } from '../components/ui/IconButton'
import { PlayButton } from '../components/ui/PlayButton'
import { YtmShelf } from '../components/ui/YtmShelf'
import { ytmPage, type YtmPage as PageData } from '../data/ytmusic'
import { player } from '../player/engine'
import type { Track } from '../player/types'
import { useNowPlaying } from '../player/useNowPlaying'

/** Página de YouTube Music: playlist o álbum (lista de canciones) o artista (sus estantes). */
export function YtmPage() {
  const { browseId = '' } = useParams()
  const navigate = useNavigate()
  const { open } = useNowPlaying()
  const [page, setPage] = useState<{ id: string; data: PageData | null } | null>(null)

  useEffect(() => {
    let alive = true
    ytmPage(browseId)
      .then((data) => alive && setPage({ id: browseId, data }))
      .catch(() => alive && setPage({ id: browseId, data: null }))
    return () => {
      alive = false
    }
  }, [browseId])

  const current = page?.id === browseId ? page : null
  const data = current?.data
  const isArtist = !!data && data.sections.length > 0 && data.tracks.length === 0

  const play = (tracks: readonly Track[], index = 0, name = data?.title ?? '') => {
    open() // primero «Sonando ahora», así el video aparece ya en su sitio
    player.playContext(name, tracks, index)
  }

  return (
    <div className="pb-10">
      <header className="bg-linear-to-b from-acento/35 to-transparent px-4 pt-4 pb-4 md:px-6">
        <IconButton label="Volver" onClick={() => navigate(-1)} className="-ml-2">
          <ChevronLeft className="size-6" />
        </IconButton>
        {!current && <p className="mt-6 text-texto-sec">Cargando de YouTube Music…</p>}
        {current && !data && <p className="mt-6 text-texto-sec">No se pudo abrir esta página de YouTube Music. Revisa tu conexión.</p>}
        {data && (
          <>
            <div className="mt-2 flex flex-col items-center gap-4 text-center md:flex-row md:items-end md:text-left">
              <Cover
                seed={browseId}
                src={data.image}
                eager
                className={`size-44 shrink-0 shadow-2xl shadow-black/50 md:size-52 ${isArtist ? 'rounded-full' : 'rounded-md'}`}
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold tracking-wider text-texto-sec uppercase">{data.kind}</p>
                <h1 className="mt-1 text-3xl font-bold break-words md:text-5xl">{data.title}</h1>
                {data.subtitle && <p className="mt-2 text-sm text-texto-sec">{data.subtitle}</p>}
                <p className="mt-1 text-xs text-texto-sec">YouTube Music</p>
              </div>
            </div>
            {data.tracks.length > 0 && (
              <div className="mt-5 flex items-center gap-3">
                <PlayButton label={`Reproducir ${data.title}`} onClick={() => play(data.tracks)} />
                <IconButton
                  label={`Reproducir ${data.title} en aleatorio`}
                  onClick={() => {
                    open()
                    player.shuffleContext(data.title, data.tracks)
                  }}
                >
                  <Shuffle className="size-6" />
                </IconButton>
                <IconButton label={`Radio a partir de ${data.title}`} onClick={() => startRadio(data.tracks[0], open)}>
                  <Radio className="size-6" />
                </IconButton>
              </div>
            )}
          </>
        )}
      </header>

      {data && data.tracks.length > 0 && <TrackList tracks={data.tracks} onPlay={(i) => play(data.tracks, i)} />}
      {data?.sections.map((section) => (
        <YtmShelf key={section.title} section={section} onPlay={(tracks, i) => play(tracks, i, `${data.title}: ${section.title}`)} />
      ))}
    </div>
  )
}
