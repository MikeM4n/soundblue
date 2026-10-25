# SoundBlue

App web de música con el estilo de los reproductores modernos (barra lateral, reproductor fijo abajo, tarjetas y listas), en azul rey. Se instala como app desde Brave en Windows y Android (PWA), no usa analítica ni rastreadores, y todas sus fuentes e íconos van dentro del proyecto.

> Estado: catálogo de YouTube Music (búsqueda, Inicio, radios, «Para ti») con el reproductor oficial de YouTube, cola, favoritos, playlists y Jam.

**Dirección de la app: <https://mikem4n.github.io/soundblue/>** (repositorio `soundblue` en GitHub, publicado con GitHub Pages).

> Funciona mejor con Brave y Shields activos. La reproducción en segundo plano de YouTube depende del navegador y de YouTube.

> SoundBlue busca en el catálogo de YouTube Music. Algunas pistas YouTube no las deja reproducir fuera de sus apps: si una falla (ella y sus otras versiones), SoundBlue pasa a la siguiente y deja de mostrarla en tus listas. La búsqueda completa depende de un proxy no oficial que puede dejar de funcionar si YouTube cambia su API.

GitHub Pages solo sirve archivos, así que en la versión publicada el catálogo de YouTube Music (Inicio, búsqueda completa, radios, «Para ti») pasa por un **Cloudflare Worker** gratis (`worker/ytm-proxy.js`, ver «YouTube Music»). Si el Worker falla, la app usa los respaldos: la Data API (si hay clave) y la lista de prueba, con un aviso discreto. **Jam** usa su propio Worker con un Durable Object por sala (`worker/jam.js`, ver «Jam»), pendiente de publicar.

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

## Tema, temporizador, compartir y Tu Top 50

- **Tema** (Ajustes, `src/lib/theme.ts`): «Predeterminado del sistema» (por defecto: `prefers-color-scheme`, también si cambia con la app abierta), «Claro» u «Oscuro» (AMOLED: fondos y paneles en negro puro). Se guarda en `soundblue:ajustes` y va en `<html data-tema>`; `index.html` lo aplica antes de pintar (sin destello) y cambia el color de la barra (`theme-color`). En `src/index.css`, el tema claro cambia las variables de la paleta; `contraste`/`inverso` son los velos, bordes y fichas (blanco en el oscuro, negro en el claro); `text-white` queda blanco en los dos (sobre azul, rojo o la carátula). «Sonando ahora», la mini barra y el panel del PC llevan `siempre-oscuro`.
- **Temporizador** (⋮ de «Sonando ahora», `src/lib/sleepTimer.ts`): 15, 30 o 45 min; al llegar, `player.fadeOutAndPause(5000)` baja el volumen en 5 s y pausa (tu volumen no cambia). No se guarda al cerrar la app.
- **Vibración** (`vibrate()`, 10 ms, si el teléfono la tiene): al soltar un gesto de deslizar y al dar ▶/⏸.
- **Compartir** (⋮ de cualquier canción, `src/lib/share.ts`): tarjeta PNG de 1080×1350 dibujada en `<canvas>` (carátula sobre su versión difuminada, título, artista, «SoundBlue») y enlace `#/cancion/:id` (`src/pages/Song.tsx`: la abre con ▶ y su radio), con `navigator.share`; sin imágenes, solo texto y enlace; sin `share`, copia el enlace.
- **Tu Top 50** (acceso en Inicio → `#/coleccion/top/50`): `listening.top(50)` del historial (`soundblue:historial`, hasta 400 canciones), por veces escuchadas (30 s o más) y, a igual cantidad, la más reciente.

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

## Actualizaciones (que el teléfono no se quede con una versión vieja)

- El service worker (`public/sw.js`) pide la página siempre al servidor con `cache: 'no-cache'` (revalida con ETag; sin conexión usa la copia guardada) y precarga con `cache: 'reload'`. Antes la pedía sin eso y, como GitHub Pages deja guardar cada archivo 10 minutos y Chrome reutiliza la copia al reabrir una pestaña, el teléfono llegó a abrir una versión de hace tres publicaciones.
- Cada compilación escribe `version.json` (la misma versión de `__APP_VERSION__`); el service worker nunca lo guarda. `src/lib/updates.ts` lo consulta (`cache: 'no-store'`) al abrir la app y cada vez que se vuelve a ella: si hay una más nueva y no está sonando nada, recarga sola (una vez por versión, con una marca en `sessionStorage` para no entrar en bucle); si está sonando, ofrece «Actualizar».

