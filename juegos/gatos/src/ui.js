// UI en pantalla (fuera del mundo): botón de reintentar del HUD y pantalla de resultados estilo AB2
// (estrellas que caen una a una con campanita, puntaje que cuenta, lata de atún recuperada, botones gorditos con rebote).
// Coordenadas de diseño 2048×1536; se escala al tamaño de la pantalla.
import {Container, Sprite, Texture, Text, Graphics} from '../vendor/pixi.min.mjs';
import ART from './art.js';
import * as SFX from './sfx.js';

const W = 2048, H = 1536;
export function tex(w, h, draw, res = 1) { const c = document.createElement('canvas'); c.width = w * res; c.height = h * res; const k = c.getContext('2d'); k.scale(res, res); draw(k); return Texture.from(c); }
export const backOut = (u, s = 1.9) => 1 + (s + 1) * Math.pow(u - 1, 3) + s * Math.pow(u - 1, 2);
export const clamp01 = u => Math.max(0, Math.min(1, u));
export const txt = (text, size, fill = '#FFFFFF', stroke = 0.17) => new Text({text, style: {fontFamily: 'Luckiest Guy', fontSize: size, fill, stroke: {color: '#1F2240', width: Math.round(size * stroke), join: 'round'}, dropShadow: {color: '#1F2240', distance: Math.round(size * 0.08), angle: Math.PI / 2, blur: 0, alpha: 0.95}, align: 'center'}});

