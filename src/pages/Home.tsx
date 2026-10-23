import { Users } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link, Navigate } from 'react-router'
import { Logo } from '../components/brand/Logo'
import { TrackList } from '../components/tracks/TrackList'
import { Cover } from '../components/ui/Cover'
import { FavoritesCover } from '../components/ui/LibraryItem'
import { MediaCard } from '../components/ui/MediaCard'
import { PlayButton } from '../components/ui/PlayButton'
import { CardRow, Section } from '../components/ui/Section'
import { YtmCardRow, YtmShelf } from '../components/ui/YtmShelf'
import { catalog, TEST_LIST_NAME, testList } from '../data/catalog'
import { computeForYou, type ForYou } from '../data/forYou'
import { listening } from '../data/history'
import { readTastes } from '../data/tastes'
import { ytmHome, type YtmSection } from '../data/ytmusic'
import { library } from '../library/store'
import { greeting } from '../lib/format'
import { player } from '../player/engine'
import { coverSources, coverUrl, type Track } from '../player/types'
import { useNowPlaying } from '../player/useNowPlaying'

const CATALOG_NAME = 'Catálogo de prueba'

/**
 * Inicio: saludo, accesos rápidos, «Para ti» (sugerencias según tus artistas, favoritas e historial; ver
 * data/forYou.ts) y los estantes de YouTube Music (selecciones rápidas, playlists, lanzamientos…). Si YouTube
 * Music no responde, un aviso discreto y la lista de prueba. La primera vez lleva a «¿Qué artistas te gustan?».
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
  const ytmFailed = ytm === 'error'

  if (!tastes) return <Navigate to="/gustos" replace />

  // Tocar una canción abre «Sonando ahora» y la reproduce (en ese orden: así el video aparece ya en su sitio).
  const play = (name: string, tracks: readonly Track[], index = 0) => {
    open()
    player.playContext(name, tracks, index)
  }

  return (
    <div className="pb-10">
      <header className="bg-linear-to-b from-acento/30 via-acento/5 to-transparent px-4 pt-6 pb-2 md:px-6">
        {/* En el celular no hay barra lateral: el nombre de la app va arriba de Inicio. */}
        <div className="mb-4 md:hidden">
          <Logo />
        </div>
        <h1 className="text-2xl font-bold md:text-3xl">{greeting()}</h1>
        <ul className="mt-5 grid grid-cols-2 gap-2 xl:grid-cols-3">
          <QuickTile to="/coleccion/prueba/lista" title={TEST_LIST_NAME} cover={<Cover seed="lista-de-prueba" className="size-14 shrink-0 md:size-16" />} />
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
          {catalog.slice(5, 8).map((track, i) => (
            <QuickTile
              key={track.id}
              title={track.title}
              cover={<Cover seed={track.id} src={coverUrl(track)} className="size-14 shrink-0 md:size-16" />}
              onPlay={() => play(CATALOG_NAME, catalog, 5 + i)}
            />
          ))}
        </ul>
      </header>

      {/* «Para ti»: sugerencias propias (no son recomendaciones oficiales de YouTube Music). */}
      {mine === null && tastes.artists.length > 0 && <p className="mt-6 px-4 text-sm text-texto-sec md:px-6">Preparando tus sugerencias…</p>}
      {mine && (mine.artists.length > 0 || mine.shelves.length > 0) && (
        <div aria-label="Para ti">
          <p className="mt-8 px-4 text-xs font-semibold tracking-wider text-texto-sec uppercase md:px-6">Para ti · sugerencias</p>
          {mine.artists.length > 0 && (
            <Section title="Tus artistas">
              <YtmCardRow cards={mine.artists} />
            </Section>
          )}
          {mine.shelves.map((shelf) => (
            <Section key={shelf.key} title={shelf.title}>
              <p className="-mt-2 mb-3 px-4 text-sm text-texto-sec md:px-6">{shelf.note}</p>
              <CardRow>
                {shelf.tracks.map((track, i) => (
                  <MediaCard
                    key={track.id}
                    title={track.title}
                    subtitle={track.artist}
                    seed={track.id}
                    image={coverSources(track, 'large')}
                    onPlay={() => play(shelf.title, shelf.tracks, i)}
                  />
                ))}
              </CardRow>
            </Section>
          ))}
          {mine.similar.length > 0 && (
            <Section title="Artistas recomendados para ti">
              <YtmCardRow cards={mine.similar} />
            </Section>
          )}
        </div>
      )}

      {ytm === null && <p className="mt-8 px-4 text-sm text-texto-sec md:px-6">Cargando YouTube Music…</p>}
      {Array.isArray(ytm) && ytm.map((section) => <YtmShelf key={section.title} section={section} onPlay={(tracks, i) => play(section.title, tracks, i)} />)}

      {ytmFailed && (
        <Section title={TEST_LIST_NAME}>
          <div className="mb-3 flex items-center gap-4 px-4 md:px-6">
            <PlayButton label={`Reproducir ${TEST_LIST_NAME}`} onClick={() => play(TEST_LIST_NAME, testList)} />
            <p className="text-sm text-texto-sec">No se pudo conectar con YouTube Music; mientras tanto, canciones de prueba.</p>
          </div>
          <TrackList tracks={testList} onPlay={(i) => play(TEST_LIST_NAME, testList, i)} />
        </Section>
      )}

      {ytmFailed && (
        <Section title="Más para probar">
          <CardRow>
            {catalog.slice(5).map((track, i) => (
              <MediaCard
                key={track.id}
                title={track.title}
                subtitle={track.artist}
                seed={track.id}
                image={coverSources(track, 'large')}
                onPlay={() => play(CATALOG_NAME, catalog, 5 + i)}
              />
            ))}
          </CardRow>
        </Section>
      )}
    </div>
  )
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
