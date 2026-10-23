# SoundBlue

App web de música con el estilo de los reproductores modernos (barra lateral, reproductor fijo abajo, tarjetas y listas), en azul rey. Se instala como app desde Brave en Windows y Android (PWA), no usa analítica ni rastreadores, y todas sus fuentes e íconos van dentro del proyecto.

> Estado: catálogo de YouTube Music (búsqueda, Inicio, radios, «Para ti») con el reproductor oficial de YouTube, cola, favoritos, playlists y Jam.

**Dirección de la app: <https://mikem4n.github.io/soundblue/>** (repositorio `soundblue` en GitHub, publicado con GitHub Pages).

> Funciona mejor con Brave y Shields activos. La reproducción en segundo plano de YouTube depende del navegador y de YouTube.

> SoundBlue busca en el catálogo de YouTube Music. Algunas pistas solo están disponibles en la app oficial de YouTube Music; para esas, usa el botón «Abrir en YouTube Music». La búsqueda completa depende de un proxy no oficial que puede dejar de funcionar si YouTube cambia su API.

GitHub Pages solo sirve archivos, así que en la versión publicada el catálogo de YouTube Music (Inicio, búsqueda completa, radios, «Para ti») pasa por un **Cloudflare Worker** gratis (`worker/ytm-proxy.js`, ver «YouTube Music»). Si el Worker falla, la app usa los respaldos: la Data API (si hay clave) y la lista de prueba, con un aviso discreto. **Jam** todavía necesita su propio servidor (ver «Jam»).

**Antes se llamaba «Blue Music».** Al abrir la versión nueva, `src/lib/storageMigration.ts` pasa los datos guardados de `bluemusic:*` a `soundblue:*` (favoritos, playlists, historial y ajustes), y el service worker borra sus copias viejas `bluemusic-*`.

## Requisitos

- Node.js 22.19 o superior (probado con 26.1)
- npm

## Comandos

```bash
npm install        # instala las dependencias (solo la primera vez)
npm run dev        # abre la app en desarrollo: http://localhost:5173/soundblue/
npm run dev:red    # lo mismo, visible desde otros equipos de tu red (http://192.168…; ahí YouTube bloquea mucha música)
npm run build      # compila la versión final en dist/
npm run preview    # sirve dist/ para probar la versión final: http://localhost:4173/soundblue/
npm run iconos     # regenera los íconos y el favicon desde el logo
```

Para probar en el teléfono, usa la versión publicada: <https://mikem4n.github.io/soundblue/>.

## Cambiar los colores

Toda la paleta está en `src/index.css`, dentro de `@theme`. Cada color crea sus clases de Tailwind (`bg-fondo`, `text-acento`, `hover:bg-tarjeta`…), así que basta con cambiar el valor ahí.

| Variable | Uso | Valor |
| --- | --- | --- |
| `fondo` | Fondo principal | `#000000` |
| `panel` | Paneles y barra lateral | `#121212` |
| `tarjeta` | Tarjetas y filas al pasar el dedo o el mouse | `#1A1A1A` |
| `elevado` | Elementos elevados: barra del reproductor, menús, diálogos | `#242424` |
| `acento` | Azul rey: botones, play/pausa, progreso, íconos activos, favoritos | `#4169E1` |
| `acento-hover` | Hover de los botones | `#5B82F0` |
| `texto` | Texto principal | `#FFFFFF` |
| `texto-sec` | Texto secundario | `#A7A7A7` |
| `acento-texto` | Azul para textos (derivado: el azul rey como texto pequeño no alcanza el contraste mínimo) | `#7C9CF5` |
| `tarjeta-claro` | Hover de elementos que ya tienen fondo `tarjeta` (derivado, = `elevado`) | `#242424` |

## Estructura

