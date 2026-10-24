# Historial de cambios

## 2026-10-24

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
