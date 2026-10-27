import { useEffect, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router'
import { clearTopCache, readTopCache } from '../data/artistTop'
import { artistKey, listening } from '../data/history'
import { readRadioDiagnostics } from '../data/radio'
import { readUsage } from '../lib/apiUsage'
import { copyText } from '../lib/clipboard'
import { clearDuplicateLog, readDuplicateLog } from '../lib/duplicateLog'
import { TAB_SWITCHER_TIP } from '../lib/tabSwitcherTip'
import { BRAVE_LINKS } from '../lib/platform'
import { playerHost } from '../player/youtube'
import { showToast } from '../ui/toast'

const linkClass = 'font-medium text-acento-texto underline-offset-2 hover:underline'

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="rounded-lg bg-tarjeta p-4">
      <h2 id={id} className="text-lg font-bold">
        {title}
      </h2>
      <div className="mt-2 space-y-2 text-sm text-texto-sec">{children}</div>
    </section>
  )
}

function Steps({ children }: { children: ReactNode }) {
  return <ol className="list-decimal space-y-2 pl-5 marker:font-bold marker:text-texto">{children}</ol>
}

const B = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <span className={`font-semibold text-texto ${className}`}>{children}</span>
)

/**
 * Ayuda para quien usa la app: cómo dejar Brave listo (segundo plano, instalar la app, Shields) y qué
 * hacer si la música se detiene. Sin promesas: el segundo plano y el bloqueo de anuncios son de Brave.
 */
