// Sonidos sintetizados con WebAudio (sin archivos): golpes por material, rotura, resortera, puf, puntos.
// Se desbloquea con el primer toque (requisito de iOS/Safari).
let ctx = null, master = null, noiseBuf = null;
let muted = false; try { muted = localStorage.getItem('gatos.mute') === '1'; } catch (e) {}
export const isMuted = () => muted;
export function setMuted(m) { muted = m; try { localStorage.setItem('gatos.mute', m ? '1' : '0'); } catch (e) {} if (master) master.gain.value = m ? 0 : 0.55; }
const last = {}; // limitar repeticiones del mismo sonido en ráfaga

export function unlockAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  ctx = new AC(); master = ctx.createGain(); master.gain.value = muted ? 0 : 0.55;
  const comp = ctx.createDynamicsCompressor(); master.connect(comp); comp.connect(ctx.destination);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  music(true);
  // pestaña oculta = silencio total (y no se acumulan notas)
  document.addEventListener('visibilitychange', () => { if (document.hidden) ctx.suspend(); else ctx.resume(); });
}
const ok = (key, gap) => { if (!ctx) return false; const t = ctx.currentTime; if (last[key] && t - last[key] < gap) return false; last[key] = t; return true; };

function env(g, t, a, peak, dec) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); }
function noise(t, dur, type, freq, q, peak, dec, sweepTo) {
  const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.playbackRate.value = 0.7 + Math.random() * 0.6;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
  const g = ctx.createGain(); env(g, t, 0.004, peak, dec);
  s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
}
function tone(t, freq, type, peak, dec, bendTo) {
  const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
  if (bendTo) o.frequency.exponentialRampToValueAtTime(bendTo, t + dec);
  const g = ctx.createGain(); env(g, t, 0.003, peak, dec);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dec + 0.05);
}
const rnd = (a, b) => a + Math.random() * (b - a);

// golpe según material; k = fuerza 0..1
const ROUND = {canball: 'can', boulder: 'stone', lamp: 'can'}; // piezas redondas suenan como su material
export function hit(mat, k) { mat = ROUND[mat] || mat;
  if (!ok('hit' + mat, 0.06)) return; const t = ctx.currentTime, v = 0.15 + 0.85 * Math.min(1, k);
  if (mat === 'box') { noise(t, 0.16, 'lowpass', rnd(380, 520), 1, 0.9 * v, 0.14); tone(t, rnd(90, 120), 'sine', 0.5 * v, 0.12, 60); }
  else if (mat === 'jar') { tone(t, rnd(1900, 2600), 'sine', 0.25 * v, 0.25); tone(t, rnd(3100, 3800), 'sine', 0.12 * v, 0.18); noise(t, 0.05, 'highpass', 3000, 1, 0.2 * v, 0.04); }
  else if (mat === 'can' || mat === 'robot') { [rnd(420, 480), rnd(1100, 1250), rnd(2150, 2400)].forEach((f, i) => tone(t, f, 'triangle', [0.35, 0.18, 0.1][i] * v, [0.45, 0.3, 0.2][i])); noise(t, 0.04, 'bandpass', 2500, 2, 0.3 * v, 0.03); }
  else if (mat === 'wood' || mat === 'tnt') { noise(t, 0.12, 'bandpass', rnd(600, 800), 1.2, 0.8 * v, 0.1); tone(t, rnd(150, 190), 'triangle', 0.45 * v, 0.14, 90); }
  else if (mat === 'pot') { tone(t, rnd(700, 900), 'triangle', 0.3 * v, 0.12); noise(t, 0.08, 'bandpass', 1600, 1.5, 0.35 * v, 0.06); }
  else if (mat === 'stone') { noise(t, 0.14, 'lowpass', rnd(500, 700), 1, 0.9 * v, 0.12); tone(t, rnd(70, 95), 'sine', 0.7 * v, 0.18, 45); }
  else if (mat === 'mouse') { tone(t, rnd(700, 900), 'square', 0.08 * v, 0.09, 1400); }
  else { noise(t, 0.12, 'lowpass', 300, 1, 0.6 * v, 0.1); }
}
export function breakSfx(mat) { mat = ROUND[mat] || mat;
  if (!ok('brk' + mat, 0.05)) return; const t = ctx.currentTime;
  if (mat === 'box') { noise(t, 0.35, 'bandpass', 900, 0.8, 0.9, 0.3, 300); noise(t + 0.05, 0.2, 'lowpass', 400, 1, 0.6, 0.18); }
  else if (mat === 'jar') { noise(t, 0.4, 'highpass', 2500, 0.7, 0.6, 0.35); for (let i = 0; i < 6; i++) tone(t + i * 0.035 + Math.random() * 0.03, rnd(2000, 5200), 'sine', 0.12, rnd(0.1, 0.3)); }
  else if (mat === 'wood') { noise(t, 0.4, 'bandpass', 1100, 0.9, 0.9, 0.32, 350); for (let i = 0; i < 3; i++) noise(t + i * 0.06, 0.06, 'bandpass', rnd(1500, 2500), 2, 0.4, 0.05); }
  else if (mat === 'pot') { noise(t, 0.3, 'bandpass', 1800, 0.8, 0.7, 0.25, 500); for (let i = 0; i < 5; i++) tone(t + i * 0.04 + Math.random() * 0.03, rnd(600, 1400), 'triangle', 0.12, rnd(0.06, 0.14)); }
  else if (mat === 'stone') { noise(t, 0.6, 'lowpass', 700, 0.8, 1.0, 0.5, 150); tone(t, 60, 'sine', 0.8, 0.4, 30); for (let i = 0; i < 4; i++) noise(t + 0.08 + i * 0.07, 0.08, 'bandpass', rnd(800, 1600), 2, 0.3, 0.06); }
  else if (mat === 'can' || mat === 'robot') { [380, 960, 1870, 2900].forEach((f, i) => tone(t, f * rnd(0.95, 1.05), 'triangle', 0.3 / (i + 1), 0.7 - i * 0.12)); noise(t, 0.3, 'bandpass', 1800, 1, 0.4, 0.25, 600); }
}
// caja de cuetes: tronidos sueltos tras la explosión y trueno de cohete en el aire
export function crackle() { if (!ok('crk', 0.1)) return; const t = ctx.currentTime; for (let i = 0; i < 14; i++) noise(t + 0.08 + i * rnd(0.03, 0.07), 0.03, 'highpass', rnd(1500, 4000), 1, rnd(0.2, 0.5), 0.025); }
export function firework() { if (!ok('fw', 0.06)) return; const t = ctx.currentTime; noise(t, 0.25, 'lowpass', 1400, 0.8, 0.55, 0.22, 300); tone(t, rnd(180, 260), 'sine', 0.3, 0.2, 60);
  for (let i = 0; i < 8; i++) noise(t + 0.1 + i * rnd(0.03, 0.06), 0.02, 'highpass', rnd(2500, 5000), 1, 0.25, 0.02); }
