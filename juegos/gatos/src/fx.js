// Partículas ligeras (sin Matter): astillas de cartón, vidrios, pedacitos de lata, humo/polvo, mechones.
// + puntos flotantes con fuente gordita. Todo vive en un contenedor del mundo.
import {Container, Sprite, Texture, Text} from '../vendor/pixi.min.mjs';
import {GROUND} from './config.js';

const G = 1300; // gravedad visual de partículas (u/s²)
function tex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return Texture.from(c); }

export class FX {
  constructor(parent) {
    this.floors = []; this.floorHits = 0; // floors: caras de arriba de repisas fijas {x0, x1, y0, m} (las pone main.js) → las partículas rebotan ahí también
    this.root = new Container(); parent.addChild(this.root); this.top = new Container(); parent.addChild(this.top); this.parts = []; this.texts = []; // top: números de puntos SIEMPRE encima de explosiones/humo
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
    this.T.spark = [this.T.zap[1]];   // chispita amarilla sola (cohetes que chisporrotean)
    this.T.tnt = shard([['#E8402A', '#4A0E08'], ['#B02418', '#3A0A05'], ['#FFE14A', '#6A5410'], ['#2F7BE0', '#1A2F55']], [[2, 16], [46, 10], [44, 28], [6, 34]]);
    // gota de agua (frascos) y terrones (macetas del Jardín)
    this.T.drop = [tex(32, 40, k => { const g = k.createLinearGradient(6, 0, 26, 40); g.addColorStop(0, 'rgba(225,248,255,0.95)'); g.addColorStop(1, 'rgba(90,170,220,0.9)'); k.fillStyle = g;
      k.beginPath(); k.moveTo(16, 2); k.bezierCurveTo(22, 14, 28, 22, 28, 28); k.arc(16, 28, 12, 0, Math.PI); k.bezierCurveTo(4, 22, 10, 14, 16, 2); k.fill(); k.fillStyle = 'rgba(255,255,255,0.85)'; k.beginPath(); k.ellipse(11, 27, 3, 5, 0.3, 0, 7); k.fill(); })];
    this.T.dirt = shard([['#6B4426', '#3A2210'], ['#5A3820', '#2E1A0A'], ['#7E5432', '#45291A']], [[8, 10], [36, 6], [44, 30], [22, 42], [4, 28]]);
    // pétalos (flor tragona del Jardín) y polen
    this.T.petal = [...['#FF7AB8', '#E8489A', '#FFB3D6'].map(c => tex(40, 40, k => { k.fillStyle = c; k.strokeStyle = '#7A1E4A'; k.lineWidth = 2.5; k.beginPath(); k.moveTo(20, 3); k.bezierCurveTo(36, 12, 32, 34, 20, 37); k.bezierCurveTo(8, 34, 4, 12, 20, 3); k.fill(); k.stroke(); })),
      tex(24, 24, k => { const g = k.createRadialGradient(12, 12, 1, 12, 12, 11); g.addColorStop(0, '#FFF6A0'); g.addColorStop(0.5, '#FFD23A'); g.addColorStop(1, 'rgba(255,190,40,0)'); k.fillStyle = g; k.beginPath(); k.arc(12, 12, 11, 0, 7); k.fill(); })];
    // briznas de pasto y hojitas (lo que cae sobre el pasto del Jardín las levanta)
    this.T.blade = ['#5FB13E', '#3E8A2C', '#8FD85E', '#4C9A34'].map((c, i) => tex(24, 56, k => { k.fillStyle = c; k.strokeStyle = '#24561A'; k.lineWidth = 2; k.beginPath();
      k.moveTo(8, 53); k.quadraticCurveTo(4 + i, 26, 13 + (i % 2) * 4, 3); k.quadraticCurveTo(11, 28, 16, 53); k.closePath(); k.fill(); k.stroke(); }));
    this.T.leaf = ['#6CBF45', '#9BD44E', '#4E9A30'].map(c => tex(40, 32, k => { k.fillStyle = c; k.strokeStyle = '#2A5A18'; k.lineWidth = 2.5; k.beginPath(); k.moveTo(3, 16);
      k.quadraticCurveTo(18, 1, 37, 16); k.quadraticCurveTo(18, 31, 3, 16); k.fill(); k.stroke(); k.beginPath(); k.moveTo(5, 16); k.lineTo(33, 16); k.lineWidth = 1.5; k.stroke(); }));
    // piedritas de concreto (La Guarida) y migajas de pan/galleta (Cocina): lo que cae fuerte en el piso las avienta y rebotan
    this.T.pebble = shard([['#9A948C', '#3A3632'], ['#7E7870', '#2E2A26'], ['#B4AEA4', '#45403A']], [[10, 8], [34, 6], [42, 26], [28, 40], [8, 32]]);
    this.T.crumb = shard([['#E2B064', '#7A4A18'], ['#C88A3E', '#5E3410'], ['#F0CC8A', '#8A5A22']], [[12, 6], [30, 10], [40, 22], [34, 38], [14, 40], [6, 22]]);
    this.puddles = [];
    this.T.canball = this.T.can; this.T.boulder = this.T.stone;
    this.T.robot = this.T.can; // la aspiradora suelta pedacitos de metal
  }
  burst(kind, x, y, n, speed, opts = {}) {
    const ts = this.T[kind];
    // tope de partículas (rendimiento en tablet): con muchas vivas, cada ráfaga nueva se reduce
    // + presupuesto según la calidad adaptativa (main pone fx.k: 1 a resolución alta … 0.5 a resolución 1): menos relleno de GPU
    const k = this.k ?? 1, cap = 260 * k;
    if (k < 1 && n > 2) n = Math.max(2, Math.round(n * k));
    if (this.parts.length > cap) n = Math.max(1, Math.round(n * cap / this.parts.length));
    for (let i = 0; i < n; i++) {
      const s = new Sprite(ts[i % ts.length]); s.anchor.set(0.5);
      const a = opts.dir != null ? opts.dir + (Math.random() - 0.5) * (opts.spread ?? 2.2) : Math.random() * Math.PI * 2;
      const v = speed * (0.35 + Math.random() * 0.8), sz = (opts.size ?? 1) * (0.5 + Math.random() * 0.8);
      s.scale.set(sz); s.position.set(x + (Math.random() - 0.5) * (opts.w ?? 0), y + (Math.random() - 0.5) * (opts.h ?? 0));
      s.rotation = Math.random() * 6; if (opts.tint != null) s.tint = opts.tint;
      this.root.addChild(s);
      this.parts.push({s, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (opts.up ?? 250), vr: (Math.random() - 0.5) * 14, life: opts.life ?? (0.9 + Math.random() * 0.7), t: 0, y0: s.y, g: opts.g ?? G, drag: opts.drag ?? 0.4, grow: opts.grow ?? 0, sz});
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
  // onda expansiva de explosión (AB2): borde brillante con ribete oscuro por fuera (se lee igual sobre la cocina clara que sobre
  // la Guarida oscura), velo claro por dentro; se adelgaza y apaga mientras crece. Si toca el piso, barre polvo a los dos lados.
  shock(x, y, R, color = 0xFFF1C8, dur = 0.42, dustTint) {
    if (!this.shockTex) this.shockTex = tex(256, 256, k => {
      let g = k.createRadialGradient(128, 128, 40, 128, 128, 108); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.8, 'rgba(255,255,255,0.16)'); g.addColorStop(1, 'rgba(255,255,255,0.4)');
      k.fillStyle = g; k.beginPath(); k.arc(128, 128, 108, 0, 7); k.fill();
      g = k.createRadialGradient(128, 128, 106, 128, 128, 127); g.addColorStop(0, 'rgba(70,40,25,0.55)'); g.addColorStop(0.35, 'rgba(70,40,25,0.32)'); g.addColorStop(1, 'rgba(70,40,25,0)');
      k.fillStyle = g; k.beginPath(); k.arc(128, 128, 127, 0, 7); k.arc(128, 128, 106, 0, 7, true); k.fill();
      k.lineWidth = 7; k.strokeStyle = '#FFFFFF'; k.beginPath(); k.arc(128, 128, 106, 0, 7); k.stroke(); });
    const s = new Sprite(this.shockTex); s.anchor.set(0.5); s.position.set(x, y); s.tint = color; s.scale.set(0.1); s.alpha = 0; (this.under || this.root).addChild(s);
    this.parts.push({s, vx: 0, vy: 0, vr: 0, life: dur, t: 0, g: 0, drag: 0, grow: 0, sz: 0.1, ring: R / 110, glow: 0.95, atk: 0.02});
    // segundo frente, más chico y rápido (aditivo): el "golpe" de aire del centro
    const s2 = new Sprite(this.shockTex); s2.anchor.set(0.5); s2.position.set(x, y); s2.tint = 0xFFFFFF; s2.blendMode = 'add'; s2.scale.set(0.1); s2.alpha = 0; this.root.addChild(s2);
    this.parts.push({s: s2, vx: 0, vy: 0, vr: 0, life: dur * 0.55, t: 0, g: 0, drag: 0, grow: 0, sz: 0.1, ring: R * 0.55 / 110, glow: 0.7, atk: 0.01});
    this.shockN = (this.shockN || 0) + 1;
    // polvo que barre el piso cuando el frente llega a la barra (cada bocanada sale cuando el anillo pasa por ahí)
    const dy = GROUND - y; if (dy < -20 || dy > R * 0.9) return;
    const half = Math.sqrt(Math.max(0, R * R - dy * dy)), n = Math.max(2, Math.round(5 * (this.k ?? 1))), V = R / dur;
    for (const side of [-1, 1]) for (let i = 0; i < n; i++) {
      const d = Math.max(dy, 30) + (half - Math.max(dy, 30)) * (i / Math.max(1, n - 1)), dx = Math.sqrt(Math.max(0, d * d - dy * dy)), n0 = this.parts.length;
      this.burst('smoke', x + side * dx, GROUND - 14, 1, 40, {up: 30 + Math.random() * 40, g: -40, drag: 2.6, life: 0.7 + Math.random() * 0.3, size: 0.9 + Math.random() * 0.6, grow: 1.6, w: 30, h: 8, tint: dustTint});
      for (let j = n0; j < this.parts.length; j++) { const p = this.parts[j]; p.vx += side * (260 + Math.random() * 160); p.delay = d / V * 0.75; p.s.alpha = 0; p.maxA = 0.7; }
    }
  }
  // picada de Miu (Silver AB2): onda aplanada que corre a ras de la estructura + líneas de velocidad que suben (el "aire" que trae)
  slam(x, y, R) {
    if (!this.ringTex) this.ring(x, y, 1, 0xFFFFFF, 0.01);
    for (const [k, dur, c] of [[1.25, 0.42, 0xE8F6FF], [0.8, 0.3, 0xFFFFFF]]) {
      const s = new Sprite(this.ringTex); s.anchor.set(0.5); s.position.set(x, y); s.tint = c; s.blendMode = 'add'; s.scale.set(0.1); s.alpha = 0; this.root.addChild(s);
      this.parts.push({s, vx: 0, vy: 0, vr: 0, life: dur, t: 0, g: 0, drag: 0, grow: 0, sz: 0.1, ring: R * k / 110, flat: 0.24, maxA: 0.45});
    }
    if (!this.lineTex) this.lineTex = tex(16, 128, k => { const g = k.createLinearGradient(0, 0, 0, 128); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.7, 'rgba(255,255,255,0.85)'); g.addColorStop(1, 'rgba(255,255,255,1)'); k.fillStyle = g; k.beginPath(); k.ellipse(8, 64, 5, 64, 0, 0, 7); k.fill(); });
    const n = Math.max(4, Math.round(9 * (this.k ?? 1)));
    for (let i = 0; i < n; i++) { const dx = (i / (n - 1) - 0.5) * R * 0.9 + (Math.random() - 0.5) * 20, h = R * (0.5 + Math.random() * 0.6);
      const s = new Sprite(this.lineTex); s.anchor.set(0.5, 1); s.position.set(x + dx, y - R * 0.15 - Math.random() * 30); s.tint = i % 2 ? 0xDFF1FF : 0xFFFFFF; s.blendMode = 'add';
      const sx = 0.9 + Math.random() * 0.8, sy = h / 128; s.scale.set(sx, sy); s.alpha = 0; (this.under || this.root).addChild(s);
      this.parts.push({s, vx: 0, vy: -520 - Math.random() * 300, vr: 0, life: 0.28 + Math.random() * 0.12, t: 0, g: 0, drag: 2.5, grow: 0, sz: sx, glow: 0.8, atk: 0.03}); }
  }
  // destello de impacto (AB2): estrella blanca de picos irregulares que aparece de golpe, crece un poco y se apaga en ~0.15 s
  impact(x, y, R, rot = 0) {
    if (!this.impTex) this.impTex = tex(160, 160, k => { k.translate(80, 80); const P = 9;
      const star = (r0, r1, j) => { k.beginPath(); for (let i = 0; i < P * 2; i++) { const a = i * Math.PI / P, r = i % 2 ? r0 : r1 * (0.75 + 0.25 * Math.abs(Math.sin(i * 2.3 + j))); k.lineTo(Math.cos(a) * r, Math.sin(a) * r); } k.closePath(); };
      star(26, 76, 0); k.fillStyle = 'rgba(255,226,120,0.9)'; k.fill(); star(18, 58, 1); k.fillStyle = '#FFFFFF'; k.fill(); });
    const s = new Sprite(this.impTex); s.anchor.set(0.5); s.position.set(x, y); s.rotation = rot; const sz = R / 76; s.scale.set(sz); this.root.addChild(s);
    this.parts.push({s, vx: 0, vy: 0, vr: 0, life: 0.15, t: 0, g: 0, drag: 0, grow: 0.5, sz});
  }
  // bola de fuego (AB2): estalla con rebote (pop), se abre en bolas irregulares que suben y pasan de amarillo → naranja → rojo
  // → tizne antes de que entre el humo; el núcleo blanco-amarillo dura poquito encima de todo
  fireball(x, y, R) {
    if (!this.fireTex) this.fireTex = tex(128, 128, k => { const g = k.createRadialGradient(64, 64, 4, 64, 64, 62); g.addColorStop(0, 'rgba(255,250,210,1)'); g.addColorStop(0.18, 'rgba(255,210,70,1)'); g.addColorStop(0.55, 'rgba(255,120,20,0.95)'); g.addColorStop(0.8, 'rgba(210,60,15,0.6)'); g.addColorStop(1, 'rgba(160,40,10,0)'); k.fillStyle = g; k.beginPath(); k.arc(64, 64, 62, 0, 7); k.fill(); });
    // bola neutra (blanco con orilla un poco más oscura) para teñir con la rampa de color
    if (!this.puffTex) this.puffTex = tex(128, 128, k => { const g = k.createRadialGradient(56, 54, 4, 64, 64, 62); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.55, 'rgba(235,235,235,1)'); g.addColorStop(0.85, 'rgba(200,200,200,0.85)'); g.addColorStop(1, 'rgba(180,180,180,0)'); k.fillStyle = g; k.beginPath(); k.arc(64, 64, 62, 0, 7); k.fill(); });
    const ramp = [[0, 0xFFF4C0], [0.16, 0xFFC040], [0.42, 0xFF8420], [0.7, 0xC8461E], [1, 0x6A4A42]];
    const n = Math.max(6, Math.round(10 * (this.k ?? 1)));
    for (let i = 0; i < n; i++) {
      const a = i / n * 6.283 + (Math.random() - 0.5) * 0.6, d = R * (0.12 + Math.random() * 0.3), v = R * (2.2 + Math.random() * 1.2);
      const s = new Sprite(this.puffTex); s.anchor.set(0.5); s.position.set(x + Math.cos(a) * d, y + Math.sin(a) * d); s.rotation = Math.random() * 6.3;
      const sz = (0.42 + Math.random() * 0.26) * R / 64; s.scale.set(sz * 0.4); s.tint = ramp[0][1]; this.root.addChild(s);
      this.parts.push({s, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.8 - R * 0.6, vr: (Math.random() - 0.5) * 1.2, life: 0.36 + Math.random() * 0.22, t: 0, g: -R * 1.1, drag: 6, grow: 0.45, sz, pop: 0.07 + Math.random() * 0.03, ramp});
    }
    // núcleo caliente encima: estalla y se apaga rápido (deja ver cómo se oscurecen las bolas de afuera)
    const c = new Sprite(this.fireTex); c.anchor.set(0.5); c.position.set(x, y); const cz = R * 0.95 / 64; c.scale.set(cz * 0.4); this.root.addChild(c);
    this.parts.push({s: c, vx: 0, vy: -R * 0.3, vr: 0, life: 0.3, t: 0, g: 0, drag: 3, grow: 0.25, sz: cz, pop: 0.06});
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
    this.bloom(x, y, R);
    // brasas
    const n1 = this.parts.length;
    this.burst('star', x, y, 18, R * 5, {up: 200, size: 0.6, life: 0.8, drag: 1.2});
    for (let i = n1; i < this.parts.length; i++) this.parts[i].s.tint = [0xFFC030, 0xFF7A20, 0xFFE070][i % 3];
  }
  // BLOOM de explosión (AB2): luz aditiva que "quema" el centro y baña de naranja lo que está alrededor + rayos de luz
  // que se abren y giran un poco. Todo con blendMode 'add' → sobre fondos claros satura a blanco (el brillo de AB2).
  // pal (opcional): paleta para otros golpes — {halo, core, rays, peak, rays0, screen}. Miu = azul-blanco, Omi = crema suave.
  // En calidad baja (k < 0.8) se salta el halo grande (relleno aditivo enorme = lo que más cuesta en GPU).
  bloom(x, y, R, pal = null) {
    if (!this.bloomTex) {
      this.bloomTex = tex(128, 128, k => { const g = k.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,240,200,1)'); g.addColorStop(0.2, 'rgba(255,190,90,0.7)'); g.addColorStop(0.5, 'rgba(255,130,40,0.28)'); g.addColorStop(1, 'rgba(255,90,20,0)'); k.fillStyle = g; k.fillRect(0, 0, 128, 128); });
      this.raysTex = tex(256, 256, k => { k.translate(128, 128); const N = 14;
        for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2 + (i % 2) * 0.09, L = i % 2 ? 84 : 124, w = i % 2 ? 0.045 : 0.07;
          const g = k.createLinearGradient(0, 0, Math.cos(a) * L, Math.sin(a) * L); g.addColorStop(0, 'rgba(255,250,225,0.95)'); g.addColorStop(0.45, 'rgba(255,215,130,0.55)'); g.addColorStop(1, 'rgba(255,170,70,0)');
          k.fillStyle = g; k.beginPath(); k.moveTo(Math.cos(a - w * 2.4) * 10, Math.sin(a - w * 2.4) * 10); k.lineTo(Math.cos(a - w) * L, Math.sin(a - w) * L); k.lineTo(Math.cos(a + w) * L, Math.sin(a + w) * L); k.lineTo(Math.cos(a + w * 2.4) * 10, Math.sin(a + w * 2.4) * 10); k.closePath(); k.fill(); } });
    }
    const add = (t, sz, life, opts) => { const s = new Sprite(t); s.anchor.set(0.5); s.position.set(x, y); s.blendMode = 'add'; s.scale.set(sz); s.rotation = opts.rot ?? 0; s.alpha = 0; if (opts.tint != null) s.tint = opts.tint;
      (opts.back ? (this.under || this.root) : this.root).addChild(s);
      this.parts.push({s, vx: 0, vy: 0, vr: opts.vr ?? 0, life, t: 0, g: 0, drag: 0, grow: opts.grow ?? 0, sz, glow: opts.peak ?? 1, atk: opts.atk ?? 0.05}); };
    if (pal && !this.bloomTexW) { // versión neutra (blanca) para teñir con colores fríos sin que salga verdosa
      this.bloomTexW = tex(128, 128, k => { const g = k.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.2, 'rgba(255,255,255,0.7)'); g.addColorStop(0.5, 'rgba(255,255,255,0.26)'); g.addColorStop(1, 'rgba(255,255,255,0)'); k.fillStyle = g; k.fillRect(0, 0, 128, 128); });
      this.raysTexW = tex(256, 256, k => { k.translate(128, 128); const N = 18;
        for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2 + (i % 2) * 0.07, L = i % 2 ? 80 : 126, w = i % 2 ? 0.035 : 0.055;
          const g = k.createLinearGradient(0, 0, Math.cos(a) * L, Math.sin(a) * L); g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.45, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0)');
          k.fillStyle = g; k.beginPath(); k.moveTo(Math.cos(a - w * 2.4) * 10, Math.sin(a - w * 2.4) * 10); k.lineTo(Math.cos(a - w) * L, Math.sin(a - w) * L); k.lineTo(Math.cos(a + w) * L, Math.sin(a + w) * L); k.lineTo(Math.cos(a + w * 2.4) * 10, Math.sin(a + w * 2.4) * 10); k.closePath(); k.fill(); } });
    }
    const P = pal || {}, pk = P.peak ?? 1, L = P.life ?? 1, low = (this.k ?? 1) < 0.8, BT = pal ? this.bloomTexW : this.bloomTex, RT = pal ? this.raysTexW : this.raysTex;
    if (!low) add(BT, R * 3.4 / 64, 0.7 * L, {grow: 0.35, peak: 0.5 * pk, atk: 0.04, tint: P.halo ?? 0xFFB070, back: P.back});          // halo grande que ilumina lo de alrededor (lento en apagarse)
    add(BT, R * 1.3 / 64, 0.26 * L, {grow: 0.5, peak: 0.6 * pk, atk: 0.02, tint: P.core, back: P.back});            // núcleo que satura a blanco
    if (P.rays !== null) add(RT, R * 2.3 / 128, 0.34 * L, {grow: 0.9, peak: 0.75 * pk * (P.rays0 ?? 1), atk: 0.03, tint: P.rays ?? 0xFFD9A0, back: P.back, rot: Math.random() * 6.3, vr: (Math.random() < 0.5 ? -1 : 1) * 0.9});
    if (this.onBoom) this.onBoom(x, y, R, P);
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
  // charquito en la barra (o sobre una repisa fija: y = su cara de arriba, maxK = no más ancho que la repisa)
  puddle(x, y = GROUND - 2, maxK = 3.2) {
    if (!this.pudTex) this.pudTex = tex(128, 32, k => { const g = k.createRadialGradient(64, 16, 2, 64, 16, 62); g.addColorStop(0, 'rgba(215,242,255,0.95)'); g.addColorStop(0.75, 'rgba(110,180,228,0.85)'); g.addColorStop(1, 'rgba(70,140,200,0.7)'); k.fillStyle = g; k.beginPath(); k.ellipse(64, 16, 60, 12, 0, 0, 7); k.fill(); k.lineWidth = 2.5; k.strokeStyle = 'rgba(50,110,165,0.75)'; k.stroke();
      k.fillStyle = 'rgba(255,255,255,0.7)'; k.beginPath(); k.ellipse(48, 12, 16, 3, 0, 0, 7); k.fill(); });
    // las gotas que caen cerca de un charco lo agrandan en vez de hacer otro
    const near = this.puddles.find(q => Math.abs(q.x - x) < 70 * q.k + 30 && Math.abs(q.s.y - y) < 20);
    if (near) { near.k = Math.min(near.maxK, near.k + 0.18); near.t = Math.min(near.t, 0.5); return; }
    if (this.puddles.length > 14) return;
    const s = new Sprite(this.pudTex); s.anchor.set(0.5, 0.45); s.position.set(x, y); s.scale.set(0.1, 0.1); (this.under || this.root).addChild(s);
    this.puddles.push({s, x, k: Math.min(0.55, maxK), cur: 0.1, t: 0, maxK});
  }
  smoke(x, y, r, n = 9, tint) { this.burst('smoke', x, y, n, r * 2.2, {up: 40, g: -60, drag: 3.5, life: 0.75, size: r / 40, grow: 1.4, w: r * 0.6, h: r * 0.6, tint}); }
  points(x, y, value, color = '#FFFFFF', big = false, k = 1) {
    const t = new Text({text: value.toLocaleString('en-US'), style: {fontFamily: 'Luckiest Guy', fontSize: (big ? 84 : 58) * k, fill: color, stroke: {color: '#1F2240', width: (big ? 12 : 9) * k, join: 'round'}, dropShadow: {color: '#1F2240', distance: 5, angle: Math.PI / 2, blur: 0, alpha: 0.9}}});
    // medidas reales (a escala 1, sin la sombra) para que updateTexts los acomode sin encimarse
    t.anchor.set(0.5); const w = t.width * 0.92, h = t.height * 0.78;
    t.position.set(x, y); t.scale.set(0.2); this.top.addChild(t);
    this.texts.push({t, t0: 0, y0: y, x, w, h, oy: 0, oyT: 0, n: 0, dx: 0});
  }
  // AB2: los números de puntos nunca se tapan entre sí. Del más viejo al más nuevo: si un número choca
  // (con su tamaño real, ya con el rebote) contra uno de abajo ya acomodado, sube hasta quedar 8 u arriba.
  // El ajuste se suaviza para que se deslicen en vez de brincar; el primer cuadro se coloca directo.
  stackTexts(dt) {
    // obst: globos de diálogo (los pone main.js cada cuadro) → los números tampoco caen encima de un globo
    // Si el número nace DEBAJO del globo, el globo le hace de techo (se queda abajo y se desvanece, en vez de brincar
    // por encima); si nace dentro o arriba, el globo cuenta como un número ya acomodado y el número sube por encima.
    const T = this.texts, obst = this.obst || [], placed = [];
    for (const o of T) {
      if (o.t.alpha < 0.25 && o.t0 > 1) continue; // ya casi invisible: no estorba
      const sc = Math.max(1, o.t.scale.x), hw = o.w * sc / 2, hh = o.h * sc / 2, by = o.y0 - o.t0 * 70;
      // orilla de la pantalla (fx.view lo pone main.js cada cuadro): un número que se saldría a medias se recorre
      // hacia adentro (como los globos); si ya está muy afuera se deja ir. Suave, salvo el primer cuadro.
      const v = this.view; let dxT = 0;
      if (v) { const lim = v.hw - hw * 1.1; if (lim > 0) { const d = Math.max(-lim, Math.min(lim, o.x - v.x)) + v.x - o.x; if (Math.abs(d) < hw * 3) dxT = d; } }
      o.dx = o.n === 0 ? dxT : o.dx + (dxT - o.dx) * Math.min(1, dt * 14); const ox = o.x + o.dx;
      let oy = 0; const ovX = q => Math.abs(q.x - ox) < q.hw + hw, above = obst.filter(q => q.cy < o.y0 - q.hh * 0.5 && ovX(q));
      const solid = placed.concat(obst.filter(q => !above.includes(q)));
      for (let pass = 0; pass < 8; pass++) {
        const cy = by + oy;
        const hit = solid.find(q => ovX(q) && Math.abs(q.cy - cy) < q.hh + hh);
        if (!hit) break;
        oy = hit.cy - hit.hh - 8 - hh - by;
      }
      // techo (globo arriba): el objetivo no puede pasar a través del globo; bajo el techo se apilan hacia ABAJO
      let cap = -Infinity; for (const q of above) cap = Math.max(cap, q.cy + q.hh + 6 + hh - by);
      if (Math.min(o.oyT, oy) < cap) { oy = cap;
        for (let pass = 0; pass < 6; pass++) { const cy = by + oy, hit = placed.find(q => ovX(q) && Math.abs(q.cy - cy) < q.hh + hh); if (!hit) break; oy = hit.cy + hit.hh + 8 + hh - by; }
        o.oyT = oy; } else o.oyT = Math.min(o.oyT, oy); // solo sube: no vuelve a bajar cuando el de abajo se va
      o.oy = o.n++ === 0 ? o.oyT : o.oy + (o.oyT - o.oy) * Math.min(1, dt * 16);
      if (o.oy < cap) o.oy = cap;   // nunca atraviesa el globo
      placed.push({x: ox, cy: by + o.oy, hw, hh});
    }
  }
  clear() { this.puddles.forEach(q => q.s.destroy()); this.puddles = []; this.parts.forEach(p => p.s.destroy()); this.texts.forEach(o => o.t.destroy()); this.parts = []; this.texts = []; }
  update(dt) {
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      if (p.delay > 0) { p.delay -= dt; continue; }
      p.t += dt;
      p.vy += p.g * dt; const d = Math.exp(-p.drag * dt); p.vx *= d; p.vy *= d;
      const py = p.s.y; p.s.x += p.vx * dt; p.s.y += p.vy * dt; p.s.rotation += p.vr * dt;
      if (p.drop) { p.s.rotation = Math.atan2(p.vy, p.vx) - Math.PI / 2; const v = Math.hypot(p.vx, p.vy); p.s.scale.set(p.sz * 0.85, p.sz * Math.min(1.9, 0.9 + v / 900)); // gota estirada
        if (p.vy > 0 && this.onDrop && this.onDrop(p)) { p.s.destroy(); this.parts.splice(i, 1); continue; } // cayó sobre un ratón o una repisa (main decide)
        if (p.s.y > GROUND - 6) { this.puddle(p.s.x); this.burst('drop', p.s.x, GROUND - 8, 1, 120, {up: 160, life: 0.35, size: p.sz * 0.5, drag: 0.5}); p.s.destroy(); this.parts.splice(i, 1); continue; } }
      if (p.s.y > GROUND - 6 && p.g > 0) { p.s.y = GROUND - 6; p.vy *= -0.3; p.vx *= 0.6; p.vr *= 0.5; } // rebotan en la barra
      else if (p.g > 0 && p.vy > 0 && !p.drop) for (const f of this.floors) { const x = p.s.x; if (x < f.x0 || x > f.x1) continue; // ...y en las repisas fijas (AB2: los pedacitos se quedan donde caen)
        const top = f.y0 + (x - f.x0) * f.m - 6; if (p.y0 > top + 14) continue; /* nació debajo de la repisa: no aterriza encima */ if (py <= top + 1 && p.s.y > top) { p.s.y = top; p.vy *= -0.3; p.vx = p.vx * 0.6 + f.m * 60; p.vr *= 0.5; this.floorHits++; break; } }
      if (p.grow || p.pop) { let f = 1 + (p.grow || 0) * p.t / p.life;
        if (p.pop) f *= p.t < p.pop ? 0.4 + 0.75 * (1 - Math.pow(1 - p.t / p.pop, 2)) : 1.15 - 0.15 * Math.min(1, (p.t - p.pop) / 0.1); // estalla con rebote
        p.s.scale.set(p.sz * f); }
      if (p.ramp) { const u = Math.min(1, p.t / p.life), R = p.ramp; let j = 1; while (j < R.length - 1 && R[j][0] < u) j++; // tinte que se va enfriando
        const [u0, c0] = R[j - 1], [u1, c1] = R[j], w = Math.min(1, Math.max(0, (u - u0) / (u1 - u0))), ch = sh => Math.round(((c0 >> sh) & 255) * (1 - w) + ((c1 >> sh) & 255) * w);
        p.s.tint = (ch(16) << 16) | (ch(8) << 8) | ch(0); }
      if (p.ring) { const r = 0.1 + (p.ring - 0.1) * (1 - Math.pow(1 - p.t / p.life, 3)); p.s.scale.set(r, r * (p.flat ?? 1)); }
      const u = p.t / p.life;
      if (p.glow) { const a = p.t < p.atk ? p.t / p.atk : Math.pow(Math.max(0, 1 - (p.t - p.atk) / (p.life - p.atk)), 1.6); p.s.alpha = p.glow * a; if (u >= 1) { p.s.destroy(); this.parts.splice(i, 1); } continue; }
      p.s.alpha = (p.maxA ?? 1) * (u > 0.6 ? Math.max(0, 1 - (u - 0.6) / 0.4) : Math.min(1, p.maxA ? u * 6 : 1));
      if (u >= 1) { p.s.destroy(); this.parts.splice(i, 1); }
    }
    for (let i = this.puddles.length - 1; i >= 0; i--) { const q = this.puddles[i]; q.t += dt; // se extiende rápido, se queda brillando y se seca despacio
      q.cur += (q.k - q.cur) * Math.min(1, dt * 7); q.s.scale.set(q.cur, q.cur * (0.8 + 0.2 * Math.min(1, q.t * 3)));
      q.s.alpha = q.t < 4 ? 1 : Math.max(0, 1 - (q.t - 4) / 3); if (q.t > 4) q.s.scale.x = q.cur * (1 - (q.t - 4) * 0.06);
      if (q.t > 7) { q.s.destroy(); this.puddles.splice(i, 1); } }
    this.stackTexts(dt);
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const o = this.texts[i]; o.t0 += dt; const u = o.t0;
      // aparece con rebote, sube despacio y se desvanece
      const pop = u < 0.18 ? 0.2 + (u / 0.18) * 1.0 : u < 0.3 ? 1.2 - (u - 0.18) / 0.12 * 0.2 : 1;
      o.t.scale.set(pop); o.t.x = o.x + o.dx; o.t.y = o.y0 - u * 70 + o.oy; o.t.alpha = u > 1.0 ? Math.max(0, 1 - (u - 1.0) / 0.4) : 1;
      if (u > 1.4) { o.t.destroy(); this.texts.splice(i, 1); }
    }
  }
}
