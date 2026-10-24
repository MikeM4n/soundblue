// «Para ti»: sugerencias que se recalculan al abrir la app, al marcar o quitar favoritos y al terminar canciones.
// No son recomendaciones oficiales de YouTube Music (su API pública no las da: no existe un endpoint de
// recomendaciones y relatedToVideoId se eliminó). Se arman en capas:
//   1. Lo tuyo, guardado aquí: artistas elegidos, favoritas e historial de escucha (funciona sin conexión).
//   2. YouTube Music (API interna, NO oficial: puede fallar sin aviso): canciones de tus artistas y su radio.
//   3. La YouTube Data API oficial (solo si la anterior falla y hay clave; guarda 24 h para no gastar cuota).
// Si algo falla se usa lo anterior guardado o la siguiente capa: nunca se muestra un error.
//
// Filtros estrictos en todos los estantes: nada de artistas que sueles saltar, como mucho 2 canciones por artista en
// cada estante y ninguna canción en dos estantes (mismo videoId). Las que vienen de una radio pasan además por los
// filtros de data/radio.ts (covers, otras versiones, época).
import { library } from '../library/store'
import type { Track } from '../player/types'
import { artistTopSongs } from './artistTop'
import { artistKey, listening } from './history'
import { createRadio } from './radio'
import { readTastes } from './tastes'
import { youtubeSearch, youtubeSearchEnabled } from './youtube'
import { ytmPage, ytmRadioItems, ytmSearchArtists, type YtmCard } from './ytmusic'

const DAY = 24 * 3600 * 1000
const RADIOS_KEY = 'soundblue:ultimas-radios' // la última radio que funcionó, por canción semilla
const SEED_KEY = 'soundblue:semilla' // qué semilla le toca a la radio (cambia en cada apertura)
const QUICK_SEEDS = 10 // «Selecciones rápidas»: a partir de las últimas 10 que sonaron…
const QUICK_PER_SEED = 3 // …3 de la radio de cada una
const QUICK_MAX = 20
const PER_ARTIST = 2 // como mucho 2 canciones de un mismo artista por estante
const TOP_ARTISTS_SHOWN = 8 // «Tus artistas» muestra hasta 8 (components/tracks/ArtistTopSongs.tsx)

export interface Shelf {
  key: 'nuevo' | 'radio' | 'sonadas' | 'volver'
  title: string
  note: string
  tracks: Track[]
}

/** «Selecciones rápidas»: con filtros «Como …» (las que salieron de las canciones de ese artista). */
export interface QuickPicks {
  tracks: Track[]
  filters: { label: string; ids: string[] }[]
}

export interface ForYou {
  quickPicks: QuickPicks | null
  shelves: Shelf[] // carruseles de canciones
  artists: YtmCard[] // «Tus artistas» (los que elegiste)
  similar: YtmCard[] // «Artistas recomendados para ti»
  genreArtists: string[] // artistKey de los artistas de tus géneros (para filtrar las tendencias)
  skippedArtists: string[] // artistKey de los que sueles saltar
}

/** Todos los artistas de una línea («Bad Bunny, Jhayco y Feid» → 3 claves). */
export const artistKeys = (artist: string) => artist.split(/,| y | & | x | feat\.? | ft\.? /i).map(artistKey).filter(Boolean)

/** Sin repetidas y como mucho `max` por artista (el primero de la línea), en el orden en que vienen. */
export function capPerArtist(tracks: readonly Track[], max = PER_ARTIST, taken: Set<string> = new Set()): Track[] {
  const perArtist = new Map<string, number>()
  return tracks.filter((track) => {
    const key = artistKey(track.artist)
    const used = perArtist.get(key) ?? 0
    if (taken.has(track.id) || used >= max) return false
    taken.add(track.id)
    perArtist.set(key, used + 1)
    return true
  })
}

const simplify = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '')

/** «Bad Bunny y Jhayco» → «Bad Bunny». */
const mainArtist = (artist: string) => artist.split(/,| y | & | x | feat\.? | ft\.? /i)[0].trim()

function unique<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>()
  return items.filter((item) => !seen.has(item.id) && !!seen.add(item.id))
}

/** Intercala listas: la 1ª de cada una, luego la 2ª… (para no poner todo de un mismo artista seguido). */
function interleave<T>(lists: T[][]): T[] {
  const out: T[] = []
  for (let i = 0; i < Math.max(0, ...lists.map((l) => l.length)); i++) for (const list of lists) if (list[i]) out.push(list[i])
  return out
}

interface ArtistScore {
  id?: string
  name: string
  score: number
}

/** Tus artistas, de más a menos: elegidos (5 puntos), en tus favoritas (3 por canción) y escuchados (1 por vez). */
function scoreArtists(): ArtistScore[] {
  const scores = new Map<string, ArtistScore>()
  const add = (name: string, id: string | undefined, points: number) => {
    const key = simplify(name)
    if (!key || key === 'youtubemusic') return
    const found = scores.get(key)
    scores.set(key, { name: found?.name ?? name, id: found?.id ?? id, score: (found?.score ?? 0) + points })
  }
  for (const artist of readTastes()?.artists ?? []) add(artist.title, artist.id, 5)
  for (const track of library.get().favorites) add(mainArtist(track.artist), track.artistId, 3)
  for (const entry of listening.entries()) add(mainArtist(entry.track.artist), entry.track.artistId, entry.count)
  return [...scores.values()].sort((a, b) => b.score - a.score)
}