## Pantalla de carga

Al abrir la app sale una pantalla negra con el logo: la onda se mueve como una serpiente (una onda que avanza por la línea con los extremos quietos, en bucle) y el nombre «SoundBlue» aparece gradualmente, sin moverse. La animación es un `<animate attributeName="d">` del SVG con 8 cuadros de una onda desplazada (y = 16 − 3,6 · sin(π·t)^0,7 · sin(2π(x−6)/10 − φ), curva suave por 11 puntos); misma estructura de trazo en todos los cuadros para que el navegador interpole. Está en `index.html` (aparece al instante, antes de que cargue la app) y `src/lib/splash.ts` la desvanece a los ~2,4 s desde que se abrió (o cuando la app termina de cargar, si tarda más). Con «reducir movimiento» del teléfono, sin animación y solo 0,6 s.

Antes de esta animación, Android muestra su propia pantalla de arranque de la app instalada (la página no puede quitarla): la dibuja con el ícono `maskable` del manifiesto sobre `background_color`. Por eso el ícono maskable es el logo redondo sobre **negro** (antes era un cuadrado azul) y el negro es el mismo en el manifiesto, `theme-color`, `html`/`body` en línea y la animación (`z-index: 9999`): el paso entre las dos pantallas no se nota. Ese ícono también es el de la pantalla de inicio. Un teléfono que ya tenía la app instalada toma el ícono nuevo cuando Chrome actualiza la app (puede tardar); desinstalar y volver a instalar lo aplica de una vez.

## Controles del sistema (Media Session)

`src/player/mediaSession.ts` publica título, artista, álbum (la lista desde donde suena) y carátula, y responde a reproducir, pausar, anterior, siguiente y mover la barra (`seekto`) desde la notificación, la pantalla de bloqueo o las teclas multimedia. El estado (sonando/pausa y posición) se actualiza con el estado real del reproductor. Con YouTube el sonido sale del iframe, así que cada navegador decide si muestra estos controles o los de YouTube.

## Reproducción en segundo plano