| Carpeta | Qué hay |
| --- | --- |
| `src/components/brand` | Logo (el trazo de las ondas está en `logo-path.ts`; lo usan la app y los íconos) |
| `src/components/layout` | Barra lateral, reproductor, barra inferior del celular, aviso de Brave |
| `src/components/ui` | Piezas reutilizables: portada, tarjeta, lista de canciones, botones |
| `src/components/player` | «Sonando ahora», barra minimizada, video de YouTube (`VideoStage`), cola |
| `src/player` | Motor del reproductor, YouTube, Media Session, canciones «solo en YouTube Music» |
| `src/pages` | Inicio, Buscar, Tu biblioteca, Cola, Ayuda |
| `src/data` | YouTube Music, «Para ti», historial, catálogo de prueba verificado y categorías de Buscar |
| `public` | Manifest, service worker (`sw.js`) e íconos |
| `scripts/iconos.ts` | Genera los íconos PNG y el favicon |
| `worker/` | Intermediario de YouTube Music para la versión publicada (Cloudflare Worker) |

## App instalable (PWA)

- `public/manifest.webmanifest` (es el «manifest.json»; la extensión `.webmanifest` es la recomendada): nombre, íconos, `display: standalone`, colores `#000000`.
- `public/sw.js`: service worker que guarda la **interfaz** (HTML, JS, CSS, íconos) para que abra rápido y sin conexión. No guarda música ni nada de YouTube.
- HTTPS: GitHub Pages lo da automáticamente (un service worker solo funciona con HTTPS o en `localhost`).
- YouTube: IFrame Player API oficial (`enablejsapi=1`, `playsinline=1`; desde `www.youtube.com` por defecto, o `youtube-nocookie.com` si el usuario lo elige; ver «Brave: segundo plano y filtros»). El video se ve entero, nunca oculto ni recortado.

## Pantalla de carga

Al abrir la app sale una pantalla negra con el logo: la onda se mueve como una serpiente (una onda que avanza por la línea con los extremos quietos, en bucle) y el nombre «SoundBlue» aparece gradualmente, sin moverse. La animación es un `<animate attributeName="d">` del SVG con 8 cuadros de una onda desplazada (y = 16 − 3,6 · sin(π·t)^0,7 · sin(2π(x−6)/10 − φ), curva suave por 11 puntos); misma estructura de trazo en todos los cuadros para que el navegador interpole. Está en `index.html` (aparece al instante, antes de que cargue la app) y `src/lib/splash.ts` la desvanece a los ~2,4 s desde que se abrió (o cuando la app termina de cargar, si tarda más). Con «reducir movimiento» del teléfono, sin animación y solo 0,6 s.

## Controles del sistema (Media Session)

`src/player/mediaSession.ts` publica título, artista, álbum (la lista desde donde suena) y carátula, y responde a reproducir, pausar, anterior, siguiente y mover la barra (`seekto`) desde la notificación, la pantalla de bloqueo o las teclas multimedia. El estado (sonando/pausa y posición) se actualiza con el estado real del reproductor. Con YouTube el sonido sale del iframe, así que cada navegador decide si muestra estos controles o los de YouTube.

## Reproducción en segundo plano

