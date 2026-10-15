// Menús: pantalla de título (zoom desde el ojo de Omi → iris que se abre → logo que cae letra por letra),
// selector de niveles (latas/estrellas leyendo localStorage) y pausa. Coordenadas de diseño 2048×1536.
import {Container, Sprite, Graphics, Texture} from '../vendor/pixi.min.mjs';
import ART from './art.js';
import * as SFX from './sfx.js';
import {tex, txt, backOut, clamp01, btnTex, makeButton, bounceButtons, iconNext, iconRetry, iconMenu, iconBack, iconSound} from './ui.js';

const W = 2048, H = 1536;
const SLOTS = 8;                             // casillas del mundo 1 (las que aún no existen salen con candado)
const PUPIL = {x: 0.505, y: 0.415, h: 0.165}; // centro y alto de la pupila en omi-eye.jpg (normalizado)
const easeIn3 = u => u * u * u, easeOut3 = u => 1 - Math.pow(1 - u, 3);
const bounceOut = u => { const n = 7.5625, d = 2.75; if (u < 1 / d) return n * u * u; if (u < 2 / d) return n * (u -= 1.5 / d) * u + 0.75; if (u < 2.5 / d) return n * (u -= 2.25 / d) * u + 0.9375; return n * (u -= 2.625 / d) * u + 0.984375; };

// una letra del logo: relieve 3D (capas oscuras hacia abajo), contorno grueso, degradado y brillo
function letterTex(ch, size, top, bottom, side) {
  const c = document.createElement('canvas'), k = c.getContext('2d'); k.font = `${size}px "Luckiest Guy"`;
  const w = Math.ceil(k.measureText(ch).width + size * 0.5), h = Math.ceil(size * 1.55);
  c.width = w * 1.5; c.height = h * 1.5; k.scale(1.5, 1.5);
  k.font = `${size}px "Luckiest Guy"`; k.textAlign = 'center'; k.textBaseline = 'middle'; k.lineJoin = 'round';
  const x = w / 2, y = h * 0.42, ext = Math.round(size * 0.15);
  // 1) contorno oscuro de todo el bloque (frente + relieve)  2) cara lateral  3) contorno y cara frontal con brillo en la mitad de arriba
  k.lineWidth = size * 0.15; k.strokeStyle = '#1A0E08';
  for (let i = ext; i >= 0; i -= 1) k.strokeText(ch, x, y + i);
  k.fillStyle = side; for (let i = ext; i > 0; i -= 1) k.fillText(ch, x, y + i);
  k.lineWidth = size * 0.05; k.strokeText(ch, x, y);
  k.fillStyle = ART.lin(k, 0, y - size * 0.42, 0, y + size * 0.38, [[0, ART.shade(top, 40)], [0.46, top], [0.5, ART.shade(top, -14)], [1, bottom]]); k.fillText(ch, x, y);
  return {tex: Texture.from(c), w, h, ax: 0.5, ay: 0.42};
}

