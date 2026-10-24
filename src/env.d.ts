/** Commit y hora de compilación (vite.config.ts), para el registro de diagnóstico. */
declare const __APP_VERSION__: string

interface ImportMetaEnv {
  /** Clave de la YouTube Data API v3 (en .env y como secreto de GitHub). Sin ella, Buscar usa el catálogo de prueba. */
  readonly VITE_YT_API_KEY?: string
  /** Intermediario para YouTube Music (InnerTube) en la versión publicada. Al probar se usa /ytm-api de Vite. */
  readonly VITE_YTM_PROXY?: string
  /** API de las Jams en la versión publicada. Al probar se usa /jam-api del servidor de Vite. */
  readonly VITE_JAM_API?: string
  /** 'true' en la versión de prueba (repositorio soundblue-preview): muestra la marca «PREVIEW». */
  readonly VITE_PREVIEW?: string
}