- **YouTube**: reproductor oficial. Que siga sonando al bloquear la pantalla es una capacidad de **Brave**, no de la app; **no está garantizado** y puede cambiar con cada versión de Brave o de YouTube. **Comprobado en un Android 10 real (22 oct. 2026, registros del teléfono)**: YouTube se pausa en el mismo segundo en que la página se oculta, siempre. Con Brave, «Reproducción en segundo plano», los dos filtros de la comunidad y el reproductor cargado desde `www.youtube.com`, pulsar ▶ en la notificación la reanuda y sigue sonando con la página oculta (a veces se vuelve a pausar y hay que pulsar ▶ otra vez). Con `youtube-nocookie.com` o en Chrome, ese ▶ no la reanudó. La app no pulsa ▶ sola: eso sería saltarse el bloqueo de YouTube (el segundo plano es de Premium).
- **«▶ Reanudar»** (respaldo si la notificación no aparece): si YouTube pausa la música con la página oculta y no fuiste tú, el motor lo anota (`pausedOnExit`). Al volver, «Sonando ahora» muestra «YouTube pausó la música al salir. ▶ Reanudar» bajo la carátula y, si estaba minimizada, sale un aviso con el mismo botón (`src/player/useResumePrompt.ts`). Lo pulsa el usuario: la app no reanuda sola ni mantiene un audio silencioso para sostener la notificación.
- La app **nunca pausa por su cuenta**: ni al minimizar «Sonando ahora», ni al apagar la pantalla, cambiar de app o perder el foco (no escucha `visibilitychange`, `pagehide` ni `blur` para pausar).
- **Vista «Canción | Video»** (como YouTube Music): por defecto «Sonando ahora» muestra la carátula cuadrada y el reproductor de YouTube suena oculto; con «Video» se ve el reproductor oficial a todo el ancho. La elección se recuerda (`soundblue:vista-youtube`).
- **Decisión del dueño de la app**: al minimizar en el celular, o en la vista «Canción», el video de YouTube se oculta y la canción sigue sonando. YouTube pide que su reproductor esté a la vista mientras suena; incumplirlo puede llevar a que YouTube limite la reproducción incrustada en el dominio o revoque la clave de la API. Para volver a pausar al minimizar, basta con pausar en `src/components/player/VideoStage.tsx` cuando no hay espacio a la vista para el video (el bloque «Sin espacio a la vista»).
- En «Sonando ahora», con YouTube, se muestra (según de dónde carga el reproductor): «Al salir, YouTube se pausa: pulsa ▶ en la notificación y sigue sonando (Brave con los filtros de la Ayuda).» o, con nocookie, «Segundo plano: con el reproductor «más privado», YouTube se pausa al salir. Para que siga sonando, mira la Ayuda.»
- No se extrae el audio de YouTube (Piped, Invidious, `<audio>`), no se oculta nada del iframe y no hay bloqueador de anuncios propio: lo primero incumple los términos de YouTube y lo segundo es imposible (el iframe es de otro dominio).

## Instrucciones para quien usa la app

Están también dentro de la app: **Tu biblioteca → «Cómo dejar Brave listo»** (ruta `#/ayuda`).

**Android**

1. Instala Brave desde la Play Store (o actualízalo).
2. En Brave: **⋮ → Ajustes → Multimedia** y activa **«Reproducción en segundo plano»** (el nombre del menú cambia un poco según la versión; busca «segundo plano» en los ajustes).
3. En Brave: **Ajustes → Brave Shields y privacidad → Filtrado de contenido → Filtros personalizados**, pega las dos líneas de la comunidad (están en la Ayuda, con botón para copiarlas) y cierra Brave por completo:
   ```
   youtube.com##+js(brave-video-bg-play)
   youtube.com##+js(brave-disable-pageview-api)
   ```
4. Abre <https://mikem4n.github.io/soundblue/> en Brave y toca **⋮ → «Instalar app»** (o «Agregar a la pantalla principal»).
5. Abre SoundBlue **desde su ícono**, no desde una pestaña.
6. Anuncios: en una pestaña de Brave con SoundBlue, toca el **león** (Shields) y pon el bloqueo de rastreadores y anuncios en **«Agresivo»** (o para todos los sitios en Ajustes → Brave Shields y privacidad).
7. Prueba: pon una canción de YouTube y sal con el botón de inicio (○). YouTube se pausa en ese momento: abre las notificaciones y pulsa **▶**; debe seguir sonando, también con la pantalla bloqueada. La notificación de YouTube sale simple (solo reproducir/pausar). Salir con «atrás» o cerrar la app desde recientes cierra la página y la música.

**Windows**: instala Brave, abre la dirección, usa el ícono de instalar de la barra de direcciones y pon Shields en «Agresivo».

