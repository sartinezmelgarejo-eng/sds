# Oído en la mano · prototipo web

Prototipo **para picar y opinar**: la app de acompañamiento de Oído (teléfono y tablet), con datos de mentira.
**No se conecta a Oído.** Lo único que suena es la batería del RITMO (sintetizada con WebAudio en el propio teléfono).

En línea: https://sartinezmelgarejo-eng.github.io/sds/oido-app/

## Qué hay
- **Teléfono de pie**: barra fija con ● GRABAR · ▶/❚❚ · ＋ TRACK y 4 pestañas abajo (▦ RITMO · 📻 RADIO · 🎚 PISTAS · ▤ CANCIÓN).
- **Teléfono acostado**: pestañas en el riel izquierdo, ▶ ● ↶ ＋TRACK en el derecho (los pulgares).
- **Tablet** (o compu, ventana ≥ 1000×700): todo a la vista: pistas a la izquierda, la vista en medio
  (RITMO 8 filas · RADIO · CANCIÓN · MEZCLA), la pista elegida con su cadena a la derecha.
- **RITMO**: un sonido a la vez en 4×4 grande (un renglón por tiempo); toca = poner/quitar, arrastra = pintar,
  mantén = afinar (fuerza, adelanto/atraso; MÁS: largo, repite, tono). Puntitos = otros sonidos en ese paso.
  ● GRABAR con ▶: tocar los sonidos los escribe en el patrón. ⋯ = rejilla, limpiar, swing, compases, kit.
- **RADIO**: estaciones (buscador), ✋ FX con 2 pads XY (multitoque) + 4 perillas, SECO, plugins de la radio;
  〰 TIRA: arrastrar = frase al compás, ¡ESO! = últimos 4 c.
- **PISTAS**: lista (≡ ordenar, M, S) → página de la pista: volumen, paneo, entrada, instrumento,
  cadena con ⏻ PRENDIDO/APAGADO, ≡ ordenar, deslizar ← = quitar, ⋯ = abrir/cambiar/quitar, ＋ AGREGAR EFECTO.
  Plugin abierto: presets ‹ ▾ › con ★, 8 perillas, cambiar, quitar.
- **BROWSER**: buscar plugin o preset, ★ favoritos, 🕘 recientes, por tipo y fabricante; tocar = probar en la
  pista (sus presets se abren debajo) → ✓ QUEDARSE o ✕ NO.
- **＋ TRACK**: AUDIO · INSTRUMENTO (abre el browser de instrumentos) · BATERÍA. Nombre y color tocando el nombre.
- ↶ deshace todo (y los avisos traen DESHACER).

## Archivos
`index.html` · `estilo.css` · `datos.js` (pistas, plugins reales de Samuel, presets y estaciones de mentira) ·
`sonido.js` (batería WebAudio + secuenciador) · `app.js` (vistas, gestos, browser) · `manifest.webmanifest` + iconos.
Sin frameworks, sin build: se abre `index.html` servido por cualquier servidor estático
(`python3 -m http.server` en esta carpeta).

Diseño: `docs/APP_ACOMPANANTE.md` (§12 CADENA, BROWSER Y TRACKS + el prototipo).
