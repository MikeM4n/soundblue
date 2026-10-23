import type { SyntheticEvent } from 'react'
import { useImageFallback } from '../../lib/imageFallback'
import { coverSources, type Track } from '../../player/types'

/**
 * Fondo de «Sonando ahora» (estilo TikTok) y de la barra: la carátula o la miniatura del video en alta
 * resolución, ampliada para llenar todo y muy difuminada, con una capa oscura encima.
 * Es una imagen, no un segundo video, y nunca va encima del reproductor de YouTube.
 */
export function Backdrop({ track, variant = 'pantalla' }: { track: Track; variant?: 'pantalla' | 'barra' }) {
  const sources = coverSources(track, 'large')
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-fondo" aria-hidden="true">
      <BlurredImage key={sources.join('|')} sources={sources} />
      {variant === 'pantalla' ? (
        <>
          <div className="absolute inset-0 bg-black/50" />
          {/* Más oscuro abajo, donde van el título y los controles. */}
          <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-black/30" />
        </>
      ) : (
        <div className="absolute inset-0 bg-black/70" />
      )}
    </div>
  )
}

function BlurredImage({ sources }: { sources: string[] }) {
  const image = useImageFallback(sources, 3000)
  if (!image.src) return null
  // Si la miniatura en alta resolución no existe, YouTube devuelve una imagen gris de 120 px: se pasa a la siguiente.
  const onLoad = (e: SyntheticEvent<HTMLImageElement>) => (e.currentTarget.naturalWidth <= 120 ? image.onError() : image.onLoad())
  return <img src={image.src} alt="" onLoad={onLoad} onError={image.onError} className="size-full scale-150 object-cover blur-3xl" />
}
