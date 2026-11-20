// Datos de MENTIRA (realistas) para el prototipo. Nada de esto viene de Oído.
'use strict';

const COLORES = ['#4f86c6', '#5aa05a', '#e0773b', '#ff4a14', '#a65fc0', '#3aa6a0', '#c9a23a', '#d9534f'];

const PADS = [
  { nombre: 'BOMBO', color: '#e0773b' }, { nombre: 'CAJA', color: '#d9534f' },
  { nombre: 'HAT', color: '#e8b33a' }, { nombre: 'HAT A', color: '#c9a23a' },
  { nombre: 'CLAP', color: '#4f86c6' }, { nombre: 'TOM', color: '#5aa05a' },
  { nombre: '📻 RADIO', color: '#ff4a14' }, { nombre: 'SHAKER', color: '#a65fc0' },
];

// tipo → nombres de las 8 perillas genéricas
const PERILLAS_POR_TIPO = {
  REVERB: ['MEZCLA', 'DECAY', 'PREDELAY', 'TAMAÑO', 'BAJOS', 'ALTOS', 'MODUL.', 'ANCHO'],
  DELAY: ['TIEMPO', 'FEEDBACK', 'MEZCLA', 'SATURA', 'FILTRO B', 'FILTRO A', 'WOW', 'ANCHO'],
  EQ: ['GRAVES', 'MEDIOS', 'FREC. M', 'AGUDOS', 'CORTE B', 'CORTE A', 'Q', 'SALIDA'],
  COMP: ['ENTRA', 'SALE', 'ATAQUE', 'SUELTA', 'RATIO', 'RODILLA', 'MEZCLA', 'SIDECHAIN'],
  SATURA: ['DRIVE', 'TONO', 'GRAVES', 'AGUDOS', 'MEZCLA', 'SALIDA', 'ESTILO', 'PUNCH'],
  MODULA: ['VELOC.', 'PROFUND.', 'MEZCLA', 'FEEDBACK', 'ANCHO', 'TONO', 'FASE', 'SALIDA'],
  FILTRO: ['CORTE', 'RESO', 'DRIVE', 'LFO', 'VELOC.', 'ENVOLV.', 'MEZCLA', 'SALIDA'],
  LIMITA: ['ENTRA', 'TECHO', 'SUELTA', 'ESTILO', 'LOOKAHEAD', 'TRUE PEAK', 'ANCHO', 'SALIDA'],
  MULTI: ['CORTE 1', 'CORTE 2', 'GRAVES', 'MEDIOS', 'AGUDOS', 'PENDIENTE', 'MEZCLA', 'SALIDA'],
  UTIL: ['GANANCIA', 'PAN', 'ANCHO', 'FASE', 'MONO B', 'DC', 'MEZCLA', 'SALIDA'],
  SINTE: ['CUTOFF', 'RESO', 'DRIVE', 'ATTACK', 'DECAY', 'SPACE', 'WARP', 'LFO'],
  PIANO: ['TONO', 'CUERPO', 'MARTILLO', 'PEDAL', 'CUARTO', 'ANCHO', 'VELOC.', 'VOLUMEN'],
  SAMPLER: ['MACRO 1', 'MACRO 2', 'MACRO 3', 'MACRO 4', 'ATTACK', 'RELEASE', 'FILTRO', 'VOLUMEN'],
  BATERIA: ['BOMBO', 'CAJA', 'HATS', 'TONO', 'CUARTO', 'APRIETA', 'SWING', 'VOLUMEN'],
};