export class Menus {
  // opts: {eyeImg, cats: [{tex, ax, ay}] (mako, omi, miu), levels: ids, levelNames, onPlay(id), onResume, onRetry, onQuit}
  constructor(app, opts) {
    this.app = app; this.o = opts; this.screen = null; this.t = 0;
    this.root = new Container(); app.stage.addChild(this.root);
    this.dim = new Graphics(); this.root.addChild(this.dim);
    // rayos de sol giratorios detrás del logo (clásico de título de juego móvil)
    this.rays = new Sprite(tex(1400, 1400, k => {
      const g = ART.rad(k, 700, 700, 0, 700, [[0, 'rgba(255,224,140,0.85)'], [0.5, 'rgba(255,180,90,0.35)'], [1, 'rgba(255,150,60,0)']]);
      k.fillStyle = g; k.translate(700, 700);
      for (let i = 0; i < 16; i++) { k.rotate(Math.PI / 8); k.beginPath(); k.moveTo(0, 0); k.lineTo(700, -95); k.lineTo(700, 95); k.closePath(); if (i % 2 === 0) k.fill(); }
    }));
    this.rays.anchor.set(0.5); this.rays.visible = false; this.root.addChild(this.rays);
    this.box = new Container(); this.root.addChild(this.box);  // contenido en coordenadas de diseño
    this.T = {
      back: btnTex(150, 'blue', iconBack), menu: btnTex(170, 'blue', iconMenu), retry: btnTex(170, 'yellow', iconRetry),
      resume: btnTex(230, 'green', iconNext), soundOn: btnTex(150, 'blue', iconSound(true)), soundOff: btnTex(150, 'grey', iconSound(false)),
      play: tex(560, 250, k => ART.button(k, 10, 10, 540, 210, '#A6EA62', '#3C9A1C', (k2, x, y, h) => {
        iconNext(k2, x - 175, y, h * 1.05); ART.strokedText(k2, 'JUGAR', x + 45, y + 6, h * 0.42);
      }), 1.5),
      starOn: tex(80, 80, k => ART.star(k, 40, 42, 32, true), 1.5), starOff: tex(80, 80, k => ART.star(k, 40, 42, 32, false), 1.5),
      starBig: tex(110, 110, k => ART.star(k, 55, 57, 44, true), 1.5),
      tuna: tex(130, 120, k => ART.can(k, 15, 25, 100, 80, {tuna: true, seed: 3}), 1.5),
      lock: tex(120, 140, k => {
        k.lineJoin = 'round'; k.lineWidth = 12; k.strokeStyle = '#1F2240'; k.beginPath(); k.arc(60, 56, 30, Math.PI, 0); k.stroke();
        k.lineWidth = 6; k.strokeStyle = '#D9DDE8'; k.stroke();
        ART.rr(k, 18, 54, 84, 70, 16); k.fillStyle = ART.lin(k, 0, 54, 0, 124, [[0, '#FFD860'], [1, '#D48A14']]); k.fill(); k.lineWidth = 7; k.strokeStyle = '#1F2240'; k.stroke();
        k.fillStyle = '#1F2240'; k.beginPath(); k.arc(60, 82, 10, 0, 7); k.fill(); k.fillRect(56, 84, 8, 22);
      }, 1.5),
      tileOn: tex(300, 330, k => ART.button(k, 10, 10, 280, 280, '#FFF0C8', '#E7B868'), 1.5),
      tileNow: tex(300, 330, k => ART.button(k, 10, 10, 280, 280, '#FFE68A', '#F2A21C'), 1.5),
      tileOff: tex(300, 330, k => ART.button(k, 10, 10, 280, 280, '#AEB4C8', '#6A7088'), 1.5),
      pausePanel: tex(900, 820, k => {
        ART.rr(k, 14, 34, 872, 772, 80); k.fillStyle = '#14163A'; k.fill();
        ART.rr(k, 14, 14, 872, 762, 80); k.fillStyle = ART.lin(k, 0, 14, 0, 776, [[0, '#4B53B8'], [0.55, '#2E3488'], [1, '#232766']]); k.fill();
        k.lineWidth = 16; k.strokeStyle = '#1F2240'; k.stroke();
        ART.rr(k, 40, 40, 820, 710, 62); k.lineWidth = 6; k.strokeStyle = 'rgba(255,255,255,0.14)'; k.stroke();
      }),
    };
    // ojo de Omi: foto + pupila que se dilata + brillo
    this.eyeBg = new Graphics(); this.root.addChild(this.eyeBg);  // negro detrás del ojo (aparece desde negro)
    this.eye = new Container(); this.root.addChild(this.eye);
    this.eyeImg = new Sprite(Texture.from(opts.eyeImg)); this.eye.addChild(this.eyeImg);
    const iw = opts.eyeImg.width, ih = opts.eyeImg.height; this.iw = iw; this.ih = ih;
    this.pupil = new Sprite(tex(160, 320, k => {
      k.save(); k.translate(80, 160); k.scale(1, 2);
      k.fillStyle = ART.rad(k, 0, 0, 0, 80, [[0, 'rgba(4,4,6,1)'], [0.82, 'rgba(6,6,8,1)'], [1, 'rgba(10,10,10,0)']]); k.beginPath(); k.arc(0, 0, 80, 0, 7); k.fill(); k.restore();
    }));
    this.pupil.anchor.set(0.5); this.pupil.position.set(PUPIL.x * iw, PUPIL.y * ih);
    this.glint = new Sprite(tex(120, 80, k => { k.fillStyle = ART.rad(k, 60, 40, 0, 50, [[0, 'rgba(255,255,255,0.9)'], [1, 'rgba(255,255,255,0)']]); k.save(); k.translate(60, 40); k.scale(1, 0.55); k.beginPath(); k.arc(0, 0, 50, 0, 7); k.fill(); k.restore(); }));
    this.glint.anchor.set(0.5);
    this.eye.addChild(this.pupil, this.glint);
    this.eye.pivot.set(PUPIL.x * iw, PUPIL.y * ih);
    this.iris = new Graphics(); this.root.addChild(this.iris);
    this.buttons = []; this.root.visible = false;
  }
  get blocking() { return this.screen != null; }
  clear() { this.box.removeChildren().forEach(c => c.destroy()); this.buttons = []; this.items = []; this.eye.visible = false; this.eyeBg.clear(); this.iris.clear(); this.t = 0; this.rays.visible = false; }
  btn(t, cb, s, x, y, delay = 0, pulse = false) {
    const b = makeButton(t, cb, s); b.position.set(x, y); this.box.addChild(b); this.buttons.push(b);
    this.items.push({o: b, t0: delay, dur: 0.35, k: 'pop', s, pulse}); return b;
  }
  item(o, x, y, t0, k = 'pop', s = 1, extra = {}) { if (o.anchor && o.text != null) o.anchor.set(0.5); o.position.set(x, y); this.box.addChild(o); this.items.push({o, t0, dur: 0.38, k, s, x, y, ...extra}); return o; }
  soundBtn(x, y, d, sc = 0.55) {
    const b = this.btn(SFX.isMuted() ? this.T.soundOff : this.T.soundOn, () => { SFX.setMuted(!SFX.isMuted()); b.texture = SFX.isMuted() ? this.T.soundOff : this.T.soundOn; }, sc, x, y, d);
    return b;
  }

