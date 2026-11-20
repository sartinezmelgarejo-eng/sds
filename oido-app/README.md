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
- **HOJA FRASE** (20-nov, `frase.js`): tocar un cuadrito de frase (📻 RADIO › 〰 TIRA; tablet: debajo de la tira) abre la frase
  para editarla. Teléfono de pie = hoja completa en una columna; acostado = onda + ▶ a la izquierda, ajustes a la derecha;
  tablet = en el panel derecho (✕ vuelve a la pista). Dentro:
  - **onda** de la frase con su **rejilla de compases** (a SU tempo, desde el «1») y un poco de lo de antes/después en gris.
  - asas **◀ INICIO / FIN ▶**: arrastrar = se pegan al compás; **mantener 0,4 s y luego mover** = libre y fino (×¼, azul).
  - **arrastrar la onda ↔ = mover el «1»** (raya naranja; se pega al golpe más cercano; mantener = libre). Inicio y fin van
    pegados a la rejilla, así que se mueven con ella (la onda no se mueve).
  - **TEMPO** «♩ 93 → 96»: arrastrar ↕ el número (mantener = décimas) · **÷2 ×2** (misma onda, recuenta compases) ·
    **SUENA A**: SU TEMPO | AL PROYECTO (= «CAE A» de la Mac).
  - **LARGO** 1 · 2 · 4 · 8 compases · **SONIDO** SECO | CON FX · **BANDA** TODO · GRAVES · MEDIOS · AGUDOS.
  - **▶ OÍR EN LOOP** (suena de verdad: una «radio» sintetizada con WebAudio; respeta tempo, largo, «1», seco/FX, banda; cabezal
    azul) · **CLIC** del compás · **→ PISTA X** (a SU pista: la de su nombre o RADIO; deja una región en el compás donde vas).
  - **✎ NOMBRE** (o tocar el título) · **🗑 BORRAR FRASE** (aviso con DESHACER). Cada cambio entra al ↶.
  - El audio es de mentira pero coherente: cada frase tiene un tempo/«1» «reales» y el detectado trae error (la 2 salió a la
    mitad → ×2; las demás con el «1» corrido ~0,1–0,2 s → mover el «1» al golpe alto).

## Archivos
`index.html` · `estilo.css` · `datos.js` (pistas, plugins reales de Samuel, presets y estaciones de mentira) ·
`sonido.js` (batería WebAudio + secuenciador; expone `Sonido.ctx`) · `frase.js` (HOJA FRASE: modelo, dibujo, gestos,
sonido; se engancha con `Object.assign(ACC, FraseEd.acc)` / `Object.assign(PD, FraseEd.pd)`) · `app.js` (vistas, gestos, browser) · `manifest.webmanifest` + iconos.
Sin frameworks, sin build: se abre `index.html` servido por cualquier servidor estático
(`python3 -m http.server` en esta carpeta).

Diseño: `docs/APP_ACOMPANANTE.md` (§12 CADENA, BROWSER Y TRACKS + el prototipo).
