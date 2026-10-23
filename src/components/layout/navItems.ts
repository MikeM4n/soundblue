import { House, Library, Search } from 'lucide-react'

// Secciones principales. La barra lateral muestra Inicio y Buscar arriba y la biblioteca en su propio panel;
// en el celular las tres van en la barra inferior.
export const mainNav = [
  { to: '/', label: 'Inicio', icon: House, end: true },
  { to: '/buscar', label: 'Buscar', icon: Search, end: false },
]

export const libraryNav = { to: '/biblioteca', label: 'Tu biblioteca', icon: Library, end: false }