**Si la música se detiene al bloquear la pantalla** (es la carrera entre YouTube y Brave, no un fallo de SoundBlue): revisa que los dos filtros sigan en «Filtros personalizados» y que el reproductor cargue desde youtube.com (Ayuda → «Brave: YouTube en segundo plano»); actualiza Brave; desactiva y activa «Reproducción en segundo plano» y cierra Brave por completo; abre la app desde el ícono; en el teléfono, Apps → Brave → Batería → sin restricciones.

## Anuncios y Brave Shields

Con Brave y Shields en «Agresivo», la mayoría de anuncios antes y durante los videos de YouTube se bloquean, pero **no es una garantía absoluta**: YouTube cambia a menudo. Si el reproductor deja de cargar o se queda en negro, baja Shields a **«Estándar»** para el sitio. SoundBlue no bloquea anuncios por su cuenta; dentro de Brave muestra un consejo discreto (se puede cerrar) que lleva a la ayuda.

## YouTube Music: inicio, búsqueda, álbumes, artistas y radio

`src/data/ytmusic.ts` lee el catálogo de YouTube Music con su API interna (**InnerTube**), la misma que usan InnerTune, OuterTune y SimpMusic (su código está como referencia en `C:\Users\miguel.mancipe\Proyectos\referencias`, no dentro del proyecto). Solo se usan **datos**: la música suena siempre en el reproductor oficial de YouTube, y los anuncios los bloquea Brave, no la app.

- **Inicio**: «Selecciones rápidas», playlists por género, lanzamientos, tendencias… (lo que YouTube Music muestra sin iniciar sesión).
- **Buscar**: canciones, artistas y álbumes, con portada cuadrada, artistas y álbum.
- **Páginas** de playlist, álbum y artista (`#/ytm/:id`).
- **Iniciar radio** (menú ⋮ o botón en playlists y álbumes): la canción y las 50 que recomienda YouTube Music.
- No necesita clave. **Riesgo**: no es una API publicada; puede cambiar sin aviso y usarla va contra los términos de YouTube. Si falla, Buscar usa la Data API (si hay clave) y luego el catálogo de prueba; Inicio muestra la lista de prueba.

