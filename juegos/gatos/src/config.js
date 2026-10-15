// Constantes del mundo. Unidades = "u" (≈ px del mundo). y crece hacia abajo (como Pixi).
export const LEVEL_W = 3800;          // nivel largo: resortera muy a la izquierda, fortaleza lejos a la derecha
export const GROUND = 2400;           // superficie de la barra de cocina (el piso de juego)
// Límites que la cámara puede mostrar (el fondo se pinta cubriendo todo esto)
export const BOUNDS = {x0: -300, y0: -700, x1: LEVEL_W + 300, y1: GROUND + 560};
export const X0 = LEVEL_W / 2;        // centro de referencia del parallax

// Física (research/README.md): parábola pura, ~media gravedad -> vuelo largo y "pesado".
// Matter 0.20: aceleración = gravity.y * gravity.scale en u/ms².
export const GRAVITY = 0.000765;      // = 765 u/s² -> tiro a 45° con v≈1515 u/s: alcance ≈3000 u, vuelo ≈2.8 s
export const STEP_MS = 1000 / 120;    // substeps fijos
export const V_UNIT = 1000 / 60;      // Matter guarda la velocidad en u por 16.67 ms

export const CAT_R = 56;              // radio del gato (~4% del alto en la vista completa)
export const SLING = {x: 640, h: 320}; // resortera: base en (x, GROUND), alto h

// niveles en orden (game/levels/<id>.json)
export const LEVELS = ['1-1', '1-2', '1-3', '1-4', '1-5', '1-6', '1-7', '1-8'];
// Mundo 2 (Jardín) en construcción: se cargan pero aún no salen en el selector (entrar con ?level=2-1)
export const DEV_LEVELS = ['2-1'];

export const CATS = {
  omi:  {img: 'assets/cats/omi.png',  flyImg: 'assets/cats/omi-up.png', fur: ['#FFFFFF', '#D8CFC2', '#6B5844']},
  mako: {img: 'assets/cats/mako.png', fur: ['#FFFFFF', '#E4E4EA', '#3C3A3F']},
  miu:  {img: 'assets/cats/miu.png',  fur: ['#E6CFAE', '#B48E66', '#3A2A20']},
};