export function thump(k = 0.5) { if (!ok('thump', 0.12)) return; const t = ctx.currentTime; tone(t, rnd(85, 105), 'sine', 0.55 * (0.3 + k), 0.18, 45); noise(t, 0.12, 'lowpass', 300, 1, 0.45 * (0.3 + k), 0.1); }
export function poof() { if (!ok('poof', 0.05)) return; const t = ctx.currentTime; noise(t, 0.3, 'bandpass', 1200, 0.9, 0.7, 0.28, 300); tone(t, 520, 'sine', 0.2, 0.18, 260); }
export function stretch(k) { if (!ok('str', 0.09)) return; const t = ctx.currentTime; tone(t, 160 + k * 260, 'sawtooth', 0.025, 0.08); }
export function release(k) { if (!ok('rel', 0.1)) return; const t = ctx.currentTime; noise(t, 0.35, 'bandpass', 600, 1.5, 0.5 * (0.4 + k), 0.3, 2400); tone(t, 140, 'sine', 0.4, 0.12, 70); }
export function points() { if (!ok('pts', 0.04)) return; const t = ctx.currentTime; tone(t, 1320, 'sine', 0.06, 0.08); tone(t + 0.05, 1760, 'sine', 0.05, 0.1); }
export function boom() { if (!ok('boom', 0.1)) return; const t = ctx.currentTime; noise(t, 1.0, 'lowpass', 900, 0.7, 1.0, 0.9, 120); tone(t, 110, 'sine', 0.9, 0.6, 35); noise(t, 0.15, 'highpass', 2000, 1, 0.5, 0.12); }
export function inflate() { if (!ok('inf', 0.1)) return; const t = ctx.currentTime; tone(t, 200, 'sine', 0.4, 0.25, 900); noise(t, 0.25, 'bandpass', 700, 2, 0.4, 0.22, 2500); }
export function deflate() { if (!ok('def', 0.1)) return; const t = ctx.currentTime; tone(t, 700, 'sawtooth', 0.06, 0.8, 120); noise(t, 0.8, 'bandpass', 1500, 3, 0.25, 0.75, 300); } // pedorreo de globo suelto (dura lo mismo que el desinflado)
export function swoosh() { if (!ok('sw', 0.1)) return; const t = ctx.currentTime; noise(t, 0.55, 'bandpass', 500, 2, 0.7, 0.5, 3200); }
export function slam() { if (!ok('slam', 0.1)) return; const t = ctx.currentTime; tone(t, 70, 'sine', 1.0, 0.5, 30); noise(t, 0.6, 'lowpass', 600, 0.8, 0.9, 0.5, 100); }
// ---- fin de nivel ----
// estrella: campanita que sube de tono con cada estrella
export function star(i) { if (!ctx) return; const t = ctx.currentTime, f = [880, 1108, 1318][i] || 1318; tone(t, f, 'triangle', 0.35, 0.5); tone(t, f * 2, 'sine', 0.18, 0.4); tone(t + 0.07, f * 1.5, 'sine', 0.15, 0.45); noise(t, 0.2, 'highpass', 6000, 1, 0.15, 0.18); }
// maullido sintético (hasta que Samuel grabe los reales): sube y baja de tono con formante
export function meow(i = 0) {
  if (!ok('meow', 0.15)) return; const t = ctx.currentTime, b = 520 + (i % 3) * 90;
  const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(b * 0.8, t); o.frequency.linearRampToValueAtTime(b * 1.35, t + 0.12); o.frequency.exponentialRampToValueAtTime(b * 0.7, t + 0.42);
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 3; f.frequency.setValueAtTime(900, t); f.frequency.linearRampToValueAtTime(1900, t + 0.14); f.frequency.exponentialRampToValueAtTime(800, t + 0.42);
  const g = ctx.createGain(); env(g, t, 0.04, 0.5, 0.4); o.connect(f); f.connect(g); g.connect(master); o.start(t); o.stop(t + 0.5);
}
// gruñidito al agarrar al gato en la resortera ("mrrrau" corto con trémolo, como el graznido de AB2 al tomar al pájaro)
export function growl(i = 0) {
  if (!ok('growl', 0.4)) return; const t = ctx.currentTime, b = 210 + (i % 3) * 45;
  const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(b, t); o.frequency.linearRampToValueAtTime(b * 1.5, t + 0.22); o.frequency.exponentialRampToValueAtTime(b * 1.1, t + 0.32);
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 2.5; f.frequency.setValueAtTime(600, t); f.frequency.linearRampToValueAtTime(1400, t + 0.25);
  const trem = ctx.createGain(), lfo = ctx.createOscillator(), dep = ctx.createGain(); lfo.frequency.value = 28; dep.gain.value = 0.45; trem.gain.value = 0.55; lfo.connect(dep); dep.connect(trem.gain);
  const g = ctx.createGain(); env(g, t, 0.03, 0.35, 0.3); o.connect(f); f.connect(trem); trem.connect(g); g.connect(master); o.start(t); lfo.start(t); o.stop(t + 0.36); lfo.stop(t + 0.36);
}
export function win() { if (!ctx) return; const t = ctx.currentTime; [523, 659, 784, 1046].forEach((f, i) => { tone(t + i * 0.11, f, 'triangle', 0.3, 0.35); tone(t + i * 0.11, f * 2, 'sine', 0.08, 0.3); }); tone(t + 0.44, 1046, 'triangle', 0.3, 0.9); tone(t + 0.44, 1318, 'triangle', 0.2, 0.9); }
export function lose() { if (!ctx) return; const t = ctx.currentTime; [392, 370, 349, 330].forEach((f, i) => tone(t + i * 0.32, f, 'sawtooth', 0.09, i === 3 ? 0.9 : 0.3, i === 3 ? 300 : 0)); }
export function giggle() { if (!ok('gig', 0.5)) return; const t = ctx.currentTime; for (let i = 0; i < 6; i++) tone(t + i * 0.09, 1300 + Math.random() * 400 - i * 40, 'square', 0.04, 0.06, 1700); }
export function click() { if (!ctx) return; const t = ctx.currentTime; tone(t, 660, 'sine', 0.25, 0.08, 990); }
// título: zumbido grave al entrar a la pupila + "pop" al abrir el iris
export function whoosh() { if (!ctx) return; const t = ctx.currentTime; noise(t, 0.8, 'bandpass', 300, 1.2, 0.6, 0.75, 2600); tone(t, 90, 'sine', 0.35, 0.7, 40); }
// lata de atún que se abre: clic del anillo, "psst" del vacío y la tapa que tintinea
export function canOpen() { if (!ok('can', 0.3)) return; const t = ctx.currentTime; tone(t, 2400, 'square', 0.08, 0.025, 1800); noise(t + 0.03, 0.35, 'highpass', 3500, 0.7, 0.35, 0.3, 7000);
  tone(t + 0.12, 1560, 'triangle', 0.16, 0.35); tone(t + 0.12, 2350, 'sine', 0.08, 0.25); tone(t + 0.36, 1480, 'triangle', 0.07, 0.25); }