  // ---------- título ----------
  showTitle(skipEye = false) {
    this.clear(); this.screen = 'title'; this.root.visible = true; this.eye.visible = !skipEye; this.phase0 = skipEye ? 2.3 : 0; this.t = this.phase0; this.whooshed = skipEye;
    // logo: GATOS (amarillo) / FURIOSOS (naranja-rojo), letras que caen con rebote una a una
    const lines = [['GATOS', 250, '#FFF27A', '#FFA21F', '#B4500E', 330], ['FURIOSOS', 205, '#FFB060', '#E5341E', '#7E1A10', 560]];
    let n = 0;
    for (const [word, size, top, bot, side, y] of lines) {
      const L = [...word].map(ch => letterTex(ch, size, top, bot, side));
      const gap = -size * 0.42, total = L.reduce((s, l) => s + l.w + gap, -gap);
      let x = W / 2 - total / 2;
      L.forEach((l, i) => {
        const sp = new Sprite(l.tex); sp.anchor.set(l.ax, l.ay); sp.scale.set(1 / 1.5);
        const lx = x + l.w / 2; x += l.w + gap;
        sp.rotation = ((n * 7919) % 11 - 5) * 0.012;
        this.item(sp, lx, y, 2.75 + n * 0.065, 'letter', 1 / 1.5, {i: n, rot: sp.rotation}); n++;
      });
    }
    // los tres gatos asomándose (Omi al centro, más grande)
    const cats = this.o.cats, cpos = [[-470, 1080, 0.82, -0.12], [0, 1060, 1.0, 0], [470, 1080, 0.82, 0.12]];
    cats.forEach((c, i) => {
      const sp = new Sprite(c.tex); sp.anchor.set(c.ax, c.ay); sp.rotation = cpos[i][3];
      const s = cpos[i][2] * 430 / c.tex.height;
      this.item(sp, W / 2 + cpos[i][0], cpos[i][1] - 120, 3.55 + [1, 0, 2][i] * 0.14, 'cat', s, {ph: i * 1.3, tex: c.tex, blink: c.blink});
    });
    this.btn(this.T.play, () => this.showSelect(), 0.66, W / 2, 1340, 3.95, true);
    this.soundBtn(W - 110, H - 110, 4.1);
  }

