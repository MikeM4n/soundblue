import { useEffect, useState, type ReactNode } from 'react'
import { useLocation, useSearchParams } from 'react-router'
import { copyText } from '../lib/clipboard'
import { clearDiagnostics, readDiagnostics } from '../lib/diagnostics'
import { BRAVE_LINKS } from '../lib/platform'
import { playerHost, type PlayerHost } from '../player/youtube'
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

      <Section id="ayuda-gestos" title="Gestos en «Sonando ahora»">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <B>Carátula a la izquierda</B>: siguiente canción. <B>A la derecha</B>: la anterior (si la canción lleva más de 3 segundos,
            vuelve a empezar).
          </li>
          <li>
            <B>Hacia arriba</B>: «Próximas en sonar». Para ocultarla, desliza la lista hacia abajo (o toca fuera de ella). La canción
            sigue igual.
          </li>
          <li>
            <B>Hacia abajo</B> desde arriba de la pantalla: minimizar.
          </li>
          <li>
            En la vista <B>«Video»</B> los toques sobre el video los recibe el reproductor de YouTube: ahí la carátula no se desliza. Usa
            los botones ⏮ ⏭ o vuelve a «Canción».
          </li>
          <li>
            En el PC: <B>flecha derecha</B> = siguiente, <B>flecha izquierda</B> = anterior.
          </li>
        </ul>
      </Section>

      <Section id="ayuda-jam" title="Jam: escuchar en grupo">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Abre <B>Jam</B> (en Inicio o en «Próximas en sonar») y toca <B>Iniciar Jam</B>. Sale un código QR y un código de 6 letras.
          </li>
          <li>
            Tus amigos escanean el QR con la cámara del celular (o escriben el código en SoundBlue → Jam), ponen su nombre y agregan
            canciones. Entran al final de tu «Siguiente en la cola» y te avisa quién agregó cada una.
          </li>
          <li>La música suena solo en tu teléfono, como en una fiesta. Al terminar puedes guardar las canciones como playlist.</li>
          <li>
            Para que tus amigos puedan entrar, abre SoundBlue desde su link <B>https</B>: con una dirección local (localhost o
            192.168…) solo funciona en tu equipo.
          </li>
        </ul>
      </Section>

      <Section id="ayuda-catalogo" title="Catálogo de YouTube Music">
        <p>
          SoundBlue busca en el catálogo de YouTube Music. Algunas pistas solo están disponibles en la app oficial de YouTube Music;
          para esas, usa el botón <B>«Abrir en YouTube Music»</B>. La búsqueda completa depende de un proxy no oficial que puede
          dejar de funcionar si YouTube cambia su API.
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

      <Section id="ayuda-ventana" title="Ventana flotante y notificación">
        <p>
          <B>Pantalla flotante (experimental):</B> en el computador (Chrome, Edge o Brave), el botón de pantalla flotante de «Sonando
          ahora» abre una ventanita que queda encima de las demás, con la carátula, el progreso y los controles. El video no va dentro:
          el reproductor de YouTube no deja sacarlo de la página. Si quieres el video flotando, haz clic derecho dos veces sobre el
          video y elige «Imagen en imagen» (lo ofrece el navegador, no SoundBlue).
        </p>
        <p>
          La ventana flotante no está disponible en navegadores móviles. Para controlar la reproducción fuera de la app, usa la
          notificación de tu sistema Android (panel de notificaciones o pantalla de bloqueo). La reproducción en segundo plano de
          YouTube puede pausarse por decisiones de YouTube; si ocurre, actualiza Brave y verifica que su opción «Reproducción en
          segundo plano» esté activa.
        </p>
        <p>
          Dentro de la app, la mini‑barra de abajo (sobre Inicio, Buscar y Tu biblioteca) mantiene la canción a mano: tócala para volver
          a «Sonando ahora».
        </p>
      </Section>

      <BraveBackgroundSection />

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
            YouTube 1,5 s después de que se pause y, si a los 3 s sigue en pausa, una vez más; nada más. Al volver a la app, si
            YouTube la había pausado, vuelve a sonar sola; y al abrir la app, si la última canción sonaba cuando la cerraste,
            también (en una pestaña normal el navegador puede pedirte que toques ▶). Si pausas con ⏸ en la app, lo respeta siempre;
            con ⏸ en la notificación, lo respeta si no hubo un intento en los últimos 15 s. YouTube puede bloquearlo en cualquier
            momento: en «Diagnóstico de segundo plano» verás cada intento y si volvió a sonar.
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
          fallo de SoundBlue, y puede funcionar en un teléfono y en otro no. La app nunca pausa por su cuenta: ni al minimizar
          «Sonando ahora», ni al bloquear la pantalla, ni al cambiar de app.
        </p>
        <p>
          Cuando ves la carátula (vista «Canción») o minimizas, el reproductor de YouTube sigue sonando oculto. Es una decisión del
          proyecto y un riesgo aceptado: puede dejar de funcionar si YouTube cambia sus reglas.
        </p>
      </Section>

      <DiagnosticsSection />
    </div>
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
 * de la comunidad + el reproductor desde youtube.com. Al salir YouTube se pausa igual, pero el ▶ de la notificación
 * lo reanuda y sigue con la pantalla apagada. Los filtros no alcanzan al reproductor si carga desde nocookie.
 */