- **YouTube**: reproductor oficial. Que siga sonando al bloquear la pantalla es una capacidad de **Brave**, no de la app; **no está garantizado** y puede cambiar con cada versión de Brave o de YouTube. **Comprobado en un Android 10 real (22 oct. 2026, registros del teléfono)**: YouTube se pausa en el mismo segundo en que la página se oculta, siempre. Con Brave, «Reproducción en segundo plano», los dos filtros de la comunidad y el reproductor cargado desde `www.youtube.com`, pulsar ▶ en la notificación la reanuda y sigue sonando con la página oculta (a veces se vuelve a pausar y hay que pulsar ▶ otra vez). Con `youtube-nocookie.com` o en Chrome, ese ▶ no la reanudó.
- **Auto‑reanudación (experimental, decisión del dueño de la app; zona gris frente a las condiciones de YouTube)** en `src/player/engine.ts`: la app **no pausa ni toca el sonido al salir** (la pausa la hacen YouTube o Chrome). Cuando detecta esa pausa (sonaba o iba a sonar, no la pausó el usuario), manda el Mute‑Trick en el acto (`attemptResume`, 0 ms), otro a los 0,5 s y un respaldo a los 1,5 s desde la pausa (`AUTO_RESUME_SCHEDULE_MS`), y nada más (historia: 1,5 s funcionó a las 04:26; luego 1 s con corte de la app, disparo al ocultarse y 1,5 s + 3 s, ya quitados). Además, en `pagehide` un último `playVideo()` (`lastGasp`); en el teléfono, ir a Inicio no dispara `pagehide`, así que sirve sobre todo cuando el navegador cierra o guarda la pestaña. **Registros del teléfono con la versión 2638f9b (23 oct.)**: saliendo directo a Inicio, la pausa llegó 63 ms después de ocultarse, el propio reproductor intentó arrancar 8 ms después y se volvió a pausar, y los ▶ de la app (1,5 s y 3 s, enviados a tiempo) cargaron ~0,5 s y fueron pausados; pasando por el selector de pestañas de Chrome, el ▶ de la app a 1,5 s cargó 1,1 s y volvió a sonar. Por eso «Sonando ahora» (en una pestaña) y Ayuda muestran el «truco del selector de pestañas» (`src/lib/tabSwitcherTip.ts`), para no saturar al navegador (el contador vuelve a 0 al entrar a la app, al pausar el usuario o al cambiar de canción). **Comprobado en el teléfono (23 oct., 03:41)**: con el ▶ en silencio (`mute()` → `playVideo()` → `mediaSession.playbackState = 'playing'` → volumen de vuelta a los 0,8 s) volvió a sonar oculta en 2 de 3 salidas; sin silencio (prueba de las 03:05) ningún intento funcionó, por eso el ▶ sigue yendo en silencio. El volumen también vuelve al entrar a la app o al cambiar de canción, para que nunca quede en silencio. Registro (cada línea con los milisegundos de `performance.now()` y `visibilityState/hidden`): «visibilitychange: hidden» (anotado en la fase de captura de `window`, con `event.timeStamp`), «player.pauseVideo() detectado», «Ejecutando Mute-Trick (intento n de 3, en el acto, 0 ms | a los 0.5s / 1.5s de la pausa)», «Iniciando temporizador de reanudación (…)», «pagehide: playVideo() como último intento», «Resultado a los 0,8 s del Mute-Trick: Sonando | En pausa | Cargando», «Reproducción confirmada…» y «Volumen devuelto». Cada apertura anota la versión (`__APP_VERSION__`: commit de `GITHUB_SHA` y hora de compilación, definida en `vite.config.ts`), que también sale en Ayuda y al copiar el registro: así se sabe con qué versión se hizo cada prueba (el registro conserva las anteriores). Botones «Prueba manual iniciada» / «Prueba automática iniciada» para separar pruebas. **Prueba de mantener el hilo despierto**: mientras la página está oculta, `src/lib/diagnostics.ts` cuenta cada 250 ms en memoria; no hay garantía de que impida que Android frene la página, pero mide si lo hace: anota cuando el JavaScript estuvo detenido más de 1,5 s y, al volver, cuántas cuentas hubo frente a las esperadas. **Resultado en el teléfono (23 oct.)**: 40 de 40 cuentas en 10,2 s y 17 de 17 en 4,3 s: el JavaScript no se congeló; los ▶ salieron a tiempo y fue el reproductor el que no siguió. El temporizador no cambia nada; queda solo como medición.
- **Al volver a la app**: si quedó en pausa por haber salido (no el usuario), `playVideo()` sin espera; el aviso «▶ Reanudar» solo sale si a los 2 s sigue en pausa.
- **Al abrir la app**: la sesión guarda `playing` (sonaba, o YouTube la pausó al salir). Si estaba en `true`, `VideoStage` llama a `player.autoStart()` en cuanto el reproductor tiene dónde vivir: se carga la última canción con autoplay (el reproductor da ▶ en `onReady`). En una pestaña normal del celular el navegador puede no dejar arrancar con sonido sin un toque (con la app instalada sí suele dejar): a los 7 s, si no arrancó, queda en pausa, lista para ▶. Solo cuenta una pausa que llega en los 3 s después de ocultarse la página o en los 15 s después de un intento (en el teléfono YouTube volvió a pausar ~10 s después de reanudar): una más tarde puede ser ⏸ en la notificación de YouTube (no pasa por la app) y se respeta. Al volver a la app se cancela. El arranque de 5 s (`startTimer`) ahora también actúa con la página oculta, para que siga la siguiente canción. Cada intento queda en el registro de diagnóstico. YouTube puede bloquearlo en cualquier momento: **no está garantizado**. No se mandan metadatos falsos a la Media Session para sostener la notificación: la notificación es del iframe de YouTube y los de la página no la afectan.
- **«▶ Reanudar»** (respaldo si la auto‑reanudación no lo logra y la notificación no aparece): si YouTube pausa la música con la página oculta y no fuiste tú, el motor lo anota (`pausedOnExit`). Al volver, «Sonando ahora» muestra «YouTube pausó la música al salir. ▶ Reanudar» bajo la carátula y, si estaba minimizada, sale un aviso con el mismo botón (`src/player/useResumePrompt.ts`). No se usa un audio silencioso para sostener la notificación.
- **Sin corte al salir** (se quitó el 23 oct.; pudo delatar el proceso ante YouTube): la app **nunca pausa por su cuenta**, ni al salir, ni al minimizar «Sonando ahora», ni al perder el foco. Al volver, `playVideo()` sin espera si quedó en pausa por haber salido.
- **Vista «Canción | Letra»**: «Canción» muestra la carátula grande; «Letra», la letra tipo **karaoke** (la línea que se canta resaltada, la lista avanza sola; tocar una línea lleva la canción a ese momento; si deslizas la letra con el dedo, deja de seguir la canción 4 s). El tiempo sale del reproductor (4 veces por segundo). Letras (`src/data/lyrics.ts`), con tiempos: 1) YouTube Music como su app de Android (cliente `ANDROID_MUSIC` por el mismo Worker: sincronizada con esa misma grabación), 2) LRCLib (`lrclib.net`, formato LRC, la versión que dura lo mismo ± 4 s). Sin tiempos: la de YouTube Music web y lyrics.ovh. Prueba del 25-10-2026 con 15 canciones latinas: YouTube Music con tiempos 15/15 y LRCLib 15/15, pero LRCLib puede traer otra grabación («Lluvia» de Eddie Santiago, 13,5 s adelantada), por eso va segunda. La fuente (Musixmatch, LyricFind, LRCLib…) se muestra al final. La elección se recuerda (`soundblue:vista-youtube`; la antigua «Video» pasa a «Letra»).
- **Decisión del dueño de la app**: desde el 25-10-2026 el video de YouTube **no se muestra en ninguna parte** (ni en «Sonando ahora», ni en el panel del PC, ni en la barra): su reproductor suena oculto (`VideoStage` sin espacios a la vista). Antes ya se ocultaba al minimizar y en la vista «Canción». YouTube pide que su reproductor esté a la vista mientras suena; incumplirlo puede llevar a que YouTube limite la reproducción incrustada en el dominio o revoque la clave de la API. Para volver a pausar al minimizar, basta con pausar en `src/components/player/VideoStage.tsx` cuando no hay espacio a la vista para el video (el bloque «Sin espacio a la vista»).
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