**«No disponible» (error 150)**: desde una dirección de la red local (`http://192.168…`, la de `npm run dev:red`) YouTube bloquea casi toda la música de sellos; desde https casi todo suena (medido: 0 de 56 frente a 55 de 56 en modo Android). Para probar en el teléfono, usa la versión publicada (<https://mikem4n.github.io/soundblue/>). Si una canción sigue bloqueada, la app prueba otra versión de la misma (video oficial, con letra…) y la recuerda (`soundblue:versiones`).

El navegador no puede llamar a YouTube Music directamente (CORS). Al probar (`npm run dev`, `npm run dev:red`, `npm run preview`), el propio servidor de Vite hace de intermediario en `/ytm-api` (ver `vite.config.ts`). **GitHub Pages no puede hacerlo**, así que la versión publicada usa un **Cloudflare Worker** (`worker/ytm-proxy.js`, plan gratis: 100 000 peticiones al día):

- Recibe las mismas peticiones que `/ytm-api` (`POST /search`, `/browse` y `/next`: búsqueda; Inicio, playlists, álbumes y artistas; radio) y las reenvía a `music.youtube.com/youtubei/v1` con cabeceras de navegador. No reenvía `player`: solo datos, nunca audio.
- CORS solo para `https://mikem4n.github.io` (y `localhost:5173`/`4173` para probar); otros sitios reciben 403. Rechaza cuerpos que no sean de InnerTube o de más de 32 KB.
- Publicado en <https://soundblue-ytm.miguelmancipe09.workers.dev> (cuenta de Cloudflare del dueño). Su dirección va en la variable del repositorio `VITE_YTM_PROXY` (Settings → Secrets and variables → Actions → Variables). Sin ella, o si el Worker falla, la app usa los respaldos sin mostrar errores.
- Los títulos de los videos se muestran sin la etiqueta del video («(Official Video)», «(Video Oficial)», «(Lyric Video)», «| Audio Oficial»…); «(Remix)», «(En Vivo)» o «(feat. …)» se quedan.

**Canciones «solo en YouTube Music»**: algunas pistas (sobre todo de sellos) YouTube no las deja reproducir fuera de sus apps (errores 100/101/150). La app prueba primero otras versiones de la misma canción; si ninguna sirve, la recuerda (`soundblue:solo-youtube-music`), la marca en las listas («Solo en YouTube Music»), la salta al avanzar y en «Sonando ahora» ofrece **«Abrir en YouTube Music»** (en Android abre la app con un enlace `intent://`, y si no está instalada, la web; en el PC, la web). También está en el menú ⋮ de cada canción. No se extrae el audio ni se usan Piped/Invidious.
- Probarlo en el PC: `npm run worker:dev` (en `http://localhost:8787`, sin cuenta). Publicarlo o actualizarlo: `npm run worker:publicar` (la primera vez abre el navegador para iniciar sesión en Cloudflare).
- **Riesgo**: es una API no oficial; puede dejar de funcionar si YouTube la cambia. Si falla, la app usa la lista de prueba.

## Tus gustos y «Para ti»

La primera vez que se abre la app, Inicio lleva a **«¿Qué artistas te gustan?»** (`#/gustos`, `src/pages/Tastes.tsx`): 32 artistas populares para empezar, buscador, y al elegir uno aparecen al lado otros parecidos («Puede que también te guste» de YouTube Music). Se cambia en Tu biblioteca → «Cambiar tus artistas». YouTube Music no da su propio selector sin iniciar sesión, por eso es propio.

**«Para ti» son sugerencias propias, no recomendaciones oficiales**: la YouTube Data API no ofrece recomendaciones (no hay endpoint y `relatedToVideoId` se eliminó). `src/data/forYou.ts` las arma en capas y las **recalcula al abrir la app, al marcar o quitar favoritas y al terminar de escuchar canciones**:

1. **Lo tuyo** (sin conexión ni cuota): artistas elegidos, favoritas e historial de escucha (`src/data/history.ts`, `soundblue:historial`: cuántas veces y cuándo; una canción cuenta a los 30 s o al terminar). Se guarda en localStorage como el resto de la biblioteca: son pocos datos.
2. **YouTube Music** (API interna, **no oficial: puede dejar de funcionar sin aviso**): canciones de tus artistas y la radio («A continuación»).
3. **YouTube Data API** (solo si lo anterior falla y hay clave; guarda 24 h).

Carruseles: **«Nuevo para ti»** (de tus artistas, aún sin escuchar), **«Radio de «…»»** (la semilla rota en cada apertura: tu última favorita, lo más escuchado de tu artista top, algo nuevo de tu historial; la última radio buena se guarda por si falla), **«Muy sonadas»** (lo más escuchado en YouTube Music de tus artistas top) y artistas recomendados. No repite lo que sonó en las últimas 24 h, salvo tus favoritas. Si YouTube Music no responde, sale «Para volver a escuchar» (tus favoritas y lo que más escuchas): nunca un error en pantalla.

## «Sonando ahora» y la barra inferior

- La barra inferior (Inicio, Buscar, Tu biblioteca) se ve siempre, también con «Sonando ahora» abierta: esa pantalla termina justo encima (`--nav-h`, lo publica `MobileNav`). Tocar una sección navega sin detener la música; la mini‑barra vuelve a abrirla en el mismo punto.
- El bloque de abajo (aviso, título en máx. 2 líneas, artista, progreso, controles) tiene alto fijo y la carátula usa el espacio que queda (`100cqh`): al deslizar o cambiar de canción nada salta y no hay scroll.
- Gestos: carátula = izquierda/derecha; arriba = cola; abajo desde el encabezado = minimizar.

## Notificación y pantalla de bloqueo (Media Session)

- **Medido en un Android 10 real (Chrome 155 y Brave)**: con canciones de **YouTube**, Android muestra la notificación **simple** del navegador (solo reproducir/pausar, sin carátula de la app ni anterior/siguiente), porque el sonido sale del iframe de YouTube y el navegador le asigna la notificación a ese iframe; nuestros metadatos y acciones no se usan. El registro de diagnóstico del teléfono mostró que YouTube se pausa en el mismo segundo en que la página se oculta, en ambos navegadores; con `youtube-nocookie.com`, ▶ en la notificación no lo reanudó, y con `www.youtube.com` + los filtros de Brave, sí.
- Metadatos de la canción (título, artista, álbum) y carátula **cuadrada en 302 y 544 px** (tamaños que YouTube Music ya tiene listos; Android pide ≥512 y los teléfonos sencillos ≥256). Un video de YouTube sin portada se recorta al cuadrado (512 px).
- Acciones: reproducir, pausar, anterior, siguiente y mover la barra. Las usan las teclas multimedia del PC; en Android, con YouTube, la notificación es la simple del navegador. El estado sigue al reproductor real.
- **Seguir escuchando con la pantalla apagada (YouTube)**: el reproductor de YouTube se pausa al ocultarse la página (lo normal; es función de Premium). Sin ayuda, pulsar ▶ en la notificación **no** lo reanudó en el Android 10 de prueba (Chrome y Brave). Lo que funcionó: Brave + los dos filtros de la comunidad + el reproductor desde `www.youtube.com` (sección siguiente) y, al salir, ▶ en la notificación. La app no lo fuerza, no pulsa ▶ sola ni finge estar a la vista. **No está garantizado** (YouTube y Brave cambian a menudo); está explicado en «Sonando ahora» y en Ayuda.

## Brave: segundo plano y filtros (guía para el usuario)

- El reproductor se carga siempre directo de YouTube (`www.youtube.com/embed/…` o `youtube-nocookie.com/embed/…`, con `rel=0`, `modestbranding=1`, `playsinline=1`, `enablejsapi=1`), nunca por intermediarios.
- Ayuda → «Brave: YouTube en segundo plano» (la receta comprobada): actualizar Brave a la **última** versión (según usuarios, la 1.87.190 lo rompió), activar «Reproducción en segundo plano», pegar los **filtros de la comunidad** (no oficiales) `youtube.com##+js(brave-video-bg-play)` y `youtube.com##+js(brave-disable-pageview-api)` en «Filtros personalizados» (con botón para copiarlos) y cerrar Brave por completo.
- Esos filtros solo actúan sobre youtube.com: con el reproductor en `youtube-nocookie.com` no lo alcanzan y el ▶ de la notificación no reanuda la música (comprobado en el teléfono). Por eso **el reproductor carga por defecto desde `www.youtube.com` en todos los navegadores** (pedido del dueño de la app). La Ayuda deja elegir «más privado» (`soundblue:reproductor-youtube` = `nocookie`; con youtube.com, YouTube puede guardar cookies) y esa elección se respeta. Cambiarlo recarga la app; el registro de diagnóstico anota cuál se usó. Atajo: `…#/ayuda?reproductor=youtube` (o `=nocookie`).
- Texto honesto en la app: el segundo plano depende de Brave y de los cambios de YouTube y no está garantizado. Anuncios: «Brave bloquea muchos anuncios, pero no todos los que YouTube inserta en el video. No es una garantía de cero anuncios.» El aviso fuera de Brave dice «con menos anuncios» (antes «sin comerciales»).

## Por qué no hay ventana flotante ni «servicio en primer plano»

- Es una PWA pura (sin Capacitor ni WebView): la notificación es la Media Session estándar del navegador. Los plugins de Media Session para Capacitor solo sirven en apps empaquetadas.
- La ventana flotante de páginas (`documentPictureInPicture`) solo existe en navegadores de escritorio; la app no la usa.
- InnerTune, OuterTune y SimpMusic son **apps nativas de Android (APK)**: siguen sonando en segundo plano porque usan un servicio en primer plano **y su propio motor de audio, que descarga el audio directamente de YouTube** (sin el reproductor oficial). Esa extracción de audio quedó descartada en este proyecto; con el reproductor oficial (iframe), YouTube decide si pausa al ocultarse la página, incluso dentro de una app nativa.
- La app no pausa por su cuenta en ningún caso: solo cuando el usuario toca ⏸ (en la app o en la notificación).

## ☀ Pantalla encendida

Botón ☀ en «Sonando ahora» (`src/player/useKeepScreenOn.ts`, Screen Wake Lock API): mientras suena música con SoundBlue a la vista, el teléfono no apaga la pantalla solo, así la música no se corta cuando se bloquearía por inactividad. Es opcional (gasta más batería) y se recuerda. No sirve al salir a la pantalla de inicio: la app no puede «fingir» que sigue a la vista; el reproductor de YouTube está en un iframe de otro dominio que la página no puede tocar, y hacerlo sería saltarse la función de pago de YouTube.

## Diagnóstico de segundo plano

Ayuda → «Diagnóstico de segundo plano» muestra un registro (`src/lib/diagnostics.ts`, solo en el navegador) de cuándo se oculta la página y qué reporta el reproductor, con la vista (Canción/Video) y si «Sonando ahora» estaba abierta. Así se ve en el teléfono quién pausa al bloquear la pantalla: si llega «en pausa (con la página oculta)», fue el reproductor de YouTube. «Copiar registro» lo copia como texto para pegarlo en un chat o un correo; al probar con `npm run dev`, también está «Enviar registro al PC» (guarda `diagnostico-telefono.json`). Cambiar cómo se oculta el iframe (1×1, opacidad 0.01, fuera de la pantalla) no lo arregla: con la pantalla apagada toda la página queda oculta, y esas variantes solo servirían para esquivar la detección de YouTube, así que no se usan.

## Jam (escuchar en grupo)

Como la Jam de Spotify: el anfitrión abre una Jam (`#/jam`) y sale un **código QR** (generado en la app con `uqr`, sin servicios externos) y un código de 6 letras. Los invitados entran al enlace (`#/jam/CÓDIGO`), ponen su nombre, buscan en YouTube Music y agregan canciones; cada 3 s el teléfono del anfitrión las pone al final de su «Siguiente en la cola» y avisa quién la agregó. Los invitados ven qué suena y qué viene. La música suena solo en el teléfono del anfitrión. Al terminar se puede guardar como playlist.

- **Al probar**, las Jams las guarda en memoria el propio servidor de Vite (`server/jamDevServer.ts`, ruta `/jam-api`): se borran al cerrar `npm run dev`. Con una dirección local (localhost, 192.168…) el QR solo sirve en ese equipo o esa red.
- **Publicada**, hará falta un servidor con la misma API (por ejemplo el mismo Worker de Cloudflare del intermediario de YouTube Music); su dirección va en el secreto `VITE_JAM_API`. Mientras no exista, «Iniciar Jam» avisa: «Jam todavía no funciona en esta versión: le falta su servidor».
- El service worker no guarda nada fuera de `/soundblue/` (ni `/jam-api` ni `/ytm-api`), para no mostrar datos viejos.

## Búsqueda oficial (clave de la API, respaldo)

No hay una API oficial de YouTube Music, así que este respaldo usa la **YouTube Data API v3** (oficial) y muestra primero las **pistas de YouTube Music**: las que YouTube genera para cada canción en el canal «Artista - Topic». De ellas salen título, artistas y álbum (de su descripción «Provided to YouTube by…») y la portada cuadrada. Los videos musicales van aparte, con su título tal como lo da YouTube. Se reproducen con el mismo id en el reproductor oficial.

- Cada búsqueda nueva gasta 101 de las 10 000 unidades diarias gratis de la clave: **unas 99 búsquedas al día** entre todos los usuarios. Las búsquedas se guardan 24 h en el navegador; repetirlas no gasta cuota.
- Si se agota la cuota o falla la conexión, la app lo avisa y muestra la lista de prueba.
- Sin clave, si YouTube Music no responde, Buscar muestra la lista de prueba.

Crear la clave (gratis, con tu cuenta de Google):

1. Entra a <https://console.cloud.google.com/>, crea un proyecto (p. ej. «SoundBlue»).
2. **APIs y servicios → Biblioteca** → busca **YouTube Data API v3** → **Habilitar**.
3. **APIs y servicios → Credenciales → Crear credenciales → Clave de API**.
4. En la clave: **Restricciones de aplicaciones → Sitios web** y agrega `https://mikem4n.github.io/soundblue/*`, `http://localhost:5173/*` y `http://localhost:4173/*`. En **Restricciones de API**, elige solo **YouTube Data API v3**. Guarda.
5. En tu PC: copia `.env.example` como `.env` y pega la clave en `VITE_YT_API_KEY=`. Reinicia `npm run dev`.
6. En GitHub: **Settings → Secrets and variables → Actions → New repository secret**, nombre `VITE_YT_API_KEY`, valor la clave. La siguiente publicación ya busca en YouTube Music.

La clave queda dentro de la app publicada (así funcionan las claves de navegador); la restricción del paso 4 evita que otros sitios la usen.

## Limitaciones del reproductor de YouTube

- El video se muestra entero (16:9) y sin nada encima: no se recorta a pantalla completa vertical ni se le superponen controles, porque las reglas de YouTube lo prohíben.
- Su logo, título y enlaces («Ver en YouTube») los dibuja YouTube dentro de su iframe: la app no puede ocultarlos (el iframe es de otro dominio). `modestbranding` ya no tiene efecto.

## Publicar en GitHub Pages

El flujo `.github/workflows/deploy.yml` compila (`npm run build`) y publica `dist/` en <https://mikem4n.github.io/soundblue/> cada vez que se suben cambios a `main`.

- El repositorio se llama `soundblue`, igual que `base: '/soundblue/'` en `vite.config.ts`. Si se renombrara, hay que cambiar los dos a la vez; si no coinciden, los archivos dan 404.
- Las rutas usan `#` (`#/ayuda`, `#/biblioteca`…), así que recargar cualquier pantalla funciona en GitHub Pages sin `404.html`.
- GitHub Pages sirve todo por HTTPS (lo necesitan el service worker y la instalación como app).

Primera vez:

1. En GitHub: crea el repositorio público `soundblue` (vacío, sin README).
2. En esta carpeta (Git está en `%LOCALAPPDATA%\Programs\Git\cmd\git.exe` si `git` no aparece en la terminal):
   ```bash
   git remote add origin https://github.com/MikeM4n/soundblue.git
   git push -u origin main
   ```
   La primera vez se abre una ventana para iniciar sesión en GitHub.
3. En el repositorio: **Settings → Pages → Source: GitHub Actions**. Si la primera publicación falló porque Pages aún no estaba activo, en **Actions** elige «Publicar en GitHub Pages» → **Run workflow**.

Para publicar cambios: `git add .`, `git commit -m "..."` y `git push`.

En GitHub (Settings → Secrets and variables → Actions): el **secreto** `VITE_YT_API_KEY` (clave de YouTube, opcional, nunca en el código) y las **variables** `VITE_YTM_PROXY` y `VITE_JAM_API` (direcciones de los intermediarios; no son secretas).

## Privacidad

Sin analítica, publicidad ni rastreadores, y sin CDNs: la fuente Inter y los íconos (lucide-react) se empaquetan con la app. Lo único externo es el reproductor oficial de YouTube (`www.youtube.com` por defecto, para que los filtros de segundo plano de Brave lo alcancen; `youtube-nocookie.com` si el usuario elige «más privado»), el Worker de Cloudflare que consulta YouTube Music y, si hay clave, la YouTube Data API.
