import type { ReactNode } from 'react'

interface SectionProps {
  title: string
  action?: ReactNode // al lado del título (p. ej. «+» de «Selecciones rápidas»)
  children: ReactNode
}

/** Sección de una página con su título. */
export function Section({ title, action, children }: SectionProps) {
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center gap-2 px-4 md:px-6">
        <h2 className="text-xl font-bold md:text-2xl">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

/** Fila horizontal desplazable de tarjetas. */
export function CardRow({ children }: { children: ReactNode }) {
  return <div className="sin-scroll flex gap-3 overflow-x-auto px-4 pb-2 md:px-6">{children}</div>
}
