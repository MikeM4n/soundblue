// Tema de la app (Ajustes → Tema): «Predeterminado del sistema» (por defecto: sigue el modo claro u oscuro del
// teléfono, también si cambia con la app abierta), «Claro» u «Oscuro» (AMOLED: negro puro). Se pone en <html
// data-tema="claro|oscuro"> y src/index.css cambia la paleta. index.html lo aplica antes de pintar (sin destello).
import { settings, type ThemeChoice } from './settings'

type Theme = 'claro' | 'oscuro'

const PHONE_DARK = window.matchMedia('(prefers-color-scheme: dark)')
const BAR_COLOR: Record<Theme, string> = { claro: '#ffffff', oscuro: '#000000' } // barra del navegador o del sistema

/** El tema que se ve ahora: el elegido o, con «sistema», el del teléfono. */
export function currentTheme(choice: ThemeChoice = settings.get().theme): Theme {
  return choice === 'sistema' ? (PHONE_DARK.matches ? 'oscuro' : 'claro') : choice
}

function apply() {
  const theme = currentTheme()
  document.documentElement.dataset.tema = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BAR_COLOR[theme])
}

/** Al abrir la app: aplica el tema y lo sigue (cambio en Ajustes o en el teléfono). */
export function startTheme() {
  apply()
  settings.subscribe(apply)
  PHONE_DARK.addEventListener('change', apply)
}
