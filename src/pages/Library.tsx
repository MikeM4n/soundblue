import { ChevronRight, Plus } from 'lucide-react'
import { Link } from 'react-router'
import { LibraryList, useCreatePlaylist } from '../components/library/LibraryList'
import { IconButton } from '../components/ui/IconButton'

/** Qué pasa al apagar la pantalla. Sin promesas: depende de Brave y de YouTube. */
function PlaybackInfo() {
  return (
    <section aria-labelledby="segundo-plano" className="mx-2 mt-8 rounded-lg bg-tarjeta p-4 text-sm">
      <h2 id="segundo-plano" className="font-bold">Escuchar con la pantalla apagada</h2>
      <p className="mt-2 text-texto-sec">
        Las canciones suenan en el reproductor oficial de YouTube. Dentro de SoundBlue siguen sonando al minimizar «Sonando
        ahora». Al salir de la app, YouTube se pausa y SoundBlue intenta reanudarla sola (experimental); si no lo logra, en Brave
        con dos filtros de su comunidad, el ▶ de la notificación la reanuda (así funcionó en un Android 10). No está garantizado.
      </p>
      <Link to="/ayuda" className="mt-3 inline-flex items-center gap-1 font-semibold text-acento-texto hover:underline">
        Cómo dejar Brave listo (segundo plano y anuncios)
        <ChevronRight className="size-4" aria-hidden="true" />
      </Link>
    </section>
  )
}

/** Tu biblioteca: «Tus me gusta» y tus playlists. En escritorio también está en la barra lateral. */
export function Library() {
  const createPlaylist = useCreatePlaylist()
  return (
    <div className="px-2 pt-6 pb-10 md:px-4">
      <div className="flex items-center justify-between px-2">
        <h1 className="text-2xl font-bold md:text-3xl">Tu biblioteca</h1>
        <IconButton label="Crear playlist" onClick={createPlaylist.open}>
          <Plus className="size-6" />
        </IconButton>
      </div>
      <Link to="/gustos" className="mx-2 mt-1 inline-flex items-center gap-1 text-sm font-semibold text-acento-texto hover:underline">
        Cambiar tus artistas
        <ChevronRight className="size-4" aria-hidden="true" />
      </Link>
      <div className="mt-4">
        <LibraryList coverSize="size-16" />
      </div>
      <PlaybackInfo />
      {createPlaylist.dialog}
    </div>
  )
}
