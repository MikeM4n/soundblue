import type { ReactNode } from 'react'

interface SectionProps {
  title: string
  children: ReactNode
}

/** Sección de una página con su título. */
export function Section({ title, children }: SectionProps) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 px-4 text-xl font-bold md:px-6 md:text-2xl">{title}</h2>
      {children}
    </section>
  )
}

/** Fila horizontal desplazable de tarjetas. */
export function CardRow({ children }: { children: ReactNode }) {
  return <div className="sin-scroll flex gap-3 overflow-x-auto px-4 pb-2 md:px-6">{children}</div>
}
