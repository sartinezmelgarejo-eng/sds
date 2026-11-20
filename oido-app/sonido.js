// Batería sintetizada con WebAudio (solo para el prototipo: en la app real el sonido sale de la Mac).
'use strict';

const Sonido = (() => {
  let ctx = null, salida = null, ruido = null;
  let t0 = 0, tocando = false, tempoActual = 96;
  let proxPaso = [], timer = null, fuente = null; // fuente() → {patron, kit}
  let alGolpe = null;

  const KITS = {
    'Boom Bap': { bf: 120, bd: 0.38, ct: 190, cr: 1600, ht: 7500, sat: 0.0 },
    'Kit 808': { bf: 95, bd: 0.9, ct: 230, cr: 2000, ht: 8500, sat: 0.0 },
    'Cumbia Sonidera': { bf: 130, bd: 0.25, ct: 260, cr: 2400, ht: 6000, sat: 0.0 },
    'Acústico Seco': { bf: 110, bd: 0.22, ct: 200, cr: 1400, ht: 7000, sat: 0.0 },
    'Lo-Fi Polvo': { bf: 100, bd: 0.32, ct: 170, cr: 1100, ht: 5000, sat: 0.0 },
    'Techno Duro': { bf: 140, bd: 0.45, ct: 210, cr: 2600, ht: 9000, sat: 0.0 },
    'Jersey Club': { bf: 115, bd: 0.5, ct: 240, cr: 2200, ht: 8000, sat: 0.0 },
    'Reggaetón 95': { bf: 105, bd: 0.6, ct: 220, cr: 1800, ht: 7000, sat: 0.0 },
  };
  let kit = KITS['Boom Bap'];

  function iniciar() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { }
      ctx = new AC({ latencyHint: 'interactive' });
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -10; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.12;
      salida = ctx.createGain(); salida.gain.value = 0.8;
      salida.connect(comp); comp.connect(ctx.destination);
      ruido = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = ruido.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
    return true;
  }

  function ahora() { return ctx ? ctx.currentTime : performance.now() / 1000; }

  function env(g, t, a, pico, dec) {
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(pico, 0.0002), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
  }
  function nRuido(t, dur) {
    const s = ctx.createBufferSource(); s.buffer = ruido; s.loop = true;
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05); return s;
  }
  function osc(tipo, f, t, dur) {
    const o = ctx.createOscillator(); o.type = tipo; o.frequency.setValueAtTime(f, t);
    o.start(t); o.stop(t + dur + 0.05); return o;
  }

  // i = fila (0..7), f = fuerza 1..127, tono = semitonos, largo = 1..4
  function pad(i, f = 100, tono = 0, cuando = 0, largo = 1) {
    if (!ctx) return;
    const t = Math.max(cuando || 0, ctx.currentTime + 0.002);
    const v = Math.pow(Math.min(f, 127) / 100, 1.6) * 0.9;
    const k = Math.pow(2, tono / 12);
    const L = 0.7 + 0.3 * largo;
    const g = ctx.createGain(); g.connect(salida);
    switch (i) {
      case 0: { // BOMBO
        const o = osc('sine', kit.bf * 1.6 * k, t, kit.bd * L);
        o.frequency.exponentialRampToValueAtTime(kit.bf * 0.4 * k, t + 0.11);
        o.connect(g); env(g, t, 0.003, v * 1.1, kit.bd * L);
        const c = osc('square', 1800, t, 0.01), gc = ctx.createGain(); c.connect(gc); gc.connect(salida); env(gc, t, 0.001, v * 0.12, 0.012);
        break;
      }
      case 1: { // CAJA
        const n = nRuido(t, 0.25 * L), bp = ctx.createBiquadFilter(); bp.type = 'highpass'; bp.frequency.value = kit.cr * k;
        n.connect(bp); bp.connect(g); env(g, t, 0.002, v * 0.7, 0.18 * L);
        const o = osc('triangle', kit.ct * k, t, 0.12), go = ctx.createGain(); o.frequency.exponentialRampToValueAtTime(kit.ct * 0.7 * k, t + 0.1);
        o.connect(go); go.connect(salida); env(go, t, 0.002, v * 0.6, 0.1);
        break;
      }
      case 2: case 3: { // HAT / HAT A
        const dur = (i === 2 ? 0.045 : 0.32) * L;
        const n = nRuido(t, dur), hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = kit.ht * k;
        const bp = ctx.createBiquadFilter(); bp.type = 'peaking'; bp.frequency.value = 10000; bp.gain.value = 6;
        n.connect(hp); hp.connect(bp); bp.connect(g); env(g, t, 0.001, v * (i === 2 ? 0.45 : 0.35), dur);
        break;
      }
      case 4: { // CLAP
        const n = nRuido(t, 0.3), bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1300 * k; bp.Q.value = 1.2;
        n.connect(bp); bp.connect(g);
        g.gain.setValueAtTime(0.0001, t);
        [0, 0.011, 0.023].forEach(d => { g.gain.setValueAtTime(v * 0.9, t + d); g.gain.exponentialRampToValueAtTime(v * 0.15, t + d + 0.009); });
        g.gain.setValueAtTime(v * 0.6, t + 0.034); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.034 + 0.16 * L);
        break;
      }
      case 5: { // TOM
        const o = osc('sine', 190 * k, t, 0.4 * L); o.frequency.exponentialRampToValueAtTime(105 * k, t + 0.25);
        o.connect(g); env(g, t, 0.003, v * 0.9, 0.35 * L);
        break;
      }
      case 6: { // 📻 RADIO: un acorde «de radio» (sierra filtrada + ruido)
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1100; bp.Q.value = 1.4; bp.connect(g);
        [0, 3, 7, 10].forEach(s => { const o = osc('sawtooth', 220 * k * Math.pow(2, s / 12), t, 0.5 * L); const go = ctx.createGain(); go.gain.value = 0.22; o.connect(go); go.connect(bp); });
        const n = nRuido(t, 0.5 * L), gn = ctx.createGain(); gn.gain.value = 0.05; n.connect(gn); gn.connect(bp);
        env(g, t, 0.004, v * 0.8, 0.42 * L);
        break;
      }
      case 7: { // SHAKER
        const n = nRuido(t, 0.12), bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 5200 * k; bp.Q.value = 1.6;
        n.connect(bp); bp.connect(g); env(g, t, 0.012, v * 0.5, 0.07 * L);
        break;
      }
    }
  }

  // ---- transporte + secuenciador ----
  function pasoBeats(n) { return 4 / n; }
  function posicion() { // en tiempos (negras) desde ▶
    if (!tocando) return 0;
    return (ahora() - t0) * tempoActual / 60;
  }
  function tocar(tempo, desde = 0) {
    iniciar();
    tempoActual = tempo; tocando = true; t0 = ahora() + 0.06 - desde * 60 / tempo; proxPaso = [];
    clearInterval(timer); timer = setInterval(programar, 25); programar();
  }
  function saltar(beat) { if (!tocando) return; t0 = ahora() - beat * 60 / tempoActual; proxPaso = []; }
  function parar() { tocando = false; clearInterval(timer); timer = null; }
  function cambiarTempo(tempo) {
    if (tocando) { const p = posicion(); tempoActual = tempo; t0 = ahora() - p * 60 / tempo; proxPaso = []; }
    else tempoActual = tempo;
  }
  function programar() {
    if (!tocando || !fuente) return;
    const { patron, solo } = fuente();
    if (!patron) return;
    const horizonte = ahora() + 0.12;
    const spb = 60 / tempoActual;
    const largoP = patron.compases * 4;
    patron.filas.forEach((fila, i) => {
      const rej = REJILLAS.find(r => r.id === fila.rej); const n = rej.n; const pb = pasoBeats(n);
      if (proxPaso[i] === undefined) proxPaso[i] = Math.max(0, Math.ceil((ahora() - t0) / spb / pb - 0.001));
      while (true) {
        const k = proxPaso[i];
        let beat = k * pb;
        const enP = beat % largoP;
        const compas = Math.floor(enP / 4), paso = Math.round((enP % 4) / pb) % n;
        let sw = 0;
        if ((n === 16 || n === 8) && paso % 2 === 1) sw = (patron.swing - 50) / 50 * pb;
        const g = fila.pasos[compas] && fila.pasos[compas][paso];
        const tEv = t0 + (beat + sw) * spb + (g ? g.ad / 1000 : 0);
        if (t0 + (beat + sw) * spb > horizonte) break;
        proxPaso[i] = k + 1;
        const suena = !fila.m && (!solo || fila.s);
        if (g && suena && ctx) {
          const rep = g.rep || 1;
          for (let r = 0; r < rep; r++) pad(i, g.f * (r ? 0.8 : 1), g.tono, tEv + r * pb * spb / rep, g.largo);
          if (alGolpe) alGolpe(i, tEv);
        }
      }
    });
  }

  return {
    iniciar, pad, tocar, parar, saltar, posicion, cambiarTempo, ahora,
    get tocando() { return tocando; },
    get ctx() { return ctx; }, // la HOJA FRASE (frase.js) suena en el mismo contexto
    get listo() { return !!ctx && ctx.state === 'running'; },
    ponerFuente(f) { fuente = f; },
    alGolpe(f) { alGolpe = f; },
    ponerKit(nombre) { kit = KITS[nombre] || KITS['Boom Bap']; },
    reiniciarPasos() { proxPaso = []; },
    volumen(v) { if (salida) salida.gain.setTargetAtTime(v, ctx.currentTime, 0.02); },
    KITS,
  };
})();
