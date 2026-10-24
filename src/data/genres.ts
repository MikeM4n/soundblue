// Géneros de Inicio («Selecciones rápidas» y «Muy sonadas») y Modos de ambiente (Rumba, Tomar, Relax).
// YouTube no publica el género de una canción: cada género sale de las playlists que arma YouTube Music para él (las
// «destacadas», no las de usuarios): las de su categoría de «Géneros» cuando la hay (Vallenato, Urbano, Música regional
// y popular…) y las de búsquedas como «salsa para fiesta» (región Colombia). De ahí se usan las que traen el género en
// el título, primero las que son solo de ese género («Salsa Mix» antes que «Clásicos de Salsa y Merengue»), y nunca las
// de temporada (Halloween, Navidad).
//
// A las canciones se les aplican los filtros de las recomendaciones: sin covers ni versiones (karaoke, instrumental,
// slowed…), sin artistas que sueles saltar, como mucho 2 por artista y ninguna repetida. El orden es al azar, el mismo
// durante la sesión.
import type { Track } from '../player/types'
import { hashText, seededRandom, sessionSeed, shuffle } from '../lib/random'
import { artistKey, listening } from './history'
import { capPerArtist, interleave, unique } from './lists'
import { ytmCategoryPlaylists, ytmPage, ytmSearchPlaylists, type YtmCard } from './ytmusic'

/** Covers y versiones que no son la original (para listas que no pasan por la radio). */
export const NOT_ORIGINAL = /\b(cover|karaoke|instrumental|slowed|sped ?up|nightcore|8d)\b/i

const PLAYLISTS_PER_LIST = 2 // las canciones de un género o filtro salen de sus 2 primeras playlists
const SEASONAL = /halloween|navidad|navideñ|christmas|diciembre|decembrin/i
// Palabras de género: una playlist que nombra varios («Salsa y Merengue») va después de las de un solo género.
const GENRE_WORDS = [
  /salsa/i,
  /merengue/i,
  /regg?a?et[oó]n|perreo/i,
  /vallenat/i,
  /bachata/i,
  /cumbia/i,
  /popular|despecho/i,
  /ranch|mariachi/i,
  /balad/i,
  /bolero/i,
  /dance|electr/i,
]

export interface GenreSource {
  key: string
  label: string
  category?: string // categoría de «Géneros» de YouTube Music, si la hay («Vallenato», «Urbano»…)
  queries: string[] // búsquedas de playlists, como «salsa para fiesta»
  match: RegExp // sirven las playlists que traen esto en el título…
  avoid?: RegExp // …salvo las que traen esto
}

const SALSA: GenreSource = { key: 'salsa', label: 'Salsa', queries: ['salsa'], match: /salsa/i }
const REGGAETON: GenreSource = { key: 'reggaeton', label: 'Reggaetón', category: 'Urbano', queries: ['reggaeton'], match: /regg?a?et[oó]n|perreo/i }
const MERENGUE: GenreSource = { key: 'merengue', label: 'Merengue', queries: ['merengue'], match: /merengue/i }
const POPULAR: GenreSource = { key: 'popular', label: 'Popular', category: 'Música regional y popular', queries: ['música popular despecho'], match: /popular|despecho/i }
const VALLENATO: GenreSource = { key: 'vallenato', label: 'Vallenato', category: 'Vallenato', queries: ['vallenato'], match: /vallenat/i }
const COLOMBIANA: GenreSource = { key: 'colombiana', label: 'Música colombiana', queries: ['música colombiana'], match: /colombi/i }

/**
 * Géneros que reconoce la radio (data/genreIndex.ts): de las playlists de cada uno sale qué artistas son de qué género.
 * Van también los que nunca se recomiendan juntos (rock, electrónica, pop…), para reconocerlos y dejarlos fuera.
 */
export const INDEX_GENRES = {
  reggaeton: REGGAETON,
  dancehall: { key: 'dancehall', label: 'Dancehall', queries: ['dancehall'], match: /dancehall/i },
  trap: { key: 'trap', label: 'Trap latino', queries: ['trap latino'], match: /trap/i },
  salsa: SALSA,
  merengue: MERENGUE,
  bachata: { key: 'bachata', label: 'Bachata', category: 'Bachata', queries: ['bachata'], match: /bachata/i },
  vallenato: VALLENATO,
  cumbia: { key: 'cumbia', label: 'Cumbia', category: 'Cumbia', queries: ['cumbia'], match: /cumbia/i },
  popular: POPULAR,
  regional: {
    key: 'regional',
    label: 'Regional mexicano',
    category: 'Música regional y popular',
    queries: ['rancheras', 'regional mexicano'],
    match: /ranch|mariachi|corrido|banda|mexican|regional/i,
  },
  pop: { key: 'pop', label: 'Pop latino', category: 'Pop Latino', queries: ['pop latino'], match: /pop/i, avoid: /k-?pop|j-?pop|turk|popular/i },
  baladas: { key: 'baladas', label: 'Baladas', queries: ['baladas en español'], match: /balad/i },
  boleros: { key: 'boleros', label: 'Boleros', queries: ['boleros'], match: /bolero/i },
  electronica: { key: 'electronica', label: 'Electrónica', category: 'Dance y electrónica', queries: ['electrónica'], match: /dance|electr|edm|house/i },
  rock: { key: 'rock', label: 'Rock en español', category: 'Rock en español', queries: ['rock en español'], match: /rock/i },
} satisfies Record<string, GenreSource>

