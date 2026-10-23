// Avisos cortos (como los de Spotify): uno a la vez, con botón opcional como «Deshacer».

export interface ToastAction {
  label: string
  run: () => void
}

export interface Toast {
  id: number
  message: string
  action?: ToastAction
}

let current: Toast | null = null
let timer: number | undefined
let nextId = 1
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((listener) => listener())

/** Muestra un aviso. Con acción dura 4 s (tiempo para «Deshacer»); sin acción, 2,5 s; o lo que indique `durationMs`. */
export function showToast(message: string, action?: ToastAction, durationMs?: number) {
  window.clearTimeout(timer)
  current = { id: nextId++, message, action }
  emit()
  timer = window.setTimeout(dismissToast, durationMs ?? (action ? 4000 : 2500))
}

export function dismissToast() {
  window.clearTimeout(timer)
  current = null
  emit()
}

export const toastStore = {
  get: () => current,
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}
