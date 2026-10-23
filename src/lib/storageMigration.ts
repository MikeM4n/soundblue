// La app se llamaba «Blue Music» y guardaba todo con el prefijo «bluemusic:». Al arrancar, antes que cualquier
// otro módulo lea sus datos, se pasan a «soundblue:» para no perder favoritos, playlists, historial ni ajustes.
// Si ya existe la clave nueva, gana la nueva. Va importado de primero en main.tsx.
const OLD_PREFIX = 'bluemusic:'
const NEW_PREFIX = 'soundblue:'

export function migrateStorage() {
  try {
    const oldKeys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(OLD_PREFIX)) oldKeys.push(key)
    }
    for (const oldKey of oldKeys) {
      const newKey = NEW_PREFIX + oldKey.slice(OLD_PREFIX.length)
      const value = localStorage.getItem(oldKey)
      if (value !== null && localStorage.getItem(newKey) === null) localStorage.setItem(newKey, value)
      localStorage.removeItem(oldKey)
    }
  } catch {
    /* sin almacenamiento (modo privado estricto): no hay nada que pasar */
  }
}

migrateStorage()
