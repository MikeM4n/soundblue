# Historial de cambios

## 2026-10-24

- Se cierra el experimento de segundo plano basado en Mute-Trick: descartado, iframe de YouTube silenciado por Chrome a nivel de proceso. Repo de preview: su página de GitHub Pages se dio de baja (https://mikem4n.github.io/soundblue-preview/ da 404); el repositorio `MikeM4n/soundblue-preview` lo borra el dueño desde GitHub (Settings → Danger Zone), porque la credencial de este PC no tiene permiso para borrar repositorios.
- «Tus artistas» (Inicio): cada artista muestra sus 5 canciones más conocidas (estante «Canciones» de su página de YouTube Music, sin cuota), guardadas 24 h por artista; respaldo con la YouTube Data API solo si YouTube Music falla. Diagnóstico en Ayuda → «Diagnóstico de recomendaciones». Rama `feat/artistas-top-canciones`, pendiente de la prueba del dueño.