/** «Selecciones rápidas»: canciones por género. */
export const QUICK_PICK_GENRES = [SALSA, REGGAETON, MERENGUE, POPULAR]
/** «Muy sonadas»: playlists por género. */
export const POPULAR_GENRES = [SALSA, REGGAETON, MERENGUE, POPULAR, VALLENATO, COLOMBIANA]

export interface Mode {
  key: 'rumba' | 'tomar' | 'relax'
  label: string
  note: string
  filters: GenreSource[] // subfiltros; «Todo» los mezcla
}

export const MODES: Mode[] = [
  {
    key: 'rumba',
    label: 'Modo Rumba',
    note: 'Para la fiesta',
    filters: [
      { key: 'salsa', label: 'Salsa', queries: ['salsa para fiesta', 'salsa mix'], match: /salsa/i },
      { key: 'reggaeton', label: 'Reggaetón', category: 'Urbano', queries: ['reggaeton para fiesta', 'perreo'], match: /regg?a?et[oó]n|perreo/i, avoid: /triste/i },
      { key: 'merengue', label: 'Merengue', queries: ['merengue para bailar'], match: /merengue/i, avoid: /rom[aá]ntic/i },
      {
        key: 'electronica',
        label: 'Electrónica',
        category: 'Dance y electrónica',
        queries: ['electrónica para fiesta', 'dance party'],
        match: /dance|electr|edm|house|guaracha|party|tomorrowland/i,
      },
    ],
  },
  {
    key: 'tomar',
    label: 'Modo Tomar',
    note: 'Despecho, rancheras y vallenato',
    filters: [
      { key: 'despecho', label: 'Despecho', category: 'Música regional y popular', queries: ['música para tomar despecho'], match: /despecho|popular/i },
      { key: 'rancheras', label: 'Rancheras', category: 'Música regional y popular', queries: ['rancheras para tomar'], match: /ranch|mariachi|vicente/i },
      { key: 'vallenato', label: 'Vallenato', category: 'Vallenato', queries: ['vallenato para tomar'], match: /vallenat/i },
    ],
  },
  {
    key: 'relax',
    label: 'Modo Relax',
    note: 'Para bajar el ritmo',
    filters: [
      { key: 'baladas', label: 'Baladas', queries: ['baladas en español'], match: /balad/i },
      { key: 'boleros', label: 'Boleros', queries: ['boleros'], match: /bolero/i },
      { key: 'chill', label: 'Chill', queries: ['chill latino', 'relajante'], match: /chill|relaj|calma|tranquil|cafecito/i, avoid: /house|jazz|nana|beb[eé]|rock/i },
    ],
  },
]

const mixes = (title: string) => GENRE_WORDS.filter((word) => word.test(title)).length

/** Las playlists de YouTube Music de un género (o subfiltro), de la que más se ajusta a la que menos. */
export async function sourcePlaylists(source: GenreSource): Promise<YtmCard[]> {
  const lists = await Promise.all([
    source.category ? ytmCategoryPlaylists(source.category).catch(() => []) : [],
    ...source.queries.map((q) => ytmSearchPlaylists(q).catch(() => [])),
  ])
  const found = unique(lists.flat()).filter((card) => !SEASONAL.test(card.title) && !source.avoid?.test(card.title))
  const fitting = found.filter((card) => source.match.test(card.title))
  // Sort estable: entre las que nombran la misma cantidad de géneros, se respeta el orden de YouTube Music.
  return fitting.length ? [...fitting].sort((a, b) => mixes(a.title) - mixes(b.title)) : found.slice(0, PLAYLISTS_PER_LIST)
}

/** Canciones de un género o subfiltro: las de sus 2 primeras playlists, al azar (el mismo orden en la sesión), filtradas. */
export async function sourceTracks(source: GenreSource, limit = 40): Promise<Track[]> {
  const playlists = (await sourcePlaylists(source)).slice(0, PLAYLISTS_PER_LIST)
  const pages = await Promise.all(playlists.map((playlist) => ytmPage(playlist.id).catch(() => null)))
  const random = seededRandom(sessionSeed() ^ hashText(source.key + source.queries.join()))
  return strictFilter(interleave(pages.map((page) => shuffle(page?.tracks ?? [], random))), limit)
}

/** Canciones de un modo: un subfiltro, o todos mezclados («Todo»). */
export async function modeTracks(mode: Mode, filterKey: string | null, limit = 50): Promise<Track[]> {
  const sources = filterKey ? mode.filters.filter((f) => f.key === filterKey) : mode.filters
  const lists = await Promise.all(sources.map((source) => sourceTracks(source).catch(() => [])))
  return strictFilter(interleave(lists), limit)
}

/** Los filtros de las recomendaciones: sin covers, sin artistas que sueles saltar, 2 por artista y sin repetidas. */
function strictFilter(tracks: Track[], limit: number): Track[] {
  const skipped = listening.skippedArtists()
  return capPerArtist(tracks.filter((track) => !NOT_ORIGINAL.test(track.title) && !skipped.has(artistKey(track.artist)))).slice(0, limit)
}