export function pop() { if (!ok('pop', 0.04)) return; const t = ctx.currentTime; tone(t, 380 + Math.random() * 120, 'sine', 0.22, 0.09, 760); }

// ---- música de fondo: marimba juguetona sintetizada (loop de 8 compases, bajito) ----
// Programador con anticipación: cada 100 ms agenda las notas de los próximos 0.4 s.
let mus = null;
const BPM = 108, STEP = 60 / BPM / 2; // corcheas
const N = s => 440 * Math.pow(2, (s - 9) / 12); // semitonos desde C4
// acordes (I–vi–IV–V ×2 con variación) y melodía pentatónica: null = silencio
const CH = [[0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2], [0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, 2, 5]];
const MEL = [12, null, 16, 19, 16, null, 14, 12, 9, null, 12, null, 16, 14, 12, null,
             9, null, 12, 14, 12, null, 9, 7, 7, 9, null, 11, 14, null, 11, null,
             12, null, 16, 19, 21, 19, 16, null, 16, null, 19, 16, 12, null, 9, null,
             9, 12, null, 9, 7, null, 4, null, 7, null, 11, 14, null, 12, null, null];
function marimba(t, f, peak, out) {
  const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), g2 = ctx.createGain();
  o.type = 'sine'; o.frequency.value = f; o2.type = 'sine'; o2.frequency.value = f * 4;
  env(g, t, 0.004, peak, 0.35); env(g2, t, 0.002, peak * 0.35, 0.05);
  o.connect(g); o2.connect(g2); g.connect(out); g2.connect(out); o.start(t); o2.start(t); o.stop(t + 0.45); o2.stop(t + 0.1);
}
// cada mundo su música (como AB2): 1 Cocina = marimba juguetona · 2 Jardín = silbidito alegre más rápido ·
// 3 Guarida = menor, sigilosa, con bajo pizzicato caminando (tipo "ladrones de caricatura")
const THEMES = {
  1: {bpm: BPM, ch: CH, mel: MEL, lead: 'marimba', walk: false},
  2: {bpm: 120, lead: 'whistle', walk: false,
      ch: [[0, 4, 7], [-7, -3, 0], [-5, -1, 2], [0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2], [-5, 2, 5]],
      mel: [16, null, 19, null, 21, 19, 16, null, 14, 16, null, 12, null, null, 9, null,
            11, null, 14, 16, 14, null, 11, null, 7, null, 9, 11, null, null, null, null,
            16, null, 19, null, 24, null, 21, 19, 16, null, 19, 21, null, 19, 16, null,
            12, 14, null, 16, 14, null, 11, null, 12, null, null, null, 7, null, null, null]},
  3: {bpm: 92, lead: 'pluck', walk: true,
      ch: [[-3, 0, 4], [-3, 0, 4], [-7, -3, 0], [-8, -4, -1], [-3, 0, 4], [-10, -7, -3], [-8, -4, -1], [-8, -4, -1]],
      mel: [9, null, null, 12, null, 11, 9, null, 8, null, 9, null, null, null, null, null,
            12, null, null, 16, null, 15, 12, null, 11, null, 8, null, null, null, null, null,
            9, null, 12, null, 16, null, 17, 16, 15, null, 16, null, 12, null, null, null,
            14, null, 12, 11, 9, null, 8, null, 4, null, 8, null, 9, null, null, null]},
};
function whistle(t, f, peak, out) { // silbido: seno con vibrato y ataque suave
  const o = ctx.createOscillator(), l = ctx.createOscillator(), lg = ctx.createGain(), g = ctx.createGain();
  o.type = 'sine'; o.frequency.value = f * 2; l.frequency.value = 6; lg.gain.value = f * 0.012; l.connect(lg); lg.connect(o.frequency);
  env(g, t, 0.03, peak * 0.45, 0.32); o.connect(g); g.connect(out); o.start(t); l.start(t); o.stop(t + 0.4); l.stop(t + 0.4);
}
function pluck(t, f, peak, out) { // pizzicato: triángulo corto con un filtro que se cierra
  const o = ctx.createOscillator(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
  o.type = 'sawtooth'; o.frequency.value = f; fl.type = 'lowpass'; fl.frequency.setValueAtTime(f * 6, t); fl.frequency.exponentialRampToValueAtTime(f * 1.2, t + 0.15);
  env(g, t, 0.004, peak * 0.4, 0.18); o.connect(fl); fl.connect(g); g.connect(out); o.start(t); o.stop(t + 0.25);
}
const LEAD = {marimba, whistle, pluck};
let theme = THEMES[1], themeNext = null;
export function musicTheme(w) { const th = THEMES[w] || THEMES[1]; if (th !== theme) themeNext = th; }
function tick() {
  if (!mus || !ctx) return;
  while (mus.next < ctx.currentTime + 0.4) {
    if (themeNext && mus.i % 8 === 0) { theme = themeNext; themeNext = null; mus.i = 0; } // cambia al empezar compás
    const th = theme, t = mus.next, i = mus.i % 64, bar = Math.floor(i / 8), ch = th.ch[bar], step = 60 / th.bpm / 2;
    if (th.mel[i] != null) LEAD[th.lead](t, N(th.mel[i]), 0.5, mus.out);
    if (th.walk) { if (i % 2 === 0) pluck(t, N(ch[(i >> 1) % 3] - 24), 0.6, mus.out); }    // bajo que camina (negras)
    else if (i % 8 === 0 || i % 8 === 5) tone2(t, N(ch[0] - 12), 0.35, 0.5, mus.out);   // bajo
    if (i % 2 === 1) (th.walk ? pluck : marimba)(t, N(ch[(i >> 1) % 3]), th.walk ? 0.12 : 0.16, mus.out); // arpegio suave
    if (i % 4 === 2) noiseTo(t, mus.out);                                                  // shaker
    mus.next += step * (th.walk ? 1 : i % 2 ? 0.9 : 1.1); mus.i++;                          // swing ligero (no en la Guarida)
  }
}
function tone2(t, f, peak, dec, out) { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.value = f; env(g, t, 0.01, peak, dec); o.connect(g); g.connect(out); o.start(t); o.stop(t + dec + 0.05); }
function noiseTo(t, out) { const s = ctx.createBufferSource(); s.buffer = noiseBuf; const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000; const g = ctx.createGain(); env(g, t, 0.003, 0.12, 0.05); s.connect(f); f.connect(g); g.connect(out); s.start(t, Math.random() * 0.5); s.stop(t + 0.08); }
const MUS_VOL = 0.16;
export function music(on) {
  if (!ctx) return;
  if (on && !mus) {
    const out = ctx.createGain(); out.gain.value = 0.0001; out.connect(master);
    out.gain.exponentialRampToValueAtTime(MUS_VOL, ctx.currentTime + 1.5);
    mus = {out, next: ctx.currentTime + 0.1, i: 0, iv: setInterval(tick, 100)}; tick();
  } else if (!on && mus) {
    const m = mus; mus = null; clearInterval(m.iv);
    m.out.gain.cancelScheduledValues(ctx.currentTime); m.out.gain.setValueAtTime(m.out.gain.value, ctx.currentTime);
    m.out.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6); setTimeout(() => m.out.disconnect(), 800);
  }
}
// baja la música un rato (fanfarrias de victoria/derrota) y la regresa
export function duck(sec) {
  if (!mus) return; const g = mus.out.gain, t = ctx.currentTime;
  g.cancelScheduledValues(t); g.setValueAtTime(Math.max(0.0001, g.value), t); g.exponentialRampToValueAtTime(0.012, t + 0.25);
  g.setValueAtTime(0.012, t + sec); g.exponentialRampToValueAtTime(MUS_VOL, t + sec + 2);
}
// ---- motor de la aspiradora robot: zumbido continuo (vol 0 = se apaga suave); pan = -1..1 según la cámara ----
let mot = null;
export function motor(vol, pan = 0, rate = 1) {
  if (!ctx) return;
  if (!mot && vol <= 0.001) return;
  if (!mot) {
    const out = ctx.createGain(); out.gain.value = 0.0001;
    const pn = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 62;
    const o2 = ctx.createOscillator(); o2.type = 'square'; o2.frequency.value = 124.7;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; lp.Q.value = 2;
    const g2 = ctx.createGain(); g2.gain.value = 0.25;
    const ns = ctx.createBufferSource(); ns.buffer = noiseBuf; ns.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2400; bp.Q.value = 0.8;
    const gn = ctx.createGain(); gn.gain.value = 0.35;
    // trémolo lento (el cepillo que gira)
    const lfo = ctx.createOscillator(); lfo.frequency.value = 7; const lg = ctx.createGain(); lg.gain.value = 0.3;
    const trem = ctx.createGain(); trem.gain.value = 0.7; lfo.connect(lg); lg.connect(trem.gain);
    o.connect(lp); o2.connect(g2); g2.connect(lp); lp.connect(trem); ns.connect(bp); bp.connect(gn); gn.connect(trem);
    trem.connect(out); if (pn) { out.connect(pn); pn.connect(master); } else out.connect(master);
    [o, o2, ns, lfo].forEach(n => n.start());
    mot = {out, pn, o, o2, bp, nodes: [o, o2, ns, lfo]};
  }
  const t = ctx.currentTime;
  mot.out.gain.setTargetAtTime(Math.max(0.0001, vol * 0.22), t, 0.12);
  if (mot.pn) mot.pn.pan.setTargetAtTime(Math.max(-1, Math.min(1, pan)), t, 0.1);
  mot.o.frequency.setTargetAtTime(62 * rate, t, 0.15); mot.o2.frequency.setTargetAtTime(124.7 * rate, t, 0.15); mot.bp.frequency.setTargetAtTime(2400 * rate, t, 0.15);
  if (vol <= 0.001) { const m = mot; mot = null; setTimeout(() => m.nodes.forEach(n => { try { n.stop(); } catch (e) {} }), 600); }
}
// chisporroteo eléctrico (aspiradora dañada)
export function zap() { if (!ok('zap', 0.12)) return; const t = ctx.currentTime; for (let i = 0; i < 4; i++) { noise(t + i * 0.025, 0.03, 'highpass', 3500, 1, 0.25, 0.025); } tone(t, 1800, 'square', 0.04, 0.08, 600); }
// la Rata Jefa grita enojada ("¡IIIK!")
export function squeak() { if (!ok('sqk', 0.6)) return; const t = ctx.currentTime; tone(t, 1500, 'square', 0.07, 0.12, 2300); tone(t + 0.12, 2200, 'square', 0.07, 0.22, 1300); }
// fanfarria final (jefe vencido): arpegio largo y acorde mayor sostenido
export function fanfare() { if (!ctx) return; const t = ctx.currentTime; [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => { tone(t + i * 0.13, f, 'triangle', 0.28, 0.4); tone(t + i * 0.13, f * 2, 'sine', 0.07, 0.3); });
  [1046, 1318, 1568].forEach(f => tone(t + 0.95, f, 'triangle', 0.22, 1.6)); noise(t + 0.95, 0.4, 'highpass', 6000, 1, 0.12, 0.35); }

