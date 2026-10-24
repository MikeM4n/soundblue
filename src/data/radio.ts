// Radio dinámica (Buscar, «Iniciar radio», «Tus artistas» en Inicio y la cola infinita al acabarse cualquier lista):
// suena la canción elegida y la cola se va llenando de a 5 con canciones del mismo artista y de otros artistas del mismo
// género y época. NUNCA a partir del título: eso llenaba la cola de covers y de canciones que solo comparten palabras
// con el nombre.
//
// De dónde salen (sin cuota: YouTube Music vía el intermediario):
//  - Mismo artista: las suyas que trae la radio y, si la canción no es vieja, sus más conocidas (data/artistTop.ts;
//    no traen año, por eso no se usan con canciones viejas).
//  - Mismo género y época: la radio de YouTube Music de esa canción («A continuación», a partir de su videoId). YouTube
//    no publica el género de una canción; su radio es lo que lo mantiene (reggaetón con reggaetón, ranchera con
//    ranchera). Cuando se acaba, la radio de la última que sonó de otro artista.
//
// Filtros: solo audio o video oficial (fuera los subidos por usuarios: covers); fuera los «Canción – Otro Artista» de
// un intérprete distinto (covers); nada que comparta más del 40 % de las palabras del título de la semilla (covers,
// remix, en vivo); una sola versión de cada título (la más vieja, que suele
// ser la original); época: año del álbum a ±10 años del de la semilla y, si la semilla es vieja (8 años o más), nada
// de los últimos 3 años. Mezcla: en cada tanda de 5, como mucho 1 del mismo artista (el 80 % de otros artistas). Orden
// al azar con una semilla por sesión. Nunca la misma canción dos veces, ni una que ya esté en la cola (`exclude`).
import { logDuplicate } from '../lib/duplicateLog'
import type { Track } from '../player/types'
import { artistTopSongs } from './artistTop'
import { ytmRadioItems, ytmSearchArtists, type RadioItem } from './ytmusic'

const SAME_ARTIST_PER_BATCH = 1 // de cada 5: 20 % (el resto, otros artistas del mismo género)
const ERA_SPAN = 10 // años alrededor del de la semilla
const OLD_SEED = 8 // años: desde aquí la semilla es «vieja»
const RECENT = 3 // con una semilla vieja, nada de los últimos 3 años
const TITLE_OVERLAP = 0.4
const MAX_REFILLS = 4 // radios de respaldo como mucho
const OFFICIAL = new Set(['MUSIC_VIDEO_TYPE_ATV', 'MUSIC_VIDEO_TYPE_OMV', 'MUSIC_VIDEO_TYPE_OFFICIAL_SOURCE_MUSIC'])
const LOG_KEY = 'soundblue:radio-diagnostico'
const SESSION_KEY = 'soundblue:radio-semilla' // sessionStorage: cambia en cada sesión
const STOPWORDS = new Set(
  'el la los las lo un una unos unas de del al a y e o u en con por para que mi mis tu tus te me se yo su sus le the of and to in on my you your i is it feat ft'.split(
    ' ',
  ),
)

type Reason = 'mismo artista' | 'mismo género y época'

interface Candidate {
  track: Track
  year?: number
  reason: Reason
}

export interface RadioDiagnostics {
  at: number
  seed: string // «Gasolina · Daddy Yankee»
  seedYear?: number
  era: string // «Años 2000»
  window?: string // «1994–2014»
  filtered: Record<string, number> // descartadas, por motivo
  picks: { title: string; artist: string; year?: number; reason: Reason }[] // las últimas 10 que generó
}

const thisYear = new Date().getFullYear()
const normalize = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
const words = (title: string) =>
  normalize(title)
    .replace(/\(.*?\)|\[.*?\]/g, ' ')
    .split(/[^a-z0-9ñ]+/)
    .filter(Boolean)
