import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { sheetState } from './stage'

/**
 * Abre «Sonando ahora» en pantalla completa. Es la ruta /reproduciendo dibujada ENCIMA de la página
 * donde estabas (que queda debajo), así el botón «atrás» del celular la minimiza.
 * Llámalo ANTES de reproducir: así una canción de YouTube ya puede sonar (su video se va a ver).
 */
export function useNowPlaying() {
  const navigate = useNavigate()
  const location = useLocation()
  const open = useCallback(() => {
    if (location.pathname === '/reproduciendo') return
    sheetState.set('open')
    navigate('/reproduciendo', { state: { background: location } })
  }, [navigate, location])
  return { open }
}