// crujido de una pieza que se tambalea (k 0..1): madera/cartón = rechinido de fricción (clics cada vez más rápidos),
// vidrio/maceta = tintineo, lata/piedra = raspón grave
// ventilador: "fuup" suave de aire por cada aspa que pasa + un zumbidito de motor
export function fan(v = 0.5) { if (!ok('fan', 0.1)) return; const t = ctx.currentTime;
  noise(t, 0.16, 'bandpass', 650, 1.4, 0.07 * v, 0.14, 1100); tone(t, 118, 'triangle', 0.018 * v, 0.14); }
export function creak(mat, k = 0.5) { mat = ROUND[mat] || mat;
  if (!ok('creak', 0.35)) return; const t = ctx.currentTime, v = 0.25 + 0.75 * k;
  if (mat === 'jar' || mat === 'pot') { const f = rnd(2400, 3200); tone(t, f, 'sine', 0.05 * v, 0.12); tone(t + rnd(0.05, 0.1), f * 1.33, 'sine', 0.035 * v, 0.1); return; }
  if (mat === 'can' || mat === 'stone') { noise(t, 0.35, 'lowpass', 380, 1.5, 0.22 * v, 0.3, 160); tone(t, 75, 'triangle', 0.08 * v, 0.3, 60); return; }
  const n = 10 + Math.floor(Math.random() * 8), f0 = rnd(380, 620), up = Math.random() < 0.5; let dt = 0.045;
  for (let i = 0, tt = t; i < n; i++) { const f = f0 * (up ? 1 + i * 0.04 : 1.4 - i * 0.03); noise(tt, 0.015, 'bandpass', f, 9, 0.5 * v, 0.012); tt += dt; dt *= 0.9; }
  tone(t, f0 * 0.25, 'sawtooth', 0.025 * v, 0.4, f0 * 0.21);
}