export function Help() {
  const appUrl = window.location.href.split('#')[0]
  const { state } = useLocation()
  // Si se llega desde un enlace con sección (p. ej. desde «Sonando ahora»), se baja hasta ella.
  const section = (state as { seccion?: string } | null)?.seccion
  useEffect(() => {
    if (!section) return
    const timer = window.setTimeout(() => document.getElementById(section)?.scrollIntoView({ block: 'start' }), 50) // después de que la página vuelva arriba
    return () => window.clearTimeout(timer)
  }, [section])
  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 pt-6 pb-10">
      <h1 className="text-2xl font-bold md:text-3xl">Ayuda: escuchar con Brave</h1>
      <p className="text-sm text-texto-sec">
        SoundBlue funciona en cualquier navegador. Con Brave, además, las canciones de YouTube pueden seguir sonando con la
        pantalla bloqueada (con dos filtros de su comunidad y un toque en ▶ de la notificación; así funcionó en un Android 10,
        sin garantía) y se bloquean la mayoría de sus anuncios. Las dos cosas las hace Brave, no la app.
      </p>

      <Section id="ayuda-android" title="Dejarlo listo en Android">
        <Steps>
          <li>
            Instala{' '}
            <a href={BRAVE_LINKS.playStore} target="_blank" rel="noopener noreferrer" className={linkClass}>
              Brave desde la Play Store
            </a>{' '}
            (o actualízalo si ya lo tienes).
          </li>
          <li>
            En Brave: <B>⋮ → Ajustes → Multimedia</B> y activa <B>«Reproducción en segundo plano»</B>. El nombre del menú cambia un
            poco según la versión; si no lo ves, busca «segundo plano» en los ajustes.
          </li>
          <li>
            Agrega los <B>dos filtros</B> de la comunidad de Brave: están más abajo, en{' '}
            <JumpTo id="ayuda-brave-fondo">«Brave: YouTube en segundo plano»</JumpTo>, con un botón para copiarlos.
          </li>
          <li>
            Abre <B className="break-all">{appUrl}</B> en Brave y toca <B>⋮ → «Instalar app»</B> (en algunas versiones dice «Agregar a la
            pantalla principal»).
          </li>
          <li>
            Abre SoundBlue <B>desde su ícono</B>, no desde una pestaña.
          </li>
          <li>
            Anuncios: en una pestaña de Brave con SoundBlue abierta, toca el <B>león</B> de la barra de direcciones (Shields) y pon el
            bloqueo de rastreadores y anuncios en <B>«Agresivo»</B>. También puedes cambiarlo para todos los sitios en{' '}
            <B>Ajustes → Brave Shields y privacidad</B>.
          </li>
          <li>
            Prueba: pon una canción de YouTube y sal al inicio con el botón de inicio (○). YouTube se pausa en ese momento: abre las
            notificaciones, pulsa <B>▶</B> y debe seguir sonando, también con la pantalla bloqueada. La notificación sale simple
            (solo reproducir/pausar).
          </li>
        </Steps>
      </Section>

      <Section id="ayuda-pc" title="En el computador (Windows)">
        <Steps>
          <li>
            Instala{' '}
            <a href={BRAVE_LINKS.pc} target="_blank" rel="noopener noreferrer" className={linkClass}>
              Brave para Windows
            </a>
            .
          </li>
          <li>
            Abre <B className="break-all">{appUrl}</B> y toca el ícono de instalar de la barra de direcciones (o <B>⋮ → Instalar SoundBlue</B>).
          </li>
          <li>
            Shields en <B>«Agresivo»</B> con el león de la barra de direcciones, igual que en el celular.
          </li>
        </Steps>
        <p>En el computador la música sigue sonando aunque minimices la ventana.</p>
      </Section>

      <Section id="ayuda-anuncios" title="Sobre los anuncios">
        <p>
          <B>Brave bloquea muchos anuncios, pero no todos los que YouTube inserta en el video. No es una garantía de cero anuncios.</B>{' '}
          Con Shields en «Agresivo» se bloquean la mayoría de los que salen antes y durante las canciones, pero YouTube cambia a
          menudo. SoundBlue no bloquea anuncios por su cuenta (el reproductor es de YouTube y la app no puede tocar lo de adentro).
        </p>
        <p>
          <B>Si el reproductor deja de cargar</B> o se queda en negro con «Agresivo», baja Shields a <B>«Estándar»</B> para este
          sitio.
        </p>
      </Section>

      <Section id="ayuda-gestos" title="Gestos">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <B>A la izquierda, acción rápida</B> (nunca abre un menú): en Buscar y en las listas (playlists, álbumes, modos, Tus me
            gusta) agrega la canción a la cola de una vez (o a la Jam, si estás en la de un amigo); en «Próximas en sonar», la pone
            a sonar a continuación.
          </li>
          <li>
            <B>A la derecha</B>: en «Próximas en sonar», <B>la quita de la cola</B> o <B>descarta la recomendación</B> (con «Deshacer»).
            En Buscar y en las listas, abre el menú de opciones.
          </li>
          <li>
            «Próximas en sonar» tiene tres pestañas: <B>En Cola</B> (lo que va a sonar), <B>Recomendadas</B> y <B>Por Descubrir</B>{' '}
            (canciones que nunca sonaron aquí), a partir de la canción que suena. En las dos últimas, a la izquierda la agregas a la
            cola y <B>Reproducir a continuación</B> pone todas justo después de la que suena. Una canción nunca sale en dos pestañas.
          </li>
          <li>
            <B>Fila Dinámica</B> (en «En Cola» o en Ajustes): encendida, siempre hay al menos 10 por sonar; si quitas una, entra otra de
            «Recomendadas». Apagada, la cola queda como la dejas y la música se detiene al acabarse. Te recomendamos dejarla encendida.
          </li>
          <li>
            <B>Tocar ⋮</B>: siempre el menú de opciones.
          </li>
          <li>
            En los carruseles de Inicio, deslizar de lado solo mueve el carrusel: usa ▶ o el menú ⋮.
          </li>
          <li>
            <B>Carátula a la izquierda</B>: siguiente canción. <B>A la derecha</B>: la anterior (si la canción lleva más de 3 segundos,
            vuelve a empezar).
          </li>
          <li>
            <B>Hacia arriba</B>: «Próximas en sonar». Para ocultarla, desliza la lista hacia abajo (o toca fuera de ella). La canción
            sigue igual.
          </li>
          <li>
            <B>Hacia abajo</B> desde arriba de la pantalla: minimizar (en el PC también con la tecla Esc). Arriba a la derecha,
            junto a ⋮, <B>Jam</B> te lleva a tu sala.
          </li>
          <li>
            En la vista <B>«Letra»</B> la letra sigue la canción como un karaoke: la línea que se canta se ilumina y la lista avanza
            sola. <B>Toca una línea</B> para ir a ese momento; si la deslizas con el dedo, deja de avanzar sola unos segundos. Si una
            letra no tiene tiempos, se ve completa.
          </li>
          <li>
            En el PC: <B>flecha derecha</B> = siguiente, <B>flecha izquierda</B> = anterior.
          </li>
        </ul>
      </Section>

      <Section id="ayuda-extras" title="Tema, temporizador, compartir y Tu Top 50">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <B>Tema</B> (Ajustes): <B>Predeterminado del sistema</B> (claro u oscuro como tu teléfono), <B>Claro</B> u <B>Oscuro</B>{' '}
            (negro puro: ahorra batería en pantallas OLED). «Sonando ahora» se ve siempre oscura, sobre la carátula.
          </li>
          <li>
            <B>Temporizador</B> (⋮ de «Sonando ahora»): a los 15, 30 o 45 minutos la música baja de volumen poco a poco y se pausa.
          </li>
          <li>
            <B>Compartir</B> (⋮ de cualquier canción): manda una imagen con la carátula y un enlace que abre la canción en SoundBlue.
          </li>
          <li>
            <B>Tu Top 50</B> (Inicio): las canciones que más escuchaste aquí, de más a menos (cuentan las que suenan 30 segundos o más).
            Desliza una <B>a la izquierda</B> para que suene a continuación y <B>a la derecha</B> para quitarla de tu Top (con
            «Deshacer»; si la vuelves a escuchar mucho, regresa).
          </li>
        </ul>
      </Section>

      <Section id="ayuda-jam" title="Jam: escuchar en grupo">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Abre <B>Jam</B> (en Inicio o en «Próximas en sonar») y toca <B>Iniciar Jam</B>. Sale un código QR y un código de 6 letras.
          </li>
          <li>
            Tus amigos escanean el QR con la cámara del celular (o escriben el código en SoundBlue → Jam) y ponen su nombre. Agregan
            canciones con la búsqueda de la Jam (deslizando la canción a la izquierda o con +) o, desde cualquier canción de la app,
            deslizándola a la izquierda o con <B>⋮ → Agregar a la Jam</B>: siguen en tu Jam
            aunque cambien de página, hasta que toquen <B>Salir</B>.
          </li>
          <li>
            Tú agregas igual: con la búsqueda de tu Jam o con <B>⋮ → Agregar a la cola</B>. Tu cola es la de todos: lo que agrega o
            quita cualquiera lo ven todos al instante en «Próximas en sonar» («En camino» mientras tu teléfono lo pasa al final de tu
            «Siguiente en la cola») y te avisa quién agregó cada una.
          </li>
          <li>
            En la lista de la Jam, <B>desliza una canción a la derecha</B> para quitarla (con «Deshacer»; también con ⋮ →{' '}
            <B>Eliminar de la Jam</B>): tú puedes quitar cualquiera; cada amigo, solo las que agregó él. Tú, además, la deslizas{' '}
            <B>a la izquierda</B> para que suene a continuación.
          </li>
          <li>
            La música suena solo en tu teléfono, como en una fiesta: deja SoundBlue abierto (en segundo plano el teléfono deja de
            recibir la Jam; lo que agreguen espera «En camino» y al volver se pone al día). Al terminar puedes guardar las canciones
            como playlist.
          </li>
          <li>
            Para que tus amigos puedan entrar, abre SoundBlue desde su link <B>https</B>: con una dirección local (localhost o
            192.168…) solo funciona en tu equipo.
          </li>
        </ul>
      </Section>

      <Section id="ayuda-catalogo" title="Catálogo de YouTube Music">
        <p>
          SoundBlue busca en el catálogo de YouTube Music. Algunas pistas YouTube no las deja reproducir fuera de sus apps: si una
          falla (ella y sus otras versiones), SoundBlue pasa a la siguiente y deja de mostrarla en tus listas. La búsqueda completa
          depende de un proxy no oficial que puede dejar de funcionar si YouTube cambia su API.
        </p>
        <p>
          Si un día no carga, la app sigue funcionando con la lista de prueba. Las canciones suenan en el reproductor oficial de
          YouTube; los anuncios los bloquea Brave Shields (no todos).
        </p>
      </Section>

      <Section id="ayuda-no-disponible" title="Si muchas canciones dicen «no disponible»">
        <p>
          Abre SoundBlue desde su dirección <B>https</B>. Desde una dirección de la red local (<B>http://192.168…</B>), YouTube
          bloquea casi toda la música de los sellos discográficos. Si una canción sigue bloqueada, la app prueba sola otra versión
          de la misma canción (el video oficial o el de la letra) antes de pasar a la siguiente.
        </p>
      </Section>

      <Section id="ayuda-ventana" title="Controlar la música fuera de la app">
        <p>
          Para controlar la reproducción fuera de la app, usa la notificación de tu sistema Android (panel de notificaciones o
          pantalla de bloqueo). La reproducción en segundo plano de
          YouTube puede pausarse por decisiones de YouTube; si ocurre, actualiza Brave y verifica que su opción «Reproducción en
          segundo plano» esté activa.
        </p>
        <p>
          Dentro de la app, la mini‑barra de abajo (sobre Inicio, Buscar y Tu biblioteca) mantiene la canción a mano: tócala para volver
          a «Sonando ahora».
        </p>
      </Section>

      <BraveBackgroundSection />

      <Section id="ayuda-truco-pestanas" title="Para que la música siga sonando al salir (Chrome)">
        <p>
          <B>{TAB_SWITCHER_TIP}</B>
        </p>
        <p>
          Lo que mostraron los registros del teléfono (23 oct.): saliendo directo a Inicio, YouTube o Chrome pausan la música y no
          la dejan volver sola (con ▶ en la notificación sí vuelve). Si primero abres el selector de pestañas, la app logra que
          vuelva a sonar. Sirve en una pestaña de Chrome; la app instalada no tiene selector de pestañas.
        </p>
      </Section>

      <Section id="ayuda-notificacion" title="La notificación con canciones de YouTube">
        <p>
          <B>
            Al salir de la app, YouTube pausa la música. Si la notificación de Android aparece, pulsa ▶ en ella para reanudar. Si la
            notificación no aparece, vuelve a abrir SoundBlue y pulsa ▶ en el reproductor. Esto es una restricción de YouTube, no un
            fallo de la app.
          </B>
        </p>
        <p>
          Al volver, SoundBlue te muestra <B>«▶ Reanudar»</B> (en «Sonando ahora» o en un aviso abajo). La notificación no siempre
          aparece: depende de YouTube, del navegador y de Android.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <B>Al salir de la app, YouTube se pausa</B> en el mismo segundo. Lo hace el reproductor de YouTube (escuchar con la
            pantalla apagada es una función de YouTube Premium), no SoundBlue.
          </li>
          <li>
            <B>Auto‑reanudación (experimental):</B> si la canción sonaba y no la pausaste tú, SoundBlue le pide ▶ al reproductor de
            YouTube en cuanto YouTube o Chrome la pausan, otra vez a los 0,5 s y una última a los 1,5 s (en silencio y con el
            volumen de vuelta a los 0,8 s); nada más. Al salir, la app no toca el sonido. Al volver a la app, si
            YouTube la había pausado, vuelve a sonar sola; y al abrir la app, si la última canción sonaba cuando la cerraste,
            también (en una pestaña normal el navegador puede pedirte que toques ▶). Si pausas con ⏸ en la app, lo respeta siempre;
            con ⏸ en la notificación, lo respeta si no hubo un intento en los últimos 15 s. YouTube puede bloquearlo en cualquier
            momento; si pasa, puedes reanudar desde el aviso o el reproductor.
          </li>
          <li>
            Con Brave, los dos filtros y el reproductor desde youtube.com: abre las notificaciones y pulsa <B>▶</B>. La música vuelve
            y sigue sonando con la pantalla apagada (comprobado en un Android 10). Si se vuelve a pausar, pulsa ▶ otra vez.
          </li>
          <li>
            Sin los filtros, en Chrome o con youtube-nocookie.com, ese ▶ no la reanudó en nuestras pruebas.
          </li>
          <li>
            <B>Anterior y Siguiente en la notificación:</B> SoundBlue los tiene listos, pero con canciones de YouTube no aparecen. El
            sonido sale del reproductor de YouTube y Android le da la notificación a él, no a SoundBlue; esa notificación es{' '}
            <B>simple</B> (solo reproducir/pausar), como lo comprobamos en un Android 10. Para cambiar de canción, vuelve a SoundBlue y
            usa ⏮ ⏭ en «Sonando ahora» o en la mini‑barra.
          </li>
          <li>
            Sal con el <B>botón de inicio (○)</B>. Con «atrás» o cerrándola desde las apps recientes, el navegador cierra la página y
            la música se detiene del todo.
          </li>
          <li>
            Si Android cierra la app al salir: <B>Ajustes del teléfono → Apps → Brave (o Chrome) → Batería → Sin restricciones</B>.
          </li>
          <li>
            Si borraste los datos del navegador: abre de nuevo el link de SoundBlue, vuelve a instalarla (⋮ → «Instalar app») y revisa
            que los dos filtros sigan en Brave. Tus favoritos y playlists se guardan en el navegador, así que borrar sus datos también
            los borra.
          </li>
        </ul>
        <p>
          <B>No está garantizado:</B> YouTube y los navegadores cambian a menudo. Puede funcionar hoy y dejar de funcionar mañana, o
          funcionar en un teléfono y en otro no.
        </p>
      </Section>

      <Section id="ayuda-segundo-plano" title="Si la música se detiene al bloquear la pantalla">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Revisa <JumpTo id="ayuda-brave-fondo">«Brave: YouTube en segundo plano»</JumpTo>: las dos líneas deben seguir en «Filtros
            personalizados» y el reproductor, cargar desde youtube.com.
          </li>
          <li>Actualiza Brave desde la Play Store.</li>
          <li>Desactiva y vuelve a activar «Reproducción en segundo plano» y cierra Brave por completo antes de volver a abrirlo.</li>
          <li>Abre SoundBlue desde el ícono instalado.</li>
          <li>
            En los ajustes del teléfono: <B>Apps → Brave → Batería</B> y quita las restricciones; el ahorro de batería puede cortar el
            sonido.
          </li>
        </ul>
        <p>
          Que una canción de YouTube siga con la pantalla bloqueada depende de Brave y de YouTube: es una carrera entre los dos, no un
          fallo de SoundBlue, y puede funcionar en un teléfono y en otro no. La app nunca pausa por su cuenta: al salir, si
          YouTube o Chrome la pausan, intenta en el acto que vuelva a sonar; al volver, sigue sola. Al minimizar «Sonando ahora»
          no se pausa nunca.
        </p>
        <p>
          Cuando ves la carátula (vista «Canción») o minimizas, el reproductor de YouTube sigue sonando oculto. Es una decisión del
          proyecto y un riesgo aceptado: puede dejar de funcionar si YouTube cambia sus reglas.
        </p>
      </Section>

      <RecommendationsSection />
    </div>
  )
}

