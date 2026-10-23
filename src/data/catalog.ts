import type { Track } from '../player/types'

// Catálogo de prueba, para cuando no hay clave de YouTube (con clave, Buscar trae todo YouTube Music).
// Son pistas de YouTube Music (canales «Artista - Topic»: su imagen es la portada del álbum) y cada una se
// comprobó SONANDO dentro del reproductor incrustado (youtube-nocookie.com) el 2026-10-22.
// El álbum solo se pone cuando se confirmó.
export const catalog: Track[] = [
  { id: '-llx6IKlX8E', title: 'DÁKITI', artist: 'Bad Bunny, Jhay Cortez', album: 'EL ÚLTIMO TOUR DEL MUNDO', duration: 206, ytMusic: true },
  { id: 'd0eUMnJ5kTA', title: 'Faded', artist: 'Alan Walker', duration: 213, ytMusic: true },
  { id: '9qnqYL0eNNI', title: 'Yellow', artist: 'Coldplay', album: 'Parachutes', duration: 267, ytMusic: true },
  { id: 'xTvyyoF_LZY', title: 'Shape of You', artist: 'Ed Sheeran', duration: 234, ytMusic: true },
  { id: 'CStMZ5CXpIw', title: 'Gasolina', artist: 'Daddy Yankee', duration: 193, ytMusic: true },
  { id: 'hywYx5UxqaA', title: 'Bohemian Rhapsody', artist: 'Queen', album: 'A Night At The Opera', duration: 354, ytMusic: true },
  { id: 'dxp9w9Ggehc', title: 'Numb', artist: 'Linkin Park', album: 'Meteora 20th Anniversary Edition', duration: 188, ytMusic: true },
  { id: '2PW9Ld34ON4', title: 'Deltics', artist: 'Chris Rea', duration: 327, ytMusic: true },
  { id: 'QKrNZmyNCQg', title: 'Kinjito', artist: '[Alexandros]', duration: 262, ytMusic: true },
  { id: 'SpGVPWnX8Ic', title: "It's Expected I'm Gone", artist: 'Minutemen', duration: 125, ytMusic: true },
  { id: 'My32cFkNnm8', title: 'Pulling Teeth', artist: 'Curbside', duration: 177, ytMusic: true },
  { id: 'VqctkxPovLk', title: 'Amerikkka', artist: "Luke Carlos O'Reilly", duration: 384, ytMusic: true },
]

export const TEST_LIST_NAME = 'Lista de prueba'
export const testList = catalog.slice(0, 5)

/** Búsqueda local en el catálogo (sin tildes ni mayúsculas). */
export function searchCatalog(query: string): Track[] {
  const q = normalize(query)
  if (!q) return []
  return catalog.filter((t) => normalize(`${t.title} ${t.artist} ${t.album ?? ''}`).includes(q))
}

function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}
