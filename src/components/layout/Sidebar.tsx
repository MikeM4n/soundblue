import { Plus, Settings as SettingsIcon, Users } from 'lucide-react'
import { Link, NavLink } from 'react-router'
import { Logo } from '../brand/Logo'
import { LibraryList, useCreatePlaylist } from '../library/LibraryList'
import { IconButton } from '../ui/IconButton'
import { libraryNav, mainNav } from './navItems'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-4 rounded-md px-2 py-2 font-semibold transition-colors ${
    isActive ? 'text-texto' : 'text-texto-sec hover:text-texto'
  }`

/** Barra lateral de escritorio: logo, navegación y el panel de «Tu biblioteca». */
export function Sidebar() {
  const LibraryIcon = libraryNav.icon
  const createPlaylist = useCreatePlaylist()
  return (
    <aside className="hidden w-72 shrink-0 flex-col gap-2 lg:flex xl:w-80">
      <nav aria-label="Principal" className="rounded-lg bg-panel p-4">
        <Link to="/" aria-label="SoundBlue, ir al inicio" className="mb-5 inline-flex rounded-md px-2">
          <Logo />
        </Link>
        <ul className="space-y-1">
          {mainNav.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink to={to} end={end} className={linkClass}>
                <Icon className="size-6" aria-hidden="true" />
                {label}
              </NavLink>
            </li>
          ))}
          <li>
            <NavLink to="/jam" className={linkClass}>
              <Users className="size-6" aria-hidden="true" />
              Jam
            </NavLink>
          </li>
          <li>
            <NavLink to="/ajustes" className={linkClass}>
              <SettingsIcon className="size-6" aria-hidden="true" />
              Ajustes
            </NavLink>
          </li>
        </ul>
      </nav>

      <section aria-label="Tu biblioteca" className="flex min-h-0 flex-1 flex-col rounded-lg bg-panel">
        <header className="flex items-center justify-between px-4 pt-3 pb-2">
          <NavLink to={libraryNav.to} className={linkClass}>
            <LibraryIcon className="size-6" aria-hidden="true" />
            {libraryNav.label}
          </NavLink>
          <IconButton label="Crear playlist" onClick={createPlaylist.open}>
            <Plus className="size-5" />
          </IconButton>
        </header>
        <div className="scroll-fino min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          <LibraryList />
        </div>
      </section>
      {createPlaylist.dialog}
    </aside>
  )
}