// presets de mentira por tipo (+ algunos por plugin)
const PRESETS_POR_TIPO = {
  REVERB: ['Plate Brillante', 'Cuarto Chico', 'Sala de Concierto', 'Catedral', 'Shimmer Lento', 'Vocal Cálida', 'Snare Plate 80s', 'Cámara de Eco', 'Ambiente Sutil', 'Infinito', 'Iglesia Vacía', 'Spring Surf'],
  DELAY: ['Slapback', 'Corchea Ping-Pong', 'Cinta Vieja', 'Dub Infinito', 'Negra con Puntillo', 'Doble Voz', 'Eco de Cañón', 'Analógico Oscuro', 'Lo-Fi Cassette', 'Rebote Estéreo'],
  EQ: ['Limpia Graves', 'Aire Vocal', 'Teléfono', 'Bombo Gordo', 'Quita Barro', 'Brillo Suave', 'Plano'],
  COMP: ['Voz Delante', 'Bus Batería', 'Bajo Parejo', 'Todos los Botones', 'Pegamento', 'Suave 2:1', 'Aplasta'],
  SATURA: ['Cinta Caliente', 'Tubo Sucio', 'Distorsión Ligera', 'Punch', 'Radio Vieja', 'Fuzz', 'Cálido'],
  MODULA: ['Chorus Ancho', 'Flanger Jet', 'Phaser Lento', 'Vibrato', 'Ensemble', 'Leslie'],
  FILTRO: ['Barrido Lento', 'Wah Auto', 'Pasa Bajos', 'Resonante', 'Ritmo 1/8'],
  LIMITA: ['Master Moderno', 'Transparente', 'Fuerte', 'Streaming −14'],
  MULTI: ['Graves Mono', 'Tres Bandas Suaves', 'Aplastar Medios'],
  UTIL: ['Neutro', 'Mono Graves', 'Ancho'],
  SINTE: ['Glass Pad', 'Reese Profundo', 'Lead Brillante', 'Sub Redondo', 'Pluck Cristal', 'Pad Atardecer', 'Bajo Acid', 'Campanas', 'Cuerdas Analógicas', 'Arpegio Neón', 'Brass Gordo', 'Noise Sweep', 'Supersaw', 'Wobble', 'Vintage Keys', 'Polvo Estelar'],
  PIANO: ['Felt Íntimo', 'Concierto Brillante', 'Rhodes Mk I', 'Wurli Sucio', 'Upright Viejo', 'Pop Comprimido', 'Clavinet', 'CP-80', 'Lo-Fi Keys'],
  SAMPLER: ['Cuerdas Legato', 'Coro Ahh', 'Guitarra Nylon', 'Marimba', 'Flauta Andina', 'Vibráfono', 'Kalimba', 'Pizzicato'],
  BATERIA: ['Boom Bap', 'Kit 808', 'Cumbia Sonidera', 'Acústico Seco', 'Lo-Fi Polvo', 'Techno Duro', 'Jersey Club', 'Reggaetón 95'],
};
const PRESETS_DE = {
  'Serum 2': ['BA Reese Profundo', 'BA Sub Redondo', 'LD Supersaw Festival', 'PL Pluck Cristal', 'PD Atardecer', 'SY Wobble 1/8', 'FX Noise Sweep', 'KY Vintage Keys', 'BA Neuro', 'PD Polvo Estelar'],
  'Keyscape': ['LA Custom C7 · Felt', 'LA Custom C7 · Pop', 'Rhodes Mk I · Clásico', 'Wurlitzer 200A · Sucio', 'Clavinet C · Funk', 'Yamaha CP-80', 'Toy Piano', 'Celesta'],
  'Omnisphere': ['Glass Pad', 'Analog Strings Lush', 'Ambient Dreams', 'Pluck Harp Grain', 'Distant Choir', 'Warm Analog Bass', 'Bell Shimmer', 'Dark Drone'],
  'ValhallaVintageVerb': ['Concert Hall 1970s', 'Plate Bright 1980s', 'Chamber Now', 'Smooth Random', 'Chorus Space', 'Dirty Hall'],
  'EchoBoy': ['Studio Tape', 'Space Echo', 'Memory Man', 'Rainbow Tape', 'Dub Delay', 'TelRay', 'Ping Pong'],
  'Decapitator': ['Ampex A', 'EMI E', 'Neve N', 'Triode T', 'Pentode P', 'Punish'],
};

