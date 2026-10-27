// Índice de géneros: de qué género es cada artista, sacado de las playlists que arma YouTube Music para cada género
// (YouTube no publica el género de una canción). Con eso la radio sabe el género de la canción que suena y deja solo lo
// de ese género o de uno parecido (la matriz SIMILAR), de cualquier año. Se arma una vez (unas 60 consultas, de a 3) y se
// guarda 7 días en este navegador.
// Se cuenta cuántas veces sale cada artista en las playlists de cada género (el principal vale 2; los invitados, 1) y se
// queda con sus géneros fuertes: los que suman al menos la mitad que el principal. Así un remix de salsa con Daddy Yankee
// de invitado no lo vuelve salsero.
import type { Track } from '../player/types'
import { INDEX_GENRES, sourcePlaylists } from './genres'
import { artistKey } from './history'
import { artistKeys } from './lists'
import { ytmPage } from './ytmusic'

export type GenreKey = keyof typeof INDEX_GENRES
export type GenreIndex = ReadonlyMap<string, ReadonlySet<GenreKey>> // artistKey → sus géneros fuertes

/** Géneros parecidos: si la canción que suena es de uno, la radio acepta también estos. */
const SIMILAR: Record<GenreKey, GenreKey[]> = {
  reggaeton: ['dancehall', 'trap'],
  dancehall: ['reggaeton', 'trap'],
  trap: ['reggaeton', 'dancehall'],
  salsa: ['merengue', 'bachata'],
  merengue: ['salsa', 'bachata'],
  bachata: ['salsa', 'merengue'],
  vallenato: ['popular', 'regional'],
  cumbia: ['merengue'],
  popular: ['regional', 'vallenato'],
  regional: ['popular', 'vallenato'],
  pop: ['baladas'],
  baladas: ['pop', 'boleros'],
  boleros: ['baladas'],
  electronica: [],
  rock: [],
  kpop: ['jpop', 'cpop'],
  jpop: ['kpop', 'cpop'],
  cpop: ['kpop', 'jpop'],
  colombiana: [],
}

// Escritura asiática en el título o el artista: si el índice no conoce al artista, cuenta como K-Pop, J-Pop o Mandopop
// (y queda fuera de las radios latinas).
const SCRIPTS: [RegExp, GenreKey][] = [
  [/[가-힯ᄀ-ᇿ]/, 'kpop'], // coreano
  [/[぀-ヿ]/, 'jpop'], // japonés (kana)
  [/[一-鿿]/, 'cpop'], // chino
]
const DOMINANT = 0.3 // sin género conocido, la canción que suena toma el de la mayoría de su radio (≥ 30 %)

// Popular, ranchera (regional mexicano) y vallenato son una familia CERRADA (la del Modo Tomar): si la canción que suena
// es de ella, su radio nunca trae salsa, merengue, bachata ni urbano, aunque el artista también salga en playlists de
// esos géneros (Maluma, Romeo Santos, Rubén Blades con Fonseca…) o el título lo diga («Mi Decisión (Merengue)»). Salvo
// que la canción que suena también sea de ese género.
const CLOSED: readonly GenreKey[] = ['popular', 'regional', 'vallenato']
const CLASH: readonly GenreKey[] = ['salsa', 'merengue', 'bachata', 'reggaeton', 'dancehall', 'trap', 'electronica', 'kpop', 'jpop', 'cpop']
const CLASH_WORDS = /\b(salsa|merengue|bachata|regg?a?et[oó]n|perreo|dembow|dancehall)\b/i

const KEY = 'soundblue:indice-generos'
const VERSION = 5 // cambia si cambian los géneros, sus fuentes o la forma de contar
const MAX_AGE = 7 * 24 * 3600 * 1000
const PLAYLISTS_PER_GENRE = 3
// La familia cerrada no deja entrar artistas que el índice no conoce: de esos géneros se leen más playlists.
const PLAYLISTS_CLOSED = 6
const AT_ONCE = 3 // consultas de géneros a la vez (para no saturar al intermediario)
const MAIN_WEIGHT = 2 // el artista principal de la canción cuenta doble que los invitados
const STRONG = 0.5 // un género cuenta si suma al menos la mitad que el más fuerte del artista

export const genreLabel = (genre: GenreKey) => INDEX_GENRES[genre].label

function readSaved(): GenreIndex | null {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (saved?.v !== VERSION || Date.now() - saved.at > MAX_AGE) return null
    return new Map(Object.entries(saved.artists as Record<string, GenreKey[]>).map(([artist, genres]) => [artist, new Set(genres)]))
  } catch {
    return null
  }
}

function save(index: GenreIndex) {
  try {
    const artists = Object.fromEntries([...index].map(([artist, genres]) => [artist, [...genres]]))
    localStorage.setItem(KEY, JSON.stringify({ v: VERSION, at: Date.now(), artists }))
  } catch {
    /* sin almacenamiento: se vuelve a armar la próxima vez */
  }
}

