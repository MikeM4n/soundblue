// Genera los íconos de SoundBlue (PWA y favicon) a partir del trazo del logo.
// Uso: npm run iconos   (escribe en public/)
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { LOGO_PATH } from '../src/components/brand/logo-path.ts'

const AZUL_REY = '#4169E1'
const publicDir = new URL('../public/', import.meta.url)
const iconsDir = new URL('icons/', publicDir)
mkdirSync(iconsDir, { recursive: true })

const ondasDeSonido = (transform = '') =>
  `<path d="${LOGO_PATH}" transform="${transform}" fill="none" stroke="#fff" stroke-width="2.75" stroke-linecap="round"/>`

const circulo = `<circle cx="16" cy="16" r="16" fill="${AZUL_REY}"/>`
const cuadradoLleno = `<rect width="32" height="32" fill="${AZUL_REY}"/>`

// 'circulo': favicon e íconos normales (el logo tal cual).
// 'lleno': maskable y Apple; el sistema recorta la forma, así que el azul llena todo y las ondas se
// achican para quedar dentro de la zona segura (80 % central).
function iconSvg(forma: 'circulo' | 'lleno'): string {
  const contenido =
    forma === 'circulo'
      ? circulo + ondasDeSonido()
      : cuadradoLleno + ondasDeSonido('translate(16 16) scale(0.8) translate(-16 -16)')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${contenido}</svg>`
}

writeFileSync(new URL('favicon.svg', publicDir), iconSvg('circulo') + '\n')
console.log('✓ public/favicon.svg')

const iconos = [
  { archivo: 'icon-192.png', tamano: 192, forma: 'circulo' },
  { archivo: 'icon-512.png', tamano: 512, forma: 'circulo' },
  { archivo: 'icon-maskable-512.png', tamano: 512, forma: 'lleno' },
  { archivo: 'apple-touch-icon.png', tamano: 180, forma: 'lleno' },
] as const

for (const { archivo, tamano, forma } of iconos) {
  await sharp(Buffer.from(iconSvg(forma)), { density: (72 * tamano) / 32 })
    .resize(tamano, tamano)
    .png()
    .toFile(fileURLToPath(new URL(archivo, iconsDir)))
  console.log(`✓ public/icons/${archivo}`)
}
