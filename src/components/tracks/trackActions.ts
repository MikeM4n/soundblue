// Acciones sobre una canción, compartidas por el menú «⋮» y los gestos de deslizar.
import { createRadio } from '../../data/radio'
import { library } from '../../library/store'
import { player } from '../../player/engine'
import { sheetState } from '../../player/stage'
import type { Track } from '../../player/types'
import { showToast } from '../../ui/toast'

/** Cómo quitar una canción de la lista donde aparece (playlist propia, favoritos o cola). */
export interface RemoveAction {
  listName: string // para el aviso: «Eliminada de …»
  remove: () => () => void // quita y devuelve la función para deshacer
}

/** Al final de «Siguiente en la cola» (deslizar a la izquierda o «Agregar a la cola»). */
export function addToSiguientes(track: Track) {
  const result = player.addToQueue(track)
  showToast(result === 'repetida' ? 'Ya está en siguientes' : result === 'lista' ? 'Lista para sonar: toca ▶ para escucharla' : 'Agregada a siguientes')
}

/** Al principio de la cola: suena justo después de la actual. */
export function playNext(track: Track) {
  const result = player.playNext(track)
  showToast(result === 'lista' ? 'Lista para sonar: toca ▶ para escucharla' : 'Sonará a continuación')
}

export function removeFromQueue(track: Track) {
  const undo = player.removeFromQueue(track.id)
  if (undo) showToast('Quitada de la cola', { label: 'Deshacer', run: undo })
}

export function toggleFavorite(track: Track) {
  const added = library.toggleFavorite(track)
  showToast(added ? 'Agregada a Tus me gusta' : 'Quitada de Tus me gusta')
}

/**
 * «Iniciar radio»: suena la canción y la cola se va llenando de a 5 con el mismo artista y el mismo género y época
 * (ver data/radio.ts). `open` abre «Sonando ahora» (si ya está abierta, no se vuelve a abrir).
 */
export function startRadio(track: Track, open: () => void) {
  if (sheetState.get() !== 'open') open()
  player.playRadio(`Radio de «${track.title}»`, track, createRadio(track))
}

/** Deslizar a la derecha / «Eliminar de…»: quita y ofrece «Deshacer» durante 4 s. */
export function removeWithUndo(action: RemoveAction) {
  const undo = action.remove()
  showToast(`Eliminada de ${action.listName}`, { label: 'Deshacer', run: undo })
}

/** Vibración corta (Android). En iPhone no existe y no pasa nada. */
export function vibrate() {
  try {
    navigator.vibrate?.(15)
  } catch {
    /* sin vibración */
  }
}