async function artistId(artist: ArtistScore): Promise<string | null> {
  if (artist.id) return artist.id
  const found = await ytmSearchArtists(artist.name).catch(() => [])
  return found.find((card) => simplify(card.title) === simplify(artist.name))?.id ?? found[0]?.id ?? null
}

type SavedRadios = Record<string, { at: number; tracks: Track[] }>

function readRadios(): SavedRadios {
  try {
    return JSON.parse(localStorage.getItem(RADIOS_KEY) ?? '{}')
  } catch {
    return {}
  }
}

function saveRadio(seedId: string, tracks: Track[]) {
  if (!tracks.length) return
  try {
    const recent = Object.entries({ ...readRadios(), [seedId]: { at: Date.now(), tracks } })
      .sort(([, a], [, b]) => b.at - a.at)
      .slice(0, 5)
    localStorage.setItem(RADIOS_KEY, JSON.stringify(Object.fromEntries(recent)))
  } catch {
    /* sin almacenamiento: sin radio de respaldo */
  }
}

let rotatedThisSession = false

/** La semilla de la radio rota una vez por apertura de la app. */
function seedIndex(rotate: boolean, count: number): number {
  let index = 0
  try {
    index = Number(localStorage.getItem(SEED_KEY)) || 0
    if (rotate && !rotatedThisSession) {
      rotatedThisSession = true
      index += 1
      localStorage.setItem(SEED_KEY, String(index))
    }
  } catch {
    /* sin almacenamiento: siempre la primera */
  }
  return index % count
}

/**
 * «Selecciones rápidas»: la radio de cada una de las últimas 10 canciones que sonaron (mismo género y época, sin covers),
 * 3 de cada una, intercaladas. Sin historial todavía, a partir de tus favoritas. Devuelve también los artistas que
 * aparecen en esas radios: el «vecindario» de tus géneros.
 */
async function quickPicks(skipped: Set<string>, avoid: Set<string>): Promise<{ picks: QuickPicks | null; genre: Set<string> }> {
  const listened = listening.entries().map((entry) => entry.track) // de la más reciente a la más vieja
  const seeds = unique([...listened, ...library.get().favorites])
    .filter((track) => !skipped.has(artistKey(track.artist)))
    .slice(0, QUICK_SEEDS)
  if (!seeds.length) return { picks: null, genre: new Set() }
  const exclude = new Set([...seeds.map((track) => track.id), ...avoid])
  const [batches, radios] = await Promise.all([
    Promise.all(seeds.map((seed) => createRadio(seed, { artistTop: false, diagnostics: false })(QUICK_PER_SEED, exclude).catch(() => []))),
    Promise.all(seeds.map((seed) => ytmRadioItems(seed.id).catch(() => []))),
  ])
  const genre = new Set(radios.flat().flatMap((item) => artistKeys(item.track.artist)))
  const from = new Map<string, string>() // id → artista de la canción de la que salió
  batches.forEach((batch, i) => batch.forEach(({ track }) => from.set(track.id, mainArtist(seeds[i].artist))))
  const tracks = capPerArtist(interleave(batches.map((batch) => batch.map(({ track }) => track)))).slice(0, QUICK_MAX)
  if (!tracks.length) return { picks: null, genre }
  const byArtist = new Map<string, string[]>()
  for (const track of tracks) {
    const artist = from.get(track.id)!
    byArtist.set(artist, [...(byArtist.get(artist) ?? []), track.id])
  }
  const filters = [...byArtist]
    .filter(([, ids]) => ids.length >= 2)
    .slice(0, 5)
    .map(([artist, ids]) => ({ label: `Como ${artist}`, ids }))
  return { picks: { tracks, filters }, genre }
}