/** Nombres de los artistas que sueles saltar (como aparecen en tu historial). */
function skippedArtistNames(): string[] {
  const keys = listening.skippedArtists()
  const names = new Map<string, string>()
  for (const { track } of listening.entries()) {
    const key = artistKey(track.artist)
    if (keys.has(key) && !names.has(key)) names.set(key, track.artist.split(/,| y | & | x | feat\.? | ft\.? /i)[0].trim())
  }
  return [...names.values()]
}

const hoursAgo = (at: number) => {
  const hours = (Date.now() - at) / 3600_000
  return hours < 1 ? 'hace menos de 1 h' : `hace ${Math.floor(hours)} h`
}

/**
 * Diagnóstico de las recomendaciones: cuánto se le pidió hoy a YouTube (YouTube Music no tiene cuota; la Data API sí:
 * 10 000 unidades al día), qué artistas tienen sus canciones top guardadas (se renuevan cada 24 h), la última radio
 * (género detectado, cuántas descartó y por qué, y las últimas 10 que generó con su motivo) y las canciones que no
 * entraron a la cola por estar repetidas.
 */
function RecommendationsSection() {
  const [usage, setUsage] = useState(readUsage)
  const [saved, setSaved] = useState(readTopCache)
  const [radio, setRadio] = useState(readRadioDiagnostics)
  const [duplicates, setDuplicates] = useState(readDuplicateLog)
  const [skipped, setSkipped] = useState(skippedArtistNames)
  const entries = Object.entries(saved).sort(([, a], [, b]) => b.at - a.at)
  const refresh = () => {
    setUsage(readUsage())
    setSaved(readTopCache())
    setRadio(readRadioDiagnostics())
    setDuplicates(readDuplicateLog())
    setSkipped(skippedArtistNames())
  }
  return (
    <Section id="ayuda-recomendaciones" title="Diagnóstico de recomendaciones">
      <ul className="list-disc space-y-1 pl-5">
        <li>
          Consultas a YouTube Music hoy: <B>{usage.ytm}</B> (no tiene cuota).
        </li>
        <li>
          YouTube Data API hoy: <B>{usage.dataApi}</B> de 10 000 unidades (respaldo de búsqueda y popularidad de Rumba).
        </li>
      </ul>
      <p>Artistas con sus canciones top guardadas ({entries.length}; se renuevan cada 24 h):</p>
      {entries.length === 0 ? (
        <p>Todavía ninguno.</p>
      ) : (
        <ul className="space-y-1 rounded-md bg-fondo/60 p-3 text-sm">
          {entries.map(([id, entry]) => (
            <li key={id}>
              <B>{entry.name}</B> · {entry.tracks.length} canciones · {hoursAgo(entry.at)} · {entry.source === 'youtube-music' ? 'YouTube Music' : 'YouTube Data API'}
            </li>
          ))}
        </ul>
      )}
      <p>Última radio (Buscar, «Iniciar radio», recomendadas o la cola infinita, a partir de la canción que sonaba):</p>
      {!radio ? (
        <p>Todavía ninguna.</p>
      ) : (
        <div className="space-y-2 rounded-md bg-fondo/60 p-3 text-sm">
          <p>
            Semilla: <B>{radio.seed}</B> · {hoursAgo(radio.at)}
          </p>
          {/* Diagnósticos guardados por versiones anteriores no traen género. */}
          <p>
            Género detectado: <B>{radio.genres?.length ? radio.genres.join(', ') : 'no se conoce'}</B>
            {radio.guessed && ' (deducido de su radio)'}
            {radio.accepts?.length ? ` · acepta ${radio.accepts.join(', ')} (de cualquier año)` : ' (no se filtra por género: queda la radio de YouTube tal cual)'}
          </p>
          <p>
            Descartadas:{' '}
            {Object.entries(radio.filtered)
              .map(([reason, n]) => `${reason}: ${n}`)
              .join(' · ')}
          </p>
          <ol className="list-decimal space-y-0.5 pl-5">
            {radio.picks.map((pick, i) => (
              <li key={`${pick.title}-${i}`}>
                {pick.title} · {pick.artist}
                {pick.year ? ` (${pick.year})` : ''} — <span className="text-texto-sec">{pick.reason}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
      <p>
        Artistas que sueles saltar (pasas a la siguiente antes de 30 s; no se recomiendan):{' '}
        {skipped.length ? <B>{skipped.join(', ')}</B> : 'ninguno.'}
      </p>
      <p>Canciones descartadas por duplicado (mismo video; las últimas {duplicates.length}, la más reciente primero):</p>
      {duplicates.length === 0 ? (
        <p>Ninguna todavía.</p>
      ) : (
        <ol className="space-y-0.5 rounded-md bg-fondo/60 p-3 text-sm">
          {duplicates
            .slice()
            .reverse()
            .map((entry, i) => (
              <li key={`${entry.at}-${i}`}>
                <span className="tabular-nums">{new Date(entry.at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</span> ·{' '}
                {entry.title} · {entry.artist} — <span className="text-texto-sec">{entry.where}</span>
              </li>
            ))}
        </ol>
      )}
      <div className="flex flex-wrap gap-2 pt-1">
        <button type="button" onClick={refresh} className="rounded-full bg-contraste/10 px-4 py-1.5 text-sm font-semibold text-texto hover:bg-contraste/15">
          Actualizar
        </button>
        <button
          type="button"
          onClick={() => {
            clearDuplicateLog()
            refresh()
          }}
          className="rounded-full px-4 py-1.5 text-sm font-semibold text-texto-sec hover:text-texto"
        >
          Borrar registro de duplicados
        </button>
        <button
          type="button"
          onClick={() => {
            clearTopCache()
            refresh()
            showToast('Canciones guardadas borradas: se vuelven a pedir al abrir Inicio')
          }}
          className="rounded-full px-4 py-1.5 text-sm font-semibold text-texto-sec hover:text-texto"
        >
          Borrar canciones guardadas
        </button>
      </div>
    </Section>
  )
}

/** Enlace a otra sección de esta misma página (con HashRouter, un href="#…" cambiaría de pantalla). */
function JumpTo({ id, children }: { id: string; children: ReactNode }) {
  return (
    <button type="button" onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className={linkClass}>
      {children}
    </button>
  )
}

// Filtros que la comunidad de Brave recomienda cuando falla el segundo plano de YouTube (no son oficiales de Brave).
const BRAVE_FILTERS = 'youtube.com##+js(brave-video-bg-play)\nyoutube.com##+js(brave-disable-pageview-api)'

/**
 * Brave: la receta comprobada en un Android 10 real (oct. 2026): «Reproducción en segundo plano» + los dos filtros
 * de la comunidad + el reproductor desde youtube.com (la app lo carga siempre desde ahí). Al salir YouTube se pausa
 * igual, pero el ▶ de la notificación lo reanuda y sigue con la pantalla apagada.
 */
function BraveBackgroundSection() {
  const copy = async () =>
    showToast((await copyText(BRAVE_FILTERS)) ? 'Filtros copiados: pégalos en «Filtros personalizados» de Brave' : 'No se pudo copiar: escríbelos tal cual')
  return (
    <Section id="ayuda-brave-fondo" title="Brave: YouTube en segundo plano">
      <p>
        <B>
          La reproducción en segundo plano de YouTube depende de Brave y de los cambios de YouTube. Si se detiene, actualiza Brave,
          refresca los filtros de Shields y vuelve a intentarlo. No está garantizado.
        </B>
      </p>
      <p>
        Así quedó funcionando en un Android 10 con Brave: al salir, YouTube se pausa; con <B>▶</B> en la notificación vuelve a sonar
        y sigue con la pantalla apagada.
      </p>
      <Steps>
        <li>
          Actualiza Brave a la <B>última versión</B> (Play Store). Algunas versiones lo han roto (según usuarios, la 1.87.190) y Brave
          lo corrige en la siguiente.
        </li>
        <li>
          <B>Ajustes → Multimedia</B>: activa <B>«Reproducción en segundo plano»</B>.
        </li>
        <li>
          <B>Ajustes → Brave Shields y privacidad → Filtrado de contenido → Filtros personalizados</B>: pega estas dos líneas, guarda y
          cierra Brave por completo antes de volver a abrirlo. Son un truco de la comunidad de Brave, no oficial; si el reproductor
          deja de cargar, bórralas.
          <pre className="mt-2 overflow-x-auto rounded-md bg-fondo/60 p-2 font-mono text-xs text-texto">{BRAVE_FILTERS}</pre>
          <button type="button" onClick={() => void copy()} className="mt-2 rounded-full bg-contraste/10 px-4 py-1.5 text-sm font-semibold text-texto hover:bg-contraste/15">
            Copiar las dos líneas
          </button>
        </li>
        <li>
          El reproductor carga siempre desde <B>youtube.com</B> (los filtros solo actúan ahí; con youtube-nocookie.com el ▶ de la
          notificación no la reanudaba). No hay que cambiar nada.
        </li>
        <li>
          Prueba: canción de YouTube → sal con el botón de inicio (○) → se pausa → abre las notificaciones y pulsa <B>▶</B> → sigue
          sonando, también con la pantalla bloqueada.
        </li>
      </Steps>
      <p>
        El reproductor carga desde: <B>{playerHost.label} ✓ (los filtros de Brave lo alcanzan)</B>. Desde ahí YouTube puede guardar
        sus cookies, como en su propia página.
      </p>
      <p>
        <B>Si un día deja de funcionar:</B> actualiza Brave, revisa que las dos líneas sigan en «Filtros personalizados» y, en{' '}
        <B>Filtrado de contenido</B>, actualiza las listas si ves la opción.
      </p>
    </Section>
  )
}