/** «Ven Bailalo - Reggaeton Mix (con X)» → «ven bailalo»: para reconocer versiones del mismo título. */
const baseTitle = (title: string) => words(title.replace(/\s+[-–—]\s+.*$/, '')).join(' ')
/** Lo que va después de « – » en el título («La Gran Noche – Los Tucanes De Tijuana» → «Los Tucanes De Tijuana»). */
const titleSuffix = (title: string) => title.match(/\s[-–—]\s(.+)$/)?.[1]
/** «Bad Bunny y Jhayco» → «badbunny» (el primer artista). */
const firstArtist = (artist: string) => artist.split(/,| y | & | x | feat\.? | ft\.? /i)[0].trim()
const artistKey = (artist: string) => normalize(firstArtist(artist)).replace(/[^a-z0-9]+/g, '')

/** Época de un año, para mostrarla en el diagnóstico. */
export function eraLabel(year?: number): string {
  if (!year) return 'desconocida'
  if (year > thisYear - RECENT) return 'Actualidad'
  if (year >= 2020) return 'Años 2020'
  if (year >= 2010) return 'Años 2010'
  if (year >= 2000) return 'Años 2000'
  if (year >= 1990) return 'Años 90'
  if (year >= 1980) return 'Años 80'
  return 'Clásicos'
}

function eraWindow(seedYear?: number): [number, number] | null {
  if (!seedYear) return null
  let to = seedYear + ERA_SPAN
  if (seedYear <= thisYear - OLD_SEED) to = Math.min(to, thisYear - RECENT)
  return [seedYear - ERA_SPAN, to]
}