/** Calcula «Para ti». `rotate`: al abrir la app, la radio cambia de semilla. */
export async function computeForYou({ rotate = false } = {}): Promise<ForYou> {
  const favorites = library.get().favorites
  const favoriteIds = new Set(favorites.map((track) => track.id))
  const recent = listening.playedWithin(DAY)
  const ever = new Set(listening.entries().map((entry) => entry.track.id))
  const skipped = listening.skippedArtists()
  // No repetir lo que sonó en las últimas 24 h, salvo tus favoritas; nunca artistas que sueles saltar.
  const fresh = (track: Track) => (favoriteIds.has(track.id) || !recent.has(track.id)) && !skipped.has(artistKey(track.artist))
  const quick = quickPicks(skipped, recent)

  const top = scoreArtists().slice(0, 3)
  const ids = await Promise.all(top.map(artistId))
  const pages = await Promise.all(ids.map((id) => (id ? ytmPage(id).catch(() => null) : null)))
  const topSongs = pages.map((page) => page?.sections.find((section) => section.tracks.length)?.tracks ?? [])
  const shelves: Shelf[] = []

  // 1) Nuevo para ti: canciones de tus artistas que todavía no has escuchado aquí.
  let fresher = interleave(topSongs).filter((track) => !ever.has(track.id))
  if (!fresher.length && top[0] && youtubeSearchEnabled) {
    fresher = ((await youtubeSearch(top[0].name).catch(() => null))?.songs ?? []).filter((track) => !ever.has(track.id))
  }
  if (fresher.length) shelves.push({ key: 'nuevo', title: 'Nuevo para ti', note: 'De tus artistas, todavía sin escuchar', tracks: unique(fresher).slice(0, 12) })

  // 2) Radio de…: la semilla rota entre tu última favorita, lo más escuchado de tu artista top y algo nuevo de tu historial.
  // (Las favoritas se guardan de la más reciente a la más antigua.)
  const seeds = unique([favorites[0], topSongs[0]?.[0], listening.entries().find((entry) => entry.count <= 1)?.track].filter((t): t is Track => !!t))
  if (seeds.length) {
    const seed = seeds[seedIndex(rotate, seeds.length)]
    // Con los filtros de la radio (sin covers ni otras versiones, misma época); sin conexión, la última guardada.
    const radio = await createRadio(seed, { artistTop: false, diagnostics: false })(20, recent)
      .then((picks) => {
        const tracks = picks.map(({ track }) => track)
        saveRadio(seed.id, tracks)
        return tracks
      })
      .catch(() => readRadios()[seed.id]?.tracks ?? [])
    const tracks = radio.filter((track) => track.id !== seed.id && fresh(track))
    if (tracks.length) shelves.push({ key: 'radio', title: `Radio de «${seed.title}»`, note: `A partir de ${seed.title}, de ${mainArtist(seed.artist)}`, tracks: tracks.slice(0, 20) })
  }

  // 3) Muy sonadas: lo más escuchado en YouTube Music de tus artistas top (aunque ya las hayas escuchado).
  if (top[0]) {
    const popular = unique(interleave(topSongs.map((songs) => songs.slice(0, 8)))).filter(fresh)
    const names = top.filter((_, i) => topSongs[i]?.length).map((artist) => artist.name)
    const who = names.length > 1 ? `${names.slice(0, -1).join(', ')} y ${names.at(-1)}` : names[0]
    if (popular.length) shelves.push({ key: 'sonadas', title: 'Muy sonadas', note: `Lo más escuchado de ${who} en YouTube Music`, tracks: popular.slice(0, 16) })
  }

  // Sin YouTube Music (sin conexión o falló): de tus favoritas y lo que más escuchas.
  if (!shelves.some((shelf) => shelf.key === 'nuevo' || shelf.key === 'radio')) {
    const byCount = [...listening.entries()].sort((a, b) => b.count - a.count).map((entry) => entry.track)
    const local = unique([...favorites, ...byCount]).filter(fresh)
    if (local.length) shelves.push({ key: 'volver', title: 'Para volver a escuchar', note: 'De tus favoritas y lo que más escuchas', tracks: local.slice(0, 12) })
  }

  const chosen = readTastes()?.artists ?? []
  const chosenIds = new Set(chosen.map((artist) => artist.id))
  const similar = unique(pages.flatMap((page) => page?.sections.flatMap((section) => section.cards.filter((card) => card.kind === 'artist')) ?? []))

  // Filtros estrictos: lo que ya muestra «Tus artistas» (sus 5 más conocidas, guardadas 24 h) no se repite; luego
  // «Selecciones rápidas» y los demás estantes, cada canción en uno solo y 2 por artista como mucho.
  const [{ picks, genre }, tops] = await Promise.all([quick, Promise.all(chosen.slice(0, TOP_ARTISTS_SHOWN).map((artist) => artistTopSongs(artist).catch(() => null)))])
  const taken = new Set(tops.flatMap((top) => top?.tracks.map((track) => track.id) ?? []))
  if (picks) {
    picks.tracks = picks.tracks.filter((track) => !taken.has(track.id))
    const kept = new Set(picks.tracks.map((track) => track.id))
    picks.filters = picks.filters.map((f) => ({ ...f, ids: f.ids.filter((id) => kept.has(id)) })).filter((f) => f.ids.length >= 2)
    for (const id of kept) taken.add(id)
  }
  const strict = shelves.map((shelf) => ({ ...shelf, tracks: capPerArtist(shelf.tracks, PER_ARTIST, taken) })).filter((shelf) => shelf.tracks.length)
  // Tus géneros: los artistas de esas radios, más los tuyos (elegidos, favoritas y escuchados), menos los que saltas.
  const yours = [...chosen.map((artist) => artist.title), ...scoreArtists().map((artist) => artist.name)].flatMap(artistKeys)
  const genreArtists = [...new Set([...genre, ...yours])].filter((key) => !skipped.has(key))
  return {
    quickPicks: picks?.tracks.length ? picks : null,
    shelves: strict,
    artists: chosen,
    similar: similar.filter((card) => !chosenIds.has(card.id) && !skipped.has(artistKey(card.title))).slice(0, 15),
    genreArtists,
    skippedArtists: [...skipped],
  }
}