// íconos blancos con contorno para los botones
export function iconRetry(k, x, y, h) {
  const r = h * 0.24; k.save(); k.lineCap = 'round'; k.lineJoin = 'round';
  for (const [col, lw] of [['#1F2240', h * 0.17], ['#FFFFFF', h * 0.09]]) {
    k.strokeStyle = col; k.fillStyle = col; k.lineWidth = lw;
    k.beginPath(); k.arc(x, y, r, -Math.PI * 0.35, Math.PI * 1.35); k.stroke();
    const ax = x + Math.cos(-Math.PI * 0.35) * r, ay = y + Math.sin(-Math.PI * 0.35) * r, s = h * 0.13 + (col === '#1F2240' ? h * 0.04 : 0);
    k.beginPath(); k.moveTo(ax + s * 0.9, ay - s * 0.9); k.lineTo(ax + s * 0.9, ay + s * 0.6); k.lineTo(ax - s * 0.6, ay + s * 0.6); k.closePath(); k.fill();
  }
  k.restore();
}
export function iconNext(k, x, y, h) {
  const s = h * 0.24; k.save(); k.lineJoin = 'round';
  k.beginPath(); k.moveTo(x - s * 0.7, y - s); k.lineTo(x + s * 1.0, y); k.lineTo(x - s * 0.7, y + s); k.closePath();
  k.lineWidth = h * 0.08; k.strokeStyle = '#1F2240'; k.fillStyle = '#FFFFFF'; k.stroke(); k.fill(); k.restore();
}
// pausa (dos barras), menú de niveles (cuadrícula 2×2), atrás (flecha), sonido (bocina con ondas / tachada)
const outlined = (k, h, draw) => { k.save(); k.lineJoin = 'round'; k.lineCap = 'round'; k.lineWidth = h * 0.07; k.strokeStyle = '#1F2240'; k.fillStyle = '#FFFFFF'; draw(); k.stroke(); k.fill(); k.restore(); };
export function iconPause(k, x, y, h) { const w = h * 0.11, t = h * 0.36; for (const dx of [-w * 1.6, w * 0.6]) outlined(k, h, () => ART.rr(k, x + dx, y - t / 2, w, t, w * 0.35)); }
export function iconMenu(k, x, y, h) { const s = h * 0.15, g = h * 0.06; for (const i of [-1, 0]) for (const j of [-1, 0]) outlined(k, h, () => ART.rr(k, x + (i ? -s - g / 2 : g / 2), y + (j ? -s - g / 2 : g / 2), s, s, s * 0.25)); }
export function iconBack(k, x, y, h) { const s = h * 0.24; outlined(k, h, () => { k.beginPath(); k.moveTo(x - s * 1.05, y); k.lineTo(x + s * 0.1, y - s); k.lineTo(x + s * 0.1, y - s * 0.42); k.lineTo(x + s * 0.95, y - s * 0.42); k.lineTo(x + s * 0.95, y + s * 0.42); k.lineTo(x + s * 0.1, y + s * 0.42); k.lineTo(x + s * 0.1, y + s); k.closePath(); }); }
export function iconSound(on) {
  return (k, x, y, h) => {
    const s = h * 0.2; x -= s * 0.35;
    outlined(k, h, () => { k.beginPath(); k.moveTo(x - s, y - s * 0.45); k.lineTo(x - s * 0.35, y - s * 0.45); k.lineTo(x + s * 0.35, y - s * 1.05); k.lineTo(x + s * 0.35, y + s * 1.05); k.lineTo(x - s * 0.35, y + s * 0.45); k.lineTo(x - s, y + s * 0.45); k.closePath(); });
    k.save(); k.lineCap = 'round';
    for (const [col, lw] of [['#1F2240', h * 0.12], ['#FFFFFF', h * 0.055]]) {
      k.strokeStyle = col; k.lineWidth = lw; k.beginPath();
      if (on) { k.arc(x + s * 0.5, y, s * 0.75, -0.8, 0.8); k.moveTo(x + s * 0.5 + Math.cos(-0.8) * s * 1.35, y + Math.sin(-0.8) * s * 1.35); k.arc(x + s * 0.5, y, s * 1.35, -0.8, 0.8); }
      else { k.moveTo(x + s * 0.85, y - s * 0.5); k.lineTo(x + s * 1.75, y + s * 0.5); k.moveTo(x + s * 1.75, y - s * 0.5); k.lineTo(x + s * 0.85, y + s * 0.5); }
      k.stroke();
    }
    k.restore();
  };
}
export const BTN = {yellow: ['#FFD860', '#E8861A'], green: ['#A6EA62', '#3C9A1C'], blue: ['#7CC8FF', '#2F6BD0'], grey: ['#C3C8DA', '#6F7590'], red: ['#FF9A7A', '#D4382A']};
export const btnTex = (size, col, icon) => tex(size + 20, size + 40, k => ART.button(k, 10, 10, size, size, BTN[col][0], BTN[col][1], icon), 1.5);
// botón gordito: se hunde al presionar y rebota al soltar (se anima con bounceButtons)
export function makeButton(t, cb, base = 1) {
  const b = new Sprite(t); b.anchor.set(0.5); b.scale.set(base); b.base = base; b.eventMode = 'static'; b.cursor = 'pointer';
  b.on('pointerdown', e => { e.stopPropagation(); b.pressed = true; b.scale.set(base * 0.86); SFX.unlockAudio(); SFX.click(); });
  b.on('pointerupoutside', () => { b.pressed = false; b.scale.set(base); });
  b.on('pointerup', e => { e.stopPropagation(); if (!b.pressed) return; b.pressed = false; b.bounce = 0; cb(); });
  return b;
}
export function bounceButtons(list, dt) {
  for (const b of list) if (b.bounce != null) { b.bounce += dt; const u = clamp01(b.bounce / 0.3); b.scale.set(b.base * (1 + Math.sin(u * Math.PI) * 0.15)); if (u >= 1) b.bounce = null; }
}