// sótano: gota que cae en un charco ("plic" con eco corto) y zumbido eléctrico del foco que parpadea
export function drip(v = 0.5) { if (!ok('drip', 0.25)) return; const t = ctx.currentTime, f = rnd(1300, 1900);
  tone(t, f, 'sine', 0.12 * v, 0.09, f * 2.1); tone(t + 0.11, f * 1.05, 'sine', 0.035 * v, 0.07, f * 2); noise(t, 0.03, 'bandpass', 2600, 4, 0.03 * v, 0.03); }
export function buzz(v = 0.5) { if (!ok('buzz', 0.2)) return; const t = ctx.currentTime;
  tone(t, 120, 'sawtooth', 0.05 * v, 0.09); tone(t, 240, 'square', 0.02 * v, 0.07); noise(t, 0.05, 'highpass', 4000, 1, 0.04 * v, 0.04); }
// entrada del jefe: "tan-tan-TAAAN" de villano (metales graves en menor, el último con vibrato hacia abajo)
export function villain() { if (!ctx) return; const t = ctx.currentTime;
  [[0, 196, 0.16], [0.2, 185, 0.16], [0.42, 147, 0.9]].forEach(([dt, f, d]) => { tone(t + dt, f, 'sawtooth', 0.12, d, dt > 0.4 ? f * 0.94 : 0); tone(t + dt, f / 2, 'square', 0.07, d); tone(t + dt, f * 1.19, 'sawtooth', 0.06, d); }); }