// catálogo de plugins (nombres reales de lo que Samuel usa; tipos y presets de mentira)
const PLUGINS = [
  // instrumentos
  ['Serum 2', 'Xfer Records', 'SINTE', 1], ['Omnisphere', 'Spectrasonics', 'SINTE', 1], ['Keyscape', 'Spectrasonics', 'PIANO', 1],
  ['Pigments', 'Arturia', 'SINTE', 1], ['Analog Lab', 'Arturia', 'SINTE', 1], ['Prophet V3', 'Arturia', 'SINTE', 1],
  ['Mini V', 'Arturia', 'SINTE', 1], ['Stage-73 V', 'Arturia', 'PIANO', 1], ['Piano V', 'Arturia', 'PIANO', 1],
  ['Kontakt 7', 'Native Instruments', 'SAMPLER', 1], ['Massive X', 'Native Instruments', 'SINTE', 1],
  ['Battery 4', 'Native Instruments', 'BATERIA', 1], ['Diva', 'u-he', 'SINTE', 1], ['Hive 2', 'u-he', 'SINTE', 1],
  ['Zebra2', 'u-he', 'SINTE', 1], ['Repro-1', 'u-he', 'SINTE', 1], ['Vital', 'Vital Audio', 'SINTE', 1],
  ['Batería de Oído', 'Oído', 'BATERIA', 1], ['Sampler de Oído', 'Oído', 'SAMPLER', 1],
  ['DLSMusicDevice', 'Apple', 'SAMPLER', 1], ['AUSampler', 'Apple', 'SAMPLER', 1],
  // efectos de Oído
  ['EQ', 'Oído', 'EQ', 0], ['COMPRESOR', 'Oído', 'COMP', 0], ['REVERB', 'Oído', 'REVERB', 0], ['DELAY', 'Oído', 'DELAY', 0],
  ['SATURADOR', 'Oído', 'SATURA', 0], ['LIMITADOR', 'Oído', 'LIMITA', 0], ['TRES BANDAS', 'Oído', 'MULTI', 0],
  // Soundtoys
  ['EchoBoy', 'Soundtoys', 'DELAY', 0], ['EchoBoy Jr', 'Soundtoys', 'DELAY', 0], ['Decapitator', 'Soundtoys', 'SATURA', 0],
  ['PrimalTap', 'Soundtoys', 'DELAY', 0], ['Tremolator', 'Soundtoys', 'MODULA', 0], ['PanMan', 'Soundtoys', 'MODULA', 0],
  ['MicroShift', 'Soundtoys', 'MODULA', 0], ['Radiator', 'Soundtoys', 'SATURA', 0], ['PhaseMistress', 'Soundtoys', 'MODULA', 0],
  ['FilterFreak', 'Soundtoys', 'FILTRO', 0], ['Little Plate', 'Soundtoys', 'REVERB', 0], ['Crystallizer', 'Soundtoys', 'DELAY', 0],
  ['Devil-Loc', 'Soundtoys', 'COMP', 0], ['SuperPlate', 'Soundtoys', 'REVERB', 0],
  // Valhalla
  ['ValhallaVintageVerb', 'Valhalla DSP', 'REVERB', 0], ['ValhallaRoom', 'Valhalla DSP', 'REVERB', 0],
  ['ValhallaShimmer', 'Valhalla DSP', 'REVERB', 0], ['ValhallaSpaceModulator', 'Valhalla DSP', 'MODULA', 0],
  ['ValhallaSupermassive', 'Valhalla DSP', 'REVERB', 0], ['ValhallaDelay', 'Valhalla DSP', 'DELAY', 0],
  // NI
  ['Raum', 'Native Instruments', 'REVERB', 0], ['Replika', 'Native Instruments', 'DELAY', 0], ['Phasis', 'Native Instruments', 'MODULA', 0],
  ['Guitar Rig 7', 'Native Instruments', 'SATURA', 0], ['Supercharger', 'Native Instruments', 'COMP', 0],
  // UADx
  ['UADx 1176LN Rev E', 'Universal Audio', 'COMP', 0], ['UADx LA-2A Silver', 'Universal Audio', 'COMP', 0],
  ['UADx Pultec EQP-1A', 'Universal Audio', 'EQ', 0], ['UADx Galaxy Tape Echo', 'Universal Audio', 'DELAY', 0],
  ['UADx Pure Plate', 'Universal Audio', 'REVERB', 0], ['UADx Studer A800', 'Universal Audio', 'SATURA', 0],
  ['UADx Lexicon 224', 'Universal Audio', 'REVERB', 0], ['UADx Neve 1073', 'Universal Audio', 'EQ', 0],
  // otros
  ['Pro-Q 3', 'FabFilter', 'EQ', 0], ['Pro-C 2', 'FabFilter', 'COMP', 0], ['Pro-L 2', 'FabFilter', 'LIMITA', 0], ['Saturn 2', 'FabFilter', 'SATURA', 0],
  ['ShaperBox 3', 'Cableguys', 'FILTRO', 0], ['Lohi', 'Cableguys', 'FILTRO', 0], ['Uhbik-A', 'u-he', 'REVERB', 0], ['Uhbik-D', 'u-he', 'DELAY', 0],
  ['Choral', 'Arturia', 'MODULA', 0], ['Rev PLATE-140', 'Arturia', 'REVERB', 0], ['Delay TAPE-201', 'Arturia', 'DELAY', 0],
  ['SerumFX', 'Xfer Records', 'MODULA', 0], ['OTT', 'Xfer Records', 'MULTI', 0], ['RC-20 Retro Color', 'XLN Audio', 'SATURA', 0],
  ['AUMatrixReverb', 'Apple', 'REVERB', 0], ['AUDelay', 'Apple', 'DELAY', 0], ['AUPitch', 'Apple', 'MODULA', 0],
  ['AUBandpass', 'Apple', 'FILTRO', 0], ['AUPeakLimiter', 'Apple', 'LIMITA', 0], ['AUGraphicEQ', 'Apple', 'EQ', 0],
  ['AUDynamicsProcessor', 'Apple', 'COMP', 0], ['AUDistortion', 'Apple', 'SATURA', 0],
].map(([nombre, fab, tipo, instr], i) => ({ id: 'p' + i, nombre, fab, tipo, instr: !!instr }));

