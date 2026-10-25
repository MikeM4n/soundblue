import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Switch } from '../components/ui/Switch'
import { settings, useSettings } from '../lib/settings'

/** Ajustes: lo que se puede personalizar de la app (se guarda en este navegador). */
export function Settings() {
  const { hideViewToggle, dynamicQueue } = useSettings()
  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 pt-6 pb-10">
      <h1 className="text-2xl font-bold md:text-3xl">Ajustes</h1>

      <section aria-labelledby="ajustes-sonando" className="rounded-lg bg-tarjeta p-4">
        <h2 id="ajustes-sonando" className="text-lg font-bold">
          Sonando ahora
        </h2>
        <Switch
          className="mt-3"
          label="Mostrar «Canción | Video»"
          note="Si lo ocultas, siempre se ve la carátula. La música suena igual."
          checked={!hideViewToggle}
          onChange={(on) => settings.set({ hideViewToggle: !on })}
        />
        <Switch
          className="mt-4"
          label="Fila Dinámica"
          note="La cola nunca baja de 10: si quitas una o se acaba la lista, entran canciones de «Recomendadas». También se cambia en «Próximas en sonar»."
          checked={dynamicQueue}
          onChange={(on) => settings.set({ dynamicQueue: on })}
        />
      </section>

      <section aria-labelledby="ajustes-mas" className="rounded-lg bg-tarjeta p-4">
        <h2 id="ajustes-mas" className="text-lg font-bold">
          Más
        </h2>
        <ul className="mt-2">
          <LinkRow to="/gustos">Cambiar tus artistas</LinkRow>
          <LinkRow to="/ayuda">Ayuda: escuchar con Brave y diagnóstico</LinkRow>
        </ul>
        {/* Para saber si el teléfono ya tiene la última versión publicada. */}
        <p className="mt-3 text-sm text-texto-sec">
          Versión: <span className="font-semibold text-texto">{__APP_VERSION__}</span>
        </p>
      </section>
    </div>
  )
}

function LinkRow({ to, children }: { to: string; children: ReactNode }) {
  return (
    <li>
      <Link to={to} className="flex items-center justify-between py-2 font-semibold hover:underline">
        {children}
        <ChevronRight className="size-5 text-texto-sec" aria-hidden="true" />
      </Link>
    </li>
  )
}
