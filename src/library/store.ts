// Tu biblioteca: favoritos («Tus me gusta») y playlists, guardados en este navegador (localStorage).
import { useSyncExternalStore } from 'react'
import { isTrack, newId, type Track } from '../player/types'

export interface Playlist {
  id: string
  name: string
  tracks: Track[]
}

interface LibraryState {
  favorites: Track[]
  playlists: Playlist[]
}

const KEY = 'soundblue:biblioteca'
const listeners = new Set<() => void>()
let state: LibraryState = load()

function load(): LibraryState {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null')
    return {
      favorites: Array.isArray(saved?.favorites) ? saved.favorites.filter(isTrack) : [],
      playlists: Array.isArray(saved?.playlists)
        ? saved.playlists
            .filter((p: Playlist) => p && typeof p.id === 'string' && Array.isArray(p.tracks))
            .map((p: Playlist) => ({ id: p.id, name: String(p.name || 'Mi playlist'), tracks: p.tracks.filter(isTrack) }))
        : [],
    }
  } catch {
    return { favorites: [], playlists: [] }
  }
}

function commit(next: LibraryState) {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* almacenamiento lleno o bloqueado */
  }
  listeners.forEach((listener) => listener())
}

const insertAt = <T,>(list: T[], index: number, item: T) => {
  const copy = [...list]
  copy.splice(Math.min(index, copy.length), 0, item)
  return copy
}

export const library = {
  get: () => state,
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },

  isFavorite: (id: string) => state.favorites.some((t) => t.id === id),

  /** Agrega o quita de favoritos. Devuelve true si quedó en favoritos. */
  toggleFavorite(track: Track): boolean {
    if (library.isFavorite(track.id)) {
      commit({ ...state, favorites: state.favorites.filter((t) => t.id !== track.id) })
      return false
    }
    commit({ ...state, favorites: [track, ...state.favorites] })
    return true
  },

  /** Quita el favorito de esa posición. Devuelve una función para deshacer. */
  removeFavoriteAt(index: number): () => void {
    const removed = state.favorites[index]
    if (!removed) return () => {}
    commit({ ...state, favorites: state.favorites.filter((_, i) => i !== index) })
    return () => {
      if (!library.isFavorite(removed.id)) commit({ ...state, favorites: insertAt(state.favorites, index, removed) })
    }
  },

  playlist: (id: string) => state.playlists.find((p) => p.id === id) ?? null,

  createPlaylist(name: string): Playlist {
    const playlist = { id: newId(), name: name.trim() || 'Mi playlist', tracks: [] }
    commit({ ...state, playlists: [...state.playlists, playlist] })
    return playlist
  },

  /** Devuelve false si la canción ya estaba en esa playlist. */
  addToPlaylist(playlistId: string, track: Track): boolean {
    const playlist = library.playlist(playlistId)
    if (!playlist || playlist.tracks.some((t) => t.id === track.id)) return false
    updatePlaylist(playlistId, (tracks) => [...tracks, track])
    return true
  },

  /** Quita la canción de esa posición de la playlist. Devuelve una función para deshacer. */
  removeFromPlaylistAt(playlistId: string, index: number): () => void {
    const removed = library.playlist(playlistId)?.tracks[index]
    if (!removed) return () => {}
    updatePlaylist(playlistId, (tracks) => tracks.filter((_, i) => i !== index))
    return () => updatePlaylist(playlistId, (tracks) => insertAt(tracks, index, removed))
  },
}

function updatePlaylist(id: string, change: (tracks: Track[]) => Track[]) {
  commit({ ...state, playlists: state.playlists.map((p) => (p.id === id ? { ...p, tracks: change(p.tracks) } : p)) })
}

export function useLibrary() {
  return useSyncExternalStore(library.subscribe, library.get)
}
