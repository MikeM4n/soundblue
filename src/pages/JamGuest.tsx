import { Check, LoaderCircle, Plus, Search as SearchIcon, Users } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { JamTrackRow } from '../components/jam/JamTrackRow'
import { ytmSearch } from '../data/ytmusic'
import { jamApi, JamError, normalizeCode, readName, saveName, type JamState } from '../jam/api'
import type { Track } from '../player/types'
import { showToast } from '../ui/toast'

const POLL_MS = 4000
const inputClass =
  'h-12 w-full rounded-full bg-tarjeta px-5 text-texto ring-1 ring-white/10 outline-none placeholder:text-texto-sec focus:ring-2 focus:ring-acento'

/**
 * Invitado de una Jam (llega escaneando el código QR o escribiendo el código): ve qué suena en el teléfono del
 * anfitrión y lo que viene, y busca canciones de YouTube Music para agregarlas a su cola. Aquí no suena nada.
 */
export function JamGuest() {
  const { code: rawCode = '' } = useParams()
  const code = normalizeCode(rawCode)
  const navigate = useNavigate()
  const [jam, setJam] = useState<JamState | null>(null)
  const [missing, setMissing] = useState(false)
  const [name, setName] = useState(readName)
  const [draft, setDraft] = useState(readName)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ query: string; songs: Track[] } | null>(null)
  const [adding, setAdding] = useState<string | null>(null)
  const [added, setAdded] = useState<ReadonlySet<string>>(new Set())
  const [otherCode, setOtherCode] = useState('')

  // Lo que suena y lo que viene, al día cada 4 s.
  useEffect(() => {
    let alive = true
    const load = () =>
      jamApi
        .get(code)
        .then((state) => {
          if (!alive) return
          setJam(state)
          setMissing(false)
        })
        .catch((error) => alive && error instanceof JamError && error.status === 404 && setMissing(true))
    void load()
    const timer = window.setInterval(load, POLL_MS)
    return () => {
      alive = false
      window.clearInterval(timer)
    }
  }, [code])

  // Buscar en YouTube Music (espera a que dejes de escribir).
  useEffect(() => {
    const q = query.trim()
    if (!q) return
    let alive = true
    const timer = window.setTimeout(() => {
      ytmSearch(q)
        .then((found) => alive && setResults({ query: q, songs: found.songs.slice(0, 15) }))
        .catch(() => alive && setResults({ query: q, songs: [] }))
    }, 450)
    return () => {
      alive = false
      window.clearTimeout(timer)
    }
  }, [query])

  const add = async (track: Track) => {
    setAdding(track.id)
    try {
      await jamApi.add(code, track, name)
      setAdded((prev) => new Set(prev).add(track.id))
      showToast(`Agregada a la Jam: «${track.title}»`)
      setJam(await jamApi.get(code))
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No se pudo agregar.')
    } finally {
      setAdding(null)
    }
  }

  if (missing) {
    const tryOther = (e: FormEvent) => {
      e.preventDefault()
      if (normalizeCode(otherCode).length === 6) navigate(`/jam/${normalizeCode(otherCode)}`)
    }
    return (
      <div className="mx-auto max-w-xl px-4 pt-10 pb-10">
        <h1 className="text-2xl font-bold">Esta Jam no existe o ya terminó</h1>
        <p className="mt-2 text-texto-sec">Revisa el código ({code || '—'}) o pide uno nuevo.</p>
        <form onSubmit={tryOther} className="mt-4 flex gap-2">
          <input
            value={otherCode}
            onChange={(e) => setOtherCode(normalizeCode(e.target.value))}
            placeholder="Código"
            aria-label="Código de la Jam"
            autoCapitalize="characters"
            className={`${inputClass} font-mono tracking-[0.3em] uppercase`}
          />
          <button type="submit" disabled={otherCode.length !== 6} className="h-12 shrink-0 rounded-full bg-texto px-6 font-bold text-fondo disabled:opacity-40">
            Unirme
          </button>
        </form>
        <Link to="/" className="mt-6 inline-block text-acento-texto hover:underline">
          Ir al inicio
        </Link>
      </div>
    )
  }

  if (!jam) return <p className="p-8 text-texto-sec">Entrando a la Jam…</p>

  if (!name) {
    const enter = (e: FormEvent) => {
      e.preventDefault()
      if (!draft.trim()) return
      saveName(draft)
      setName(draft.trim())
    }
    return (
      <form onSubmit={enter} className="mx-auto max-w-xl px-4 pt-10 pb-10">
        <div className="grid size-16 place-items-center rounded-2xl bg-linear-to-br from-acento to-acento-oscuro">
          <Users className="size-8 text-white" aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-2xl font-bold">Jam de {jam.host}</h1>
        <p className="mt-2 text-texto-sec">Vas a poder agregar canciones a su cola. ¿Cómo te llamas?</p>
        <input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={40} placeholder="Tu nombre" aria-label="Tu nombre" className={`${inputClass} mt-4`} />
        <button type="submit" disabled={!draft.trim()} className="mt-3 h-12 w-full rounded-full bg-acento font-bold text-white hover:bg-acento-hover disabled:opacity-40">
          Entrar a la Jam
        </button>
      </form>
    )
  }

  const q = query.trim()
  const songs = q && results?.query === q ? results.songs : null

  return (
    <div className="mx-auto max-w-xl px-4 pt-6 pb-10">
      <header className="flex items-center gap-3">
        <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-linear-to-br from-acento to-acento-oscuro">
          <Users className="size-6 text-white" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold">Jam de {jam.host}</h1>
          <p className="text-sm text-texto-sec">
            Código <span className="font-mono font-semibold tracking-widest text-texto">{jam.code}</span> · la música suena en el teléfono de {jam.host}
          </p>
        </div>
      </header>

      <section aria-label="Sonando ahora" className="mt-6">
        <h2 className="mb-1 text-sm font-semibold tracking-wider text-texto-sec uppercase">Sonando ahora</h2>
        {jam.nowPlaying ? <ul><JamTrackRow track={jam.nowPlaying} /></ul> : <p className="text-sm text-texto-sec">Todavía no suena nada.</p>}
      </section>

      <section aria-label="Agregar canciones" className="mt-6">
        <h2 className="mb-2 text-lg font-bold">Agrega canciones</h2>
        <label className="relative block">
          <span className="sr-only">Buscar canciones</span>
          <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-texto-sec" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Busca en YouTube Music"
            enterKeyHint="search"
            className={`${inputClass} pl-12 [&::-webkit-search-cancel-button]:hidden`}
          />
        </label>
        {q && !songs && <p className="mt-3 text-sm text-texto-sec">Buscando…</p>}
        {songs && songs.length === 0 && <p className="mt-3 text-sm text-texto-sec">No encontramos «{q}».</p>}
        {songs && songs.length > 0 && (
          <ul className="mt-2">
            {songs.map((track) => (
              <JamTrackRow
                key={track.id}
                track={track}
                detail={[track.artist, track.album].filter(Boolean).join(' · ')}
                action={
                  <button
                    type="button"
                    onClick={() => void add(track)}
                    disabled={adding !== null || added.has(track.id)}
                    aria-label={added.has(track.id) ? `${track.title} ya está en la Jam` : `Agregar ${track.title} a la Jam`}
                    className="grid size-10 shrink-0 place-items-center rounded-full bg-acento text-white transition hover:bg-acento-hover disabled:bg-tarjeta disabled:text-texto-sec"
                  >
                    {adding === track.id ? <LoaderCircle className="size-5 animate-spin" /> : added.has(track.id) ? <Check className="size-5" /> : <Plus className="size-5" />}
                  </button>
                }
              />
            ))}
          </ul>
        )}
      </section>

      <section aria-label="A continuación" className="mt-6">
        <h2 className="mb-1 text-lg font-bold">A continuación</h2>
        {jam.upcoming.length === 0 ? (
          <p className="text-sm text-texto-sec">Nada en la cola todavía: ¡agrega la primera!</p>
        ) : (
          <ul>
            {jam.upcoming.map((track, i) => (
              <JamTrackRow key={`${i}-${track.id}`} track={track} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
