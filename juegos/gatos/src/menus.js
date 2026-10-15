// Menús: pantalla de título (zoom desde el ojo de Omi → iris que se abre → logo que cae letra por letra),
// selector de niveles (latas/estrellas leyendo localStorage) y pausa. Coordenadas de diseño 2048×1536.
import {Container, Sprite, Graphics, Texture} from '../vendor/pixi.min.mjs';
import ART from './art.js';
import * as SFX from './sfx.js';
import {tex, txt, backOut, clamp01, btnTex, makeButton, bounceButtons, iconNext, iconRetry, iconMenu, iconBack, iconSound} from './ui.js';

const W = 2048, H = 1536;
const SLOTS = 8;                             // casillas del mundo 1 (las que aún no existen salen con candado)
const PUPIL = {x: 0.505, y: 0.415, h: 0.165}; // centro y alto de la pupila en omi-eye.jpg (normalizado)
// SOMBREROS (AB2): orden en la pantalla, nombre y estrellas totales para desbloquear (decisión tomada: umbrales bajos para que se vean pronto)
const HAT_LIST = [['party', 'FIESTA', 0], ['cowboy', 'VAQUERO', 0], ['sombrero', 'CHARRO', 3], ['chef', 'CHEF', 6], ['crown', 'CORONA', 12], ['wizard', 'MAGO', 20], ['none', 'SIN', 0]];
// tamaño del ala para que cada sombrero quepa en su casilla: [ancho relativo, alto relativo]
const HAT_BOX = {party: [0.84, 1.17], cowboy: [1.24, 0.5], sombrero: [1.44, 0.64], chef: [0.88, 0.78], crown: [0.72, 0.45], wizard: [1.1, 1.05]};
const CAT_INFO = [['mako', 'MAKO', '¡EXPLOTA!', '#FF9A7A'], ['omi', 'OMI', '¡SE INFLA!', '#FFD860'], ['miu', 'MIU', '¡CLAVADO!', '#7CC8FF']];
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
      back: btnTex(150, 'blue', iconBack), prevW: btnTex(150, 'green', iconBack), nextW: btnTex(150, 'green', (k, x, y, h) => { k.save(); k.translate(2 * x, 0); k.scale(-1, 1); iconBack(k, x, y, h); k.restore(); }), menu: btnTex(170, 'blue', iconMenu), retry: btnTex(170, 'yellow', iconRetry),
      resume: btnTex(230, 'green', iconNext), soundOn: btnTex(150, 'blue', iconSound(true)), soundOff: btnTex(150, 'grey', iconSound(false)),
      play: tex(560, 250, k => ART.button(k, 10, 10, 540, 210, '#A6EA62', '#3C9A1C', (k2, x, y, h) => {
        iconNext(k2, x - 175, y, h * 1.05); ART.strokedText(k2, 'JUGAR', x + 45, y + 6, h * 0.42);
      }), 1.5),
      starOn: tex(80, 80, k => ART.star(k, 40, 42, 32, true), 1.5), starOff: tex(80, 80, k => ART.star(k, 40, 42, 32, false), 1.5),
      starSm: tex(56, 56, k => ART.star(k, 28, 29, 22, true), 1.5),
      starBig: tex(110, 110, k => ART.star(k, 55, 57, 44, true), 1.5),
      tuna: tex(130, 120, k => ART.can(k, 15, 25, 100, 80, {tuna: true, seed: 3}), 1.5),
      lock: tex(120, 140, k => {
        k.lineJoin = 'round'; k.lineWidth = 12; k.strokeStyle = '#1F2240'; k.beginPath(); k.arc(60, 56, 30, Math.PI, 0); k.stroke();
        k.lineWidth = 6; k.strokeStyle = '#D9DDE8'; k.stroke();
        ART.rr(k, 18, 54, 84, 70, 16); k.fillStyle = ART.lin(k, 0, 54, 0, 124, [[0, '#FFD860'], [1, '#D48A14']]); k.fill(); k.lineWidth = 7; k.strokeStyle = '#1F2240'; k.stroke();
        k.fillStyle = '#1F2240'; k.beginPath(); k.arc(60, 82, 10, 0, 7); k.fill(); k.fillRect(56, 84, 8, 22);
      }, 1.5),
      hatBtn: btnTex(150, 'yellow', (k, x, y, h) => ART.catHat(k, x, y + h * 0.16, h * 0.6, 'cowboy')),
      hatTile: tex(250, 280, k => ART.button(k, 10, 10, 230, 230, '#FFF0C8', '#E7B868'), 1.5),
      hatTileOn: tex(250, 280, k => ART.button(k, 10, 10, 230, 230, '#FFE68A', '#F2A21C'), 1.5),
      hatTileOff: tex(250, 280, k => ART.button(k, 10, 10, 230, 230, '#AEB4C8', '#6A7088'), 1.5),
      check: tex(90, 90, k => { k.beginPath(); k.arc(45, 45, 36, 0, 7); k.fillStyle = '#3C9A1C'; k.fill(); k.lineWidth = 7; k.strokeStyle = '#1F2240'; k.stroke();
        k.lineCap = k.lineJoin = 'round'; k.beginPath(); k.moveTo(27, 46); k.lineTo(40, 59); k.lineTo(64, 32); k.lineWidth = 10; k.strokeStyle = '#FFFFFF'; k.stroke(); }, 1.5),
      stage: tex(760, 300, k => { // cojín/pedestal donde posa el gato (con sombra suave)
        k.fillStyle = ART.rad(k, 380, 200, 0, 380, [[0, 'rgba(0,0,0,0.45)'], [1, 'rgba(0,0,0,0)']]); k.save(); k.translate(380, 210); k.scale(1, 0.25); k.beginPath(); k.arc(0, 0, 380, 0, 7); k.fill(); k.restore();
        k.beginPath(); k.ellipse(380, 150, 300, 70, 0, 0, 7); k.fillStyle = '#7A1E2E'; k.fill(); k.lineWidth = 10; k.strokeStyle = '#1F2240'; k.stroke();
        k.beginPath(); k.ellipse(380, 120, 300, 70, 0, 0, 7); k.fillStyle = ART.lin(k, 0, 50, 0, 190, [[0, '#FF6F8A'], [1, '#C7304E']]); k.fill(); k.stroke();
        k.beginPath(); k.ellipse(380, 112, 240, 44, 0, 0, 7); k.setLineDash([16, 12]); k.lineWidth = 6; k.strokeStyle = '#FFD860'; k.stroke(); k.setLineDash([]);
        k.beginPath(); k.ellipse(320, 95, 120, 18, -0.05, 0, 7); k.fillStyle = 'rgba(255,255,255,0.28)'; k.fill(); }),
      spot: tex(700, 900, k => { // foco de luz desde arriba
        const g = k.createLinearGradient(0, 0, 0, 900); g.addColorStop(0, 'rgba(255,240,190,0.0)'); g.addColorStop(0.25, 'rgba(255,240,190,0.18)'); g.addColorStop(1, 'rgba(255,230,160,0.32)');
        k.fillStyle = g; k.beginPath(); k.moveTo(250, 0); k.lineTo(450, 0); k.lineTo(700, 900); k.lineTo(0, 900); k.closePath(); k.fill(); }),
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
  clear() { this.box.removeChildren().forEach(c => c.destroy()); this.buttons = []; this.items = []; this.unlocks = []; this.eye.visible = false; this.eyeBg.clear(); this.iris.clear(); this.t = 0; this.rays.visible = false; }
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
    this.btn(this.T.hatBtn, () => { SFX.whoosh(); this.showHats('title'); }, 0.55, 110, H - 110, 4.1, this.newHats().length > 0);
  }

  // ---------- selector de niveles ----------
  showSelect(page = this.page || 0) {
    this.clear(); this.screen = 'select'; this.root.visible = true; this.t = 2.3; this.phase0 = 2.3; this.whooshed = true; this.page = page;
    const WS = this.o.worlds, wd = WS[page], lv = wd.levels, best = id => { try { return JSON.parse(localStorage.getItem('gatos.best.' + id) || 'null'); } catch (e) { return null; } };
    const recs = lv.map(best);
    this.o.onPage?.(page); // detrás del selector se ve el mundo de la página (cocina / jardín)
    // un mundo se abre al ganar el último nivel del anterior
    const worldOpen = p => p === 0 || !!best(WS[p - 1].levels[WS[p - 1].levels.length - 1]);
    const wOpen = worldOpen(page);
    const tStars = recs.reduce((s, r) => s + (r?.stars || 0), 0);
    this.item(txt('MUNDO ' + (page + 1), 54, '#C9D2FF'), W / 2, 150, 2.3);
    this.item(txt(wd.name, 120, page === 1 ? '#A8F06A' : page === 2 ? '#FF8A7A' : '#FFE27A'), W / 2, 250, 2.36, 'drop');
    this.btn(this.T.back, () => this.showTitle(true), 0.62, 110, 110, 2.3);
    this.btn(this.T.hatBtn, () => { SFX.whoosh(); this.showHats('select'); }, 0.62, 300, 110, 2.35, this.newHats().length > 0);
    const st = this.item(new Sprite(this.T.starBig), W - 330, 110, 2.4); st.anchor.set(0.5);
    const stt = this.item(txt(`${tStars}/${lv.length * 3}`, 64, '#FFFFFF'), W - 175, 116, 2.45); stt.anchor.set(0.5);
    // flechas para cambiar de mundo (como las páginas de episodios de AB2)
    if (page > 0) this.btn(this.T.prevW, () => { SFX.whoosh(); this.showSelect(page - 1); }, 0.6, 110, 770, 2.6);
    if (page < WS.length - 1) this.btn(this.T.nextW, () => { SFX.whoosh(); this.showSelect(page + 1); }, 0.6, W - 110, 770, 2.6, worldOpen(page + 1));
    // 8 casillas en 2 filas: número, 3 estrellas, lata de atún si ya se recuperó; candado si no se ha ganado el anterior
    let current = wOpen ? lv.findIndex((id, i) => !recs[i]) : -1;
    // casillas recién abiertas (AB2): la primera vez que se ven abiertas, el candado tiembla, salta y la casilla se destapa
    let seen = null; try { seen = JSON.parse(localStorage.getItem('gatos.seenOpen') || 'null'); } catch (e) {}
    const first = !seen; seen = new Set(seen || []);
    if (first) WS.forEach((w, p) => w.levels.forEach((id, i) => { if (worldOpen(p) && (i === 0 || best(w.levels[i - 1]))) seen.add(id); })); // jugadores de antes: sin animación
    // mundo corto: ≤4 niveles = una fila de casillas grandes al centro; 5–6 = cuadrícula de 3×2 (la guarida); si no, 4×2
    const nS = lv.length <= 6 ? lv.length : SLOTS, solo = nS <= 4, cols = nS <= 6 ? 3 : 4;
    for (let i = 0; i < nS; i++) {
      const col = i % cols, row = Math.floor(i / cols), x = solo ? W / 2 + (i - (nS - 1) / 2) * (nS > 3 ? 440 : 460) : W / 2 + (col - (cols - 1) / 2) * (cols === 3 ? 420 : 380), y = solo ? 760 : 560 + row * 420;
      const exists = i < lv.length, open = exists && wOpen && (i === 0 || recs[i - 1]), now = i === current;
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
        if (!seen.has(lv[i])) { seen.add(lv[i]);
          if (!first && lv[i] !== WS[0].levels[0]) { // tapa: casilla gris con candado encima de la abierta
            const cv = new Sprite(this.T.tileOff); cv.anchor.set(0.5, 0.47); cv.scale.set(1 / 1.5 * 0.95); const lk = new Sprite(this.T.lock); lk.anchor.set(0.5); lk.scale.set(1 / 1.5); lk.y = -10;
            tile.addChild(cv, lk); tile.eventMode = 'none'; this.unlocks.push({tile, cv, lk, t0: d + 0.55, done: false}); } }
      } else {
        const lk = new Sprite(this.T.lock); lk.anchor.set(0.5); lk.scale.set(1 / 1.5); lk.y = -10; tile.addChild(lk);
        if (!exists) { const p = txt('PRONTO', 34, '#E4E7F2', 0.2); p.anchor.set(0.5); p.y = 95; tile.addChild(p); }
      }
      // nivel de jefa (el último del mundo): la Rata Jefa se asoma por la esquina de la casilla
      if (exists && i === lv.length - 1 && this.o.bossTex) { const bs = new Sprite(this.o.bossTex); bs.anchor.set(0.5); bs.scale.set(nS === 1 ? 0.5 : 0.36); bs.position.set(-118, -128); bs.rotation = -0.25; tile.addChild(bs); }
      this.item(tile, x, y, d, 'pop', solo ? (nS > 3 ? 1.1 : 1.35) : 1, {pulse: now, tile: true});
    }
    try { localStorage.setItem('gatos.seenOpen', JSON.stringify([...seen])); } catch (e) {}
    const prevLast = page > 0 ? WS[page - 1].levels[WS[page - 1].levels.length - 1] : '';
    const nxt = WS[page + 1], foot = !wOpen ? `GANA LA ${prevLast} PARA ABRIR ${wd.name}`
      : nxt ? (worldOpen(page + 1) ? `MUNDO ${page + 2} · ${nxt.name}  ▶` : `GANA LA ${lv[lv.length - 1]} PARA ABRIR ${nxt.name}`)
      : '¡LA RATA JEFA TE ESPERA EN SU ASPIRADORA ROBOT!';
    const w2 = this.item(txt(foot, 46, '#A8F06A'), W / 2, 1400, 3.0); w2.alpha = 0.9;
    this.soundBtn(W - 110, H - 110, 3.0);
    // los gatos se asoman por la orilla de abajo a la izquierda, miran las casillas y se esconden (como los pájaros en el mapa de AB2);
    // si tocas uno, maúlla y da un brinquito
    this.o.cats.forEach((c, i) => {
      const sp = new Sprite(c.tex); sp.anchor.set(c.ax, c.ay); sp.eventMode = 'static'; sp.cursor = 'pointer';
      const a = this.item(sp, 120 + i * 175, H - 90 + [0, -14, 6][i], 3.1 + i * 0.25, 'peek', 230 / c.tex.height, {ph: i * 2.3, tex: c.tex, blink: c.blink, i, poke: 0});
      sp.on('pointerdown', e => { e.stopPropagation(); SFX.unlockAudio(); SFX.meow(i); a.poke = 0.45; });
    });
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
  // ---------- sombreros (como el armario de hats de AB2) ----------
  // gato posando en un cojín bajo un foco a la izquierda (pestañas para cambiar de gato) y casillas de sombreros a la derecha.
  // Los sombreros se desbloquean con estrellas totales; el que se acaba de abrir sale con "¡NUEVO!".
  totalStars() { let n = 0; for (const w of this.o.worlds) for (const id of w.levels) { try { n += JSON.parse(localStorage.getItem('gatos.best.' + id) || 'null')?.stars || 0; } catch (e) {} } return n; }
  hatOpen(i, stars = this.totalStars()) { return this.o.allHats || stars >= HAT_LIST[i][2]; }
  newHats() { let seen = []; try { seen = JSON.parse(localStorage.getItem('gatos.hatsSeen') || '[]'); } catch (e) {} const st = this.totalStars(); return HAT_LIST.filter((h, i) => HAT_LIST[i][2] > 0 && this.hatOpen(i, st) && !seen.includes(h[0])).map(h => h[0]); }
  hatIcon(h) {
    this.hatIcons = this.hatIcons || {}; if (this.hatIcons[h]) return this.hatIcons[h];
    return (this.hatIcons[h] = tex(200, 200, k => {
      if (h === 'none') { k.lineWidth = 14; k.strokeStyle = '#8A90A8'; k.beginPath(); k.arc(100, 100, 56, 0, 7); k.moveTo(60, 140); k.lineTo(140, 60); k.stroke(); return; }
      const [bw, bh] = HAT_BOX[h], w = Math.min(165 / bw, 150 / bh); ART.catHat(k, 100, 100 + bh * w / 2 - (h === 'sombrero' || h === 'cowboy' ? 14 : 4), w, h);
    }, 1.5));
  }
  // quick: 0 = entrada completa · 1 = cambio de gato (solo el gato aparece) · 2 = refresco tras ponerse un sombrero (sin animación)
  showHats(from = 'select', cat = this.hatCat || 'omi', quick = 0) {
    this.clear(); this.screen = 'hats'; this.root.visible = true; this.t = quick ? 3.2 : 2.3; this.phase0 = 2.3; this.whooshed = true; this.hatCat = cat;
    const ci = CAT_INFO.findIndex(c => c[0] === cat), cats = this.o.cats, stars = this.totalStars(), fresh = new Set(this.newHats());
    try { const seen = new Set(JSON.parse(localStorage.getItem('gatos.hatsSeen') || '[]')); fresh.forEach(h => seen.add(h)); localStorage.setItem('gatos.hatsSeen', JSON.stringify([...seen])); } catch (e) {}
    this.item(txt('SOMBREROS', 120, '#FFE27A'), W / 2, 170, 2.3, 'drop');
    this.btn(this.T.back, () => { SFX.whoosh(); this.o.onHatsClose?.(); from === 'title' ? this.showTitle(true) : this.showSelect(); }, 0.62, 110, 110, 2.3);
    const st = this.item(new Sprite(this.T.starBig), W - 330, 110, 2.4); st.anchor.set(0.5);
    this.item(txt(String(stars), 64, '#FFFFFF'), W - 210, 116, 2.45);
    // escenario: foco, cojín y el gato posando
    const sp0 = this.item(new Sprite(this.T.spot), 640, 290, 2.35, 'fade'); sp0.anchor.set(0.5, 0); sp0.alpha = 0;
    const cu = this.item(new Sprite(this.T.stage), 640, 1110, 2.4); cu.anchor.set(0.5);
    const c = cats[ci], pose = new Sprite(c.tex); pose.anchor.set(c.ax, c.ay);
    this.item(pose, 640, 860, quick === 1 ? 3.2 : 2.5, 'pose', 560 / c.tex.width, {ci});
    this.item(txt(CAT_INFO[ci][1], 110, CAT_INFO[ci][3]), 640, 1290, 2.55, 'drop');
    this.item(txt(CAT_INFO[ci][2], 46, '#C9D2FF'), 640, 1390, 2.6);
    this.hs = {pose, ci, hop: -1, swap: null, sparks: []};
    // pestañas de los 3 gatos (columna izquierda): la del gato elegido brilla
    CAT_INFO.forEach(([n], i) => {
      const tab = new Container(), on = i === ci, base = new Sprite(on ? this.T.hatTileOn : this.T.hatTile); base.anchor.set(0.5, 0.47); base.scale.set(1 / 1.5 * 0.78); tab.addChild(base);
      const f = new Sprite(cats[i].tex); f.anchor.set(cats[i].ax, cats[i].ay); f.scale.set(150 / cats[i].tex.width); f.y = 4; tab.addChild(f);
      this.press(tab, () => { if (i !== ci && this.hs.hop === -1) { SFX.meow(i); this.showHats(from, n, 1); } });
      this.item(tab, 150, 520 + i * 290, 2.45 + i * 0.05, 'pop', on ? 1.08 : 0.92, {pulse: on});
    });
    // casillas: 3 + 3 + 1 (SIN sombrero abajo al centro)
    const cur = this.o.getHat?.(cat) || 'none';
    HAT_LIST.forEach(([h, name, need], i) => {
      const col = i % 3, row = Math.floor(i / 3), x = i === 6 ? 1530 : 1270 + col * 260, y = 470 + row * 300;
      const open = this.hatOpen(i, stars), on = h === cur, tile = new Container();
      const base = new Sprite(!open ? this.T.hatTileOff : on ? this.T.hatTileOn : this.T.hatTile); base.anchor.set(0.5, 0.47); base.scale.set(1 / 1.5); tile.addChild(base);
      const ic = new Sprite(this.hatIcon(h)); ic.anchor.set(0.5); ic.scale.set(1 / 1.5 * 0.92); ic.y = -26; if (!open) { ic.tint = 0x2A2E48; ic.alpha = 0.55; } tile.addChild(ic);
      if (open) { const l = txt(name, 36, on ? '#FFFFFF' : '#FFE27A'); l.anchor.set(0.5); l.y = 72; tile.addChild(l); }
      else { const lk = new Sprite(this.T.lock); lk.anchor.set(0.5); lk.scale.set(1 / 1.5 * 0.62); lk.position.set(0, -30); tile.addChild(lk);
        const ss = new Sprite(this.T.starSm); ss.anchor.set(0.5); ss.position.set(-30, 72); tile.addChild(ss); const l = txt(String(need), 40, '#FFFFFF'); l.anchor.set(0, 0.5); l.position.set(-2, 74); tile.addChild(l); }
      if (on) { const ck = new Sprite(this.T.check); ck.anchor.set(0.5); ck.scale.set(1 / 1.5); ck.position.set(84, -92); tile.addChild(ck); }
      if (fresh.has(h)) { const nw = txt('¡NUEVO!', 34, '#FF5A4A'); nw.anchor.set(0.5); nw.position.set(-40, -104); nw.rotation = -0.2; tile.addChild(nw); }
      this.item(tile, x, y, 2.55 + i * 0.05, 'pop', 1, {pulse: fresh.has(h)}); const it = this.items[this.items.length - 1];
      this.press(tile, () => {
        if (!open) { it.shake = 0.4; SFX.thump(0.3); return; }
        if (on || this.hs.hop !== -1) return;
        this.hs.hop = 0; this.hs.swap = () => { this.o.onHat?.(cat, h); pose.texture = cats[ci].tex; pose.anchor.set(cats[ci].ax, cats[ci].ay); };
        this.hs.after = () => this.showHats(from, cat, 2);
        SFX.pop();
      });
    });
  }
  // presionable genérico (se hunde y responde al soltar)
  press(o, cb) {
    o.eventMode = 'static'; o.cursor = 'pointer';
    o.on('pointerdown', e => { e.stopPropagation(); o.pressed = true; SFX.unlockAudio(); SFX.click(); });
    o.on('pointerupoutside', () => { o.pressed = false; });
    o.on('pointerup', e => { e.stopPropagation(); if (!o.pressed) return; o.pressed = false; cb(); });
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
      else if (a.k === 'peek') {
        // ciclo de 7 s por gato: escondido → sube con rebote → mira (se inclina, parpadea) → se agacha rápido → escondido
        const c = ((t - a.t0) + a.ph * 1.7) % 7, up = c < 0.45 ? backOut(c / 0.45, 2) : c < 4.2 ? 1 : c < 4.45 ? 1 - easeIn3((c - 4.2) / 0.25) : 0;
        if (a.poke > 0) a.poke -= dt;
        const pk = a.poke > 0 ? Math.sin(a.poke / 0.45 * Math.PI) * 70 : 0, sh = Math.max(up, a.poke > 0 ? 1 : 0);
        a.o.y = a.y + 230 * (1 - sh) - pk; const br = 1 + Math.sin(t * 3 + a.ph) * 0.02;
        a.o.scale.set(a.s / Math.sqrt(br), a.s * br); a.o.rotation = 0.14 + Math.sin(t * 0.9 + a.ph) * 0.08 * up;
        const bc = (t + a.ph * 2.3) % (2.7 + a.i * 0.5), T = a.blink && bc < 0.13 ? a.blink : a.tex; if (a.o.texture !== T) a.o.texture = T;
      }
      else if (a.k === 'fade') a.o.alpha = clamp01(u);
      else if (a.k === 'pose') this.updatePose(a, t, dt, u);
      if (a.shake > 0) { a.shake -= dt; a.o.x = a.x + Math.sin(a.shake * 70) * 18 * (a.shake / 0.4); if (a.shake <= 0) a.o.x = a.x; }
      if (u > 1 && a.pulse) a.o.scale.set(a.s * (1 + Math.sin((t - a.t0) * 5) * 0.045));
      if (a.o.pressed && a.k === 'pop') a.o.scale.set(a.o.scale.x * 0.9);
    }
    for (const q of this.unlocks || []) { // candado: tiembla 0.5 s, ¡clac!, sale volando girando; la tapa se encoge y la casilla rebota
      const v = t - q.t0; if (v < 0) continue;
      if (v < 0.5) { q.lk.rotation = Math.sin(v * 60) * 0.18 * (v / 0.5); q.lk.scale.set(1 / 1.5 * (1 + v * 0.3)); continue; }
      if (!q.done) { q.done = true; q.vx = 260; q.vy = -900; SFX.canOpen(); SFX.star(2); q.tile.eventMode = 'static'; }
      const w = v - 0.5; q.vy += 2600 * dt; q.lk.x += q.vx * dt; q.lk.y += q.vy * dt; q.lk.rotation += 9 * dt; q.lk.alpha = Math.max(0, 1 - w / 0.7);
      const c = clamp01(w / 0.22); q.cv.scale.set(1 / 1.5 * 0.95 * (1 - c)); q.cv.alpha = 1 - c;
      if (w < 0.45) { const b = Math.sin(w / 0.45 * Math.PI) * 0.14 * (1 - w / 0.45); q.tile.scale.set(q.tile.scale.x * (1 + b)); }
    }
    bounceButtons(this.buttons, dt);
    if (this.redo) { const f = this.redo; this.redo = null; f(); }
  }
  // gato en el cojín: aparece con rebote, respira y parpadea; al ponerse un sombrero salta, en lo alto cambia de textura
  // (sombrero puesto) con chispas de estrellas y aterriza aplastándose
  updatePose(a, t, dt, u) {
    const hs = this.hs, c = this.o.cats[hs.ci]; let y = a.y, sx = 1, sy = 1;
    const v = clamp01(u * 0.8); sx = sy = backOut(v, 2.2);
    const br = 1 + Math.sin(t * 3) * 0.02; sx /= Math.sqrt(br); sy *= br;
    if (hs.hop >= 0) {
      const h = (hs.hop += dt), up = 0.42;
      if (h < 0.1) { const q = Math.sin(h / 0.1 * Math.PI / 2) * 0.14; sx *= 1 + q; sy *= 1 - q; } // se agacha
      else if (h < 0.1 + up) { const w = (h - 0.1) / up; y -= Math.sin(w * Math.PI) * 190; sx *= 0.92; sy *= 1.1;
        if (w > 0.5 && hs.swap) { hs.swap(); hs.swap = null; SFX.star(1); this.burst(a.x, a.y - 300); } }
      else { const l = (h - 0.1 - up) / 0.3; const q = Math.sin(clamp01(l) * Math.PI) * 0.18 * (1 - clamp01(l)); sx *= 1 + q; sy *= 1 - q; if (l >= 1) hs.hop = -2; }
    }
    a.o.y = y; const k = a.s; a.o.scale.set(k * sx, k * sy);
    const bc = t % 3.4, T = bc > 0 && bc < 0.13 && hs.hop < 0 && c.blink ? c.blink : c.tex; if (a.o.texture !== T) a.o.texture = T;
    for (const p of hs.sparks) { p.vy += 1500 * dt; p.o.x += p.vx * dt; p.o.y += p.vy * dt; p.o.rotation += p.vr * dt; p.life -= dt; p.o.alpha = clamp01(p.life / 0.3); }
    hs.sparks = hs.sparks.filter(p => { if (p.life > 0) return true; p.o.destroy(); return false; });
    if (hs.hop === -2 && !hs.sparks.length) { hs.hop = -3; this.redo = hs.after; } // se reconstruye al terminar el cuadro (no a media iteración)
  }
  burst(x, y) {
    for (let i = 0; i < 14; i++) { const o = new Sprite(this.T.starSm), a = -Math.PI / 2 + (Math.random() - 0.5) * 2.6, v = 500 + Math.random() * 600;
      o.anchor.set(0.5); o.position.set(x, y); o.scale.set(0.5 + Math.random() * 0.7); this.box.addChild(o);
      this.hs.sparks.push({o, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vr: (Math.random() - 0.5) * 12, life: 0.7 + Math.random() * 0.4}); }
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
