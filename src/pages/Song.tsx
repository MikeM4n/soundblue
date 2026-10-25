import { ChevronLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { IconButton } from '../components/ui/IconButton'
import { Cover } from '../components/ui/Cover'
import { PlayButton } from '../components/ui/PlayButton'
import { createRadio } from '../data/radio'
import { ytmRadioItems } from '../data/ytmusic'
import { player } from '../player/engine'
import { coverSources, type Track } from '../player/types'
import { useNowPlaying } from '../player/useNowPlaying'

/**
 * Una canción compartida (#/cancion/:id, ver lib/share.ts): su carátula, título y artista, y ▶ para escucharla con su
 * radio. No suena sola: el navegador pide un toque antes de reproducir con sonido.
 */
export function SongPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { open } = useNowPlaying()
  const [found, setFound] = useState<{ id: string; track: Track | null } | null>(null)

  useEffect(() => {
    let alive = true
    // «A continuación» de la canción empieza por ella misma: de ahí salen su título, artista y carátula.
    ytmRadioItems(id)
      .then((items) => alive && setFound({ id, track: items.find((item) => item.track.id === id)?.track ?? null }))
      .catch(() => alive && setFound({ id, track: null }))
    return () => {
      alive = false
    }
  }, [id])

  const track = found?.id === id ? found.track : undefined
  const play = (song: Track) => {
    open()
    player.playRadio(`Radio de «${song.title}»`, song, createRadio(song), { replaceQueue: true })
  }

  return (
    <div className="px-4 pt-4 pb-10 md:px-6">
      <IconButton label="Volver" onClick={() => navigate('/')} className="-ml-2">
        <ChevronLeft className="size-6" />
      </IconButton>
      {track === undefined && <p className="mt-10 text-center text-texto-sec">Buscando la canción…</p>}
      {track === null && <p className="mt-10 text-center text-texto-sec">No se pudo abrir esta canción. Revisa tu conexión o búscala en Buscar.</p>}
      {track && (
        <div className="mx-auto mt-4 flex max-w-sm flex-col items-center text-center">
          <p className="text-xs font-semibold tracking-wider text-texto-sec uppercase">Te compartieron</p>
          <Cover seed={track.id} src={coverSources(track, 'large')} eager className="mt-3 aspect-square w-full rounded-lg shadow-2xl shadow-black/50" />
          <h1 className="mt-5 text-2xl font-bold break-words">{track.title}</h1>
          <p className="text-texto-sec">{track.artist}</p>
          <PlayButton label={`Reproducir ${track.title}`} onClick={() => play(track)} className="mt-5 size-16" />
        </div>
      )}
    </div>
  )
}