**Canciones «solo en YouTube Music»**: algunas pistas (sobre todo de sellos) YouTube no las deja reproducir fuera de sus apps (errores 100/101/150). La app prueba primero otras versiones de la misma canción; si ninguna sirve, la recuerda (`soundblue:solo-youtube-music`), la salta al avanzar y deja de mostrarla en las listas (ver «Limitaciones»). Desde el 25-10-2026 no hay ningún enlace que saque de SoundBlue («Abrir en YouTube Music» se quitó del menú ⋮, de «Sonando ahora» y de los avisos, a pedido del dueño). No se extrae el audio ni se usan Piped/Invidious.
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
- Acciones: reproducir, pausar, anterior (`previoustrack` → `player.prev()`), siguiente (`nexttrack` → `player.next()`) y mover la barra, con la misma lógica de los botones de la app; los metadatos (título, artista, álbum, carátula 302/544 px o recorte de 512 px) se actualizan en cada cambio de canción (`loadCurrent`). **Pero el navegador solo usa los controles de la parte de la página donde suena el audio**: con YouTube es su iframe, así que la notificación (y las teclas multimedia) son las del reproductor de YouTube, no estas. En Android esa notificación es la simple (solo ▶/⏸; comprobado en un Android 10). La única forma de que el navegador use los de SoundBlue sería tener un audio propio sonando en la página (p. ej. uno silencioso), un truco que no se usa. El estado sigue al reproductor real.
- **Seguir escuchando con la pantalla apagada (YouTube)**: el reproductor de YouTube se pausa al ocultarse la página (lo normal; es función de Premium). Sin ayuda, pulsar ▶ en la notificación **no** lo reanudó en el Android 10 de prueba (Chrome y Brave). Lo que funcionó: Brave + los dos filtros de la comunidad + el reproductor desde `www.youtube.com` (sección siguiente) y, al salir, ▶ en la notificación. La app no lo fuerza, no pulsa ▶ sola ni finge estar a la vista. **No está garantizado** (YouTube y Brave cambian a menudo); está explicado en «Sonando ahora» y en Ayuda.

## Brave: segundo plano y filtros (guía para el usuario)

