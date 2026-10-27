import type { GenreKey } from './genreIndex'

self.onmessage = (event: MessageEvent<Record<string, Partial<Record<GenreKey, number>>>>) => {
  const result: Record<string, GenreKey[]> = {}
  for (const [artist, genres] of Object.entries(event.data)) {
    const values = Object.entries(genres) as [GenreKey, number][]
    const top = Math.max(0, ...values.map(([, count]) => count))
    result[artist] = values.filter(([, count]) => count >= top * 0.5).map(([genre]) => genre)
  }
  self.postMessage(result)
}
