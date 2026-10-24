import { Settings as SettingsIcon, Users } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link, Navigate } from 'react-router'
import { Logo } from '../components/brand/Logo'
import { ArtistTopSongsRow } from '../components/tracks/ArtistTopSongs'
import { Cover } from '../components/ui/Cover'
import { FavoritesCover } from '../components/ui/LibraryItem'
import { CardPages, TrackPages } from '../components/ui/RowPages'
import { Section } from '../components/ui/Section'
import { catalog } from '../data/catalog'
import { artistKeys, capPerArtist, computeForYou, type ForYou, type QuickPicks } from '../data/forYou'
import { listening } from '../data/history'
import { createRadio } from '../data/radio'
import { readTastes } from '../data/tastes'
import { ytmHome, type YtmCard, type YtmSection } from '../data/ytmusic'
import { library } from '../library/store'
import { greeting } from '../lib/format'
import { player } from '../player/engine'
import { coverUrl, type Track } from '../player/types'
import { useNowPlaying } from '../player/useNowPlaying'

const CATALOG_NAME = 'Catálogo de prueba'
// Estantes de YouTube Music que no se muestran: su «Selecciones rápidas» no es personal (sin iniciar sesión no sabe qué
// escuchas; la nuestra la reemplaza) y «Versiones y remixes» son covers.
const HIDDEN_SHELVES = /selecciones r[aá]pidas|versiones|covers/i
const NOT_ORIGINAL = /\b(cover|karaoke|instrumental|slowed|sped ?up|nightcore|8d)\b/i
const MIN_TRACKS = 4 // un estante de canciones con menos, tras los filtros, no se muestra

/**
 * Inicio: saludo, accesos rápidos, «Para ti» («Selecciones rápidas» a partir de tus últimas 10 canciones, «Tus
 * artistas» con sus canciones más conocidas y sugerencias según tus artistas, favoritas e historial; ver data/forYou.ts y
 * data/artistTop.ts) y las tendencias y novedades de YouTube Music, solo de tus géneros. Todo en listas compactas que se
 * deslizan de lado. La primera vez lleva a «¿Qué artistas te gustan?».
 */