- El reproductor se carga siempre directo de YouTube (`www.youtube.com/embed/…` o `youtube-nocookie.com/embed/…`, con `rel=0`, `modestbranding=1`, `playsinline=1`, `enablejsapi=1`), nunca por intermediarios.
- Ayuda → «Brave: YouTube en segundo plano» (la receta comprobada): actualizar Brave a la **última** versión (según usuarios, la 1.87.190 lo rompió), activar «Reproducción en segundo plano», pegar los **filtros de la comunidad** (no oficiales) `youtube.com##+js(brave-video-bg-play)` y `youtube.com##+js(brave-disable-pageview-api)` en «Filtros personalizados» (con botón para copiarlos) y cerrar Brave por completo.
- Esos filtros solo actúan sobre youtube.com: con el reproductor en `youtube-nocookie.com` no lo alcanzan y el ▶ de la notificación no reanuda la música (comprobado en el teléfono). Por eso **el reproductor carga por defecto desde `www.youtube.com` en todos los navegadores** (pedido del dueño de la app). La Ayuda deja elegir «más privado» (`soundblue:reproductor-youtube` = `nocookie`; con youtube.com, YouTube puede guardar cookies) y esa elección se respeta. Cambiarlo recarga la app; el registro de diagnóstico anota cuál se usó. Atajo: `…#/ayuda?reproductor=youtube` (o `=nocookie`).
- Texto honesto en la app: el segundo plano depende de Brave y de los cambios de YouTube y no está garantizado. Anuncios: «Brave bloquea muchos anuncios, pero no todos los que YouTube inserta en el video. No es una garantía de cero anuncios.» El aviso fuera de Brave dice «con menos anuncios» (antes «sin comerciales»).

## Por qué no hay pantalla flotante ni «servicio en primer plano»

- La pantalla flotante (Document Picture-in-Picture, solo en Chrome/Edge/Brave del PC) se quitó el 25-10-2026 a pedido del dueño: en el celular no existe y el botón solo mostraba un aviso. El **video** de YouTube tampoco puede flotar desde la app: es un iframe de otro dominio y la página no puede tocar su `<video>`.
- Es una PWA pura (sin Capacitor ni WebView): la notificación es la Media Session estándar del navegador. Los plugins de Media Session para Capacitor solo sirven en apps empaquetadas.
- InnerTune, OuterTune y SimpMusic son **apps nativas de Android (APK)**: siguen sonando en segundo plano porque usan un servicio en primer plano **y su propio motor de audio, que descarga el audio directamente de YouTube** (sin el reproductor oficial). Esa extracción de audio quedó descartada en este proyecto; con el reproductor oficial (iframe), YouTube decide si pausa al ocultarse la página, incluso dentro de una app nativa.
- La app no pausa por su cuenta en ningún caso: solo cuando el usuario toca ⏸ (en la app o en la notificación).

## Diagnóstico de segundo plano

Ayuda → «Diagnóstico de segundo plano» muestra un registro (`src/lib/diagnostics.ts`, solo en el navegador) de cuándo se oculta la página y qué reporta el reproductor, con la vista (Canción/Letra) y si «Sonando ahora» estaba abierta. Así se ve en el teléfono quién pausa al bloquear la pantalla: si llega «en pausa (con la página oculta)», fue el reproductor de YouTube. «Copiar registro» lo copia como texto para pegarlo en un chat o un correo; al probar con `npm run dev`, también está «Enviar registro al PC» (guarda `diagnostico-telefono.json`). Cambiar cómo se oculta el iframe (1×1, opacidad 0.01, fuera de la pantalla) no lo arregla: con la pantalla apagada toda la página queda oculta, y esas variantes solo servirían para esquivar la detección de YouTube, así que no se usan.

## Jam (escuchar en grupo)

Como la Jam de Spotify: el anfitrión abre una Jam (`#/jam`) y sale un **código QR** (generado en la app con `uqr`, sin servicios externos) y un código de 6 letras. Los invitados entran al enlace (`#/jam/CÓDIGO`), ponen su nombre y agregan canciones con la búsqueda de la Jam o, en cualquier página, con «⋮ → Agregar a la Jam»: la Jam en la que están se recuerda en el navegador (`src/jam/guestJam.ts`) hasta que tocan «Salir». El teléfono del anfitrión las pone al final de su «Siguiente en la cola» apenas llegan y avisa quién la agregó; el anfitrión agrega igual (búsqueda de su Jam o «⋮ → Agregar a la cola»), porque su cola es la compartida. Todos ven en «Próximas en sonar» qué suena (o si está en pausa), qué viene, quién agregó cada una y lo recién agregado («En camino» hasta que el teléfono del anfitrión lo toma). En esa lista, **deslizar a la derecha quita la canción** con «Deshacer» (el anfitrión, cualquiera; cada invitado, solo las suyas: lleva un id al azar guardado en su navegador que el servidor guarda sin publicarlo) y el anfitrión, deslizando a la izquierda, la pone a sonar a continuación. «⋮» abre el menú. La música suena solo en el teléfono del anfitrión. Al terminar se puede guardar como playlist.