const NOMBRE_TIPO = {
  REVERB: 'REVERB', DELAY: 'DELAY', EQ: 'EQ', COMP: 'COMP', SATURA: 'SATURA', MODULA: 'MODULA', FILTRO: 'FILTRO',
  LIMITA: 'LIMITA', MULTI: 'MULTIBANDA', UTIL: 'ÚTIL', SINTE: 'SINTE', PIANO: 'PIANO', SAMPLER: 'SAMPLER', BATERIA: 'BATERÍA',
};

const ESTACIONES = [
  { nombre: 'J-WAVE', lugar: 'TOKIO', pais: 'JAPÓN', genero: 'pop' },
  { nombre: 'Radio Educación', lugar: 'CDMX', pais: 'MÉXICO', genero: 'cultural' },
  { nombre: 'FIP', lugar: 'PARÍS', pais: 'FRANCIA', genero: 'ecléctica' },
  { nombre: 'KEXP', lugar: 'SEATTLE', pais: 'EE. UU.', genero: 'indie' },
  { nombre: 'Radio Mirchi', lugar: 'MUMBAI', pais: 'INDIA', genero: 'bollywood' },
  { nombre: 'BBC 6 Music', lugar: 'LONDRES', pais: 'R. UNIDO', genero: 'alternativa' },
  { nombre: 'Rádio Nacional', lugar: 'RÍO', pais: 'BRASIL', genero: 'mpb' },
  { nombre: 'Radio Habana Cuba', lugar: 'LA HABANA', pais: 'CUBA', genero: 'son' },
  { nombre: 'Radio Nova', lugar: 'PARÍS', pais: 'FRANCIA', genero: 'groove' },
  { nombre: 'Radio Bilingüe', lugar: 'FRESNO', pais: 'EE. UU.', genero: 'regional' },
  { nombre: 'Radio Kaya', lugar: 'ACCRA', pais: 'GHANA', genero: 'highlife' },
  { nombre: 'NTS 1', lugar: 'LONDRES', pais: 'R. UNIDO', genero: 'electrónica' },
  { nombre: 'Radio Ciudad de Lima', lugar: 'LIMA', pais: 'PERÚ', genero: 'chicha' },
  { nombre: 'CRI Pekín', lugar: 'PEKÍN', pais: 'CHINA', genero: 'variada' },
];

