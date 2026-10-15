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
export function hit(mat, k) {
  if (!ok('hit' + mat, 0.06)) return; const t = ctx.currentTime, v = 0.15 + 0.85 * Math.min(1, k);
  if (mat === 'box') { noise(t, 0.16, 'lowpass', rnd(380, 520), 1, 0.9 * v, 0.14); tone(t, rnd(90, 120), 'sine', 0.5 * v, 0.12, 60); }
  else if (mat === 'jar') { tone(t, rnd(1900, 2600), 'sine', 0.25 * v, 0.25); tone(t, rnd(3100, 3800), 'sine', 0.12 * v, 0.18); noise(t, 0.05, 'highpass', 3000, 1, 0.2 * v, 0.04); }
  else if (mat === 'can' || mat === 'robot') { [rnd(420, 480), rnd(1100, 1250), rnd(2150, 2400)].forEach((f, i) => tone(t, f, 'triangle', [0.35, 0.18, 0.1][i] * v, [0.45, 0.3, 0.2][i])); noise(t, 0.04, 'bandpass', 2500, 2, 0.3 * v, 0.03); }
  else if (mat === 'wood') { noise(t, 0.12, 'bandpass', rnd(600, 800), 1.2, 0.8 * v, 0.1); tone(t, rnd(150, 190), 'triangle', 0.45 * v, 0.14, 90); }
  else if (mat === 'pot') { tone(t, rnd(700, 900), 'triangle', 0.3 * v, 0.12); noise(t, 0.08, 'bandpass', 1600, 1.5, 0.35 * v, 0.06); }
  else if (mat === 'stone') { noise(t, 0.14, 'lowpass', rnd(500, 700), 1, 0.9 * v, 0.12); tone(t, rnd(70, 95), 'sine', 0.7 * v, 0.18, 45); }
  else if (mat === 'mouse') { tone(t, rnd(700, 900), 'square', 0.08 * v, 0.09, 1400); }
  else { noise(t, 0.12, 'lowpass', 300, 1, 0.6 * v, 0.1); }
}
export function breakSfx(mat) {
  if (!ok('brk' + mat, 0.05)) return; const t = ctx.currentTime;
  if (mat === 'box') { noise(t, 0.35, 'bandpass', 900, 0.8, 0.9, 0.3, 300); noise(t + 0.05, 0.2, 'lowpass', 400, 1, 0.6, 0.18); }
  else if (mat === 'jar') { noise(t, 0.4, 'highpass', 2500, 0.7, 0.6, 0.35); for (let i = 0; i < 6; i++) tone(t + i * 0.035 + Math.random() * 0.03, rnd(2000, 5200), 'sine', 0.12, rnd(0.1, 0.3)); }
  else if (mat === 'wood') { noise(t, 0.4, 'bandpass', 1100, 0.9, 0.9, 0.32, 350); for (let i = 0; i < 3; i++) noise(t + i * 0.06, 0.06, 'bandpass', rnd(1500, 2500), 2, 0.4, 0.05); }
  else if (mat === 'pot') { noise(t, 0.3, 'bandpass', 1800, 0.8, 0.7, 0.25, 500); for (let i = 0; i < 5; i++) tone(t + i * 0.04 + Math.random() * 0.03, rnd(600, 1400), 'triangle', 0.12, rnd(0.06, 0.14)); }
  else if (mat === 'stone') { noise(t, 0.6, 'lowpass', 700, 0.8, 1.0, 0.5, 150); tone(t, 60, 'sine', 0.8, 0.4, 30); for (let i = 0; i < 4; i++) noise(t + 0.08 + i * 0.07, 0.08, 'bandpass', rnd(800, 1600), 2, 0.3, 0.06); }
  else if (mat === 'can' || mat === 'robot') { [380, 960, 1870, 2900].forEach((f, i) => tone(t, f * rnd(0.95, 1.05), 'triangle', 0.3 / (i + 1), 0.7 - i * 0.12)); noise(t, 0.3, 'bandpass', 1800, 1, 0.4, 0.25, 600); }
}
export function poof() { if (!ok('poof', 0.05)) return; const t = ctx.currentTime; noise(t, 0.3, 'bandpass', 1200, 0.9, 0.7, 0.28, 300); tone(t, 520, 'sine', 0.2, 0.18, 260); }
export function stretch(k) { if (!ok('str', 0.09)) return; const t = ctx.currentTime; tone(t, 160 + k * 260, 'sawtooth', 0.025, 0.08); }
export function release(k) { if (!ok('rel', 0.1)) return; const t = ctx.currentTime; noise(t, 0.35, 'bandpass', 600, 1.5, 0.5 * (0.4 + k), 0.3, 2400); tone(t, 140, 'sine', 0.4, 0.12, 70); }
export function points() { if (!ok('pts', 0.04)) return; const t = ctx.currentTime; tone(t, 1320, 'sine', 0.06, 0.08); tone(t + 0.05, 1760, 'sine', 0.05, 0.1); }
export function boom() { if (!ok('boom', 0.1)) return; const t = ctx.currentTime; noise(t, 1.0, 'lowpass', 900, 0.7, 1.0, 0.9, 120); tone(t, 110, 'sine', 0.9, 0.6, 35); noise(t, 0.15, 'highpass', 2000, 1, 0.5, 0.12); }
export function inflate() { if (!ok('inf', 0.1)) return; const t = ctx.currentTime; tone(t, 200, 'sine', 0.4, 0.25, 900); noise(t, 0.25, 'bandpass', 700, 2, 0.4, 0.22, 2500); }
export function deflate() { if (!ok('def', 0.1)) return; const t = ctx.currentTime; tone(t, 700, 'sawtooth', 0.06, 0.5, 120); noise(t, 0.5, 'bandpass', 1500, 3, 0.25, 0.45, 300); }
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
export function win() { if (!ctx) return; const t = ctx.currentTime; [523, 659, 784, 1046].forEach((f, i) => { tone(t + i * 0.11, f, 'triangle', 0.3, 0.35); tone(t + i * 0.11, f * 2, 'sine', 0.08, 0.3); }); tone(t + 0.44, 1046, 'triangle', 0.3, 0.9); tone(t + 0.44, 1318, 'triangle', 0.2, 0.9); }
export function lose() { if (!ctx) return; const t = ctx.currentTime; [392, 370, 349, 330].forEach((f, i) => tone(t + i * 0.32, f, 'sawtooth', 0.09, i === 3 ? 0.9 : 0.3, i === 3 ? 300 : 0)); }
export function giggle() { if (!ok('gig', 0.5)) return; const t = ctx.currentTime; for (let i = 0; i < 6; i++) tone(t + i * 0.09, 1300 + Math.random() * 400 - i * 40, 'square', 0.04, 0.06, 1700); }
export function click() { if (!ctx) return; const t = ctx.currentTime; tone(t, 660, 'sine', 0.25, 0.08, 990); }
// título: zumbido grave al entrar a la pupila + "pop" al abrir el iris
export function whoosh() { if (!ctx) return; const t = ctx.currentTime; noise(t, 0.8, 'bandpass', 300, 1.2, 0.6, 0.75, 2600); tone(t, 90, 'sine', 0.35, 0.7, 40); }
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
function tick() {
  if (!mus || !ctx) return;
  while (mus.next < ctx.currentTime + 0.4) {
    const t = mus.next, i = mus.i % 64, bar = Math.floor(i / 8), ch = CH[bar];
    if (MEL[i] != null) marimba(t, N(MEL[i]), 0.5, mus.out);
    if (i % 8 === 0 || i % 8 === 5) tone2(t, N(ch[0] - 12), 0.35, 0.5, mus.out);       // bajo
    if (i % 2 === 1) marimba(t, N(ch[(i >> 1) % 3]), 0.16, mus.out);                       // arpegio suave
    if (i % 4 === 2) noiseTo(t, mus.out);                                                  // shaker
    mus.next += STEP * (i % 2 ? 0.9 : 1.1); mus.i++;                                       // swing ligero
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
