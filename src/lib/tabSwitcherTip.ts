// «Truco del selector de pestañas» (Chrome, en una pestaña): en los registros del teléfono (23 oct.), saliendo directo a
// Inicio YouTube/Chrome pausan y no dejan reanudar; si primero se abre el selector de pestañas, la app logra que vuelva a
// sonar. Se muestra en «Sonando ahora» (ℹ️) y en Ayuda. Sin promesas: puede cambiar con Chrome o YouTube.
export const TAB_SWITCHER_TIP =
  '💡 Para que la música siga sonando: si vas a salir de la app, no presiones el botón Inicio directamente. Primero toca el icono de pestañas de Chrome (el número arriba) y, desde ahí, presiona Inicio. La música se corta un instante y vuelve sola (así funcionó en las pruebas; no está garantizado).'

/** El truco solo aplica en una pestaña del navegador (la app instalada no tiene selector de pestañas). */
export const inBrowserTab = () => !window.matchMedia('(display-mode: standalone)').matches