const SECCIONES = [
  { nombre: 'INTRO', desde: 1, hasta: 2, color: '#e4dccd' }, { nombre: 'A', desde: 3, hasta: 6, color: '#d6e2f0' },
  { nombre: 'CORO', desde: 7, hasta: 10, color: '#f8d3c4' }, { nombre: 'A', desde: 11, hasta: 12, color: '#d6e2f0' },
  { nombre: 'CORO', desde: 13, hasta: 16, color: '#f8d3c4' }, { nombre: 'FIN', desde: 17, hasta: 18, color: '#e4dccd' },
];
const COMPASES_CANCION = 18;

const REJILLAS = [
  { id: '1/8', n: 8, filas: 2 }, { id: '1/16', n: 16, filas: 4 }, { id: '1/32', n: 32, filas: 8 },
  { id: '1/8 T', n: 12, filas: 3 }, { id: '1/16 T', n: 24, filas: 6 },
];

function plug(nombre) { return PLUGINS.find(p => p.nombre === nombre); }

// proyecto inicial (se clona al arrancar)
function proyectoInicial() {
  let nid = 1;
  const fx = (nombre, preset, on = true) => ({ uid: 'f' + (nid++), plug: plug(nombre).id, preset, on, v: rnd8(nombre) });
  const pista = (nombre, tipo, color, extra) => Object.assign({ uid: 't' + (nid++), nombre, tipo, color, vol: 0.72, pan: 0, m: false, s: false, fx: [] }, extra);
  const p = {
    pistas: [
      pista('KEYS', 'MIDI', '#4f86c6', { inst: fx('Keyscape', 'LA Custom C7 · Felt'), fx: [fx('Pro-Q 3', 'Aire Vocal'), fx('ValhallaVintageVerb', 'Plate Bright 1980s')], regiones: [[1, 6, 'acordes'], [7, 16, 'acordes'], [17, 18, 'final']] }),
      pista('BAJO', 'MIDI', '#5aa05a', { inst: fx('Serum 2', 'BA Sub Redondo'), fx: [fx('Decapitator', 'Ampex A'), fx('UADx 1176LN Rev E', 'Bajo Parejo')], vol: 0.66, regiones: [[3, 16, 'bajo']] }),
      pista('BATERÍA', 'BATERIA', '#e0773b', { inst: fx('Batería de Oído', 'Boom Bap'), fx: [fx('COMPRESOR', 'Bus Batería'), fx('SATURADOR', 'Cinta Caliente', false)], vol: 0.8, regiones: [[3, 6, 'patrón A'], [7, 10, 'patrón B'], [11, 12, 'patrón A'], [13, 16, 'patrón B']] }),
      pista('RADIO', 'AUDIO', '#ff4a14', { entrada: '📻 la radio', fx: [fx('EchoBoy', 'Space Echo'), fx('Phasis', 'Phaser Lento', false)], vol: 0.6, regiones: [[7, 8, 'J-WAVE 4c'], [13, 14, 'J-WAVE 4c']] }),
      pista('VOX', 'AUDIO', '#a65fc0', { entrada: 'Apollo · entrada 1', fx: [fx('UADx 1176LN Rev E', 'Voz Delante'), fx('Pro-Q 3', 'Quita Barro'), fx('UADx LA-2A Silver', 'Suave 2:1'), fx('EchoBoy', 'Studio Tape'), fx('ValhallaRoom', 'Vocal Cálida')], regiones: [[7, 10, 'toma 3'], [13, 16, 'toma 5']] }),
      pista('PAD', 'MIDI', '#3aa6a0', { inst: fx('Omnisphere', 'Glass Pad'), fx: [fx('Raum', 'Shimmer Lento'), fx('Replika', 'Dub Infinito')], vol: 0.5, regiones: [[1, 2, 'colchón'], [7, 10, 'colchón'], [13, 18, 'colchón']] }),
      pista('OLLA', 'AUDIO', '#c9a23a', { entrada: '📱 iPhone de Samuel', fx: [fx('RC-20 Retro Color', 'Radio Vieja')], vol: 0.45, regiones: [[2, 2, 'olla']] }),
    ],
    master: { uid: 'tm', nombre: 'MASTER', tipo: 'MASTER', color: '#1d1d1d', vol: 0.8, pan: 0, m: false, s: false, fx: [fx('TRES BANDAS', 'Tres Bandas Suaves'), fx('LIMITADOR', 'Master Moderno')] },
    radio: { fx: [], estacion: 0 },
    tempo: 96,
    ritmo: patronesIniciales(),
    clip: 0,
    frases: [{ n: 1, nombre: 'RADIO', c: 4, color: '#f8d3c4' }, { n: 2, nombre: 'KEYS', c: 2, color: '#d6e2f0' }, { n: 3, nombre: 'BAJO', c: 2, color: '#dcebd6' }],
    favs: ['Serum 2', 'Keyscape', 'EchoBoy', 'ValhallaVintageVerb', 'Pro-Q 3', 'UADx 1176LN Rev E', 'Decapitator', 'Omnisphere'].map(n => plug(n).id),
    recientes: ['Phasis', 'RC-20 Retro Color', 'ValhallaRoom', 'UADx LA-2A Silver', 'Raum', 'Replika', 'Little Plate'].map(n => plug(n).id),
    favPresets: { 'Serum 2': ['BA Reese Profundo', 'PL Pluck Cristal'], 'EchoBoy': ['Space Echo'] },
    nid,
  };
  return p;
}

