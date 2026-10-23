import { useMemo } from 'react'
import { encode } from 'uqr'

/** Código QR dibujado aquí mismo (SVG), sin servicios externos. Blanco y negro para que cualquier cámara lo lea. */
export function QrCode({ text, label, className = '' }: { text: string; label: string; className?: string }) {
  const { size, path } = useMemo(() => {
    const { data } = encode(text, { ecc: 'M', border: 2 })
    const cells = data.flatMap((row, y) => row.map((dark, x) => (dark ? `M${x} ${y}h1v1h-1z` : '')))
    return { size: data.length, path: cells.join('') }
  }, [text])
  return (
    <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label} shapeRendering="crispEdges" className={className}>
      <rect width={size} height={size} fill="#fff" />
      <path d={path} fill="#000" />
    </svg>
  )
}
