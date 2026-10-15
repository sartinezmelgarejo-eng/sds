// Partículas ligeras (sin Matter): astillas de cartón, vidrios, pedacitos de lata, humo/polvo, mechones.
// + puntos flotantes con fuente gordita. Todo vive en un contenedor del mundo.
import {Container, Sprite, Texture, Text} from '../vendor/pixi.min.mjs';
import {GROUND} from './config.js';

const G = 1300; // gravedad visual de partículas (u/s²)
function tex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return Texture.from(c); }

export class FX {
  constructor(parent) {
    this.root = new Container(); parent.addChild(this.root); this.parts = []; this.texts = [];
    const shard = (cols, poly) => cols.map(([f, s]) => tex(48, 48, (k) => { k.beginPath(); poly.forEach(([x, y], i) => i ? k.lineTo(x, y) : k.moveTo(x, y)); k.closePath(); k.fillStyle = f; k.fill(); k.lineWidth = 3; k.strokeStyle = s; k.stroke(); }));
    this.T = {
      box: shard([['#D9A464', '#5A3415'], ['#B97E43', '#4A2810'], ['#E9C38A', '#6A4420']], [[4, 10], [40, 4], [44, 30], [10, 42]]),
      jar: shard([['rgba(200,235,250,0.85)', 'rgba(70,130,170,0.9)'], ['rgba(230,250,255,0.9)', 'rgba(90,150,190,0.9)']], [[24, 2], [44, 40], [6, 30]]),
      can: shard([['#C9CDD6', '#3A3F4F'], ['#2F6FB8', '#1A2F55'], ['#F2C230', '#6A5410']], [[6, 8], [42, 12], [36, 40], [4, 34]]),
      smoke: [tex(96, 96, (k) => { const g = k.createRadialGradient(48, 44, 4, 48, 48, 46); g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.6, 'rgba(240,235,228,0.8)'); g.addColorStop(1, 'rgba(230,225,215,0)'); k.fillStyle = g; k.beginPath(); k.arc(48, 48, 46, 0, 7); k.fill(); })],
      star: [tex(48, 48, (k) => { k.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 9 : 22; k.lineTo(24 + Math.cos(a) * r, 24 + Math.sin(a) * r); } k.closePath(); k.fillStyle = '#FFE680'; k.fill(); })],
    };
  }
  burst(kind, x, y, n, speed, opts = {}) {
    const ts = this.T[kind];
    for (let i = 0; i < n; i++) {
      const s = new Sprite(ts[i % ts.length]); s.anchor.set(0.5);
      const a = opts.dir != null ? opts.dir + (Math.random() - 0.5) * (opts.spread ?? 2.2) : Math.random() * Math.PI * 2;
      const v = speed * (0.35 + Math.random() * 0.8), sz = (opts.size ?? 1) * (0.5 + Math.random() * 0.8);
      s.scale.set(sz); s.position.set(x + (Math.random() - 0.5) * (opts.w ?? 0), y + (Math.random() - 0.5) * (opts.h ?? 0));
      s.rotation = Math.random() * 6;
      this.root.addChild(s);
      this.parts.push({s, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (opts.up ?? 250), vr: (Math.random() - 0.5) * 14, life: opts.life ?? (0.9 + Math.random() * 0.7), t: 0, g: opts.g ?? G, drag: opts.drag ?? 0.4, grow: opts.grow ?? 0, sz});
    }
  }
  smoke(x, y, r, n = 9) { this.burst('smoke', x, y, n, r * 2.2, {up: 40, g: -60, drag: 3.5, life: 0.75, size: r / 40, grow: 1.4, w: r * 0.6, h: r * 0.6}); }
  points(x, y, value, color = '#FFFFFF', big = false) {
    const t = new Text({text: value.toLocaleString('en-US'), style: {fontFamily: 'Luckiest Guy', fontSize: big ? 84 : 58, fill: color, stroke: {color: '#1F2240', width: big ? 12 : 9, join: 'round'}, dropShadow: {color: '#1F2240', distance: 5, angle: Math.PI / 2, blur: 0, alpha: 0.9}}});
    // si hay otro número reciente encima, apilar hacia arriba para que no se encimen
    for (let k = 0; k < 6; k++) { const hit = this.texts.find(o => o.t0 < 0.8 && Math.abs(o.x - x) < 170 && Math.abs(o.y0 - y) < 64); if (!hit) break; y = hit.y0 - 70; }
    t.anchor.set(0.5); t.position.set(x, y); t.scale.set(0.2); this.root.addChild(t);
    this.texts.push({t, t0: 0, y0: y, x});
  }
  update(dt) {
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i]; p.t += dt;
      p.vy += p.g * dt; const d = Math.exp(-p.drag * dt); p.vx *= d; p.vy *= d;
      p.s.x += p.vx * dt; p.s.y += p.vy * dt; p.s.rotation += p.vr * dt;
      if (p.s.y > GROUND - 6 && p.g > 0) { p.s.y = GROUND - 6; p.vy *= -0.3; p.vx *= 0.6; p.vr *= 0.5; } // rebotan en la barra
      if (p.grow) p.s.scale.set(p.sz * (1 + p.grow * p.t / p.life));
      const u = p.t / p.life; p.s.alpha = u > 0.6 ? Math.max(0, 1 - (u - 0.6) / 0.4) : 1;
      if (u >= 1) { p.s.destroy(); this.parts.splice(i, 1); }
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const o = this.texts[i]; o.t0 += dt; const u = o.t0;
      // aparece con rebote, sube despacio y se desvanece
      const pop = u < 0.18 ? 0.2 + (u / 0.18) * 1.0 : u < 0.3 ? 1.2 - (u - 0.18) / 0.12 * 0.2 : 1;
      o.t.scale.set(pop); o.t.y = o.y0 - u * 70; o.t.alpha = u > 1.0 ? Math.max(0, 1 - (u - 1.0) / 0.4) : 1;
      if (u > 1.4) { o.t.destroy(); this.texts.splice(i, 1); }
    }
  }
}