  // ---------- selector de niveles ----------
  showSelect() {
    this.clear(); this.screen = 'select'; this.root.visible = true; this.t = 2.3; this.phase0 = 2.3; this.whooshed = true;
    const lv = this.o.levels, best = id => { try { return JSON.parse(localStorage.getItem('gatos.best.' + id) || 'null'); } catch (e) { return null; } };
    const recs = lv.map(best);
    const tStars = recs.reduce((s, r) => s + (r?.stars || 0), 0);
    this.item(txt('MUNDO 1', 54, '#C9D2FF'), W / 2, 150, 2.3);
    this.item(txt('LA COCINA', 120, '#FFE27A'), W / 2, 250, 2.36, 'drop');
    this.btn(this.T.back, () => this.showTitle(true), 0.62, 110, 110, 2.3);
    const st = this.item(new Sprite(this.T.starBig), W - 330, 110, 2.4); st.anchor.set(0.5);
    const stt = this.item(txt(`${tStars}/${lv.length * 3}`, 64, '#FFFFFF'), W - 175, 116, 2.45); stt.anchor.set(0.5);
    // 8 casillas en 2 filas: número, 3 estrellas, lata de atún si ya se recuperó; candado si no se ha ganado el anterior
    let current = lv.findIndex((id, i) => !recs[i]); if (current < 0) current = -1;
    for (let i = 0; i < SLOTS; i++) {
      const col = i % 4, row = Math.floor(i / 4), x = W / 2 + (col - 1.5) * 380, y = 560 + row * 420;
      const exists = i < lv.length, open = exists && (i === 0 || recs[i - 1]), now = i === current;
      const tile = new Container(); const d = 2.5 + i * 0.06;
      const base = new Sprite(open ? (now ? this.T.tileNow : this.T.tileOn) : this.T.tileOff); base.anchor.set(0.5, 0.47); base.scale.set(1 / 1.5 * 0.95);
      tile.addChild(base);
      if (open) {
        const num = txt(String(i + 1), 150, now ? '#FFFFFF' : '#FFE27A'); num.anchor.set(0.5); num.y = -28; tile.addChild(num);
        for (let s = 0; s < 3; s++) { const sp = new Sprite((recs[i]?.stars || 0) > s ? this.T.starOn : this.T.starOff); sp.anchor.set(0.5); sp.scale.set(1 / 1.5 * (s === 1 ? 1.15 : 0.95)); sp.position.set((s - 1) * 72, 88 - (s === 1 ? 12 : 0)); tile.addChild(sp); }
        if (recs[i]) { const tn = new Sprite(this.T.tuna); tn.anchor.set(0.5); tn.scale.set(1 / 1.5 * 0.9); tn.position.set(108, -112); tn.rotation = 0.18; tile.addChild(tn); }
        tile.eventMode = 'static'; tile.cursor = 'pointer'; tile.base = 1;
        tile.on('pointerdown', e => { e.stopPropagation(); tile.pressed = true; tile.scale.set(0.9); SFX.unlockAudio(); SFX.click(); });
        tile.on('pointerupoutside', () => { tile.pressed = false; tile.scale.set(1); });
        tile.on('pointerup', e => { e.stopPropagation(); if (!tile.pressed) return; tile.pressed = false; this.hide(); this.o.onPlay(lv[i]); });
        tile.levelId = lv[i];
      } else {
        const lk = new Sprite(this.T.lock); lk.anchor.set(0.5); lk.scale.set(1 / 1.5); lk.y = -10; tile.addChild(lk);
        if (!exists) { const p = txt('PRONTO', 34, '#E4E7F2', 0.2); p.anchor.set(0.5); p.y = 95; tile.addChild(p); }
      }
      // nivel de jefa (el último del mundo): la Rata Jefa se asoma por la esquina de la casilla
      if (exists && i === lv.length - 1 && this.o.bossTex) { const bs = new Sprite(this.o.bossTex); bs.anchor.set(0.5); bs.scale.set(0.36); bs.position.set(-118, -128); bs.rotation = -0.25; tile.addChild(bs); }
      this.item(tile, x, y, d, 'pop', 1, {pulse: now, tile: true});
    }
    const w2 = this.item(txt('MUNDO 2 · EL JARDÍN  —  ¡PRÓXIMAMENTE!', 46, '#A8F06A'), W / 2, 1400, 3.0); w2.alpha = 0.9;
    this.soundBtn(W - 110, H - 110, 3.0);
  }

