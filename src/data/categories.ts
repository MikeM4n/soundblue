// Categorías de «Explorar todo» en Buscar. En la fase 4, tocar una buscará esa música en YouTube.
export interface Category {
  id: string
  name: string
  color: string
}

export const categories: Category[] = [
  { id: 'pop', name: 'Pop', color: '#2563EB' },
  { id: 'latino', name: 'Latino', color: '#DC5A2A' },
  { id: 'reggaeton', name: 'Reggaetón', color: '#7C3AED' },
  { id: 'salsa', name: 'Salsa', color: '#DB2777' },
  { id: 'rock', name: 'Rock', color: '#B91C1C' },
  { id: 'hiphop', name: 'Hip-Hop', color: '#B45309' },
  { id: 'electronica', name: 'Electrónica', color: '#0891B2' },
  { id: 'lofi', name: 'Lo-Fi', color: '#4F46E5' },
  { id: 'vallenato', name: 'Vallenato', color: '#15803D' },
  { id: 'clasica', name: 'Clásica', color: '#475569' },
  { id: 'jazz', name: 'Jazz', color: '#0F766E' },
  { id: 'acustico', name: 'Acústico', color: '#A16207' },
]