function BraveBackgroundSection() {
  const [host] = useState(playerHost.get)
  // Atajo para el usuario: abrir …#/ayuda?reproductor=youtube (o =nocookie) cambia la opción sin buscar el botón.
  const [params] = useSearchParams()
  useEffect(() => {
    const wanted = params.get('reproductor')
    if (wanted !== 'youtube' && wanted !== 'nocookie') return
    window.history.replaceState(null, '', window.location.href.replace(/\?reproductor=\w+/, ''))
    if (wanted === playerHost.get()) return
    playerHost.set(wanted)
    window.location.reload() // el reproductor se crea una sola vez: se recarga para usar la nueva dirección
  }, [params])
  const choose = (value: PlayerHost) => {
    if (value === host) return
    playerHost.set(value)
    window.location.reload() // el reproductor se crea una sola vez: se recarga para usar la nueva dirección
  }
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
          <pre className="mt-2 overflow-x-auto rounded-md bg-black/30 p-2 font-mono text-xs text-texto">{BRAVE_FILTERS}</pre>
          <button type="button" onClick={() => void copy()} className="mt-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-semibold text-texto hover:bg-white/15">
            Copiar las dos líneas
          </button>
        </li>
        <li>
          El reproductor debe cargar desde <B>youtube.com</B>, porque los filtros solo actúan ahí. Viene así por defecto; con
          «youtube-nocookie.com (más privado)», el ▶ de la notificación no la reanuda.
        </li>
        <li>
          Prueba: canción de YouTube → sal con el botón de inicio (○) → se pausa → abre las notificaciones y pulsa <B>▶</B> → sigue
          sonando, también con la pantalla bloqueada.
        </li>
      </Steps>
      <p>
        Ahora el reproductor carga desde:{' '}
        <B>{host === 'youtube' ? 'youtube.com ✓ (los filtros de Brave lo alcanzan)' : 'youtube-nocookie.com (los filtros de Brave no lo alcanzan)'}</B>
      </p>
      <div role="radiogroup" aria-label="Dirección del reproductor de YouTube" className="flex flex-wrap gap-2">
        {(
          [
            ['youtube', 'youtube.com (para los filtros de Brave · recomendado)'],
            ['nocookie', 'youtube-nocookie.com (más privado)'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={host === value}
            onClick={() => choose(value)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${host === value ? 'bg-acento text-white' : 'bg-white/10 text-texto hover:bg-white/15'}`}
          >
            {label}
          </button>
        ))}
      </div>
      <p>
        Con youtube.com, YouTube puede guardar sus cookies; con youtube-nocookie.com no, pero la música no vuelve con el ▶ de la
        notificación. Cambiarlo recarga la app.
      </p>
      <p>
        <B>Si un día deja de funcionar:</B> actualiza Brave, revisa que las dos líneas sigan en «Filtros personalizados» y, en{' '}
        <B>Filtrado de contenido</B>, actualiza las listas si ves la opción.
      </p>
    </Section>
  )
}

const time = (t: number) => new Date(t).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

const isInstalled = () => window.matchMedia('(display-mode: standalone)').matches

/** El registro como texto (con el navegador y si la app está instalada), para pegarlo en un chat o un correo. */
function diagnosticsReport(): string {
  return [
    `SoundBlue · ${window.location.href}`,
    `Navegador: ${navigator.userAgent}`,
    `Instalada: ${isInstalled() ? 'sí' : 'no'}`,
    '',
    ...readDiagnostics().map((event) => `${time(event.t)}  ${event.msg}`),
  ].join('\n')
}

const copyReport = async () =>
  showToast((await copyText(diagnosticsReport())) ? 'Registro copiado: pégalo en un chat o un correo' : 'No se pudo copiar el registro')

/**
 * Solo al probar en el PC (`npm run dev` o `npm run dev:red`): manda el registro al servidor de desarrollo, que lo
 * guarda en diagnostico-telefono.json. Publicada no hay a dónde enviarlo; ahí se usa «Copiar registro».
 */
async function sendToPc() {
  try {
    const response = await fetch('/diag-api', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ direccion: window.location.href, navegador: navigator.userAgent, instalada: isInstalled(), eventos: readDiagnostics() }),
    })
    showToast(response.ok ? 'Registro enviado al PC' : 'No se pudo enviar el registro')
  } catch {
    showToast('No se pudo enviar el registro al PC')
  }
}

/**
 * Diagnóstico de segundo plano: qué pasó la última vez que se bloqueó la pantalla, para saber si quien pausa es
 * YouTube (la app recibe «en pausa» justo después de ocultarse la página) o el navegador (no llega ningún aviso).
 */
function DiagnosticsSection() {
  const [events, setEvents] = useState(readDiagnostics)
  const latest = [...events].reverse().slice(0, 40)
  return (
    <Section id="ayuda-diagnostico" title="Diagnóstico de segundo plano">
      <p>Para saber qué combinación mantiene el audio en tu teléfono, prueba en este orden y mira el registro de abajo:</p>
      <Steps>
        <li>Canción de YouTube con «Sonando ahora» abierta en vista «Video». Bloquea la pantalla 30 segundos y desbloquéala.</li>
        <li>Lo mismo en vista «Canción».</li>
        <li>Repite con «Reproducción en segundo plano» de Brave activada y desactivada, y con el reproductor desde youtube.com y desde youtube-nocookie.com.</li>
      </Steps>
      <p>
        Cómo leerlo: si justo después de <B>«Página oculta»</B> aparece <B>«Reproductor: en pausa (con la página oculta)»</B>, quien pausó fue
        el reproductor de YouTube. Si sigue diciendo «sonando» pero no se oye, fue el navegador. La app no pausa en ninguno de los dos
        casos. Si después de esa pausa aparece <B>«sonando (con la página oculta)»</B>, el ▶ de la notificación la reanudó y el
        segundo plano funciona.
      </p>
      <div className="flex flex-wrap gap-2 pt-1">
        <button type="button" onClick={() => setEvents([...readDiagnostics()])} className="rounded-full bg-white/10 px-4 py-1.5 text-sm font-semibold text-texto hover:bg-white/15">
          Actualizar
        </button>
        <button type="button" onClick={() => void copyReport()} className="rounded-full bg-acento px-4 py-1.5 text-sm font-semibold text-white hover:bg-acento-hover">
          Copiar registro
        </button>
        {import.meta.env.DEV && (
          <button type="button" onClick={() => void sendToPc()} className="rounded-full bg-white/10 px-4 py-1.5 text-sm font-semibold text-texto hover:bg-white/15">
            Enviar registro al PC
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            clearDiagnostics()
            setEvents([])
          }}
          className="rounded-full px-4 py-1.5 text-sm font-semibold text-texto-sec hover:text-texto"
        >
          Borrar registro
        </button>
      </div>
      {latest.length === 0 ? (
        <p>Todavía no hay nada registrado.</p>
      ) : (
        <ol aria-label="Registro de segundo plano" className="max-h-72 space-y-1 overflow-y-auto rounded-md bg-black/30 p-3 font-mono text-xs">
          {latest.map((event, i) => (
            <li key={`${event.t}-${i}`}>
              <span className="text-texto-sec">{time(event.t)}</span> <span className="text-texto">{event.msg}</span>
            </li>
          ))}
        </ol>
      )}
    </Section>
  )
}