// utensilios colgados que chocan entre sí (tintineo metálico, 3–4 golpecitos desordenados)
export function clink(v = 0.6) { if (!ok('clink', 0.4)) return; const t = ctx.currentTime;
  for (let i = 0; i < 4; i++) { const tt = t + 0.12 + i * rnd(0.07, 0.16), f = rnd(2100, 3400); tone(tt, f, 'sine', 0.06 * v, 0.25); tone(tt, f * 2.76, 'sine', 0.02 * v, 0.12); } }
// gorriones que salen volando en desbandada: piídos agudos con glissando + aleteo (ruido filtrado)
export function tweet(v = 0.7) { if (!ok('tweet', 0.6)) return; const t = ctx.currentTime;
  for (let i = 0; i < 7; i++) { const tt = t + 0.05 + i * rnd(0.05, 0.12), f = rnd(3200, 4600); tone(tt, f, 'sine', 0.05 * v, 0.07, f * rnd(1.15, 1.4)); }
  for (let i = 0; i < 5; i++) noise(t + i * 0.06, 0.05, 'bandpass', 1400, 1.5, 0.05 * v, 0.04); }
// ratón tiznado que tose: dos "kof" (ruido de banda media con un tono que cae), más agudo en los chiquitos
export function cough(pitch = 1) { if (!ok('cough', 0.35)) return; const t = ctx.currentTime;
  [0, 0.16].forEach((dt, i) => { noise(t + dt, 0.11, 'bandpass', 900 * pitch, 1.4, 0.16 * (i ? 0.7 : 1), 0.09, 500 * pitch); tone(t + dt, 420 * pitch, 'triangle', 0.05 * (i ? 0.7 : 1), 0.08, 260 * pitch); }); }
