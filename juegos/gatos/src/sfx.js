// Sonidos sintetizados con WebAudio (sin archivos): golpes por material, rotura, resortera, puf, puntos.
// Se desbloquea con el primer toque (requisito de iOS/Safari).
let ctx = null, master = null, noiseBuf = null;
const last = {}; // limitar repeticiones del mismo sonido en ráfaga

export function unlockAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.55;
  const comp = ctx.createDynamicsCompressor(); master.connect(comp); comp.connect(ctx.destination);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
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
  else if (mat === 'can') { [rnd(420, 480), rnd(1100, 1250), rnd(2150, 2400)].forEach((f, i) => tone(t, f, 'triangle', [0.35, 0.18, 0.1][i] * v, [0.45, 0.3, 0.2][i])); noise(t, 0.04, 'bandpass', 2500, 2, 0.3 * v, 0.03); }
  else if (mat === 'mouse') { tone(t, rnd(700, 900), 'square', 0.08 * v, 0.09, 1400); }
  else { noise(t, 0.12, 'lowpass', 300, 1, 0.6 * v, 0.1); }
}
export function breakSfx(mat) {
  if (!ok('brk' + mat, 0.05)) return; const t = ctx.currentTime;
  if (mat === 'box') { noise(t, 0.35, 'bandpass', 900, 0.8, 0.9, 0.3, 300); noise(t + 0.05, 0.2, 'lowpass', 400, 1, 0.6, 0.18); }
  else if (mat === 'jar') { noise(t, 0.4, 'highpass', 2500, 0.7, 0.6, 0.35); for (let i = 0; i < 6; i++) tone(t + i * 0.035 + Math.random() * 0.03, rnd(2000, 5200), 'sine', 0.12, rnd(0.1, 0.3)); }
  else if (mat === 'can') { [380, 960, 1870, 2900].forEach((f, i) => tone(t, f * rnd(0.95, 1.05), 'triangle', 0.3 / (i + 1), 0.7 - i * 0.12)); noise(t, 0.3, 'bandpass', 1800, 1, 0.4, 0.25, 600); }
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