- **En vivo**: cada sala tiene un WebSocket (`/jams/:code/live`) que avisa cada cambio al instante a todos los teléfonos; si no conecta o se cae, la app consulta cada 3 s y lo reintenta (`src/jam/live.ts`). El contrato completo (rutas HTTP y mensajes) está en el comentario de `src/jam/api.ts`; las reglas de una sala, en `worker/jam-room.ts`, compartidas por los dos servidores.
- **Al probar**, las Jams las guarda en memoria el propio servidor de Vite (`server/jamDevServer.ts`, ruta `/jam-api`, con su WebSocket): se borran al cerrar `npm run dev`. Con una dirección local (localhost, 192.168…) el QR solo sirve en ese equipo o esa red; para el teléfono se usa el túnel https de `cloudflared` (solo para probar, no para la versión final).
- **Publicada**: el Worker `worker/jam.js` (Cloudflare, nombre `soundblue-jam`): un Durable Object por sala, de clase SQLite (plan gratis), con WebSockets con hibernación; las Jams sin actividad se borran a las 12 horas. CORS solo para `https://mikem4n.github.io` y `localhost` (5173, 5174, 4173). Probarlo en el PC sin cuenta: `npm run worker:jam:dev` (en `http://localhost:8787`) y la app con `VITE_JAM_API=http://localhost:8787`. Publicarlo, con la cuenta de Cloudflare del dueño: `npm run worker:jam:publicar`; después, la variable del repositorio `VITE_JAM_API` con su dirección (`https://soundblue-jam.<cuenta>.workers.dev`). Mientras no esté, «Iniciar Jam» avisa: «Jam todavía no funciona en esta versión: le falta su servidor».
- **Red local (Wi-Fi) sin servidor: no es viable.** Una página web no puede abrir un servidor en el teléfono, y conectar los teléfonos directamente (WebRTC) exige intercambiar los datos de conexión por un servidor (o escanear dos QR por invitado), sin garantía en redes que aíslan a los equipos. Con `npm run dev:red` la API de Jam sí responde en la red local (la atiende el PC), pero YouTube bloquea la mayoría de canciones en `http://192.168…` y es el anfitrión quien las reproduce. Para probar, `npm run dev` + el túnel https; para la versión final, el Worker.
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

- El video ya no se muestra (ver «Decisión del dueño» arriba). Nunca se recortó ni se le superpuso nada: el «modo TikTok» (zoom del video con la letra encima) no se hizo; la letra va sola, en la vista «Letra».
- **Controles de reloj, carro y Bluetooth, y ⏮ ⏭ en la notificación**: los manejadores de la Media Session (`previoustrack`, `nexttrack`…) están registrados (`src/player/mediaSession.ts`), pero el navegador entrega la notificación y los botones del sistema al iframe de YouTube, que es el que suena; por eso solo hay ▶/⏸. Para que fueran los de SoundBlue haría falta un `<audio>` propio: con el audio de YouTube eso es extraerlo (descartado en este proyecto y prohibido por YouTube), y con un audio silencioso de truco también se descartó.
- Su logo, título y enlaces («Ver en YouTube») los dibuja YouTube dentro de su iframe: la app no puede ocultarlos (el iframe es de otro dominio). `modestbranding` ya no tiene efecto.
- **Canciones que no se dejan reproducir fuera de YouTube** (errores 100/101/150): YouTube Music no dice de antemano cuáles son (solo lo sabe el reproductor al intentarlo). Probado el 25-10-2026: 108 de 108 canciones de YouTube Music sonaron; de 247 videos oficiales y versiones, 56 no, y el oEmbed de YouTube (401 = incrustar desactivado) solo avisó de 5 de esas 56, así que no sirve como filtro previo. Lo que hace la app: si una falla, prueba hasta 3 versiones; si ninguna suena, la recuerda (`soundblue:solo-youtube-music`), la quita de tu cola, de lo que sigue y de las pestañas, no se deja agregar otra vez y no aparece en ninguna lista (Buscar, playlists, Inicio, la Jam). Solo se ve si es la que suena, con el aviso «No disponible aquí».

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

Sin analítica, publicidad ni rastreadores, y sin CDNs: la fuente Inter y los íconos (lucide-react) se empaquetan con la app. Lo único externo es el reproductor oficial de YouTube (`www.youtube.com` por defecto, para que los filtros de segundo plano de Brave lo alcancen; `youtube-nocookie.com` si el usuario elige «más privado»), el Worker de Cloudflare que consulta YouTube Music, las APIs de letras LRCLib y lyrics.ovh (solo si YouTube Music no tiene la letra con tiempos o sin ellos; reciben el artista, el título y la duración, no cargan ningún script) y, si hay clave, la YouTube Data API.
