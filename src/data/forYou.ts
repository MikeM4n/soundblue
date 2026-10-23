// «Para ti»: sugerencias que se recalculan al abrir la app, al marcar o quitar favoritos y al terminar canciones.
// No son recomendaciones oficiales de YouTube Music (su API pública no las da: no existe un endpoint de
// recomendaciones y relatedToVideoId se eliminó). Se arman en capas:
//   1. Lo tuyo, guardado aquí: artistas elegidos, favoritas e historial de escucha (funciona sin conexión).
//   2. YouTube Music (API interna, NO oficial: puede fallar sin aviso): canciones de tus artistas y su radio.
//   3. Audius (API pública y estable): tendencias para rellenar.
//   4. La YouTube Data API oficial (solo si las anteriores fallan y hay clave; guarda 24 h para no gastar cuota).
// Si algo falla se usa lo anterior guardado o la siguiente capa: nunca se muestra un error.
import { library } from '../library/store'
import type { Track } from '../player/types'
import { audiusTrending } from './audius'
import { listening } from './history'
import { readTastes } from './tastes'
import { youtubeSearch, youtubeSearchEnabled } from './youtube'
import { ytmPage, ytmRadio, ytmSearchArtists, type YtmCard } from './ytmusic'

const DAY = 24 * 3600 * 1000
const RADIOS_KEY = 'soundblue:ultimas-radios' // la última radio que funcionó, por canción semilla
const SEED_KEY = 'soundblue:semilla' // qué semilla le toca a la radio (cambia en cada apertura)

export interface Shelf {
  key: 'nuevo' | 'radio' | 'sonadas' | 'volver'
  title: string
  note: string
  tracks: Track[]
}

export interface ForYou {
  shelves: Shelf[] // carruseles de canciones
  artists: YtmCard[] // «Tus artistas» (los que elegiste)
  similar: YtmCard[] // «Artistas recomendados para ti»
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

/** Calcula «Para ti». `rotate`: al abrir la app, la radio cambia de semilla. */
export async function computeForYou({ rotate = false } = {}): Promise<ForYou> {
  const favorites = library.get().favorites
  const favoriteIds = new Set(favorites.map((track) => track.id))
  const recent = listening.playedWithin(DAY)
  const ever = new Set(listening.entries().map((entry) => entry.track.id))
  // No repetir lo que sonó en las últimas 24 h, salvo tus favoritas.
  const fresh = (track: Track) => favoriteIds.has(track.id) || !recent.has(track.id)

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
    const radio = await ytmRadio(seed.id)
      .then((tracks) => {
        saveRadio(seed.id, tracks)
        return tracks
      })
      .catch(() => readRadios()[seed.id]?.tracks ?? [])
    const tracks = radio.filter((track) => track.id !== seed.id && fresh(track))
    if (tracks.length) shelves.push({ key: 'radio', title: `Radio de «${seed.title}»`, note: `A partir de ${seed.title}, de ${mainArtist(seed.artist)}`, tracks: tracks.slice(0, 20) })
  }

  // 3) Muy sonadas: lo más escuchado de tu artista top + tendencias de Audius.
  if (top[0]) {
    const audius = await audiusTrending(12).catch(() => [])
    const popular = unique(interleave([(topSongs[0] ?? []).filter(fresh), audius.filter(fresh)]))
    if (popular.length) shelves.push({ key: 'sonadas', title: 'Muy sonadas', note: `Lo más escuchado de ${top[0].name} y tendencias de Audius`, tracks: popular.slice(0, 16) })
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
  return { shelves, artists: chosen, similar: similar.filter((card) => !chosenIds.has(card.id)).slice(0, 15) }
}