export class UI {
  constructor(app, {onRetry, onNext, onMenu, onPause, mouseTex, cats}) {
    this.app = app; this.cats = cats || []; this.onRetry = onRetry; this.onNext = onNext; this.onMenu = onMenu; this.mouseTex = mouseTex;
    this.hud = new Container(); this.overlay = new Container(); this.overlay.visible = false;
    app.stage.addChild(this.hud, this.overlay);
    this.T = {
      retry: tex(170, 190, k => ART.button(k, 10, 10, 150, 150, '#FFD860', '#E8861A', iconRetry), 1.5),
      next: tex(230, 250, k => ART.button(k, 10, 10, 210, 210, '#A6EA62', '#3C9A1C', iconNext), 1.5),
      retryBig: tex(230, 250, k => ART.button(k, 10, 10, 210, 210, '#FFD860', '#E8861A', iconRetry), 1.5),
      pause: btnTex(150, 'blue', iconPause),
      menu: btnTex(170, 'blue', iconMenu),
      starOn: tex(260, 260, k => ART.star(k, 130, 134, 112, true)),
      starOff: tex(260, 260, k => ART.star(k, 130, 134, 112, false)),
      spark: tex(48, 48, k => { k.fillStyle = '#FFF6C0'; k.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i % 2 ? 6 : 22; k.lineTo(24 + Math.cos(a) * r, 24 + Math.sin(a) * r); } k.fill(); }),
      confetti: tex(24, 14, k => { k.fillStyle = '#FFFFFF'; k.fillRect(0, 0, 24, 14); k.fillStyle = 'rgba(0,0,0,0.18)'; k.fillRect(0, 9, 24, 5); }),
      tuna: tex(220, 200, k => ART.can(k, 30, 40, 160, 130, {tuna: true, seed: 3})),
      // lata abierta: copete de atún en hojuelas asomando por la boca, con el borde delantero encima
      tunaOpen: tex(220, 200, k => {
        ART.can(k, 30, 40, 160, 130, {tuna: true, seed: 3});
        const cx = 110, cy = 49.6;
        k.beginPath(); k.ellipse(cx, cy, 76, 8, 0, 0, Math.PI * 2); k.fillStyle = '#3A3F48'; k.fill();
        k.save(); k.beginPath(); k.ellipse(cx, cy, 72, 7, 0, 0, Math.PI); k.lineTo(cx - 72, cy); k.ellipse(cx, cy, 72, 34, 0, Math.PI, Math.PI * 2); k.closePath();
        k.fillStyle = ART.lin(k, 0, cy - 34, 0, cy + 6, [[0, '#F7C9A8'], [0.55, '#E39A78'], [1, '#B8644A']]); k.fill(); k.clip();
        let sd = 7; const R = () => (sd = (sd * 9301 + 49297) % 233280) / 233280;
        for (let i = 0; i < 26; i++) { const a = Math.PI + R() * Math.PI, rr = R() * 0.95, x = cx + Math.cos(a) * 70 * rr, y = cy + Math.sin(a) * 32 * rr + 3;
          k.beginPath(); k.ellipse(x, y, 7 + R() * 7, 3 + R() * 2.5, (R() - 0.5) * 0.9, 0, Math.PI * 2); k.fillStyle = R() < 0.5 ? 'rgba(255,226,200,0.85)' : 'rgba(170,82,60,0.45)'; k.fill(); }
        k.beginPath(); k.ellipse(cx - 18, cy - 20, 22, 6, -0.15, 0, Math.PI * 2); k.fillStyle = 'rgba(255,255,255,0.45)'; k.fill();
        k.restore();
        k.beginPath(); k.ellipse(cx, cy, 72, 34, 0, Math.PI, Math.PI * 2); k.lineWidth = 3; k.strokeStyle = '#7A3A2A'; k.stroke();
        k.beginPath(); k.ellipse(cx, cy, 79, 9.6, 0, 0, Math.PI); k.lineWidth = 6; k.strokeStyle = '#DDE4EC'; k.stroke(); k.lineWidth = 2; k.strokeStyle = '#2E343C'; k.stroke();
      }),
      lid: tex(200, 70, k => {
        k.beginPath(); k.ellipse(100, 40, 80, 16, 0, 0, Math.PI * 2); k.fillStyle = ART.lin(k, 20, 24, 180, 56, [[0, '#F4F8FB'], [0.5, '#C2CCD6'], [1, '#7E8996']]); k.fill();
        k.lineWidth = 3; k.strokeStyle = '#2E343C'; k.stroke();
        k.beginPath(); k.ellipse(100, 40, 60, 11, 0, 0, Math.PI * 2); k.lineWidth = 2; k.strokeStyle = 'rgba(60,65,75,0.5)'; k.stroke();
        k.beginPath(); k.ellipse(100, 36, 22, 9, 0, 0, Math.PI * 2); k.lineWidth = 6; k.strokeStyle = '#2E343C'; k.stroke(); k.lineWidth = 3.5; k.strokeStyle = '#E8EEF4'; k.stroke(); // anillo
      }),
      heart: tex(60, 56, k => { k.beginPath(); k.moveTo(30, 50); k.bezierCurveTo(4, 32, 2, 10, 17, 7); k.bezierCurveTo(25, 5, 30, 12, 30, 17); k.bezierCurveTo(30, 12, 35, 5, 43, 7); k.bezierCurveTo(58, 10, 56, 32, 30, 50); k.closePath();
        k.fillStyle = ART.lin(k, 0, 6, 0, 50, [[0, '#FFA6C4'], [1, '#E8457A']]); k.fill(); k.lineWidth = 4; k.strokeStyle = '#1F2240'; k.stroke();
        k.beginPath(); k.ellipse(19, 17, 5, 3, -0.6, 0, Math.PI * 2); k.fillStyle = 'rgba(255,255,255,0.75)'; k.fill(); }),
      panel: tex(1180, 980, k => {
        ART.rr(k, 14, 34, 1152, 930, 90); k.fillStyle = '#14163A'; k.fill();                       // base 3D
        ART.rr(k, 14, 14, 1152, 920, 90); k.fillStyle = ART.lin(k, 0, 14, 0, 934, [[0, '#4B53B8'], [0.55, '#2E3488'], [1, '#232766']]); k.fill();
        k.lineWidth = 16; k.strokeStyle = '#1F2240'; k.stroke();
        ART.rr(k, 40, 40, 1100, 868, 70); k.lineWidth = 6; k.strokeStyle = 'rgba(255,255,255,0.14)'; k.stroke();
        ART.rr(k, 120, 640, 940, 150, 50); k.fillStyle = 'rgba(10,12,40,0.45)'; k.fill();          // marco del puntaje
      }),
    };
    // HUD: pausa (arriba a la izquierda, como AB2) + reintentar rápido + nombre del nivel
    this.hudPause = this.button(this.T.pause, () => onPause(), 0.54); this.hudPause.position.set(84, 92);
    this.hudRetry = this.button(this.T.retry, () => this.onRetry(), 0.54); this.hudRetry.position.set(234, 92);
    this.lvlName = txt('', 44, '#FFE27A'); this.lvlName.anchor.set(0, 0.5); this.lvlName.position.set(318, 88);
    this.hud.addChild(this.hudPause, this.hudRetry, this.lvlName);
    // overlay de resultados
    this.dim = new Graphics(); this.overlay.addChild(this.dim);
    this.box = new Container(); this.overlay.addChild(this.box);
    this.anims = []; this.t = 0; this.open = false;
    // cartel del nivel al empezar (durante el sobrevuelo): listón con el nombre que cae, rebota y se va hacia arriba
    this.ban = new Container(); this.ban.visible = false; app.stage.addChild(this.ban);
    this.banRib = new Sprite(tex(1100, 230, k => {
      const rib = (x, y, w, h, c1, c2) => { k.beginPath(); k.moveTo(x, y); k.lineTo(x + w, y); k.lineTo(x + w - 40, y + h / 2); k.lineTo(x + w, y + h); k.lineTo(x, y + h); k.lineTo(x + 40, y + h / 2); k.closePath(); k.fillStyle = ART.lin(k, 0, y, 0, y + h, [[0, c1], [1, c2]]); k.fill(); k.lineWidth = 10; k.strokeStyle = '#1F2240'; k.stroke(); };
      rib(10, 70, 230, 130, '#C0392B', '#8E2418'); rib(860, 70, 230, 130, '#C0392B', '#8E2418'); // puntas del listón (atrás)
      ART.rr(k, 140, 22, 820, 170, 30); k.fillStyle = '#1F2240'; k.fill();
      ART.rr(k, 140, 14, 820, 166, 30); k.fillStyle = ART.lin(k, 0, 14, 0, 180, [[0, '#FF7A5A'], [0.5, '#E8452C'], [1, '#B8301C']]); k.fill(); k.lineWidth = 10; k.strokeStyle = '#1F2240'; k.stroke();
      ART.rr(k, 165, 30, 770, 40, 18); k.fillStyle = 'rgba(255,255,255,0.22)'; k.fill();
    }, 1.5)); this.banRib.anchor.set(0.5); this.banRib.scale.set(1 / 1.5);
    this.banT = txt('', 92, '#FFFFFF'); this.banT.anchor.set(0.5); this.banT.y = -14;
    this.banS = txt('', 44, '#FFE27A'); this.banS.anchor.set(0.5); this.banS.y = 112;
    this.ban.addChild(this.banRib, this.banT, this.banS); this.banTime = -1;
  }
  banner(title, sub) { this.banT.text = title; this.banS.text = sub || ''; this.banTime = 0; this.ban.visible = true;
    const k = Math.min(1, 720 / this.banT.width); this.banT.scale.set(k); }
  hideBanner() { this.banTime = -1; this.ban.visible = false; }
  // botón gordito: se hunde al presionar y rebota al soltar
  button(t, cb, base = 1) { return makeButton(t, cb, base); }
  setLevelName(s) { this.lvlName.text = s; }
  hide() { this.overlay.visible = false; this.open = false; this.box.removeChildren().forEach(c => c.destroy()); this.anims = []; this.hud.visible = true; }

  // r = {win, stars, score, best, record, name, hasNext}
  show(r) {
    this.hide(); this.cans = []; this.open = true; this.overlay.visible = true; this.hud.visible = false; this.t = 0; this.r = r;
    const B = this.box, add = (o, x, y) => { o.position.set(x, y); B.addChild(o); return o; };
    const panel = add(new Sprite(this.T.panel), 0, 40); panel.anchor.set(0.5);
    const title = add(txt(r.final ? '¡JEFA VENCIDA!' : r.win ? '¡NIVEL SUPERADO!' : 'NIVEL FALLIDO', 104, r.win ? '#FFE27A' : '#FF8A6A'), 0, -440); title.anchor.set(0.5);
    const sub = add(txt(r.name, 50, '#C9D2FF'), 0, -350); sub.anchor.set(0.5);
    // animaciones: {o, t0, kind}
    const A = this.anims;
    A.push({o: panel, t0: 0, dur: 0.38, k: 'pop'}, {o: title, t0: 0.12, dur: 0.4, k: 'drop'}, {o: sub, t0: 0.25, dur: 0.3, k: 'pop'});
    if (r.win) {
      // tres estrellas en arco (la de en medio más grande y más alta), caen una a una
      const pos = [[-300, -150, 0.85, -0.18], [0, -195, 1.05, 0], [300, -150, 0.85, 0.18]];
      pos.forEach(([x, y, s, rot], i) => {
        const off = add(new Sprite(this.T.starOff), x, y); off.anchor.set(0.5); off.scale.set(s); off.rotation = rot;
        A.push({o: off, t0: 0.3, dur: 0.3, k: 'pop', s});
        if (i < r.stars) { const on = add(new Sprite(this.T.starOn), x, y); on.anchor.set(0.5); on.rotation = rot; on.visible = false; A.push({o: on, t0: 0.9 + i * 0.55, dur: 0.42, k: 'star', s, i}); }
      });
      if (r.final && this.cats.length) {
        // final del juego: los 3 gatos festejan brincando detrás de una pila de latas de atún
        this.cats.forEach((c, i) => { const sp = add(new Sprite(c.tex), (i - 1) * 260, 70); sp.anchor.set(c.ax, c.ay);
          A.push({o: sp, t0: 0.55 + i * 0.12, dur: 0.45, k: 'pop', s: i === 1 ? 0.42 : 0.36, cheer: i, y0: i === 1 ? 60 : 78}); });
        [[-140, 120, 0.55, -0.2], [140, 120, 0.55, 0.2], [0, 132, 0.62, 0]].forEach(([x, y, s, rot], i) => { const t = add(new Sprite(this.T.tuna), x, y); t.anchor.set(0.5); t.rotation = rot; A.push({o: t, t0: 0.85 + i * 0.1, dur: 0.4, k: 'pop', s});
          this.cans.push({o: t, tOpen: 2.9 + i * 0.3, opened: false, peek: [], hearts: [], lid: null, hT: 0, s, r0: rot}); });
        this.confetti = [];
      } else {
        // la lata llega cerrada; después de las estrellas tiembla, ¡clic!, la tapa sale volando y dos gatos se asoman a olerla
        const pals = this.cats.length ? [...this.cats].sort(() => Math.random() - 0.5).slice(0, 2) : [];
        const peek = pals.map((c, i) => { const sp = add(new Sprite(c.tex), i ? 128 : -128, 30); sp.anchor.set(c.ax, c.ay); sp.c = c; sp.side = i ? 1 : -1; sp.scale.set(0); return sp; });
        const tuna = add(new Sprite(this.T.tuna), 0, 15); tuna.anchor.set(0.5); A.push({o: tuna, t0: 0.6, dur: 0.45, k: 'pop', s: 1});
        this.cans.push({o: tuna, tOpen: 0.9 + r.stars * 0.55 + 0.2, opened: false, peek, hearts: [], lid: null, hT: 0, s: 1});
        const tl = add(txt('¡ATÚN RECUPERADO!', 46, '#BDEBFF'), 0, 125); tl.anchor.set(0.5); A.push({o: tl, t0: 0.75, dur: 0.3, k: 'pop'});
      }
    } else {
      const m = add(new Sprite(this.mouseTex), 0, -90); m.anchor.set(0.5); A.push({o: m, t0: 0.3, dur: 0.4, k: 'pop', s: 1.45, laugh: true});
      const tl = add(txt('¡Los ratones se quedan con el atún!', 46, '#FFFFFF'), 0, 115); tl.anchor.set(0.5); A.push({o: tl, t0: 0.5, dur: 0.3, k: 'pop'});
    }
    // puntaje que cuenta
    this.scoreTxt = add(txt('0', 110, '#FFFFFF'), 0, 262); this.scoreTxt.anchor.set(0.5); A.push({o: this.scoreTxt, t0: 0.35, dur: 0.3, k: 'pop'});
    this.bestTxt = add(txt(r.record ? '¡NUEVO RÉCORD!' : `MEJOR: ${r.best.toLocaleString('en-US')}`, 42, r.record ? '#A8F06A' : '#C9D2FF'), 0, 392); this.bestTxt.anchor.set(0.5);
    A.push({o: this.bestTxt, t0: r.win ? 0.9 + r.stars * 0.55 + 0.2 : 1.0, dur: 0.35, k: 'pop'});
    // botones
    const tb = r.win ? 0.9 + r.stars * 0.55 + 0.35 : 1.2;
    // menú (niveles) · reintentar · siguiente; el principal late
    const btns = r.win && r.hasNext
      ? [[this.T.menu, this.onMenu, 0.62, -330], [this.T.retryBig, this.onRetry, 0.72, -95], [this.T.next, this.onNext, 0.9, 185, true]]
      : [[this.T.menu, this.onMenu, 0.62, -150], [this.T.retryBig, this.onRetry, 0.9, 110, true]];
    btns.forEach(([t, cb, s, x, pulse], i) => { const b = add(this.button(t, () => cb(), s), x, 625); A.push({o: b, t0: tb + i * 0.1, dur: 0.35, k: 'pop', s, pulse}); });
    A.forEach(a => { a.s = a.s ?? 1; if (a.k !== 'star') a.o.scale.set(0); });
    this.sparks = [];
  }
  updateCan(c, t, dt) {
    const u = t - c.tOpen, o = c.o, S = c.s, r0 = c.r0 || 0;
    if (u < 0 && u > -0.4) { const w = 1 + u / 0.4; o.rotation = r0 + Math.sin(t * 46) * 0.07 * w; o.scale.set(S * (1 + w * 0.04), S * (1 - w * 0.04)); } // tiembla antes de abrirse
    if (u >= 0 && !c.opened) {
      c.opened = true; o.texture = this.T.tunaOpen; o.rotation = r0; SFX.canOpen(); this.burst(o.x, o.y - 40 * S);
      const l = new Sprite(this.T.lid); l.anchor.set(0.5); l.position.set(o.x, o.y - 50 * S); l.scale.set(S); this.box.addChild(l); c.lid = {s: l, vx: (o.x < 0 ? -1 : 1) * 330, vy: -1250, w: 11, sc: S};
    }
    if (!c.opened) return;
    const k = Math.exp(-u * 7); o.scale.set(S * (1 - Math.sin(u * 22) * 0.16 * k), S * (1 + Math.sin(u * 22) * 0.2 * k)); // rebote elástico al abrirse
    if (c.lid) { const L = c.lid; L.vy += 2600 * dt; L.s.x += L.vx * dt; L.s.y += L.vy * dt; L.s.rotation += L.w * dt; L.s.scale.y = L.sc * Math.cos(u * 9);
      L.s.alpha = Math.min(1, Math.max(0, 1.3 - u)); if (u > 1.3) { L.s.destroy(); c.lid = null; } }
    // corazoncitos que suben como aroma
    if ((c.hT -= dt) <= 0 && c.hearts.length < 9) { c.hT = u < 0.5 ? 0.09 : 0.5; const h = new Sprite(this.T.heart); h.anchor.set(0.5);
      h.position.set(o.x + (Math.random() - 0.5) * 110 * S, o.y - 55 * S); this.box.addChild(h); c.hearts.push({s: h, a: 0, ph: Math.random() * 6, sz: 0.45 + Math.random() * 0.35}); }
    for (let i = c.hearts.length - 1; i >= 0; i--) { const h = c.hearts[i]; h.a += dt; h.s.y -= (120 + 60 * h.sz) * dt; h.s.x += Math.sin(h.a * 4 + h.ph) * 40 * dt;
      const sc = h.sz * Math.min(1, h.a * 5); h.s.scale.set(sc); h.s.rotation = Math.sin(h.a * 4 + h.ph) * 0.25; h.s.alpha = 1 - Math.max(0, (h.a - 0.6) / 0.5);
      if (h.a > 1.1) { h.s.destroy(); c.hearts.splice(i, 1); } }
    // gatos que se asoman por los lados, se inclinan hacia la lata y husmean (parpadeo lento = cara de gusto)
    c.peek.forEach((p, i) => { const v = u - 0.12 - i * 0.12; if (v < 0) return; const pv = backOut(clamp01(v / 0.4), 2.2);
      const sn = Math.sin(v * 9) * 0.03 * (v > 0.4); p.scale.set(0.3 * pv * (1 - sn), 0.3 * pv * (1 + sn)); p.rotation = -p.side * (0.32 + Math.sin(v * 2.2) * 0.05);
      p.x = p.side * (136 - 18 * Math.min(1, v * 2)); p.y = 30 - 26 * pv - Math.abs(Math.sin(v * 3)) * 6;
      p.texture = (v % 2.4) > 1.7 && p.c.blink ? p.c.blink : p.c.tex; });
  }
  burst(x, y) {
    for (let i = 0; i < 14; i++) {
      const s = new Sprite(this.T.spark); s.anchor.set(0.5); s.position.set(x, y); const a = Math.random() * 6.28, v = 300 + Math.random() * 500;
      s.scale.set(0.6 + Math.random() * 0.9); this.box.addChild(s); this.sparks.push({s, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0});
    }
  }
  update(dt) {
    const sw = this.app.screen.width, sh = this.app.screen.height;
    const hs = Math.min(sw / W, sh / H) * 1.25; this.hud.scale.set(hs);
    bounceButtons(this.hud.children, dt);
    if (this.banTime >= 0) {
      const bt = (this.banTime += dt), s = Math.min(sw / W, sh / H) * 1.25;
      // entra cayendo con rebote (0.2–0.65 s), se queda, y sale hacia arriba acelerando (2.4–2.8 s)
      const uin = clamp01((bt - 0.2) / 0.45), uout = clamp01((bt - 2.4) / 0.4);
      this.ban.scale.set(s * (0.6 + 0.4 * backOut(uin)));
      this.ban.position.set(sw / 2, sh * 0.3 - (1 - backOut(uin, 1.2)) * sh * 0.25 - uout * uout * sh * 0.6);
      this.ban.alpha = Math.min(1, uin * 3) * (1 - uout); this.ban.rotation = (1 - uin) * -0.08;
      if (bt > 2.85) this.hideBanner();
    }
    if (!this.open) return;
    this.t += dt; const t = this.t;
    this.dim.clear().rect(0, 0, sw, sh).fill({color: 0x0A0820, alpha: Math.min(0.62, t * 2)});
    const s = Math.min(sw / W, sh / H) * 1.05; this.box.scale.set(s); this.box.position.set(sw / 2, sh / 2 - 20 * s);
    for (const a of this.anims) {
      const u = (t - a.t0) / a.dur;
      if (u < 0) continue;
      if (a.k === 'pop') { a.o.scale.set(a.s * Math.max(0, backOut(clamp01(u)))); }
      else if (a.k === 'drop') { a.o.scale.set(1); a.o.y = -440 - 300 * (1 - backOut(clamp01(u), 1.4)); }
      else if (a.k === 'star') {
        // la estrella cae grande desde arriba, se asienta con rebote, campanita y chispas
        a.o.visible = true; const v = clamp01(u);
        a.o.scale.set(a.s * (2.6 - 1.6 * backOut(v, 2.4))); a.o.alpha = Math.min(1, v * 3);
        if (u >= 1 && !a.done) { a.done = true; SFX.star(a.i); this.burst(a.o.x, a.o.y); }
      }
      if (u > 1 && a.pulse) a.o.scale.set(a.s * (1 + Math.sin((t - a.t0) * 5) * 0.045));
      if (u > 1 && a.cheer != null) { const c = (t * 1.6 + a.cheer * 0.33) % 1, h = c < 0.45 ? Math.sin(c / 0.45 * Math.PI) : 0;
        a.o.y = a.y0 - h * 70; const sq = c < 0.45 ? 1 + h * 0.06 : 1 - Math.sin((c - 0.45) / 0.55 * Math.PI) * 0.07; a.o.scale.set(a.s / Math.sqrt(sq), a.s * sq); a.o.rotation = h * (a.cheer - 1) * 0.12; }
      if (u > 1 && a.laugh) { a.o.rotation = Math.sin(t * 14) * 0.06; a.o.y = -90 - Math.abs(Math.sin(t * 7)) * 18; }
    }
    for (const c of this.cans) this.updateCan(c, t, dt);
    // puntaje cuenta de 0 al total
    const cu = clamp01((t - 0.4) / 1.1); this.scoreTxt.text = Math.round(this.r.score * (1 - Math.pow(1 - cu, 3))).toLocaleString('en-US');
    if (this.r.final && this.confetti) { // confeti que cae sin parar sobre el panel final
      const hw = sw / 2 / s, hh = sh / 2 / s, C = [0xFFE27A, 0xFF7A8A, 0x7AD8FF, 0xA8F06A, 0xFFB04A, 0xD9A0FF];
      if (t > 0.5 && this.confetti.length < 90) for (let i = 0; i < 2; i++) { const c = new Sprite(this.T.confetti); c.anchor.set(0.5); c.tint = C[Math.floor(Math.random() * C.length)];
        c.position.set((Math.random() - 0.5) * hw * 2, -hh - 20); this.box.addChild(c); this.confetti.push({s: c, vy: 180 + Math.random() * 160, w: Math.random() * 6, ph: Math.random() * 6, sz: 0.8 + Math.random() * 0.8}); }
      for (let i = this.confetti.length - 1; i >= 0; i--) { const c = this.confetti[i]; c.ph += dt * (3 + c.w); c.s.y += c.vy * dt; c.s.x += Math.sin(c.ph) * 60 * dt; c.s.rotation = c.ph * 0.7; c.s.scale.set(c.sz * Math.cos(c.ph), c.sz);
        if (c.s.y > hh + 30) { c.s.destroy(); this.confetti.splice(i, 1); } }
    }
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const p = this.sparks[i]; p.t += dt; p.vx *= 0.93; p.vy = p.vy * 0.93 + 900 * dt; p.s.x += p.vx * dt; p.s.y += p.vy * dt; p.s.rotation += dt * 6; p.s.alpha = 1 - p.t / 0.7;
      if (p.t > 0.7) { p.s.destroy(); this.sparks.splice(i, 1); }
    }
  }
}
