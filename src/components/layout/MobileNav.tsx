import { useLayoutEffect, useRef } from 'react'
import { NavLink } from 'react-router'
import { libraryNav, mainNav } from './navItems'

/**
 * Barra inferior del celular con las tres secciones. Se ve siempre, también con «Sonando ahora» abierta: esa
 * pantalla termina justo encima (usa --nav-h, el alto de esta barra). Desde ahí, tocar una sección navega sin
 * detener la música.
 */
export function MobileNav() {
  const ref = useRef<HTMLElement>(null)

  // Publica su alto (con la zona segura del teléfono) para que «Sonando ahora» no la tape. En el PC está oculta: 0.
  useLayoutEffect(() => {
    const nav = ref.current
    if (!nav) return
    const update = () => document.documentElement.style.setProperty('--nav-h', `${nav.offsetHeight}px`)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(nav)
    return () => {
      observer.disconnect()
      document.documentElement.style.removeProperty('--nav-h')
    }
  }, [])

  return (
    <nav
      ref={ref}
      aria-label="Principal"
      className="relative z-40 grid shrink-0 grid-cols-3 border-t border-contraste/5 bg-fondo pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {[...mainNav, libraryNav].map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={(event) => {
            const active = (event.currentTarget as HTMLAnchorElement).getAttribute('aria-current') === 'page'
            if (active) { event.preventDefault(); document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' }); window.scrollTo({ top: 0, behavior: 'smooth' }) }
          }}
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 pt-2 pb-1.5 text-[11px] font-medium ${isActive ? 'text-texto' : 'text-texto-sec'}`
          }
        >
          <Icon className="size-6" aria-hidden="true" />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
