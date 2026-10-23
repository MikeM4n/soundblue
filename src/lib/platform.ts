// Detección del navegador y del sistema, para el aviso de Brave.

declare global {
  interface Navigator {
    brave?: { isBrave: () => Promise<boolean> } // solo existe en Brave
  }
}

export type Platform = 'android' | 'ios' | 'pc'

export function detectPlatform(): Platform {
  const ua = navigator.userAgent
  if (/Android/i.test(ua)) return 'android'
  // El iPad moderno se presenta como Mac, pero tiene pantalla táctil.
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) return 'ios'
  return 'pc'
}

export async function isBraveBrowser(): Promise<boolean> {
  try {
    return (await navigator.brave?.isBrave()) === true
  } catch {
    return false
  }
}

/**
 * ¿La app se abrió desde una dirección de la red local (http://192.168…, 10.…, 172.16–31.…)? Así se prueba con
 * `npm run dev:red`, pero YouTube bloquea ahí casi toda la música de sellos (error 150): hace falta https.
 */
export function isLocalNetworkAddress(): boolean {
  return /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(window.location.hostname)
}

/** ¿Dirección que solo funciona en este PC o en esta red (localhost, 192.168…)? Tus amigos no podrían entrar. */
export function isPrivateAddress(): boolean {
  return isLocalNetworkAddress() || /^(localhost|127\.|\[::1\])/.test(window.location.hostname)
}

export const BRAVE_LINKS = {
  playStore: 'https://play.google.com/store/apps/details?id=com.brave.browser',
  appStore: 'https://apps.apple.com/app/brave-private-web-browser/id1052879175',
  pc: 'https://brave.com/download/',
}

/**
 * Enlace de Android que abre esta misma página en Brave. Si Brave no está instalado,
 * Android lleva a la Play Store (browser_fallback_url).
 */
export function braveIntentUrl(): string {
  const { host, pathname, search, protocol } = window.location
  const scheme = protocol.replace(':', '') // https al publicar; http al probar en la red local
  return `intent://${host}${pathname}${search}#Intent;scheme=${scheme};package=com.brave.browser;S.browser_fallback_url=${encodeURIComponent(BRAVE_LINKS.playStore)};end`
}
