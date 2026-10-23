import { Link } from 'react-router'
import { Cover } from './Cover'
import { PlayButton } from './PlayButton'

interface MediaCardProps {
  title: string
  subtitle: string
  seed: string
  image?: string | readonly string[] // imagen o alternativas, en orden
  onPlay?: () => void
  to?: string // abre una página (playlist, álbum, artista) en vez de reproducir
  round?: boolean // imagen redonda, para artistas
}

/** Tarjeta: portada, título y descripción; el botón de reproducir aparece al pasar el mouse. */
export function MediaCard({ title, subtitle, seed, image, onPlay, to, round = false }: MediaCardProps) {
  const content = (
    <>
      <Cover seed={seed} src={image} className={`aspect-square w-full shadow-lg shadow-black/40 ${round ? 'rounded-full' : 'rounded-md'}`} />
      <span className={`mt-3 block truncate font-semibold ${round ? 'text-center' : ''}`}>{title}</span>
      <span className={`mt-1 line-clamp-2 text-sm text-texto-sec ${round ? 'text-center' : ''}`}>{subtitle}</span>
    </>
  )
  return (
    <article className="group relative w-40 shrink-0 rounded-lg transition-colors hover:bg-tarjeta md:w-44">
      {to ? (
        <Link to={to} className="block w-full p-3 text-left">
          {content}
        </Link>
      ) : (
        <button type="button" onClick={onPlay} className="block w-full p-3 text-left">
          {content}
        </button>
      )}
      {onPlay && (
        // Capa del mismo tamaño que la portada, para ubicar el botón en su esquina sin anidar botones.
        <div className="pointer-events-none absolute inset-x-3 top-3 aspect-square">
          <PlayButton
            label={`Reproducir ${title}`}
            onClick={onPlay}
            className="pointer-events-auto absolute right-2 bottom-2 translate-y-2 opacity-0 group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:translate-y-0 group-hover:opacity-100"
          />
        </div>
      )}
    </article>
  )
}
