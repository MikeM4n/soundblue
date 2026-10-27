import { useSyncExternalStore } from 'react'
import type { GenreKey } from './genreIndex'

const KEY = 'soundblue:generos-favoritos'
const VALID_KEYS = new Set<GenreKey>(['reggaeton', 'dancehall', 'trap', 'salsa', 'merengue', 'bachata', 'vallenato', 'cumbia', 'popular', 'regional', 'pop', 'baladas', 'boleros', 'electronica', 'rock', 'kpop', 'jpop', 'cpop', 'colombiana'])
const listeners = new Set<() => void>()
const isGenreKey = (key: unknown): key is GenreKey => typeof key === 'string' && VALID_KEYS.has(key as GenreKey)
function read(): GenreKey[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(value) ? value.filter(isGenreKey) : []
  } catch { return [] }
}
let current = read()
export const favoriteGenres = {
  get: () => current,
  set(value: readonly GenreKey[]) {
    current = [...new Set(value.filter(isGenreKey))]
    try { localStorage.setItem(KEY, JSON.stringify(current)); localStorage.removeItem('soundblue:generos-rapidos') } catch { /* almacenamiento opcional */ }
    listeners.forEach((listener) => listener())
  },
  subscribe(listener: () => void) { listeners.add(listener); return () => listeners.delete(listener) },
}
export const useFavoriteGenres = () => useSyncExternalStore(favoriteGenres.subscribe, favoriteGenres.get)