export function Home() {
  const { open } = useNowPlaying()
  const [tastes] = useState(readTastes)
  const [ytm, setYtm] = useState<YtmSection[] | 'error' | null>(null)
  const [mine, setMine] = useState<ForYou | null>(null)

  useEffect(() => {
    if (!tastes) return // primero elige sus artistas
    let alive = true
    ytmHome()
      .then((sections) => alive && setYtm(sections.length ? sections : 'error'))
      .catch(() => alive && setYtm('error'))
    // «Para ti» se recalcula al abrir, al marcar o quitar favoritas y al terminar de escuchar canciones.
    let pending: number | undefined
    const refresh = (rotate: boolean) =>
      computeForYou({ rotate })
        .then((data) => alive && setMine(data))
        .catch(() => {}) // nunca un error en pantalla: si falla, se queda lo anterior
    const later = () => {
      window.clearTimeout(pending)
      pending = window.setTimeout(() => refresh(false), 1500)
    }
    void refresh(true)
    const offLibrary = library.subscribe(later)
    const offListening = listening.subscribe(later)
    return () => {
      alive = false
      window.clearTimeout(pending)
      offLibrary()
      offListening()
    }
  }, [tastes])

  if (!tastes) return <Navigate to="/gustos" replace />

  // Tocar una canción abre «Sonando ahora» y pone su radio (en ese orden: así el video aparece ya en su sitio): 10
  // «Recomendadas basadas en esta canción» y luego «Nuevas para ti». En Inicio lo que tocas reemplaza la cola: nada se
  // agrega a la cola sin que lo pidas (con «⋮» o en Buscar).
  const playSong = (track: Track, name = `Radio de «${track.title}»`) => {
    open()
    player.playRadio(name, track, createRadio(track), { replaceQueue: true })
  }
  const playCatalog = (index: number) => {
    open()
    player.playContext(CATALOG_NAME, catalog, index, { replaceQueue: true })
  }
  // «Tus artistas»: como mucho 1 de cada 5 del mismo artista; el resto, su género.
  const playArtist = (artist: YtmCard, track: Track) => playSong(track, `Radio de ${artist.title}`)

  const inMine = new Set([...(mine?.quickPicks?.tracks ?? []), ...(mine?.shelves.flatMap((shelf) => shelf.tracks) ?? [])].map((track) => track.id))
  const trends = Array.isArray(ytm) && mine ? forYourGenres(ytm, mine, inMine) : null

  return (
    <div className="pb-10">
      <header className="bg-linear-to-b from-acento/30 via-acento/5 to-transparent px-4 pt-6 pb-2 md:px-6">
        {/* En el celular no hay barra lateral: el nombre de la app y Ajustes van arriba de Inicio. */}
        <div className="mb-4 flex items-center justify-between md:hidden">
          <Logo />
          <Link to="/ajustes" aria-label="Ajustes" className="grid size-10 place-items-center rounded-full text-texto-sec hover:text-texto">
            <SettingsIcon className="size-6" aria-hidden="true" />
          </Link>
        </div>
        <h1 className="text-2xl font-bold md:text-3xl">{greeting()}</h1>
        <ul className="mt-5 grid grid-cols-2 gap-2 xl:grid-cols-3">
          <QuickTile to="/coleccion/favoritos/todas" title="Tus me gusta" cover={<FavoritesCover className="size-14 md:size-16" />} />
          <QuickTile
            to="/jam"
            title="Jam: en grupo"
            cover={
              <div className="grid size-14 shrink-0 place-items-center bg-linear-to-br from-acento to-acento-oscuro md:size-16">
                <Users className="size-6 text-white" aria-hidden="true" />
              </div>
            }
          />
          {catalog.slice(5, 9).map((track, i) => (
            <QuickTile
              key={track.id}
              title={track.title}
              cover={<Cover seed={track.id} src={coverUrl(track)} className="size-14 shrink-0 md:size-16" />}
              onPlay={() => playCatalog(5 + i)}
            />
          ))}
        </ul>
      </header>

      {/* «Para ti»: sugerencias propias (no son recomendaciones oficiales de YouTube Music). */}
      {mine === null && <p className="mt-6 px-4 text-sm text-texto-sec md:px-6">Preparando tus sugerencias…</p>}
      {mine && (mine.quickPicks || mine.artists.length > 0 || mine.shelves.length > 0) && (
        <div aria-label="Para ti">
          <Kicker>Para ti · sugerencias</Kicker>
          {mine.quickPicks && <QuickPicksSection picks={mine.quickPicks} onPlay={playSong} />}
          {mine.artists.length > 0 && (
            <Section title="Tus artistas">
              <ArtistTopSongsRow artists={mine.artists} onPlay={playArtist} />
            </Section>
          )}
          {mine.shelves.map((shelf) => (
            <Section key={shelf.key} title={shelf.title}>
              <p className="-mt-2 mb-1 px-4 text-sm text-texto-sec md:px-6">{shelf.note}</p>
              <TrackPages tracks={shelf.tracks} onPlay={(i) => playSong(shelf.tracks[i])} />
            </Section>
          ))}
          {mine.similar.length > 0 && (
            <Section title="Artistas recomendados para ti">
              <CardPages cards={mine.similar} />
            </Section>
          )}
        </div>
      )}

      {ytm === null && <p className="mt-8 px-4 text-sm text-texto-sec md:px-6">Cargando YouTube Music…</p>}
      {trends && trends.length > 0 && (
        <div aria-label="De YouTube Music">
          <Kicker>De YouTube Music · solo de tus géneros</Kicker>
          {trends.map((section) => (
            <Section key={section.title} title={section.title}>
              {section.tracks.length > 0 && <TrackPages tracks={section.tracks} onPlay={(i) => playSong(section.tracks[i])} />}
              {section.cards.length > 0 && <CardPages cards={section.cards} />}
            </Section>
          ))}
        </div>
      )}
      {ytm === 'error' && <p className="mt-8 px-4 text-sm text-texto-sec md:px-6">No se pudo conectar con YouTube Music. Revisa tu conexión y vuelve a abrir Inicio.</p>}
    </div>
  )
}