function rnd8(seed) {
  let h = 0; for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return Array.from({ length: 8 }, (_, i) => { h = (h * 1103515245 + 12345) >>> 0; return 0.15 + ((h >>> 8) % 1000) / 1000 * 0.7; });
}

function golpe(f = 100) { return { f, ad: 0, largo: 1, rep: 1, tono: 0 }; }

function patronesIniciales() {
  const vacio = (n, compases) => Array.from({ length: compases }, () => Array(n).fill(null));
  const mk = (nombre, compases, rejillas) => ({
    nombre, compases, swing: 54,
    filas: PADS.map((pd, i) => ({ rej: rejillas[i] || '1/16', m: false, s: false, pasos: vacio(REJILLAS.find(r => r.id === (rejillas[i] || '1/16')).n, compases) })),
  });
  const A = mk('patrón A', 2, ['1/16', '1/16', '1/16', '1/16', '1/16', '1/16', '1/16', '1/16 T']);
  for (let c = 0; c < 2; c++) {
    [0, 6, 10].forEach(s => A.filas[0].pasos[c][s] = golpe(s === 0 ? 100 : 86));
    if (c === 1) A.filas[0].pasos[c][14] = golpe(70);
    [4, 12].forEach(s => A.filas[1].pasos[c][s] = golpe(96));
    for (let s = 0; s < 16; s += 2) A.filas[2].pasos[c][s] = golpe(s % 4 === 0 ? 92 : 58);
    A.filas[2].pasos[c][7] = golpe(40);
    A.filas[3].pasos[c][14] = golpe(70);
    if (c === 1) { A.filas[4].pasos[c][12] = golpe(80); A.filas[5].pasos[c][13] = golpe(74); A.filas[5].pasos[c][15] = golpe(84); }
    A.filas[6].pasos[c][c === 0 ? 0 : 8] = Object.assign(golpe(90), { largo: 4 });
    for (let s = 1; s < 24; s += 2) A.filas[7].pasos[c][s] = golpe(36 + (s % 6) * 6);
  }
  A.filas[1].pasos[1][15] = Object.assign(golpe(60), { rep: 3 });
  A.filas[2].pasos[0][3] = Object.assign(golpe(50), { ad: 14 });
  const B = mk('patrón B', 1, ['1/16', '1/16', '1/32', '1/16', '1/16', '1/16', '1/16', '1/16']);
  [0, 3, 8, 11].forEach(s => B.filas[0].pasos[0][s] = golpe(100));
  [4, 12].forEach(s => B.filas[4].pasos[0][s] = golpe(100));
  for (let s = 0; s < 32; s += 2) B.filas[2].pasos[0][s] = golpe(s % 8 === 0 ? 90 : 50);
  [2, 6, 10, 14].forEach(s => B.filas[7].pasos[0][s] = golpe(60));
  return [A, B];
}
