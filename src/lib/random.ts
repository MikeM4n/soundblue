// Azar repetible: el mismo orden durante toda la sesión (no salta cada vez que se vuelve a Inicio) y otro distinto en la
// siguiente. Lo usan la radio (data/radio.ts) y los géneros y modos (data/genres.ts).
const SESSION_KEY = 'soundblue:radio-semilla' // sessionStorage: cambia en cada sesión

export function sessionSeed(): number {
  try {
    let value = sessionStorage.getItem(SESSION_KEY)
    if (!value) {
      value = String(Date.now())
      sessionStorage.setItem(SESSION_KEY, value)
    }
    return Number(value) || 1
  } catch {
    return Date.now()
  }
}

/** Números al azar repetibles a partir de una semilla (mulberry32). */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const hashText = (text: string) => [...text].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 0)

export function shuffle<T>(list: readonly T[], random: () => number): T[] {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}
