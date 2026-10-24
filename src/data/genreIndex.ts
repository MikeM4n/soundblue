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
  vallenato: ['cumbia', 'popular'],
  cumbia: ['vallenato', 'merengue'],
  popular: ['regional', 'vallenato'],
  regional: ['popular'],
  pop: ['baladas'],
  baladas: ['pop', 'boleros'],
  boleros: ['baladas'],
  electronica: [],
  rock: [],
}

const KEY = 'soundblue:indice-generos'
const VERSION = 2 // cambia si cambian los géneros, sus fuentes o la forma de contar
const MAX_AGE = 7 * 24 * 3600 * 1000
const PLAYLISTS_PER_GENRE = 3
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
        const playlists = (await sourcePlaylists(INDEX_GENRES[genre]).catch(() => [])).slice(0, PLAYLISTS_PER_GENRE)
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
  const index = new Map<string, Set<GenreKey>>()
  for (const [artist, byGenre] of counts) {
    const top = Math.max(...byGenre.values())
    index.set(artist, new Set([...byGenre].filter(([, n]) => n >= top * STRONG).map(([genre]) => genre)))
  }
  return index
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

/** Géneros de una canción: los de sus artistas (vacío si no se conoce ninguno). */
export function genresOf(track: Track, index: GenreIndex): Set<GenreKey> {
  const genres = new Set<GenreKey>()
  for (const artist of artistKeys(track.artist)) for (const genre of index.get(artist) ?? []) genres.add(genre)
  return genres
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
