import './lib/storageMigration' // primero: pasa los datos guardados de «bluemusic:» a «soundblue:»
import '@fontsource-variable/inter/index.css' // fuente incluida en el proyecto, sin CDN
import './index.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Rutas con # para que funcione en GitHub Pages sin configurar el servidor. */}
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)

// El service worker solo se registra en la versión compilada, para no guardar copias mientras desarrollas.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((error) => {
      console.warn('No se pudo registrar el service worker', error)
    })
  })
}
