import { useSyncExternalStore } from 'react'
import { INDEX_GENRES } from './genres'
import { isGenreKey, type GenreKey } from './genreIndex'

const KEY = 'soundblue:generos-favoritos'
const listeners = new Set<() => void>()
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
export const ALL_GENRES = Object.entries(INDEX_GENRES).map(([key, source]) => ({ key: key as GenreKey, label: source.label }))
