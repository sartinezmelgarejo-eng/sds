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
      wood: shard([['#D89A58', '#4E2A0E'], ['#B57437', '#3E200A'], ['#E8B47A', '#5A3212']], [[2, 18], [46, 12], [46, 26], [4, 32]]),
      pot: shard([['#E07B45', '#5A220A'], ['#C8602F', '#4A1C08'], ['#F29A62', '#6A2A10'], ['#4FAE3A', '#2A5A18']], [[10, 4], [44, 14], [30, 44], [4, 30]]),
      stone: shard([['#B5B1A8', '#3B3935'], ['#8E8A82', '#2E2C29'], ['#7FA850', '#3A5A20']], [[8, 6], [40, 4], [46, 34], [22, 46], [2, 30]]),
      smoke: [tex(96, 96, (k) => { const g = k.createRadialGradient(48, 44, 4, 48, 48, 46); g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.6, 'rgba(240,235,228,0.8)'); g.addColorStop(1, 'rgba(230,225,215,0)'); k.fillStyle = g; k.beginPath(); k.arc(48, 48, 46, 0, 7); k.fill(); })],
      star: [tex(48, 48, (k) => { k.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 9 : 22; k.lineTo(24 + Math.cos(a) * r, 24 + Math.sin(a) * r); } k.closePath(); k.fillStyle = '#FFE680'; k.fill(); })],
    };
    // chispas eléctricas (aspiradora dañada): rayito blanco-azul y punto amarillo
    this.T.zap = [tex(48, 48, k => { k.lineCap = 'round'; k.lineJoin = 'round'; k.strokeStyle = 'rgba(120,200,255,0.9)'; k.lineWidth = 9; const z = () => { k.beginPath(); k.moveTo(6, 10); k.lineTo(22, 20); k.lineTo(18, 28); k.lineTo(42, 40); k.stroke(); }; z(); k.strokeStyle = '#FFFFFF'; k.lineWidth = 4; z(); }),
      tex(32, 32, k => { const g = k.createRadialGradient(16, 16, 1, 16, 16, 15); g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.35, '#FFF27A'); g.addColorStop(1, 'rgba(255,190,40,0)'); k.fillStyle = g; k.beginPath(); k.arc(16, 16, 15, 0, 7); k.fill(); })];
    this.T.tnt = shard([['#E8402A', '#4A0E08'], ['#B02418', '#3A0A05'], ['#FFE14A', '#6A5410'], ['#2F7BE0', '#1A2F55']], [[2, 16], [46, 10], [44, 28], [6, 34]]);
    // gota de agua (frascos) y terrones (macetas del Jardín)
    this.T.drop = [tex(32, 40, k => { const g = k.createLinearGradient(6, 0, 26, 40); g.addColorStop(0, 'rgba(225,248,255,0.95)'); g.addColorStop(1, 'rgba(90,170,220,0.9)'); k.fillStyle = g;
      k.beginPath(); k.moveTo(16, 2); k.bezierCurveTo(22, 14, 28, 22, 28, 28); k.arc(16, 28, 12, 0, Math.PI); k.bezierCurveTo(4, 22, 10, 14, 16, 2); k.fill(); k.fillStyle = 'rgba(255,255,255,0.85)'; k.beginPath(); k.ellipse(11, 27, 3, 5, 0.3, 0, 7); k.fill(); })];
    this.T.dirt = shard([['#6B4426', '#3A2210'], ['#5A3820', '#2E1A0A'], ['#7E5432', '#45291A']], [[8, 10], [36, 6], [44, 30], [22, 42], [4, 28]]);
    this.puddles = [];
    this.T.canball = this.T.can; this.T.boulder = this.T.stone;
    this.T.robot = this.T.can; // la aspiradora suelta pedacitos de metal
  }
  burst(kind, x, y, n, speed, opts = {}) {
    const ts = this.T[kind];
    // tope de partículas (rendimiento en tablet): con muchas vivas, cada ráfaga nueva se reduce
    if (this.parts.length > 260) n = Math.max(1, Math.round(n * 260 / this.parts.length));
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
  // pedazo suelto con textura propia (p. ej. el gorro que pierde un ratón): vuela girando, rebota en la barra y se desvanece
  debris(t, x, y, vx, vy, opts = {}) {
    const s = new Sprite(t); s.anchor.set(0.5); s.position.set(x, y); s.scale.set(opts.size ?? 1); s.rotation = opts.rot ?? 0; this.root.addChild(s);
    this.parts.push({s, vx, vy, vr: opts.vr ?? 8, life: opts.life ?? 2.4, t: 0, g: opts.g ?? G, drag: opts.drag ?? 0.2, grow: 0, sz: opts.size ?? 1});
  }
  // anillo de onda expansiva (crece y se desvanece)
  ring(x, y, R, color = 0xFFFFFF, dur = 0.38) {
    if (!this.ringTex) this.ringTex = tex(256, 256, k => { k.lineWidth = 18; k.strokeStyle = 'rgba(255,255,255,0.95)'; k.beginPath(); k.arc(128, 128, 110, 0, 7); k.stroke(); k.lineWidth = 34; k.strokeStyle = 'rgba(255,255,255,0.35)'; k.beginPath(); k.arc(128, 128, 96, 0, 7); k.stroke(); });
    const s = new Sprite(this.ringTex); s.anchor.set(0.5); s.position.set(x, y); s.tint = color; s.scale.set(0.1); this.root.addChild(s);
    this.parts.push({s, vx: 0, vy: 0, vr: 0, life: dur, t: 0, g: 0, drag: 0, grow: 0, sz: 0.1, ring: R / 110});
  }
  // destello de impacto (AB2): estrella blanca de picos irregulares que aparece de golpe, crece un poco y se apaga en ~0.15 s
  impact(x, y, R, rot = 0) {
    if (!this.impTex) this.impTex = tex(160, 160, k => { k.translate(80, 80); const P = 9;
      const star = (r0, r1, j) => { k.beginPath(); for (let i = 0; i < P * 2; i++) { const a = i * Math.PI / P, r = i % 2 ? r0 : r1 * (0.75 + 0.25 * Math.abs(Math.sin(i * 2.3 + j))); k.lineTo(Math.cos(a) * r, Math.sin(a) * r); } k.closePath(); };
      star(26, 76, 0); k.fillStyle = 'rgba(255,226,120,0.9)'; k.fill(); star(18, 58, 1); k.fillStyle = '#FFFFFF'; k.fill(); });
    const s = new Sprite(this.impTex); s.anchor.set(0.5); s.position.set(x, y); s.rotation = rot; const sz = R / 76; s.scale.set(sz); this.root.addChild(s);
    this.parts.push({s, vx: 0, vy: 0, vr: 0, life: 0.15, t: 0, g: 0, drag: 0, grow: 0.5, sz});
  }
  // bola de fuego: núcleo blanco + capa naranja que se expande
  fireball(x, y, R) {
    if (!this.fireTex) this.fireTex = tex(128, 128, k => { const g = k.createRadialGradient(64, 64, 4, 64, 64, 62); g.addColorStop(0, 'rgba(255,250,210,1)'); g.addColorStop(0.18, 'rgba(255,210,70,1)'); g.addColorStop(0.55, 'rgba(255,120,20,0.95)'); g.addColorStop(0.8, 'rgba(210,60,15,0.6)'); g.addColorStop(1, 'rgba(160,40,10,0)'); k.fillStyle = g; k.beginPath(); k.arc(64, 64, 62, 0, 7); k.fill(); });
    for (let i = 10; i >= 0; i--) { // el núcleo (i=0) al final para que quede encima
      const s = new Sprite(this.fireTex); s.anchor.set(0.5); const a = Math.random() * 6.3, d = i ? R * (0.25 + Math.random() * 0.3) : 0;
      s.position.set(x + Math.cos(a) * d, y + Math.sin(a) * d); const sz = (i ? 0.45 + Math.random() * 0.25 : 1.0) * R / 64; s.scale.set(sz);
      this.root.addChild(s);
      this.parts.push({s, vx: Math.cos(a) * 160, vy: Math.sin(a) * 160 - 80, vr: 0, life: 0.6 + Math.random() * 0.25, t: 0, g: -160, drag: 2.2, grow: 0.7, sz});
    }
  }
  // explosión estilo AB2: destello blanco, bola de fuego aditiva en capas, chispas y humo oscuro que sube y se queda un rato
  explosion(x, y, R) {
    // humo (detrás, aparece cuando el fuego se apaga)
    const n0 = this.parts.length;
    this.burst('smoke', x, y, 10, R * 2.6, {up: 110, g: -150, drag: 3.0, life: 1.3, size: R / 110, grow: 1.4, w: R * 0.9, h: R * 0.7});
    for (let i = n0; i < this.parts.length; i++) { const p = this.parts[i]; p.s.tint = [0xB8ACA4, 0xCFC4BA, 0x9A8E86][i % 3]; p.delay = 0.25 + Math.random() * 0.15; p.s.alpha = 0; p.maxA = 0.6; }
    this.fireball(x, y, R);
    // destello corto
    if (!this.flashTex) this.flashTex = tex(128, 128, k => { const g = k.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,240,1)'); g.addColorStop(0.4, 'rgba(255,230,150,0.6)'); g.addColorStop(1, 'rgba(255,200,120,0)'); k.fillStyle = g; k.fillRect(0, 0, 128, 128); });
    const f = new Sprite(this.flashTex); f.anchor.set(0.5); f.position.set(x, y); const fs = R * 1.5 / 64; f.scale.set(fs); this.root.addChild(f);
    this.parts.push({s: f, vx: 0, vy: 0, vr: 0, life: 0.1, t: 0, g: 0, drag: 0, grow: 0.6, sz: fs});
    // brasas
    const n1 = this.parts.length;
    this.burst('star', x, y, 18, R * 5, {up: 200, size: 0.6, life: 0.8, drag: 1.2});
    for (let i = n1; i < this.parts.length; i++) this.parts[i].s.tint = [0xFFC030, 0xFF7A20, 0xFFE070][i % 3];
  }
  // estela (loop y picada de Miu): bolitas suaves que se encogen y desvanecen en su lugar
  streak(x, y, r, color = 0xEDE4FF) {
    const s = new Sprite(this.T.smoke[0]); s.anchor.set(0.5); s.position.set(x, y); s.tint = color; const sz = r / 46; s.scale.set(sz);
    (this.under || this.root).addChild(s); // detrás de los gatos si hay capa trasera
    this.parts.push({s, vx: 0, vy: 0, vr: 0, life: 0.42, t: 0, g: 0, drag: 0, grow: -0.85, sz});
  }
  // frasco con agua que se rompe: gotas que salen disparadas (estiradas en la dirección del movimiento) y al tocar la barra dejan un charquito
  splash(x, y, w, h) {
    const n0 = this.parts.length, n = Math.round(Math.min(26, 10 + w * h / 2500));
    this.burst('drop', x, y, n, 520, {w: w * 0.6, h: h * 0.6, up: 320, drag: 0.3, life: 2.5, size: 1.05});
    for (let i = n0; i < this.parts.length; i++) { const p = this.parts[i]; p.drop = 1; p.vr = 0; }
  }
  puddle(x) {
    if (!this.pudTex) this.pudTex = tex(128, 32, k => { const g = k.createRadialGradient(64, 16, 2, 64, 16, 62); g.addColorStop(0, 'rgba(215,242,255,0.95)'); g.addColorStop(0.75, 'rgba(110,180,228,0.85)'); g.addColorStop(1, 'rgba(70,140,200,0.7)'); k.fillStyle = g; k.beginPath(); k.ellipse(64, 16, 60, 12, 0, 0, 7); k.fill(); k.lineWidth = 2.5; k.strokeStyle = 'rgba(50,110,165,0.75)'; k.stroke();
      k.fillStyle = 'rgba(255,255,255,0.7)'; k.beginPath(); k.ellipse(48, 12, 16, 3, 0, 0, 7); k.fill(); });
    // las gotas que caen cerca de un charco lo agrandan en vez de hacer otro
    const near = this.puddles.find(q => Math.abs(q.x - x) < 70 * q.k + 30);
    if (near) { near.k = Math.min(3.2, near.k + 0.18); near.t = Math.min(near.t, 0.5); return; }
    if (this.puddles.length > 14) return;
    const s = new Sprite(this.pudTex); s.anchor.set(0.5, 0.45); s.position.set(x, GROUND - 2); s.scale.set(0.1, 0.1); (this.under || this.root).addChild(s);
    this.puddles.push({s, x, k: 0.55, cur: 0.1, t: 0});
  }
  smoke(x, y, r, n = 9) { this.burst('smoke', x, y, n, r * 2.2, {up: 40, g: -60, drag: 3.5, life: 0.75, size: r / 40, grow: 1.4, w: r * 0.6, h: r * 0.6}); }
  points(x, y, value, color = '#FFFFFF', big = false, k = 1) {
    const t = new Text({text: value.toLocaleString('en-US'), style: {fontFamily: 'Luckiest Guy', fontSize: (big ? 84 : 58) * k, fill: color, stroke: {color: '#1F2240', width: (big ? 12 : 9) * k, join: 'round'}, dropShadow: {color: '#1F2240', distance: 5, angle: Math.PI / 2, blur: 0, alpha: 0.9}}});
    // si hay otro número reciente encima, apilar hacia arriba para que no se encimen
    for (let k = 0; k < 6; k++) { const hit = this.texts.find(o => o.t0 < 0.8 && Math.abs(o.x - x) < 170 && Math.abs(o.y0 - y) < 64); if (!hit) break; y = hit.y0 - 70; }
    t.anchor.set(0.5); t.position.set(x, y); t.scale.set(0.2); this.root.addChild(t);
    this.texts.push({t, t0: 0, y0: y, x});
  }
  clear() { this.puddles.forEach(q => q.s.destroy()); this.puddles = []; this.parts.forEach(p => p.s.destroy()); this.texts.forEach(o => o.t.destroy()); this.parts = []; this.texts = []; }
  update(dt) {
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      if (p.delay > 0) { p.delay -= dt; continue; }
      p.t += dt;
      p.vy += p.g * dt; const d = Math.exp(-p.drag * dt); p.vx *= d; p.vy *= d;
      p.s.x += p.vx * dt; p.s.y += p.vy * dt; p.s.rotation += p.vr * dt;
      if (p.drop) { p.s.rotation = Math.atan2(p.vy, p.vx) - Math.PI / 2; const v = Math.hypot(p.vx, p.vy); p.s.scale.set(p.sz * 0.85, p.sz * Math.min(1.9, 0.9 + v / 900)); // gota estirada
        if (p.s.y > GROUND - 6) { this.puddle(p.s.x); this.burst('drop', p.s.x, GROUND - 8, 1, 120, {up: 160, life: 0.35, size: p.sz * 0.5, drag: 0.5}); p.s.destroy(); this.parts.splice(i, 1); continue; } }
      if (p.s.y > GROUND - 6 && p.g > 0) { p.s.y = GROUND - 6; p.vy *= -0.3; p.vx *= 0.6; p.vr *= 0.5; } // rebotan en la barra
      if (p.grow) p.s.scale.set(p.sz * (1 + p.grow * p.t / p.life));
      if (p.ring) p.s.scale.set(0.1 + (p.ring - 0.1) * (1 - Math.pow(1 - p.t / p.life, 3)));
      const u = p.t / p.life; p.s.alpha = (p.maxA ?? 1) * (u > 0.6 ? Math.max(0, 1 - (u - 0.6) / 0.4) : Math.min(1, p.maxA ? u * 6 : 1));
      if (u >= 1) { p.s.destroy(); this.parts.splice(i, 1); }
    }
    for (let i = this.puddles.length - 1; i >= 0; i--) { const q = this.puddles[i]; q.t += dt; // se extiende rápido, se queda brillando y se seca despacio
      q.cur += (q.k - q.cur) * Math.min(1, dt * 7); q.s.scale.set(q.cur, q.cur * (0.8 + 0.2 * Math.min(1, q.t * 3)));
      q.s.alpha = q.t < 4 ? 1 : Math.max(0, 1 - (q.t - 4) / 3); if (q.t > 4) q.s.scale.x = q.cur * (1 - (q.t - 4) * 0.06);
      if (q.t > 7) { q.s.destroy(); this.puddles.splice(i, 1); } }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const o = this.texts[i]; o.t0 += dt; const u = o.t0;
      // aparece con rebote, sube despacio y se desvanece
      const pop = u < 0.18 ? 0.2 + (u / 0.18) * 1.0 : u < 0.3 ? 1.2 - (u - 0.18) / 0.12 * 0.2 : 1;
      o.t.scale.set(pop); o.t.y = o.y0 - u * 70; o.t.alpha = u > 1.0 ? Math.max(0, 1 - (u - 1.0) / 0.4) : 1;
      if (u > 1.4) { o.t.destroy(); this.texts.splice(i, 1); }
    }
  }
}
