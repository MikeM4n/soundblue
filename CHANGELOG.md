# Historial de cambios

## 2026-10-24

- Inicio por géneros, Modos de ambiente y limpieza de etiquetas (rama `feat/inicio-generos-ambiente`, pendiente de la prueba del dueño):
  - Bajo «Tus me gusta» y «Jam» solo van tus canciones (las que te gustan y, si faltan, las últimas que sonaron); ya no las del catálogo de prueba.
  - Modos de ambiente: Modo Rumba (Salsa, Reggaetón, Merengue, Electrónica), Modo Tomar (Despecho, Rancheras, Vallenato) y Modo Relax (Baladas, Boleros, Chill), cada uno con «Todo» y sus subfiltros.
  - «Selecciones rápidas» por género (Salsa, Reggaetón, Merengue, Popular), ya no a partir del historial. «Muy sonadas» son las playlists de cada género (Salsa, Reggaetón, Merengue, Popular, Vallenato, Música colombiana).
  - Las canciones salen de las playlists que arma YouTube Music para cada género: su categoría de «Géneros» y búsquedas como «salsa para fiesta». Pasan por los filtros de las recomendaciones: sin covers, sin artistas que sueles saltar, 2 por artista y sin repetidas.
  - «Tus artistas» tiene «+ Agregar más artistas».
  - Sin las etiquetas «YouTube Music» en filas, Buscar, Inicio, páginas de playlist y subtítulos. Se dejó el botón de acción «Abrir en YouTube Music» y la explicación de Ayuda.
  - El reproductor carga siempre desde youtube.com, así lo alcanzan la opción de segundo plano y los filtros de Brave. Se quitó la opción nocookie de Ayuda.
- Limpieza de Inicio, recomendaciones, cola de 10 y sin conexión (rama `feat/ui-recomendaciones-offline`, pendiente de la prueba del dueño):
  - Inicio sin «Lista de prueba». Todo en lista compacta (carátula pequeña, título, artista y «⋮»), en páginas de 4 que se deslizan de lado.
  - Menú «⋮» en todas las filas (también en Inicio) con Reproducir, Agregar a la cola, Me gusta… Deslizar a la izquierda abre ese menú; ya no agrega nada por sí solo.
  - Ajustes (nuevo): ocultar el selector «Canción | Video» de «Sonando ahora».
  - «Selecciones rápidas» propias: la radio de tus últimas 10 canciones (mismo género y época), con filtros «Como …». Reemplaza la de YouTube Music, que sin iniciar sesión no es personal.
  - Tendencias y novedades de YouTube Music solo de tus géneros: artistas que aparecen en las radios de lo que escuchas. Fuera «Versiones y remixes».
  - Filtros estrictos en todo: sin covers, sin artistas que sueles saltar (pasar a la siguiente antes de 30 s, 2 veces o más), misma época, 2 por artista como mucho y nada repetido entre estantes (tampoco con «Tus artistas»).
  - Cola: siempre 10 o más por sonar. Al quitar una, la radio repone enseguida. Al tocar una recomendada, la cola arranca con 10 «Recomendadas basadas en esta canción» y sigue con bloques de 5 «Nuevas para ti» (nunca sonaron aquí) y más recomendadas.
  - Sin conexión: aviso y espera, sin saltar canciones en cadena ni marcarlas como «Solo en YouTube Music» (antes pasaba). Al volver internet sigue la misma canción.
  - No se implementó la descarga de canciones ni el paso a `<audio>` nativo: chocan con la regla del proyecto y con las condiciones de YouTube.
- Cero repetidas, cola infinita e Inicio solo con ▶ (rama `feat/fix-duplicados-ux`, pendiente de la prueba del dueño):
  - Causa de la canción doble en la cola: en el carrusel de «Tus artistas», deslizar de lado una fila la agregaba sin querer a «Siguiente en la cola», y luego volvía a sonar en la lista.
  - En Inicio las filas ya no tienen menú «⋮» ni gestos de agregar/quitar: solo ▶. Tocar algo en Inicio reemplaza la cola; las canciones de «Tus artistas» arrancan su radio.
  - Ninguna canción (mismo videoId) entra dos veces: ni repetida dentro de una lista, ni si ya está en tu cola, ni desde la radio, ni con «Agregar a la cola» («Ya está en siguientes»).
  - La radio trae como mucho 1 canción del mismo artista por cada 5; el resto (80 %) son otros artistas del mismo género.
  - Cola infinita: cuando a cualquier lista le quedan 2 canciones, sigue con la radio (mismo género y época) de su última canción, y si una radio se agota se arma otra. Con «repetir» activado no se agrega nada.
  - Ayuda → «Diagnóstico de recomendaciones» muestra las canciones descartadas por duplicado y el motivo de cada una.
- Se cierra el experimento de segundo plano basado en Mute-Trick: descartado, iframe de YouTube silenciado por Chrome a nivel de proceso. Repo de preview: su página de GitHub Pages se dio de baja (https://mikem4n.github.io/soundblue-preview/ da 404); el repositorio `MikeM4n/soundblue-preview` lo borra el dueño desde GitHub (Settings → Danger Zone), porque la credencial de este PC no tiene permiso para borrar repositorios.
- Radio por artista, género y época (rama `feat/radio-genero-epoca`, pendiente de la prueba del dueño): al reproducir desde Buscar (y en «Iniciar radio») la cola ya no son los demás resultados de la búsqueda (salían covers y canciones que solo comparten palabras con el título), sino una radio que se llena de a 5 cuando quedan 2: mismo artista (máx. 2 de cada 5) y otros artistas del mismo género (radio de YouTube Music a partir de la canción, no de su título), sin covers ni versiones del título de la semilla, sin repetidas, en la misma época (año del álbum ±10 años; con canciones viejas, nada de los últimos 3 años), al azar con una semilla por sesión. Diagnóstico en Ayuda: época detectada, descartadas por motivo y últimas 10 generadas.
- «Tus artistas» (Inicio): cada artista muestra sus 5 canciones más conocidas (estante «Canciones» de su página de YouTube Music, sin cuota), guardadas 24 h por artista; respaldo con la YouTube Data API solo si YouTube Music falla. Diagnóstico en Ayuda → «Diagnóstico de recomendaciones». Rama `feat/artistas-top-canciones`, pendiente de la prueba del dueño.
