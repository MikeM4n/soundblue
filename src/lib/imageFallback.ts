import { useEffect, useState, type SyntheticEvent } from 'react'

// Servidores de imágenes que no respondieron en esta sesión: se saltan directamente.
const unreachable = new Set<string>()

const hostOf = (url: string) => {
  try {
    return new URL(url).origin
  } catch {
    return url
  }
}

const firstUsable = (sources: readonly string[], from: number) => {
  for (let i = from; i < sources.length; i++) if (!unreachable.has(hostOf(sources[i]))) return i
  return sources.length
}

/**
 * Elige la primera imagen que cargue entre varias alternativas (p. ej. la portada y la imagen del video).
 * Con `timeoutMs`, si la imagen no termina de cargar en ese tiempo, se da su servidor por caído
 * y se prueba la siguiente. Úsalo solo en imágenes que se cargan de inmediato (no en las «lazy»).
 */
export function useImageFallback(sources: readonly string[], timeoutMs?: number) {
  const [index, setIndex] = useState(() => firstUsable(sources, 0))
  const [loaded, setLoaded] = useState(false)
  const src = sources[index] as string | undefined

  useEffect(() => {
    if (!src || loaded || !timeoutMs) return
    const timer = window.setTimeout(() => {
      unreachable.add(hostOf(src))
      setIndex((i) => firstUsable(sources, i + 1))
    }, timeoutMs)
    return () => window.clearTimeout(timer)
  }, [src, loaded, timeoutMs, sources])

  return {
    src,
    onLoad: (e?: SyntheticEvent<HTMLImageElement>) => {
      // YouTube responde con una imagen gris de 120×90 cuando no tiene esa resolución: se prueba la siguiente.
      const img = e?.currentTarget
      if (img && img.naturalWidth === 120 && img.naturalHeight === 90 && firstUsable(sources, index + 1) < sources.length) {
        setIndex((i) => firstUsable(sources, i + 1))
        return
      }
      setLoaded(true)
    },
    // Un error (p. ej. 404) es de ese archivo, no del servidor: solo se pasa a la siguiente.
    onError: () => setIndex((i) => firstUsable(sources, i + 1)),
  }
}
