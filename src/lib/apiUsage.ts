// Cuánto se le pidió hoy a YouTube, para el diagnóstico de Ayuda: consultas a YouTube Music (API interna, sin cuota) y
// unidades de la YouTube Data API v3 (cuota de 10 000 al día por clave: buscar = 100, detalles = 1).
// Se guarda solo en este navegador y vuelve a cero cada día.
const KEY = 'soundblue:uso-api'

export interface Usage {
  day: string // AAAA-MM-DD, hora local
  ytm: number // consultas a YouTube Music
  dataApi: number // unidades de la Data API
}

const today = () => new Date().toLocaleDateString('en-CA')

export function readUsage(): Usage {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (saved?.day === today()) return { day: saved.day, ytm: Number(saved.ytm) || 0, dataApi: Number(saved.dataApi) || 0 }
  } catch {
    /* dañado o sin almacenamiento: se empieza de cero */
  }
  return { day: today(), ytm: 0, dataApi: 0 }
}

function add(field: 'ytm' | 'dataApi', amount: number) {
  const usage = readUsage()
  usage[field] += amount
  try {
    localStorage.setItem(KEY, JSON.stringify(usage))
  } catch {
    /* sin almacenamiento: el conteo no se guarda */
  }
}

export const countYtmRequest = () => add('ytm', 1)
export const countDataApiUnits = (units: number) => add('dataApi', units)