function sessionSeed(): number {
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
function seededRandom(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const hashText = (text: string) => [...text].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 0)

function shuffle<T>(list: T[], random: () => number): T[] {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function readRadioDiagnostics(): RadioDiagnostics | null {
  try {
    return JSON.parse(localStorage.getItem(LOG_KEY) ?? 'null')
  } catch {
    return null
  }
}

function writeRadioDiagnostics(diagnostics: RadioDiagnostics) {
  try {
    localStorage.setItem(LOG_KEY, JSON.stringify(diagnostics))
  } catch {
    /* sin almacenamiento: sin diagnóstico */
  }
}

/**
 * Crea la radio de `seed`. Devuelve una función que da las siguientes `count` canciones sin ninguna de `exclude` (lo
 * que ya está en la cola); el motor la llama de a 5, cuando quedan 2 por sonar. Si ya no hay más que cumplan las
 * reglas, da menos (o ninguna) y la radio termina.
 */
export function createRadio(seed: Track): (count: number, exclude?: ReadonlySet<string>) => Promise<Track[]> {
  const served = new Set([seed.id])
  const titles = new Set([baseTitle(seed.title)])
  const seedWords = (() => {
    const all = words(seed.title)
    const meaningful = all.filter((word) => !STOPWORDS.has(word))
    return meaningful.length ? meaningful : all
  })()
  const seedArtist = artistKey(seed.artist)
  const random = seededRandom(sessionSeed() ^ hashText(seed.id))
  const same: Candidate[] = []
  const others: Candidate[] = []
  const filtered: Record<string, number> = {
    'no oficial (cover o subida por usuario)': 0,
    'cover (título con el nombre de otro artista)': 0,
    'título parecido a la semilla': 0,
    'otra versión del mismo título': 0,
    'de otra época': 0,
  }
  const knownArtists = new Set([seedArtist]) // los artistas que aparecen en las radios (para reconocer covers)
  let window: [number, number] | null = null
  let lastOther: Track | null = null
  let refills = 0
  let ready: Promise<void> | null = null
  const diagnostics: RadioDiagnostics = { at: Date.now(), seed: `${seed.title} · ${seed.artist}`, era: 'desconocida', filtered, picks: [] }

  const sharesTitle = (title: string) => {
    const candidate = new Set(words(title))
    return seedWords.filter((word) => candidate.has(word)).length / seedWords.length > TITLE_OVERLAP
  }

  /** Pasa las candidatas por los filtros y las reparte: mismo artista u otros (cada tanda nueva, al azar). */
  const add = (items: RadioItem[], reason: Reason) => {
    for (const item of items) knownArtists.add(artistKey(item.track.artist))
    // «Canción – Otro Artista» de un intérprete distinto: un cover de la canción de ese otro artista.
    const coverOf = (track: Track) => {
      const suffix = titleSuffix(track.title)
      const key = suffix ? artistKey(suffix) : ''
      return !!key && knownArtists.has(key) && key !== artistKey(track.artist)
    }
    // Una sola versión de cada título: la más vieja (suele ser la original).
    const best = new Map<string, RadioItem>()
    for (const item of items) {
      const base = baseTitle(item.track.title)
      const previous = best.get(base)
      if (!previous || (item.year ?? 9999) < (previous.year ?? 9999)) best.set(base, item)
    }
    const accepted: Candidate[] = []
    for (const item of items) {
      const { track } = item
      if (served.has(track.id)) continue
      const base = baseTitle(track.title)
      if (item.videoType && !OFFICIAL.has(item.videoType)) filtered['no oficial (cover o subida por usuario)']++
      else if (coverOf(track)) filtered['cover (título con el nombre de otro artista)']++
      else if (sharesTitle(track.title)) filtered['título parecido a la semilla']++
      else if (titles.has(base) || best.get(base) !== item) filtered['otra versión del mismo título']++
      else if (window && item.year && (item.year < window[0] || item.year > window[1])) filtered['de otra época']++
      else {
        titles.add(base)
        served.add(track.id) // ya no puede volver a entrar (está en la tanda)
        accepted.push({ track, year: item.year, reason: artistKey(track.artist) === seedArtist ? 'mismo artista' : reason })
      }
    }
    for (const candidate of shuffle(accepted, random)) (candidate.reason === 'mismo artista' ? same : others).push(candidate)
  }

  const init = async () => {
    const radio = await ytmRadioItems(seed.id).catch(() => [])
    const seedYear = radio.find((item) => item.track.id === seed.id)?.year
    window = eraWindow(seedYear)
    Object.assign(diagnostics, { seedYear, era: eraLabel(seedYear), window: window ? `${window[0]}–${window[1]}` : undefined })
    add(radio, 'mismo género y época')
    // Sus más conocidas no traen año: solo si la canción no es vieja (o no se sabe), para no saltar de época.
    const old = seedYear !== undefined && seedYear <= thisYear - OLD_SEED
    if (!old) {
      const name = firstArtist(seed.artist)
      const id = seed.artistId ?? (await ytmSearchArtists(name).catch(() => []))[0]?.id
      if (id) {
        const top = await artistTopSongs({ id, kind: 'artist', title: name, subtitle: '' })
        add(
          top.tracks.map((track) => ({ track })),
          'mismo artista',
        )
      }
    }
    writeRadioDiagnostics(diagnostics)
  }

  /** Más canciones de otros artistas: la radio de la última que sonó de otro artista (o de la primera en espera). */
  const refill = async () => {
    const from = lastOther ?? others[0]?.track
    if (!from || refills >= MAX_REFILLS) return false
    refills++
    const before = others.length
    add(await ytmRadioItems(from.id).catch(() => []), 'mismo género y época')
    return others.length > before
  }

  return async (count: number, exclude: ReadonlySet<string> = new Set()) => {
    ready ??= init()
    await ready
    const batch: Candidate[] = []
    let sameInBatch = 0
    while (batch.length < count) {
      if (!others.length && !(await refill()) && !others.length) {
        // Sin más de otros artistas: solo cabe una del mismo artista si no pasa del límite de la tanda.
        if (sameInBatch >= SAME_ARTIST_PER_BATCH || !same.length) break
      }
      const room = sameInBatch < SAME_ARTIST_PER_BATCH && same.length > 0
      const takeSame = room && (!others.length || random() < SAME_ARTIST_PER_BATCH / count)
      const pick = (takeSame ? same : others).shift()
      if (!pick) break
      if (exclude.has(pick.track.id)) {
        logDuplicate(pick.track, 'radio (ya estaba en la cola)') // se salta y se busca otra
        continue
      }
      if (takeSame) sameInBatch++
      else lastOther = pick.track
      batch.push(pick)
    }
    diagnostics.at = Date.now()
    diagnostics.picks = [...diagnostics.picks, ...batch.map(({ track, year, reason }) => ({ title: track.title, artist: track.artist, year, reason }))].slice(-10)
    writeRadioDiagnostics(diagnostics)
    return batch.map((candidate) => candidate.track)
  }
}
