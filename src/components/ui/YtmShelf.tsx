import type { YtmCard, YtmSection } from '../../data/ytmusic'
import type { Track } from '../../player/types'
import { TrackList } from '../tracks/TrackList'
import { MediaCard } from './MediaCard'
import { CardRow, Section } from './Section'

/** Fila de tarjetas de YouTube Music: cada una abre su página (playlist, álbum o artista). */
export function YtmCardRow({ cards }: { cards: readonly YtmCard[] }) {
  return (
    <CardRow>
      {cards.map((card) => (
        <MediaCard
          key={card.id}
          title={card.title}
          subtitle={card.subtitle}
          seed={card.id}
          image={card.image}
          to={`/ytm/${encodeURIComponent(card.id)}`}
          round={card.kind === 'artist'}
        />
      ))}
    </CardRow>
  )
}

/** Estante de YouTube Music: sus canciones en lista y sus tarjetas en fila. `plain`: solo ▶ (Inicio; ver TrackRow). */
export function YtmShelf({
  section,
  onPlay,
  maxTracks = 10,
  plain = false,
}: {
  section: YtmSection
  onPlay: (tracks: Track[], index: number) => void
  maxTracks?: number
  plain?: boolean
}) {
  const tracks = section.tracks.slice(0, maxTracks)
  return (
    <Section title={section.title}>
      {tracks.length > 0 && <TrackList tracks={tracks} numbered={false} plain={plain} onPlay={(i) => onPlay(section.tracks, i)} />}
      {section.cards.length > 0 && <YtmCardRow cards={section.cards} />}
    </Section>
  )
}
