import { useEffect } from 'react'
import { Route, Routes, useLocation, type Location } from 'react-router'
import { hostJam } from './jam/hostJam'
import { startDiagnostics } from './lib/diagnostics'
import { startUpdateChecks } from './lib/updates'
import { AppLayout } from './components/layout/AppLayout'
import { NowPlayingSheet } from './components/player/NowPlayingSheet'
import { usePlayerShortcuts } from './player/usePlayerShortcuts'
import { useResumePrompt } from './player/useResumePrompt'
import { Collection } from './pages/Collection'
import { Help } from './pages/Help'
import { Settings } from './pages/Settings'
import { Home } from './pages/Home'
import { Library } from './pages/Library'
import { Queue } from './pages/Queue'
import { JamGuest } from './pages/JamGuest'
import { JamHost } from './pages/JamHost'
import { Search } from './pages/Search'
import { Tastes } from './pages/Tastes'
import { YtmPage } from './pages/YtmPage'

export default function App() {
  const location = useLocation()
  usePlayerShortcuts()
  useResumePrompt() // «▶ Reanudar» al volver, si YouTube pausó la música al salir
  useEffect(() => {
    startDiagnostics() // registro de segundo plano (Ayuda → Diagnóstico)
    if (import.meta.env.PROD) startUpdateChecks() // si hay una versión más nueva publicada, se actualiza
    hostJam.resume() // si cerraste la app con una Jam abierta, sigue recibiendo canciones
  }, [])
  // «Sonando ahora» (/reproduciendo) se abre ENCIMA de la página donde estabas: esa sigue dibujada debajo.
  const background = (location.state as { background?: Location } | null)?.background
  const pageLocation = location.pathname === '/reproduciendo' ? (background ?? { ...location, pathname: '/' }) : location

  return (
    <>
      <Routes location={pageLocation}>
        <Route element={<AppLayout />}>
          <Route index element={<Home />} />
          <Route path="buscar" element={<Search />} />
          <Route path="biblioteca" element={<Library />} />
          <Route path="coleccion/:tipo/:id" element={<Collection />} />
          <Route path="cola" element={<Queue />} />
          <Route path="ayuda" element={<Help />} />
          <Route path="ajustes" element={<Settings />} />
          <Route path="ytm/:browseId" element={<YtmPage />} />
          <Route path="gustos" element={<Tastes />} />
          <Route path="jam" element={<JamHost />} />
          <Route path="jam/:code" element={<JamGuest />} />
          <Route path="*" element={<Home />} />
        </Route>
      </Routes>
      {location.pathname === '/reproduciendo' && <NowPlayingSheet />}
    </>
  )
}