/**
 * Tendencias y novedades de YouTube Music, solo de tus géneros: canciones y álbumes de artistas que aparecen en las
 * radios de lo que escuchas (o tuyos). Sin covers, sin artistas que sueles saltar, sin las que ya están en «Para ti»,
 * ninguna en dos estantes y 2 por artista como mucho. Las playlists quedan (son por género o por ánimo).
 */
function forYourGenres(sections: YtmSection[], mine: ForYou, inMine: Set<string>): YtmSection[] {
  const genre = new Set(mine.genreArtists)
  const skipped = new Set(mine.skippedArtists)
  const taken = new Set(inMine)
  const ofYourGenres = (artist: string) => {
    const keys = artistKeys(artist)
    // Sin nada tuyo todavía (ni artistas ni historial), no se filtra por género.
    return !keys.some((key) => skipped.has(key)) && (genre.size === 0 || keys.some((key) => genre.has(key)))
  }
  return sections
    .filter((section) => !HIDDEN_SHELVES.test(section.title))
    .map((section) => {
      const tracks = capPerArtist(
        section.tracks.filter((track) => !NOT_ORIGINAL.test(track.title) && ofYourGenres(track.artist)),
        2,
        taken,
      )
      // Álbumes y singles: «Single • Bad Bunny y Jhayco»; artistas: su nombre.
      const cards = section.cards.filter((card) =>
        card.kind === 'album' ? ofYourGenres(card.subtitle.split('•').at(-1) ?? '') : card.kind === 'artist' ? ofYourGenres(card.title) : true,
      )
      return { ...section, tracks: tracks.length >= MIN_TRACKS ? tracks : [], cards }
    })
    .filter((section) => section.tracks.length > 0 || section.cards.length > 0)
}

/** «Selecciones rápidas», con filtros «Todo» / «Como …» (las que salieron de las canciones de ese artista). */
function QuickPicksSection({ picks, onPlay }: { picks: QuickPicks; onPlay: (track: Track) => void }) {
  const [filter, setFilter] = useState<string | null>(null)
  const active = picks.filters.find((f) => f.label === filter)
  const ids = active ? new Set(active.ids) : null
  const tracks = ids ? picks.tracks.filter((track) => ids.has(track.id)) : picks.tracks
  return (
    <Section title="Selecciones rápidas">
      <p className="-mt-2 mb-3 px-4 text-sm text-texto-sec md:px-6">A partir de tus últimas 10 canciones: mismo género y época, sin covers</p>
      {picks.filters.length > 0 && (
        <div role="group" aria-label="Filtrar selecciones rápidas" className="sin-scroll mb-2 flex gap-2 overflow-x-auto px-4 md:px-6">
          {[null, ...picks.filters.map((f) => f.label)].map((label) => (
            <button
              key={label ?? 'todo'}
              type="button"
              aria-pressed={(active?.label ?? null) === label}
              onClick={() => setFilter(label)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                (active?.label ?? null) === label ? 'bg-white text-black' : 'bg-white/10 text-texto hover:bg-white/15'
              }`}
            >
              {label ?? 'Todo'}
            </button>
          ))}
        </div>
      )}
      <TrackPages key={active?.label ?? 'todo'} tracks={tracks} onPlay={(i) => onPlay(tracks[i])} />
    </Section>
  )
}

function Kicker({ children }: { children: ReactNode }) {
  return <p className="mt-8 px-4 text-xs font-semibold tracking-wider text-texto-sec uppercase md:px-6">{children}</p>
}

/** Acceso rápido: abre una lista (`to`) o reproduce una canción (`onPlay`). */
function QuickTile({ title, cover, to, onPlay }: { title: string; cover: ReactNode; to?: string; onPlay?: () => void }) {
  const className =
    'flex h-14 w-full items-center gap-3 overflow-hidden rounded-md bg-tarjeta text-left transition-colors hover:bg-tarjeta-claro md:h-16'
  const content = (
    <>
      {cover}
      <span className="min-w-0 flex-1 truncate pr-2 text-sm font-semibold">{title}</span>
    </>
  )
  return (
    <li>
      {to ? (
        <Link to={to} className={className}>
          {content}
        </Link>
      ) : (
        <button type="button" onClick={onPlay} className={className}>
          {content}
        </button>
      )}
    </li>
  )
}
