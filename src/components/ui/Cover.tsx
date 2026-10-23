import { AudioWaveform } from 'lucide-react'
import { hashText } from '../../lib/format'
import { useImageFallback } from '../../lib/imageFallback'

interface CoverProps {
  seed: string // texto del que sale el color, para que cada lista tenga siempre el mismo
  src?: string | readonly string[] // imagen (o imágenes alternativas, en orden)
  className?: string
  eager?: boolean // se ve de inmediato (pantalla completa, barra): carga ya y salta a la alternativa si tarda
}

/** Portada: la imagen si carga (probando las alternativas) o un degradado azul generado a partir de `seed`. */
export function Cover({ seed, src, className = '', eager = false }: CoverProps) {
  const sources = (Array.isArray(src) ? src : src ? [src] : []) as readonly string[]
  // La clave reinicia los intentos cuando cambia la canción.
  return <CoverImage key={sources.join('|')} seed={seed} sources={sources} className={className} eager={eager} />
}

function CoverImage({ seed, sources, className, eager }: { seed: string; sources: readonly string[]; className: string; eager: boolean }) {
  const image = useImageFallback(sources, eager ? 3000 : undefined)
  if (image.src) {
    return (
      <img
        src={image.src}
        alt=""
        loading={eager ? 'eager' : 'lazy'}
        onLoad={image.onLoad}
        onError={image.onError}
        className={`object-cover ${className}`}
      />
    )
  }
  const hash = hashText(seed)
  const hue = 185 + (hash % 110) // de cian a magenta, a juego con el azul rey
  const angle = 100 + ((hash >> 8) % 90)
  return (
    <div
      className={`grid place-items-center ${className}`}
      style={{ background: `linear-gradient(${angle}deg, hsl(${hue} 72% 52%), hsl(${(hue + 50) % 360} 65% 24%))` }}
      aria-hidden="true"
    >
      <AudioWaveform className="size-1/3 text-white/70" />
    </div>
  )
}
