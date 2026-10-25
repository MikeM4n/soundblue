import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { settings, useSettings } from '../lib/settings'

/** Ajustes: lo que se puede personalizar de la app (se guarda en este navegador). */
export function Settings() {
  const { hideViewToggle } = useSettings()
  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 pt-6 pb-10">
      <h1 className="text-2xl font-bold md:text-3xl">Ajustes</h1>

      <section aria-labelledby="ajustes-sonando" className="rounded-lg bg-tarjeta p-4">
        <h2 id="ajustes-sonando" className="text-lg font-bold">
          Sonando ahora
        </h2>
        <Switch
          label="Mostrar «Canción | Video»"
          note="Si lo ocultas, siempre se ve la carátula. La música suena igual."
          checked={!hideViewToggle}
          onChange={(on) => settings.set({ hideViewToggle: !on })}
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

function Switch({ label, note, checked, onChange }: { label: string; note: string; checked: boolean; onChange: (on: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="mt-3 flex w-full items-center gap-4 text-left">
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{label}</span>
        <span className="block text-sm text-texto-sec">{note}</span>
      </span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-acento' : 'bg-white/20'}`} aria-hidden="true">
        <span className={`absolute top-0.5 size-5 rounded-full bg-white transition-all ${checked ? 'left-5.5' : 'left-0.5'}`} />
      </span>
    </button>
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