  // ---------- pausa ----------
  showPause(levelName) {
    this.clear(); this.screen = 'pause'; this.root.visible = true; this.t = 2.3; this.phase0 = 2.3; this.whooshed = true;
    const p = this.item(new Sprite(this.T.pausePanel), W / 2, 790, 2.3); p.anchor.set(0.5);
    this.item(txt('PAUSA', 120, '#FFE27A'), W / 2, 450, 2.35, 'drop');
    this.item(txt(levelName, 50, '#C9D2FF'), W / 2, 560, 2.4);
    this.btn(this.T.resume, () => { this.hide(); this.o.onResume(); }, 0.85, W / 2, 780, 2.45, true);
    this.btn(this.T.menu, () => { this.hide(); this.o.onQuit(); }, 0.62, W / 2 - 230, 1010, 2.5);
    this.btn(this.T.retry, () => { this.hide(); this.o.onRetry(); }, 0.62, W / 2, 1010, 2.55);
    this.soundBtn(W / 2 + 230, 1010, 2.6, 0.69);
  }
  hide() { this.clear(); this.screen = null; this.root.visible = false; }

  update(dt) {
    if (!this.screen) return;
    if (this.hold != null) { this.t = this.hold; dt = 0; } // pruebas: congelar la intro en un instante
    const sw = this.app.screen.width, sh = this.app.screen.height, t = (this.t += dt);
    const s = Math.min(sw / W, sh / H); this.box.scale.set(s); this.box.position.set((sw - W * s) / 2, (sh - H * s) / 2);
    // fondo: el nivel congelado detrás, oscurecido con un degradado azul noche
    const da = this.screen === 'title' ? 0.5 : 0.66;
    this.dim.clear().rect(0, 0, sw, sh).fill({color: 0x0C0A2A, alpha: da * clamp01((t - this.phase0) * 4 + (this.screen === 'title' ? 1 : 0))});
    if (this.screen === 'title') {
      this.updateIntro(sw, sh, t, dt);
      const ru = clamp01((t - 2.6) / 0.6); this.rays.visible = ru > 0; this.rays.alpha = ru * 0.9;
      this.rays.position.set(sw / 2, (sh - H * s) / 2 + 440 * s); this.rays.scale.set(s * 1.5 * (0.6 + 0.4 * easeOut3(ru))); this.rays.rotation = t * 0.12;
    }
    for (const a of this.items) {
      const u = (t - a.t0) / a.dur;
      if (u < 0) { a.o.visible = false; continue; } a.o.visible = true;
      if (a.k === 'pop') a.o.scale.set(a.s * Math.max(0, backOut(clamp01(u))));
      else if (a.k === 'drop') { a.o.scale.set(a.s); a.o.y = a.y - 260 * (1 - backOut(clamp01(u), 1.4)); }
      else if (a.k === 'letter') {
        // cae desde arriba, rebota y se aplasta al aterrizar; luego ondula suave
        const v = clamp01((t - a.t0) / 0.55), land = (t - a.t0 - 0.55);
        a.o.y = a.y - 900 * (1 - bounceOut(v)) + (land > 0 ? Math.sin(t * 2.6 - a.i * 0.45) * 7 : 0);
        const sq = land > 0 && land < 0.25 ? Math.sin(land / 0.25 * Math.PI) * 0.16 : 0;
        a.o.scale.set(a.s * (1 + sq), a.s * (1 - sq)); a.o.rotation = a.rot + (land > 0 ? Math.sin(t * 1.9 + a.i) * 0.025 : 0);
        if (land > 0 && !a.popped) { a.popped = true; SFX.pop(); }
      } else if (a.k === 'cat') {
        // se asoman desde abajo y respiran/saltan
        const v = clamp01(u * 0.8), hop = Math.max(0, Math.sin(t * 2.2 + a.ph)) ** 10 * 40;
        a.o.y = a.y + 120 * (1 - backOut(v, 2.2)) - hop; const br = 1 + Math.sin(t * 3 + a.ph) * 0.025;
        a.o.scale.set(a.s / Math.sqrt(br) * Math.min(1, v * 3), a.s * br * Math.min(1, v * 3));
        // parpadeo (cada gato a su ritmo)
        const bc = (t + a.ph * 2.3) % (3.1 + a.ph * 0.4), T = a.blink && bc > 0 && bc < 0.13 ? a.blink : a.tex; if (a.o.texture !== T) a.o.texture = T;
      }
      if (u > 1 && a.pulse) a.o.scale.set(a.s * (1 + Math.sin((t - a.t0) * 5) * 0.045));
    }
    bounceButtons(this.buttons, dt);
  }
  // 0–0.4 aparece el ojo · 0.5–1.4 la pupila se dilata (¡va a atacar!) · 1.5–2.3 zoom adentro de la pupila · 2.3–2.9 se abre el iris
  updateIntro(sw, sh, t) {
    const cover = Math.max(sw / this.iw, sh / this.ih);
    if (t < 2.3) {
      this.eye.visible = true; this.eyeBg.clear().rect(0, 0, sw, sh).fill(0x000000);
      const push = 1 + 0.1 * clamp01(t / 1.5), zin = t > 1.5 ? Math.exp(Math.log(14) * easeIn3(clamp01((t - 1.5) / 0.8))) : 1;
      this.eye.scale.set(cover * push * zin); this.eye.position.set(sw / 2, sh / 2 + (1 - zin) * 0); this.eye.alpha = clamp01(t / 0.4);
      const ph = PUPIL.h * this.ih, dil = 0.33 + 0.72 * easeOut3(clamp01((t - 0.5) / 0.9)) + Math.sin(t * 9) * 0.01;
      this.pupil.height = ph * 1.08; this.pupil.width = ph * dil;
      this.glint.position.set(this.pupil.x - ph * dil * 0.18, this.pupil.y - ph * 0.22); this.glint.alpha = 0.5 * clamp01((t - 0.6) * 2); this.glint.scale.set(ph * 0.0035);
      if (t > 1.5 && !this.whooshed) { this.whooshed = true; SFX.whoosh(); }
      const black = clamp01((t - 2.0) / 0.3);
      this.iris.clear(); if (black > 0) this.iris.rect(0, 0, sw, sh).fill({color: 0x000000, alpha: black});
    } else {
      this.eye.visible = false; this.eyeBg.clear();
      // iris que se abre: anillo negro con trazo muy grueso (más robusto que recortar un hoyo)
      const u = clamp01((t - 2.35) / 0.55), D = Math.hypot(sw, sh), r = D * 0.62 * easeOut3(u);
      this.iris.clear();
      if (u < 1) this.iris.circle(sw / 2, sh * 0.42, r + D * 0.6).stroke({color: 0x000000, width: D * 1.2});
    }
  }
  // tocar durante la intro la salta
  skipIntro() { if (this.screen === 'title' && this.t < 2.3) { this.t = 2.3; this.whooshed = true; return true; } return false; }
}