// frasco con agua que se rompe: chapoteo (ruido que baja) + gotitas "plic"
export function splash(v = 0.6) { if (!ok('splash', 0.15)) return; const t = ctx.currentTime;
  noise(t + 0.02, 0.4, 'bandpass', 1800, 0.8, 0.3 * v, 0.35, 500);
  for (let i = 0; i < 4; i++) { const tt = t + 0.25 + i * rnd(0.08, 0.18), f = rnd(1200, 2000); tone(tt, f, 'sine', 0.06 * v, 0.07, f * 1.9); } }
// ratón mojado que se sacude como perrito: rachas de ruido rápido ("brrrr") + gotitas que salen volando
export function shake(pitch = 1) { if (!ok('shake', 0.4)) return; const t = ctx.currentTime;
  for (let i = 0; i < 7; i++) noise(t + i * 0.055, 0.05, 'bandpass', (1500 + (i % 2) * 500) * pitch, 1.1, 0.07, 0.045);
  for (let i = 0; i < 3; i++) { const tt = t + 0.15 + i * rnd(0.07, 0.14), f = rnd(1500, 2400) * pitch; tone(tt, f, 'sine', 0.035, 0.06, f * 1.8); } }
// ambiente (utilería del fondo, MUY bajito como el ambiente de AB2): tic-tac del reloj Kit-Cat y "chk" del aspersor de impacto
export function clockTick(tock = false, v = 1) { if (!ok(tock ? 'tock' : 'tick', 0.3)) return; const t = ctx.currentTime, f = tock ? 1700 : 2300;
  noise(t, 0.02, 'bandpass', f, 7, 0.05 * v, 0.016); tone(t, f * 0.5, 'sine', 0.012 * v, 0.03); }