async function build(): Promise<GenreIndex> {
  const counts = new Map<string, Map<GenreKey, number>>() // artista → cuánto sale en las playlists de cada género
  const genres = Object.keys(INDEX_GENRES) as GenreKey[]
  for (let i = 0; i < genres.length; i += AT_ONCE) {
    await Promise.all(
      genres.slice(i, i + AT_ONCE).map(async (genre) => {
        const playlists = (await sourcePlaylists(INDEX_GENRES[genre]).catch(() => [])).slice(0, CLOSED.includes(genre) ? PLAYLISTS_CLOSED : PLAYLISTS_PER_GENRE)
        const pages = await Promise.all(playlists.map((playlist) => ytmPage(playlist.id).catch(() => null)))
        for (const track of pages.flatMap((page) => page?.tracks ?? [])) {
          const main = artistKey(track.artist)
          for (const artist of artistKeys(track.artist)) {
            const byGenre = counts.get(artist) ?? new Map<GenreKey, number>()
            byGenre.set(genre, (byGenre.get(genre) ?? 0) + (artist === main ? MAIN_WEIGHT : 1))
            counts.set(artist, byGenre)
          }
        }
      }),
    )
  }
  const serialized = Object.fromEntries([...counts].map(([artist, values]) => [artist, Object.fromEntries(values)]))
  try {
    const classified = await new Promise<Record<string, GenreKey[]>>((resolve, reject) => {
      const worker = new Worker(new URL('./genreClassifier.worker.ts', import.meta.url), { type: 'module' })
      worker.onmessage = (event: MessageEvent<Record<string, GenreKey[]>>) => { worker.terminate(); resolve(event.data) }
      worker.onerror = (event) => { worker.terminate(); reject(event.error) }
      worker.postMessage(serialized)
    })
    return new Map(Object.entries(classified).map(([artist, genres]) => [artist, new Set(genres)]))
  } catch {
    const index = new Map<string, Set<GenreKey>>()
    for (const [artist, byGenre] of counts) {
      const top = Math.max(...byGenre.values())
      index.set(artist, new Set([...byGenre].filter(([, n]) => n >= top * STRONG).map(([genre]) => genre)))
    }
    return index
  }
}

let building: Promise<GenreIndex> | null = null

/** El índice: el guardado o, si no hay (o tiene más de 7 días), uno nuevo. */
export function genreIndex(): Promise<GenreIndex> {
  building ??= Promise.resolve(readSaved()).then(async (saved) => {
    if (saved) return saved
    const fresh = await build()
    if (fresh.size) save(fresh)
    else building = null // sin conexión: se intenta otra vez después
    return fresh
  })
  return building
}

/** El índice si está listo en `ms` (la radio no espera más que eso para empezar a sonar). */
export const genreIndexSoon = (ms: number): Promise<GenreIndex | null> =>
  Promise.race([genreIndex().catch(() => null), new Promise<null>((resolve) => window.setTimeout(() => resolve(null), ms))])

/** Géneros de una canción: los de sus artistas o, si no se conoce ninguno, el de su escritura asiática (o vacío). */
export function genresOf(track: Track, index: GenreIndex): Set<GenreKey> {
  const genres = new Set<GenreKey>()
  for (const artist of artistKeys(track.artist)) for (const genre of index.get(artist) ?? []) genres.add(genre)
  if (!genres.size) {
    const text = `${track.title} ${track.artist}`
    const script = SCRIPTS.find(([pattern]) => pattern.test(text))
    if (script) genres.add(script[1])
  }
  return genres
}

/** El género de la mayoría de unas canciones (los que llegan al 30 % de las conocidas, con 3 como mínimo). */
export function dominantGenres(tracks: readonly Track[], index: GenreIndex): Set<GenreKey> {
  const counts = new Map<GenreKey, number>()
  let known = 0
  for (const track of tracks) {
    const genres = genresOf(track, index)
    if (genres.size) known++
    for (const genre of genres) counts.set(genre, (counts.get(genre) ?? 0) + 1)
  }
  return new Set([...counts].filter(([, n]) => n >= Math.max(3, known * DOMINANT)).map(([genre]) => genre))
}

/** Lo que acepta la radio de una canción: sus géneros y los parecidos. */
export function similarTo(genres: ReadonlySet<GenreKey>): Set<GenreKey> {
  const cluster = new Set<GenreKey>()
  for (const genre of genres) {
    cluster.add(genre)
    for (const similar of SIMILAR[genre]) cluster.add(similar)
  }
  return cluster
}

export const isGenreKey = (key: unknown): key is GenreKey => typeof key === 'string' && Object.hasOwn(INDEX_GENRES, key)

/** Reglas de género de una radio (o de un Modo) a partir de los géneros de su canción. */
export interface GenreScope {
  accepts: Set<GenreKey> // sus géneros y los parecidos
  banned: Set<GenreKey> // nunca, aunque el artista también sea de un género aceptado
  strict: boolean // todo es de la familia cerrada: tampoco entran artistas que el índice no conoce
}

export function genreScope(genres: ReadonlySet<GenreKey>): GenreScope {
  const closed = [...genres].some((genre) => CLOSED.includes(genre))
  const banned = new Set(closed ? CLASH.filter((genre) => !genres.has(genre)) : [])
  return {
    accepts: new Set([...similarTo(genres)].filter((genre) => !banned.has(genre))),
    banned,
    strict: genres.size > 0 && [...genres].every((genre) => CLOSED.includes(genre)),
  }
}

/** La canción es de un género prohibido por `scope` (por sus artistas o, en la familia cerrada, por su título). */
export function clashes(track: Track, index: GenreIndex, scope: GenreScope): boolean {
  if (scope.strict && CLASH_WORDS.test(track.title)) return true
  return [...genresOf(track, index)].some((genre) => scope.banned.has(genre))
}