export function sprinkle(v = 1) { if (!ok('sprk', 0.1)) return; const t = ctx.currentTime;
  noise(t, 0.04, 'bandpass', 2600, 2, 0.035 * v, 0.03); noise(t + 0.01, 0.14, 'highpass', 5200, 0.7, 0.014 * v, 0.12); }
export function bang(v = 1) { if (!ok('bang', 0.06)) return; const t = ctx.currentTime; noise(t, 0.09, 'highpass', 1200, 0.7, 0.9 * v, 0.08); noise(t, 0.2, 'lowpass', 600, 0.8, 0.5 * v, 0.16); tone(t, 210, 'sine', 0.35 * v, 0.1, 70); } // ¡pum! de globo que truena
export function sizzle(v = 0.6) { if (!ok('sizz', 0.08)) return; const t = ctx.currentTime; noise(t, 0.28, 'highpass', 3800, 0.7, 0.16 * v, 0.26);
  for (let i = 0; i < 5; i++) noise(t + i * rnd(0.02, 0.06), 0.015, 'bandpass', rnd(2200, 5200), 3, 0.22 * v, 0.012); } // chisporroteo del chile (bloque al rojo vivo)
// cuerda que revienta: chasquido seco + "twang" que baja
export function snap(v = 0.8) { if (!ok('snap', 0.1)) return; const t = ctx.currentTime; noise(t, 0.06, 'highpass', 2500, 0.8, 0.5 * v, 0.05);
  tone(t, 620, 'triangle', 0.22 * v, 0.28, 150); tone(t + 0.01, 1240, 'sine', 0.06 * v, 0.12, 400); }
// montacargas que llega al tope: "clonc" metálico grave + traqueteo de cadena + rechinido de la polea al arrancar de vuelta
export function clank(v = 0.5) { if (!ok('clank', 0.5)) return; const t = ctx.currentTime;
  tone(t, 140, 'triangle', 0.16 * v, 0.25, 95); tone(t, 860, 'sine', 0.05 * v, 0.3); tone(t, 1337, 'sine', 0.03 * v, 0.22); noise(t, 0.08, 'lowpass', 700, 1, 0.25 * v, 0.07);
  for (let i = 0; i < 5; i++) noise(t + 0.05 + i * rnd(0.03, 0.06), 0.02, 'bandpass', rnd(2500, 3800), 5, 0.12 * v, 0.018);
  const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(1150, t + 0.4); o.frequency.linearRampToValueAtTime(980, t + 0.75);
  g.gain.setValueAtTime(0.0001, t + 0.4); g.gain.exponentialRampToValueAtTime(0.018 * v, t + 0.45); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.78);
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1100; f.Q.value = 3; o.connect(f); f.connect(g); g.connect(master); o.start(t + 0.4); o.stop(t + 0.8); }
// ¡boing! del hongo/gelatina rebotadora: resorte que sube y tiembla
export function boing(v = 0.7) { if (!ok('boing', 0.12)) return; const t = ctx.currentTime;
  tone(t, 150, 'sine', 0.5 * v, 0.42, 520); tone(t + 0.04, 300, 'triangle', 0.16 * v, 0.3, 760); tone(t + 0.16, 420, 'sine', 0.12 * v, 0.25, 260); noise(t, 0.06, 'lowpass', 500, 1, 0.3 * v, 0.05); }
// colchón de resortes viejo de La Guarida: "boiiing" metálico con vibrato + rechinido de resortes oxidados
export function spring(v = 0.7) { if (!ok('boing', 0.12)) return; const t = ctx.currentTime;
  const o = ctx.createOscillator(), l = ctx.createOscillator(), lg = ctx.createGain(), g = ctx.createGain(); o.type = 'triangle';
  o.frequency.setValueAtTime(180, t); o.frequency.exponentialRampToValueAtTime(420, t + 0.35); l.frequency.value = 22; lg.gain.value = 40;
  l.connect(lg); lg.connect(o.frequency); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.32 * v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
  o.connect(g); g.connect(master); o.start(t); l.start(t); o.stop(t + 0.55); l.stop(t + 0.55);
  noise(t, 0.05, 'lowpass', 400, 1, 0.3 * v, 0.05);
  for (let i = 0; i < 3; i++) noise(t + 0.06 + i * rnd(0.05, 0.09), 0.05, 'bandpass', rnd(1800, 2600), 9, 0.1 * v, 0.05); }
