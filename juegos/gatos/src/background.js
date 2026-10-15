// Fondo de la Cocina en capas con parallax (portado de mockup/mockup.html, escalado al nivel largo).
// Cada capa se pinta UNA vez en un canvas offscreen (a resolución reducida si está lejos) -> textura Pixi.
import {Sprite, Texture, Container} from '../vendor/pixi.min.mjs';
import ART from './art.js';
import * as SFX from './sfx.js';
import {BOUNDS, GROUND, LEVEL_W} from './config.js';
const {rr, lin, rad, rng, shade, TAU} = ART;

// Pinta en coords de mundo dentro del rectángulo (x0,y0,w,h) a resolución res -> Sprite colocado en el mundo
function bake(x0, y0, w, h, res, draw) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w * res); c.height = Math.ceil(h * res);
  const ctx = c.getContext('2d'); ctx.scale(res, res); ctx.translate(-x0, -y0); draw(ctx);
  const s = new Sprite(Texture.from(c)); s.position.set(x0, y0); s.scale.set(1 / res);
  return s;
}

function windowAt(ctx, wx, wy, ww, wh, seed) {
  const k = ww / 620; // la ventana del mockup medía 620 de ancho
  ctx.save(); rr(ctx, wx, wy, ww, wh, 18 * k); ctx.clip();
  ctx.fillStyle = lin(ctx, 0, wy, 0, wy + wh, [[0, '#5EC4F2'], [0.65, '#BDE8FA'], [1, '#FFF2CF']]); ctx.fillRect(wx, wy, ww, wh);
  ctx.fillStyle = rad(ctx, wx + 120 * k, wy + 110 * k, 10, 260 * k, [[0, 'rgba(255,250,215,1)'], [0.25, 'rgba(255,240,180,0.6)'], [1, 'rgba(255,240,180,0)']]); ctx.fillRect(wx, wy, ww, wh);
  const r = rng(seed);
  for (let i = 0; i < 6; i++) { const x = wx + (0.3 + r() * 0.6) * ww, y = wy + (0.12 + r() * 0.2) * wh, rr2 = (22 + r() * 26) * k;
    ctx.fillStyle = rad(ctx, x - rr2 * 0.3, y - rr2 * 0.4, 0, rr2 * 1.2, [[0, '#FFFFFF'], [1, '#DDEFFB']]); ctx.beginPath(); ctx.arc(x, y, rr2, 0, TAU); ctx.fill(); }
  ctx.fillStyle = '#9CCFA8'; ctx.beginPath(); ctx.moveTo(wx, wy + 0.69 * wh); ctx.quadraticCurveTo(wx + 0.32 * ww, wy + 0.52 * wh, wx + 0.61 * ww, wy + 0.67 * wh); ctx.quadraticCurveTo(wx + 0.84 * ww, wy + 0.56 * wh, wx + ww, wy + 0.65 * wh); ctx.lineTo(wx + ww, wy + wh); ctx.lineTo(wx, wy + wh); ctx.fill();
  ctx.fillStyle = '#6FB56F'; ctx.beginPath(); ctx.moveTo(wx, wy + 0.81 * wh); ctx.quadraticCurveTo(wx + 0.42 * ww, wy + 0.69 * wh, wx + ww, wy + 0.79 * wh); ctx.lineTo(wx + ww, wy + wh); ctx.lineTo(wx, wy + wh); ctx.fill();
  [[0.15, 0.73, 55], [0.23, 0.69, 45], [0.76, 0.72, 60], [0.85, 0.75, 42]].forEach(([fx, fy, rr2]) => { const x = wx + fx * ww, y = wy + fy * wh, R = rr2 * k;
    ctx.fillStyle = rad(ctx, x - R * 0.4, y - R * 0.4, 0, R * 1.2, [[0, '#7FC66F'], [1, '#3F8A47']]); ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill(); });
  ctx.fillStyle = '#4E9A52'; ctx.fillRect(wx, wy + 0.9 * wh, ww, 0.1 * wh);
  ctx.restore();
  // marco con bisel
  ctx.save(); ctx.lineJoin = 'round'; const m = 26 * k;
  ctx.beginPath(); ctx.rect(wx - m, wy - m, ww + 2 * m, wh + 2 * m); ctx.rect(wx, wy, ww, wh);
  ctx.fillStyle = lin(ctx, wx, wy, wx + ww, wy + wh, [[0, '#FFFFFF'], [1, '#D7CFC2']]); ctx.fill('evenodd');
  ctx.lineWidth = 4 * k; ctx.strokeStyle = '#8A7B66'; rr(ctx, wx - m, wy - m, ww + 2 * m, wh + 2 * m, 30 * k); ctx.stroke(); rr(ctx, wx, wy, ww, wh, 18 * k); ctx.stroke();
  ctx.fillStyle = lin(ctx, 0, 0, 30, 0, [[0, '#FFFFFF'], [1, '#D7CFC2']]); ctx.fillRect(wx + ww / 2 - 12 * k, wy, 24 * k, wh); ctx.fillRect(wx, wy + wh * 0.48, ww, 22 * k);
  ctx.strokeRect(wx + ww / 2 - 12 * k, wy, 24 * k, wh); ctx.strokeRect(wx, wy + wh * 0.48, ww, 22 * k);
  rr(ctx, wx - 50 * k, wy + wh + 18 * k, ww + 100 * k, 34 * k, 10 * k); ctx.fillStyle = lin(ctx, 0, wy + wh + 18 * k, 0, wy + wh + 52 * k, [[0, '#FFFFFF'], [1, '#CFC5B5']]); ctx.fill(); ctx.stroke();
  // cortinas
  [[wx - 70 * k, 1], [wx + ww + 70 * k, -1]].forEach(([x, s]) => {
    ctx.beginPath(); ctx.moveTo(x, wy - 50 * k); ctx.lineTo(x + s * 150 * k, wy - 50 * k); ctx.quadraticCurveTo(x + s * 70 * k, wy + 220 * k, x + s * 120 * k, wy + wh + 10 * k); ctx.lineTo(x, wy + wh + 10 * k); ctx.closePath();
    ctx.fillStyle = lin(ctx, x, 0, x + s * 150 * k, 0, [[0, '#D9534F'], [0.5, '#F07A6A'], [1, '#B83C3C']]); ctx.fill(); ctx.lineWidth = 4 * k; ctx.strokeStyle = '#7A2424'; ctx.stroke();
    ctx.save(); ctx.clip(); ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (let yy = wy - 50 * k; yy < wy + wh; yy += 46 * k) for (let xx = Math.min(x, x + s * 150 * k); xx < Math.max(x, x + s * 150 * k); xx += 46 * k) { ctx.beginPath(); ctx.arc(xx + 10 * k, yy + 10 * k, 7 * k, 0, TAU); ctx.fill(); }
    ctx.restore();
  });
  ctx.fillStyle = lin(ctx, 0, wy - 64 * k, 0, wy - 40 * k, [[0, '#E2A465'], [1, '#8A5222']]); rr(ctx, wx - 110 * k, wy - 66 * k, ww + 220 * k, 20 * k, 10 * k); ctx.fill(); ctx.strokeStyle = '#4A2A10'; ctx.stroke();
  ctx.restore();
}

function cabinets(ctx, x, y, n, w, h) {
  for (let i = 0; i < n; i++) {
    const cx = x + i * (w + 20);
    rr(ctx, cx, y, w, h, 18); ctx.fillStyle = lin(ctx, cx, y, cx + w, y + h, [[0, '#A7D3CC'], [1, '#6FA7A0']]); ctx.fill();
    ctx.lineWidth = 5; ctx.strokeStyle = '#3F6E68'; ctx.stroke();
    rr(ctx, cx + 26, y + 26, w - 52, h - 52, 14); ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 7; ctx.stroke();
    rr(ctx, cx + (i % 2 ? 30 : w - 52), y + h - 150, 18, 86, 9); ctx.fillStyle = '#E8C66A'; ctx.fill();
  }
  ctx.fillStyle = lin(ctx, 0, y + h, 0, y + h + 60, [[0, 'rgba(60,40,70,0.22)'], [1, 'rgba(60,40,70,0)']]); ctx.fillRect(x - 20, y + h, n * (w + 20) + 20, 60);
}

// frascos de especias de una repisa (misma secuencia aleatoria de siempre) -> [{x, y, w, h, col}]
function shelfJars(x, y, w, seed) {
  const r = rng(seed), cols = ['#E9A23B', '#5FA8D3', '#D9534F', '#F4F1EA', '#8CC084', '#C98BD8'], out = [];
  let cx = x + 30;
  while (cx < x + w - 110) { const jw = 70 + r() * 50, jh = 80 + r() * 90, col = cols[Math.floor(r() * cols.length)]; out.push({x: cx, y, w: jw, h: jh, col}); cx += jw + 18 + r() * 30; }
  return out;
}
function paintJar(ctx, j) {
  rr(ctx, j.x, j.y - j.h, j.w, j.h, 16); ctx.fillStyle = lin(ctx, j.x, 0, j.x + j.w, 0, [[0, shade(j.col, 30)], [1, shade(j.col, -40)]]); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; rr(ctx, j.x + j.w * 0.15, j.y - j.h + 10, j.w * 0.18, j.h - 20, 6); ctx.fill();
}
// la repisa en sí (los frascos van aparte en jarLayer para que brinquen con los estruendos)
function shelf(ctx, x, y, w) {
  rr(ctx, x, y, w, 30, 9); ctx.fillStyle = lin(ctx, 0, y, 0, y + 30, [[0, '#C98A4B'], [1, '#8E5524']]); ctx.fill();
  ctx.fillStyle = lin(ctx, 0, y + 30, 0, y + 80, [[0, 'rgba(60,40,70,0.22)'], [1, 'rgba(60,40,70,0)']]); ctx.fillRect(x, y + 30, w, 50);
}

// Pared del fondo: papel tapiz, ventanas, alacenas, repisas. Lejos -> parallax 0.35, media resolución.
function wallLayer() {
  const {x0, y0, x1} = BOUNDS, w = x1 - x0, h = GROUND - 700 - y0 + 400;
  return bake(x0, y0, w, h, 0.45, ctx => {
    ctx.fillStyle = lin(ctx, 0, y0, 0, y0 + h, [[0, '#EBCB98'], [0.5, '#F7E5C6'], [1, '#EBCFA2']]); ctx.fillRect(x0, y0, w, h);
    ctx.save(); ctx.globalAlpha = 0.07; ctx.fillStyle = '#B5733A';
    for (let y = y0 + 20; y < y0 + h; y += 90) for (let x = x0 + ((y / 90) % 2) * 45; x < x1; x += 90) { ctx.beginPath(); ctx.moveTo(x, y - 15); ctx.lineTo(x + 15, y); ctx.lineTo(x, y + 15); ctx.lineTo(x - 15, y); ctx.fill(); }
    ctx.restore();
    // moldura del techo
    ctx.fillStyle = lin(ctx, 0, y0, 0, y0 + 90, [[0, '#FFFFFF'], [1, '#D8C8AA']]); ctx.fillRect(x0, y0, w, 80); ctx.fillStyle = 'rgba(90,60,30,0.35)'; ctx.fillRect(x0, y0 + 80, w, 6);
    shelf(ctx, -150, 1050, 900);
    windowAt(ctx, 900, 250, 1000, 780, 5);
    cabinets(ctx, 2350, 80, 4, 360, 760);
    shelf(ctx, 2400, 1200, 1300);
    ctx.fillStyle = 'rgba(255,240,215,0.2)'; ctx.fillRect(x0, y0, w, h); // velo atmosférico
  });
}

// Frascos de especias sobre las repisas de la pared (f 0.35): con un estruendo brincan, se ladean y castañetean
// (cada uno con su retraso y fuerza), como la utilería del fondo de AB2.
const SHELVES = [[-150, 1050, 700, 3], [2400, 1200, 1300, 9]]; // la izquierda deja lugar a la tetera
function jarLayer() {
  const c = new Container(), items = [];
  for (const [x, y, w, seed] of SHELVES) for (const j of shelfJars(x, y, w, seed)) {
    const e = document.createElement('canvas'); e.width = Math.ceil(j.w + 8); e.height = Math.ceil(j.h + 8); const k = e.getContext('2d');
    k.translate(4 - j.x, 4 - (j.y - j.h)); paintJar(k, j);
    k.globalCompositeOperation = 'source-atop'; k.fillStyle = 'rgba(255,240,215,0.2)'; k.fillRect(j.x - 4, j.y - j.h - 4, j.w + 8, j.h + 8); // mismo velo que la pared
    const sp = new Sprite(Texture.from(e)); sp.anchor.set(0.5, (j.h + 4) / (j.h + 8)); sp.position.set(j.x + j.w / 2, j.y); c.addChild(sp);
    items.push({s: sp, x: j.x + j.w / 2, y: j.y, dy: 0, vy: 0, r: 0, vr: 0, t: 0, w: j.w});
  }
  c.jolt = (k = 1) => items.forEach(o => { o.t = -Math.random() * 0.18; o.kick = k * (0.5 + Math.random() * 0.7); });
  c.update = dt => items.forEach(o => {
    if (o.kick) { o.t += dt; if (o.t >= 0) { o.vy = -o.kick * (160 + Math.random() * 120); o.vr += (Math.random() - 0.5) * 3.2 * o.kick; o.kick = 0; } }
    if (o.dy < 0 || o.vy < 0) { o.vy += 1500 * dt; o.dy += o.vy * dt; if (o.dy >= 0) { o.dy = 0; o.vy = o.vy > 90 ? -o.vy * 0.3 : 0; o.vr *= 0.6; } }
    if (Math.abs(o.r) > 0.001 || Math.abs(o.vr) > 0.001) { o.vr += -o.r * (o.dy < 0 ? 4 : 70) * dt; o.vr *= Math.exp(-dt * 5); o.r += o.vr * dt; o.r = Math.max(-0.35, Math.min(0.35, o.r)); }
    // ladeado: gira sobre la esquina de abajo que queda apoyada
    const piv = o.dy < 0 ? 0 : Math.sign(o.r) * o.w / 2;
    o.s.rotation = o.r; o.s.position.set(o.x + piv - piv * Math.cos(o.r), o.y + o.dy - Math.abs(piv * Math.sin(o.r)));
  });
  return c;
}
// Riel con utensilios colgados (cucharón, espátula, batidor) entre la ventana y las alacenas; se mecen apenas y se
// columpian con los estruendos (y tintinean). Misma capa que la pared (f 0.35).
function utensilLayer() {
  const c = new Container(), RX = 1985, RY = 430, RW = 330;
  const cv = (w, h, draw) => { const e = document.createElement('canvas'); e.width = w; e.height = h; draw(e.getContext('2d')); return Texture.from(e); };
  const rail = new Sprite(cv(RW + 40, 40, k => { k.fillStyle = 'rgba(60,40,70,0.18)'; rr(k, 20, 18, RW, 16, 8); k.fill();
    k.fillStyle = lin(k, 0, 6, 0, 26, [[0, '#F2F2F4'], [0.5, '#A9AAB2'], [1, '#6E6F78']]); rr(k, 20, 6, RW, 18, 9); k.fill();
    for (const x of [26, RW + 14]) { k.beginPath(); k.arc(x, 15, 13, 0, TAU); k.fillStyle = '#8E8F98'; k.fill(); k.strokeStyle = '#55565E'; k.lineWidth = 3; k.stroke(); } }));
  rail.position.set(RX - 20, RY - 15); c.addChild(rail);
  const steel = (k, x0, x1) => lin(k, x0, 0, x1, 0, [[0, '#8A8C96'], [0.45, '#F4F4F6'], [1, '#6A6C76']]);
  const hook = k => { k.strokeStyle = '#6A6C76'; k.lineWidth = 5; k.beginPath(); k.arc(40, 14, 9, Math.PI, TAU * 0.95); k.stroke(); };
  const T = [
    cv(80, 300, k => { hook(k); k.fillStyle = steel(k, 34, 46); rr(k, 35, 22, 10, 190, 5); k.fill(); // cucharón
      k.beginPath(); k.arc(40, 238, 34, 0, TAU); k.fillStyle = rad(k, 30, 228, 2, 36, [[0, '#FFFFFF'], [0.5, '#C9CBD2'], [1, '#6E7079']]); k.fill(); k.strokeStyle = '#4E5058'; k.lineWidth = 4; k.stroke(); }),
    cv(80, 300, k => { hook(k); k.fillStyle = lin(k, 32, 0, 48, 0, [[0, '#7A4A22'], [0.5, '#C08550'], [1, '#6A3E1A']]); rr(k, 33, 22, 14, 150, 6); k.fill(); // espátula
      rr(k, 14, 168, 52, 100, 12); k.fillStyle = lin(k, 14, 0, 66, 0, [[0, '#E0503E'], [0.5, '#FF7A5C'], [1, '#B8382A']]); k.fill(); k.strokeStyle = '#7A2418'; k.lineWidth = 4; k.stroke();
      k.strokeStyle = 'rgba(120,30,20,0.6)'; k.lineWidth = 5; for (const x of [28, 40, 52]) { k.beginPath(); k.moveTo(x, 190); k.lineTo(x, 248); k.stroke(); } }),
    cv(80, 300, k => { hook(k); k.fillStyle = steel(k, 33, 47); rr(k, 34, 22, 12, 110, 6); k.fill(); // batidor
      k.strokeStyle = '#B9BBC4'; k.lineWidth = 4; for (const a of [-1, -0.5, 0, 0.5, 1]) { k.beginPath(); k.moveTo(40, 130); k.bezierCurveTo(40 + a * 40, 170, 40 + a * 34, 260, 40, 272); k.stroke(); }
      k.strokeStyle = 'rgba(255,255,255,0.8)'; k.lineWidth = 2; k.beginPath(); k.moveTo(40, 130); k.bezierCurveTo(60, 170, 57, 260, 40, 272); k.stroke(); }),
  ];
  const items = T.map((t, i) => { const s = new Sprite(t); s.anchor.set(0.5, 14 / 300); s.scale.set(1.25); s.position.set(RX + 60 + i * 105, RY - 4); c.addChild(s);
    return {s, ph: i * 2.1, sw: 0, swT: 0, f: 2.6 + i * 0.35}; });
  let T0 = 0;
  c.jolt = (k = 1) => { items.forEach(o => { o.sw = Math.min(0.5, o.sw + k * (0.18 + Math.random() * 0.12)); o.swT = Math.random() * 0.3; }); SFX.clink(Math.min(1, 0.4 + k * 0.4)); };
  c.update = dt => { T0 += dt; items.forEach(o => { o.s.rotation = Math.sin(T0 * 0.8 + o.ph) * 0.012;
    if (o.sw > 0.003) { o.swT += dt; o.s.rotation += o.sw * Math.sin(o.swT * o.f + 0.3); o.sw *= Math.exp(-dt * 0.9); } }); };
  return c;
}
// Tetera de peltre rojo en la repisa izquierda (f 0.35): echa vapor por el pico; de vez en cuando hierve (la tapa
// castañetea y sale más vapor) y con un estruendo la tapa brinca girando y sale una bocanada (utilería viva de AB2).
function kettleLayer() {
  const c = new Container(), KX = 615, KY = 1050, S = 1.15; // base de la tetera sobre la repisa
  const veil = (k, w, h) => { k.globalCompositeOperation = 'source-atop'; k.fillStyle = 'rgba(255,240,215,0.2)'; k.fillRect(0, 0, w, h); k.globalCompositeOperation = 'source-over'; };
  const cv = (w, h, draw) => { const e = document.createElement('canvas'); e.width = w; e.height = h; const k = e.getContext('2d'); draw(k); veil(k, w, h); return Texture.from(e); };
  const OL = '#5A1E1A';
  const body = new Sprite(cv(260, 200, k => { // origen del dibujo: (130, 190) = centro de la base
    k.translate(130, 190);
    // asa (arco arriba)
    k.lineCap = 'round'; k.strokeStyle = OL; k.lineWidth = 16; k.beginPath(); k.arc(0, -96, 62, Math.PI * 1.08, Math.PI * 1.92); k.stroke();
    k.strokeStyle = '#2E2A2A'; k.lineWidth = 10; k.beginPath(); k.arc(0, -96, 62, Math.PI * 1.08, Math.PI * 1.92); k.stroke();
    // pico (sale a la izquierda, hacia arriba)
    k.beginPath(); k.moveTo(-52, -40); k.quadraticCurveTo(-92, -46, -112, -96); k.lineTo(-98, -104); k.quadraticCurveTo(-80, -70, -46, -70); k.closePath();
    k.fillStyle = lin(k, 0, -104, 0, -40, [[0, '#F06A55'], [1, '#A82A22']]); k.fill(); k.lineWidth = 5; k.strokeStyle = OL; k.lineJoin = 'round'; k.stroke();
    // cuerpo (domo)
    k.beginPath(); k.moveTo(-78, 0); k.bezierCurveTo(-92, -40, -70, -100, 0, -104); k.bezierCurveTo(70, -100, 92, -40, 78, 0); k.closePath();
    k.fillStyle = rad(k, -26, -70, 8, 110, [[0, '#FF9A80'], [0.45, '#E2483A'], [1, '#8E2019']]); k.fill(); k.lineWidth = 6; k.strokeStyle = OL; k.stroke();
    k.fillStyle = 'rgba(255,255,255,0.55)'; k.beginPath(); k.ellipse(-38, -66, 11, 24, 0.5, 0, TAU); k.fill(); // brillo
    k.fillStyle = 'rgba(255,255,255,0.85)'; k.beginPath(); k.ellipse(-46, -80, 4, 7, 0.5, 0, TAU); k.fill();
    k.fillStyle = 'rgba(255,240,220,0.9)'; rr(k, -80, -10, 160, 10, 5); k.fill(); k.strokeStyle = OL; k.lineWidth = 4; k.stroke(); // ribete de abajo
    // florecita blanca (peltre mexicano)
    k.translate(26, -46); for (let i = 0; i < 5; i++) { k.rotate(TAU / 5); k.beginPath(); k.ellipse(0, -10, 6, 10, 0, 0, TAU); k.fillStyle = '#FFF6EA'; k.fill(); }
    k.beginPath(); k.arc(0, 0, 5, 0, TAU); k.fillStyle = '#F2C230'; k.fill(); }));
  body.anchor.set(0.5, 190 / 200); body.scale.set(S); body.position.set(KX, KY); c.addChild(body);
  const lid = new Sprite(cv(90, 50, k => { k.translate(45, 40);
    k.beginPath(); k.ellipse(0, 0, 38, 10, 0, Math.PI, TAU); k.fillStyle = lin(k, 0, -12, 0, 2, [[0, '#F57A62'], [1, '#B9332A']]); k.fill(); k.lineWidth = 4; k.strokeStyle = OL; k.stroke();
    k.beginPath(); k.arc(0, -14, 9, 0, TAU); k.fillStyle = '#2E2A2A'; k.fill(); k.strokeStyle = OL; k.lineWidth = 3; k.stroke(); }));
  const LY = KY - 103 * S; lid.anchor.set(0.5, 40 / 50); lid.scale.set(S); lid.position.set(KX, LY); c.addChild(lid);
  const st = document.createElement('canvas'); st.width = st.height = 64; const sk = st.getContext('2d'), g = sk.createRadialGradient(32, 32, 2, 32, 32, 31);
  g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.5, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); sk.fillStyle = g; sk.fillRect(0, 0, 64, 64);
  const ST = Texture.from(st), puffs = [], SPX = KX - 107 * S, SPY = KY - 102 * S; // punta del pico
  const puff = (x, y, vx, vy, sz, life) => { const p = new Sprite(ST); p.anchor.set(0.5); p.position.set(x, y); p.alpha = 0; c.addChild(p); puffs.push({p, vx, vy, sz, life, t: 0, ph: Math.random() * TAU}); };
  let T0 = 0, acc = 0, boilAt = 4 + Math.random() * 4, boil = 0, lv = {y: 0, vy: 0, r: 0, vr: 0};
  c.jolt = (k = 1) => { lv.vy = -(420 + 220 * Math.min(1.5, k)); lv.vr = (Math.random() - 0.5) * 10; boil = Math.max(boil, 1.2);
    for (let i = 0; i < 8; i++) puff(KX + (Math.random() - 0.5) * 60, LY - 10, (Math.random() - 0.5) * 80, -90 - Math.random() * 80, 1.1 + Math.random() * 0.6, 1.8); };
  c.update = dt => { T0 += dt;
    if ((boilAt -= dt) < 0) { boil = 1.3; boilAt = 7 + Math.random() * 6; }
    if (boil > 0) { boil -= dt; if (lv.y >= 0 && Math.random() < dt * 14) { lv.vy = -40 - Math.random() * 50; lv.vr += (Math.random() - 0.5) * 2; } } // la tapa castañetea
    acc += dt * (boil > 0 ? 14 : 5); while (acc > 1) { acc--; puff(SPX + (Math.random() - 0.5) * 6, SPY, -40 - Math.random() * 30 - (boil > 0 ? 40 : 0), -70 - Math.random() * 40 - (boil > 0 ? 50 : 0), boil > 0 ? 0.9 : 0.6, boil > 0 ? 1.8 : 2.4); }
    if (boil > 0 && Math.random() < dt * 8) puff(KX + (Math.random() - 0.5) * 50, LY - 6, (Math.random() - 0.5) * 40, -60, 0.7, 1.4);
    // tapa: brinca con gravedad, rebota apagada y se endereza
    if (lv.y < 0 || lv.vy < 0) { lv.vy += 1500 * dt; lv.y += lv.vy * dt; if (lv.y >= 0) { lv.y = 0; lv.vy = lv.vy > 120 ? -lv.vy * 0.3 : 0; } }
    lv.vr += -lv.r * (lv.y < 0 ? 3 : 80) * dt; lv.vr *= Math.exp(-dt * 6); lv.r += lv.vr * dt; if (lv.y >= 0) lv.r = Math.max(-0.25, Math.min(0.25, lv.r));
    lid.position.set(KX, LY + lv.y); lid.rotation = lv.r;
    for (let i = puffs.length - 1; i >= 0; i--) { const o = puffs[i]; o.t += dt; const u = o.t / o.life;
      if (u >= 1) { o.p.destroy(); puffs.splice(i, 1); continue; }
      o.vx *= Math.exp(-dt * 1.2); o.vy *= Math.exp(-dt * 0.4); o.p.x += (o.vx + Math.sin(T0 * 2 + o.ph) * 22) * dt; o.p.y += o.vy * dt;
      o.p.scale.set(o.sz * 1.3 * (0.5 + u * 1.6)); o.p.alpha = 0.85 * Math.min(1, u * 5) * (1 - u); } };
  return c;
}
// Reloj de gato (Kit-Cat) en la pared, a la izquierda de la ventana (f 0.35): la cola hace de péndulo y los ojos van y
// vienen al compás (tic-tac); con un estruendo se ladea colgado del clavo y se columpia.
function catClockLayer() {
  const c = new Container(), CX = 330, CY = 300, OL = '#14121A';
  const cv = (w, h, draw) => { const e = document.createElement('canvas'); e.width = w; e.height = h; const k = e.getContext('2d'); draw(k);
    k.globalCompositeOperation = 'source-atop'; k.fillStyle = 'rgba(255,240,215,0.2)'; k.fillRect(0, 0, w, h); return Texture.from(e); };
  const black = (k, x0, y0, x1, y1) => lin(k, x0, y0, x1, y1, [[0, '#4A4656'], [0.5, '#24222C'], [1, '#121018']]);
  const rig = new Container(); rig.position.set(CX, CY); c.addChild(rig); // cuelga del clavo (CX, CY)
  // cola (péndulo): pivote en la parte de abajo del cuerpo
  const tail = new Sprite(cv(60, 230, k => { k.lineCap = 'round'; k.strokeStyle = OL; k.lineWidth = 26; k.beginPath(); k.moveTo(30, 10); k.bezierCurveTo(30, 90, 18, 150, 30, 215); k.stroke();
    k.strokeStyle = black(k, 18, 0, 42, 0); k.lineWidth = 18; k.stroke(); }));
  tail.anchor.set(0.5, 10 / 230); tail.position.set(0, 312); rig.addChild(tail);
  const body = new Sprite(cv(200, 340, k => { k.translate(100, 20);
    // orejas
    for (const s of [-1, 1]) { k.beginPath(); k.moveTo(s * 30, 40); k.lineTo(s * 62, -14); k.lineTo(s * 74, 50); k.closePath(); k.fillStyle = black(k, -70, -10, 70, 50); k.fill(); k.lineWidth = 5; k.strokeStyle = OL; k.lineJoin = 'round'; k.stroke();
      k.beginPath(); k.moveTo(s * 40, 40); k.lineTo(s * 60, 6); k.lineTo(s * 66, 44); k.closePath(); k.fillStyle = '#C86A84'; k.fill(); }
    // cabeza + cuerpo
    k.beginPath(); k.ellipse(0, 70, 78, 56, 0, 0, TAU); k.fillStyle = black(k, -80, 20, 80, 120); k.fill(); k.lineWidth = 5; k.strokeStyle = OL; k.stroke();
    rr(k, -54, 104, 108, 200, 40); k.fillStyle = black(k, -54, 0, 54, 0); k.fill(); k.stroke();
    // carátula del reloj en la panza
    k.beginPath(); k.arc(0, 168, 40, 0, TAU); k.fillStyle = '#FFF8EC'; k.fill(); k.lineWidth = 5; k.strokeStyle = '#B8A890'; k.stroke();
    k.fillStyle = OL; for (let i = 0; i < 12; i++) { const a = i * TAU / 12; k.beginPath(); k.arc(Math.cos(a) * 32, 168 + Math.sin(a) * 32, i % 3 ? 2 : 4, 0, TAU); k.fill(); }
    k.lineCap = 'round'; k.lineWidth = 5; k.beginPath(); k.moveTo(0, 168); k.lineTo(14, 152); k.moveTo(0, 168); k.lineTo(0, 140); k.stroke();
    // corbatín blanco y patitas
    k.fillStyle = '#FFFFFF'; k.beginPath(); k.moveTo(0, 116); k.lineTo(-22, 104); k.lineTo(-22, 128); k.closePath(); k.moveTo(0, 116); k.lineTo(22, 104); k.lineTo(22, 128); k.closePath(); k.fill();
    k.beginPath(); k.arc(0, 116, 6, 0, TAU); k.fill();
    for (const s of [-1, 1]) { k.beginPath(); k.ellipse(s * 30, 290, 20, 13, 0, 0, TAU); k.fillStyle = '#FFFFFF'; k.fill(); k.lineWidth = 3; k.strokeStyle = OL; k.stroke(); }
    // hocico, bigotes y sonrisa
    k.fillStyle = '#FFFFFF'; k.beginPath(); k.ellipse(0, 96, 30, 16, 0, 0, TAU); k.fill();
    k.fillStyle = '#E07890'; k.beginPath(); k.moveTo(-7, 86); k.lineTo(7, 86); k.lineTo(0, 94); k.closePath(); k.fill();
    k.strokeStyle = OL; k.lineWidth = 3; k.beginPath(); k.moveTo(-14, 100); k.quadraticCurveTo(0, 108, 14, 100); k.stroke();
    k.strokeStyle = 'rgba(255,255,255,0.8)'; k.lineWidth = 2.5; for (const s of [-1, 1]) for (const d of [-6, 4]) { k.beginPath(); k.moveTo(s * 28, 94 + d * 0.4); k.lineTo(s * 72, 88 + d); k.stroke(); }
    // cuencas de los ojos (blancas; las pupilas van aparte y se mueven)
    for (const s of [-1, 1]) { k.beginPath(); k.ellipse(s * 26, 62, 19, 15, 0, 0, TAU); k.fillStyle = '#FFFFFF'; k.fill(); k.lineWidth = 3; k.strokeStyle = OL; k.stroke(); }
    k.fillStyle = 'rgba(255,255,255,0.22)'; k.beginPath(); k.ellipse(-36, 40, 22, 10, -0.4, 0, TAU); k.fill(); }));
  body.anchor.set(0.5, 0); body.position.set(0, -20); rig.addChild(body);
  // pupilas (dos ojos, recortadas a la cuenca con el mismo óvalo: el movimiento es chico para que no se salgan)
  const pupT = cv(24, 30, k => { k.beginPath(); k.ellipse(12, 15, 9, 13, 0, 0, TAU); k.fillStyle = '#18161E'; k.fill(); k.fillStyle = '#FFFFFF'; k.beginPath(); k.arc(9, 9, 3, 0, TAU); k.fill(); });
  const pups = [-1, 1].map(s => { const p = new Sprite(pupT); p.anchor.set(0.5); p.position.set(s * 26, 62); rig.addChild(p); return p; });
  let T0 = 0, sw = 0, swV = 0, tick = 0;
  c.jolt = (k = 1) => { swV += (Math.random() < 0.5 ? -1 : 1) * (1.2 + Math.min(1.5, k) * 0.9); };
  c.update = dt => { T0 += dt; const ph = Math.sin(T0 * Math.PI); // 1 ida/vuelta cada 2 s, como el Kit-Cat real
    tail.rotation = ph * 0.32; pups.forEach(p => { p.x = Math.sign(p.position.x) * 26 + ph * 8; });
    swV += (-sw * 26 - swV * 1.6) * dt; sw += swV * dt; sw = Math.max(-0.5, Math.min(0.5, sw)); rig.rotation = sw; };
  return c;
}
// Motas de polvo que flotan y brillan en el rayo de sol que entra por la ventana (misma capa que la pared, f 0.35)
function motesLayer() {
  const c = new Container(), r = rng(23);
  const cv = document.createElement('canvas'); cv.width = cv.height = 32; const k = cv.getContext('2d');
  const g = k.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, 'rgba(255,255,240,1)'); g.addColorStop(0.3, 'rgba(255,245,200,0.7)'); g.addColorStop(1, 'rgba(255,240,190,0)');
  k.fillStyle = g; k.fillRect(0, 0, 32, 32); const T = Texture.from(cv);
  // rayo: sale de la ventana (x 900–1900, y 1030) y baja inclinado hacia la derecha
  const beam = v => ({x: 950 + v * 380, y: 1030 + v * 760}); const items = [];
  // el haz de luz (muy tenue, se desvanece hacia abajo) — da volumen al cuarto como en AB2
  const bc = document.createElement('canvas'); bc.width = 330; bc.height = 200; const bk = bc.getContext('2d');
  bk.beginPath(); bk.moveTo(5, 0); bk.lineTo(105, 0); bk.lineTo(143, 76); bk.lineTo(43, 76); bk.closePath(); // = 1000×760 u a escala 0.1
  bk.fillStyle = lin(bk, 0, 0, 0, 76, [[0, 'rgba(255,248,215,0.3)'], [0.15, 'rgba(255,248,215,0.22)'], [1, 'rgba(255,248,215,0)']]); bk.filter = 'blur(4px)'; bk.fill();
  const shaft = new Sprite(Texture.from(bc)); shaft.scale.set(10); shaft.position.set(900 - 50, 1030); shaft.blendMode = 'add'; shaft.alpha = 0.55; c.addChild(shaft);
  for (let i = 0; i < 46; i++) { const s = new Sprite(T); s.anchor.set(0.5); s.blendMode = 'add'; c.addChild(s);
    items.push({s, u: r(), v: r(), du: (r() - 0.5) * 0.02, dv: (r() - 0.6) * 0.012, ph: r() * TAU, sz: 0.3 + r() * 0.45}); }
  c.update = dt => { shaft.alpha = 0.5 + Math.sin((items[0].ph) * 0.4) * 0.08; items.forEach(o => {
    o.ph += dt * (0.8 + o.sz); o.u += (o.du + Math.sin(o.ph * 0.7) * 0.012) * dt; o.v += o.dv * dt;
    if (o.u < 0) o.u += 1; if (o.u > 1) o.u -= 1; if (o.v < 0) o.v += 1; if (o.v > 1) o.v -= 1;
    const b = beam(o.v); o.s.position.set(b.x + o.u * 900, b.y);
    o.s.scale.set(o.sz); o.s.alpha = 0.85 * (0.2 + 0.8 * Math.abs(Math.sin(o.ph))) * (1 - o.v * 0.75) * Math.min(1, o.u * 6, (1 - o.u) * 6);
  }); };
  return c;
}
// Azulejo (backsplash) + rayos de luz. Parallax 0.75.
function tileLayer() {
  const {x0, x1} = BOUNDS, ty = GROUND - 760, w = x1 - x0, h = GROUND - ty + 30;
  return bake(x0, ty, w, h, 0.6, ctx => {
    ctx.fillStyle = '#E9E2D4'; ctx.fillRect(x0, ty, w, h);
    const T = 110, tr = rng(7);
    for (let y = ty; y < ty + h; y += T) for (let x = x0 + (((y - ty) / T) % 2) * T / 2 - T; x < x1; x += T) {
      const k = tr(); rr(ctx, x + 4, y + 4, T - 8, T - 8, 10);
      ctx.fillStyle = lin(ctx, x, y, x + T, y + T, [[0, k > 0.85 ? '#CDE6F0' : '#FFFDF8'], [1, k > 0.85 ? '#9CC7D8' : '#E6DCCB']]); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; rr(ctx, x + 13, y + 12, T * 0.42, 10, 5); ctx.fill();
    }
    ctx.fillStyle = lin(ctx, 0, ty, 0, ty + 140, [[0, 'rgba(60,40,70,0.28)'], [1, 'rgba(60,40,70,0)']]); ctx.fillRect(x0, ty, w, 140);
    ctx.fillStyle = lin(ctx, 0, GROUND - 60, 0, GROUND, [[0, 'rgba(60,40,70,0)'], [1, 'rgba(60,40,70,0.3)']]); ctx.fillRect(x0, GROUND - 60, w, 60);
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    [[1000, 360, 0.16], [1350, 300, 0.12], [1650, 380, 0.1]].forEach(([x, wd, a]) => {
      ctx.beginPath(); ctx.moveTo(x, ty); ctx.lineTo(x + wd, ty); ctx.lineTo(x + wd + 700, GROUND); ctx.lineTo(x + 480, GROUND); ctx.closePath();
      ctx.fillStyle = lin(ctx, 0, ty, 0, GROUND, [[0, `rgba(255,236,170,${a})`], [1, 'rgba(255,236,170,0)']]); ctx.fill();
    });
    ctx.restore();
  });
}

// Barra de cocina (butcher-block) + gabinetes de abajo. Es el piso de juego -> parallax 1.
function counterLayer() {
  const {x0, x1, y1} = BOUNDS, top = GROUND, th = 80, w = x1 - x0, h = y1 - top + 20;
  return bake(x0, top - 10, w, h + 10, 0.8, ctx => {
    ctx.fillStyle = lin(ctx, 0, top - 8, 0, top + th, [[0, '#F2C38A'], [0.15, '#D99C5C'], [1, '#9C6430']]); ctx.fillRect(x0, top - 8, w, th + 8);
    const br = rng(21); ctx.globalAlpha = 0.25;
    for (let x = x0; x < x1; x += 80 + br() * 50) { ctx.fillStyle = br() > 0.5 ? '#B97A3E' : '#E8B377'; ctx.fillRect(x, top, 40 + br() * 60, th); }
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255,248,225,0.85)'; ctx.fillRect(x0, top - 8, w, 6);
    ctx.fillStyle = 'rgba(60,30,10,0.55)'; ctx.fillRect(x0, top + th - 5, w, 5);
    ctx.fillStyle = lin(ctx, 0, top + th, 0, y1, [[0, '#3E7E78'], [1, '#2B5B57']]); ctx.fillRect(x0, top + th, w, h);
    for (let x = x0 + 30; x < x1; x += 440) {
      rr(ctx, x, top + th + 34, 400, h, 16); ctx.fillStyle = lin(ctx, x, top, x + 400, y1, [[0, '#5FA39C'], [1, '#356B66']]); ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = '#1F403D'; ctx.stroke();
      rr(ctx, x + 32, top + th + 66, 336, h, 12); ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 6; ctx.stroke();
      rr(ctx, x + 160, top + th + 84, 80, 18, 9); ctx.fillStyle = '#E8C66A'; ctx.fill(); ctx.strokeStyle = '#7A5A12'; ctx.lineWidth = 4; ctx.stroke();
    }
    ctx.fillStyle = lin(ctx, 0, top + th, 0, top + th + 70, [[0, 'rgba(10,20,30,0.55)'], [1, 'rgba(10,20,30,0)']]); ctx.fillRect(x0, top + th, w, 70);
  });
}

// Primer plano oscuro desenfocado (hojas de maceta) — en espacio de pantalla, con un poco de parallax inverso.
function foliage(side) {
  const S = 700;
  const c = document.createElement('canvas'); c.width = S; c.height = S; const ctx = c.getContext('2d');
  ctx.filter = 'blur(12px)';
  const leaf = (x, y, l, a, col) => { ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(l * 0.5, -l * 0.28, l, 0); ctx.quadraticCurveTo(l * 0.5, l * 0.28, 0, 0); ctx.fillStyle = col; ctx.fill(); ctx.restore(); };
  [[40, S + 20, 480, -1.05, '#1E4A2A'], [140, S + 40, 400, -0.7, '#2A6136'], [20, S - 80, 380, -0.35, '#173B22'], [200, S + 30, 330, -1.35, '#24542F']].forEach(a => leaf(...a));
  const s = new Sprite(Texture.from(c)); s.anchor.set(side < 0 ? 0 : 1, 1); if (side > 0) s.scale.x = -1;
  return s;
}

// ================= MUNDO 2: EL JARDÍN =================
// Cielo + sol + nubes + colinas lejanas azuladas (perspectiva atmosférica). Parallax 0.15, resolución baja.
function skyLayer() {
  const {x0, y0, x1} = BOUNDS, w = x1 - x0, h = GROUND - y0 + 100;
  return bake(x0, y0, w, h, 0.35, ctx => {
    ctx.fillStyle = lin(ctx, 0, y0, 0, GROUND, [[0, '#3FA7E8'], [0.55, '#9BD8F6'], [1, '#FFF1CC']]); ctx.fillRect(x0, y0, w, h);
    // sol con halo
    ctx.fillStyle = rad(ctx, 700, 250, 0, 700, [[0, 'rgba(255,250,210,1)'], [0.12, 'rgba(255,240,170,0.9)'], [0.4, 'rgba(255,236,170,0.25)'], [1, 'rgba(255,236,170,0)']]); ctx.fillRect(x0, y0, w, h);
    const hill = (base, amp, per, ph, top, bot) => {
      ctx.beginPath(); ctx.moveTo(x0, GROUND + 100);
      for (let x = x0; x <= x1 + 40; x += 40) ctx.lineTo(x, base - amp * (0.6 * Math.sin(x / per + ph) + 0.4 * Math.sin(x / (per * 0.43) + ph * 2)));
      ctx.lineTo(x1, GROUND + 100); ctx.closePath(); ctx.fillStyle = lin(ctx, 0, base - amp, 0, GROUND, [[0, top], [1, bot]]); ctx.fill();
    };
    hill(GROUND - 900, 160, 420, 1.3, '#A9CFE0', '#C9E4D6');
    hill(GROUND - 720, 130, 300, 4.1, '#8CC3A0', '#B9DDB0');
    ctx.fillStyle = 'rgba(255,245,220,0.18)'; ctx.fillRect(x0, y0, w, h);
  });
}
// Nubes esponjosas sueltas (sprites) que se deslizan lento con el viento; parallax 0.2 (delante del cielo)
function cloudLayer() {
  const {x0, y0, x1} = BOUNDS, w = x1 - x0, r = rng(41), c = new Container();
  const tex = [0, 1, 2].map(v => { const cv = document.createElement('canvas'); cv.width = 420; cv.height = 220; const k = cv.getContext('2d'), rr2 = rng(5 + v);
    const puffs = [[0, 0, 90], [-95, 25, 62], [100, 22, 68], [-40, -40, 72], [52, -38, 62]].map(([dx, dy, R]) => [dx + (rr2() - 0.5) * 20, dy, R * (0.85 + rr2() * 0.3)]);
    k.translate(210, 125); k.fillStyle = 'rgba(120,170,210,0.25)'; puffs.forEach(([dx, dy, R]) => { k.beginPath(); k.arc(dx + 6, dy + 10, R, 0, TAU); k.fill(); }); // sombra azulada abajo
    puffs.forEach(([dx, dy, R]) => { k.fillStyle = rad(k, dx - R * 0.3, dy - R * 0.4, 0, R * 1.3, [[0, '#FFFFFF'], [1, '#D7ECFA']]); k.beginPath(); k.arc(dx, dy, R, 0, TAU); k.fill(); });
    return Texture.from(cv); });
  const items = [];
  for (let i = 0; i < 10; i++) { const s = new Sprite(tex[i % 3]); s.anchor.set(0.5); const k = 0.7 + r() * 0.9; s.scale.set(k * (r() > 0.5 ? 1 : -1), k);
    s.position.set(x0 + (i + r() * 0.7) / 10 * w, GROUND - 2050 + r() * 800); s.alpha = 0.85 + r() * 0.15; c.addChild(s); items.push({s, v: 10 + r() * 14}); }
  c.update = dt => items.forEach(o => { o.s.x += o.v * dt; if (o.s.x > x1 + 300) o.s.x = x0 - 300; });
  return c;
}
// Mariposas que revolotean delante de la cerca (aleteo = escala x; ruta ondulada que cambia de rumbo). Parallax 0.85.
function butterflyLayer() {
  const {x0, x1} = BOUNDS, r = rng(19), c = new Container();
  const wing = col => { const cv = document.createElement('canvas'); cv.width = 64; cv.height = 56; const k = cv.getContext('2d');
    k.translate(32, 28); k.lineWidth = 3; k.strokeStyle = '#3A2A40';
    for (const sx of [-1, 1]) { k.fillStyle = col; k.beginPath(); k.ellipse(sx * 15, -8, 15, 13, sx * 0.5, 0, TAU); k.fill(); k.stroke();
      k.fillStyle = shade(col, -40); k.beginPath(); k.ellipse(sx * 11, 11, 10, 9, -sx * 0.4, 0, TAU); k.fill(); k.stroke();
      k.fillStyle = 'rgba(255,255,255,0.75)'; k.beginPath(); k.arc(sx * 17, -10, 4, 0, TAU); k.fill(); }
    k.fillStyle = '#3A2A40'; k.beginPath(); k.ellipse(0, 2, 3.5, 15, 0, 0, TAU); k.fill();
    k.lineWidth = 2; k.beginPath(); k.moveTo(-1, -12); k.quadraticCurveTo(-6, -24, -10, -25); k.moveTo(1, -12); k.quadraticCurveTo(6, -24, 10, -25); k.stroke();
    return Texture.from(cv); };
  const T = ['#FFB13B', '#FF7FA8', '#8FD3FF', '#FFF07A'].map(wing), items = [];
  for (let i = 0; i < 7; i++) { const s = new Sprite(T[i % T.length]); s.anchor.set(0.5); c.addChild(s);
    items.push({s, x: x0 + 400 + r() * (x1 - x0 - 800), y: GROUND - 140 - r() * 380, a: r() * TAU, ph: r() * TAU, f: 16 + r() * 8, k: 0.75 + r() * 0.4, turn: 0}); }
  // estruendo: salen espantadas hacia arriba y lejos de la explosión, aleteando a lo loco, y poco a poco se calman
  c.jolt = (k = 1, x = 0) => items.forEach(o => { o.panic = Math.min(1.6, (o.panic || 0) + k * (0.6 + Math.random() * 0.6)); o.a = -Math.PI / 2 + Math.sign(o.x - x * 0.85 || 1) * (0.5 + Math.random() * 0.6); o.turn = 0.6 + Math.random() * 0.5; o.da = 0; });
  c.update = dt => items.forEach(o => {
    const pn = o.panic > 0 ? (o.panic -= dt * 0.7, Math.max(0, o.panic)) : 0;
    o.turn -= dt; if (o.turn <= 0) { o.turn = 1 + Math.random() * 2.5; o.da = (Math.random() - 0.5) * 1.6; }
    o.a += o.da * dt; const home = GROUND - 330; o.a += ((o.y < home - 250 ? 1 : o.y > home + 170 ? -1 : 0) * Math.sign(Math.cos(o.a)) * 0.9) * dt; // no se alejan de la cerca
    o.ph += dt * o.f * (1 + pn * 1.5); const flap = Math.abs(Math.cos(o.ph));
    o.x += Math.cos(o.a) * 70 * (1 + pn * 3) * dt; o.y += Math.sin(o.a) * 45 * (1 + pn * 4) * dt + Math.sin(o.ph * 0.5) * 30 * dt * (1 - flap);
    if (o.x > x1 - 100) o.a = Math.PI - Math.abs(o.a % TAU); if (o.x < x0 + 100) o.a = 0;
    o.s.position.set(o.x, o.y); o.s.scale.set(o.k * (0.25 + 0.75 * flap) * (Math.cos(o.a) < 0 ? -1 : 1), o.k); o.s.rotation = Math.sin(o.ph * 0.3) * 0.2;
  });
  return c;
}
// Gorriones parados en el travesaño de la cerca (parallax 0.6, igual que la cerca): picotean, brincan, se voltean;
// con un estruendo salen volando en desbandada (pío-pío) y ~6–10 s después regresan planeando a su lugar.
function birdLayer() {
  const {x0, x1} = BOUNDS, r = rng(31), c = new Container(), rail = GROUND - 302;
  const bird = pose => { const cv = document.createElement('canvas'); cv.width = 96; cv.height = 80; const k = cv.getContext('2d'); k.translate(48, 48);
    k.lineWidth = 3.5; k.strokeStyle = '#3B2616'; k.lineJoin = 'round';
    const wingUp = pose === 'up', wingDn = pose === 'down';
    if (wingUp) { k.fillStyle = '#7A5232'; k.beginPath(); k.moveTo(-4, -6); k.quadraticCurveTo(-14, -40, 4, -42); k.quadraticCurveTo(10, -22, 8, -6); k.closePath(); k.fill(); k.stroke(); }
    // cola
    k.fillStyle = '#6B4529'; k.beginPath(); k.moveTo(-14, 0); k.lineTo(-34, pose === 'sit' ? 10 : -4); k.lineTo(-32, pose === 'sit' ? 18 : 6); k.lineTo(-12, 8); k.closePath(); k.fill(); k.stroke();
    // cuerpo + pancita
    k.fillStyle = '#9A6B45'; k.beginPath(); k.ellipse(0, 2, 20, 15, -0.1, 0, TAU); k.fill(); k.stroke();
    k.fillStyle = '#EBD7B8'; k.beginPath(); k.ellipse(5, 8, 13, 8, -0.15, 0, TAU); k.fill();
    // cabeza
    k.fillStyle = '#9A6B45'; k.beginPath(); k.arc(16, -10, 11, 0, TAU); k.fill(); k.stroke();
    k.fillStyle = '#6B4529'; k.beginPath(); k.arc(14, -15, 7, Math.PI * 1.05, Math.PI * 1.95); k.fill();
    k.fillStyle = '#F2E4CC'; k.beginPath(); k.ellipse(20, -6, 5, 4, 0, 0, TAU); k.fill();
    k.fillStyle = '#E39A2E'; k.beginPath(); k.moveTo(25, -12); k.lineTo(34, -9); k.lineTo(25, -6); k.closePath(); k.fill(); k.lineWidth = 2; k.stroke();
    k.fillStyle = '#1A1008'; k.beginPath(); k.arc(19, -12, 2.8, 0, TAU); k.fill(); k.fillStyle = '#FFF'; k.beginPath(); k.arc(19.8, -12.9, 1, 0, TAU); k.fill();
    // ala
    k.lineWidth = 3; k.fillStyle = '#7A5232';
    if (wingDn) { k.beginPath(); k.moveTo(-6, 2); k.quadraticCurveTo(-12, 30, 4, 32); k.quadraticCurveTo(10, 16, 8, 2); k.closePath(); k.fill(); k.stroke(); }
    else if (!wingUp) { k.beginPath(); k.ellipse(-3, 2, 13, 8, 0.25, 0, TAU); k.fill(); k.stroke(); k.strokeStyle = 'rgba(40,24,10,0.5)'; k.beginPath(); k.moveTo(-12, 4); k.lineTo(4, 6); k.stroke(); }
    if (pose === 'sit') { k.strokeStyle = '#5A3A1E'; k.lineWidth = 2.5; k.beginPath(); k.moveTo(-2, 16); k.lineTo(-4, 26); k.moveTo(6, 16); k.lineTo(6, 26); k.stroke(); }
    return Texture.from(cv); };
  const T = {sit: bird('sit'), up: bird('up'), down: bird('down')}, items = [];
  for (let gx = x0 + 500 + r() * 300; gx < x1 - 300; gx += 700 + r() * 600) {
    const n = 1 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) { const s = new Sprite(T.sit); s.anchor.set(0.5, 0.92); c.addChild(s); const hx = gx + i * (55 + r() * 30);
      items.push({s, hx, x: hx, y: rail, st: 'sit', dir: r() < 0.5 ? -1 : 1, nx: 1 + r() * 4, pk: 0, hp: 0, k: 0.8 + r() * 0.14, t: 0}); }
  }
  // estruendo en x (mundo): huyen los que están cerca primero (la onda llega después); xl ≈ x en coords de esta capa
  c.jolt = (k = 1, x = 0) => { const xl = x * 0.6 + x0 * 0.4; let any = false;
    items.forEach(o => { if (o.st !== 'sit' && o.st !== 'land') return; const d = Math.abs(o.x - xl); if (d > 1500 + k * 1500) return;
      any = true; o.st = 'flee'; o.t = -d / 3000 - Math.random() * 0.12; o.dir = Math.sign(o.x - xl) || 1; o.vx = o.dir * (380 + Math.random() * 260); o.vy = -(420 + Math.random() * 260); });
    if (any) SFX.tweet(Math.min(1, 0.5 + k * 0.4)); };
  c.update = dt => items.forEach(o => {
    o.t += dt; const s = o.s;
    if (o.st === 'sit') {
      // picotea (se inclina rápido), da brinquitos y se voltea de vez en cuando
      if ((o.nx -= dt) <= 0) { const m = Math.random(); if (m < 0.5) o.pk = 0.35; else if (m < 0.8) { o.hp = 0.3; o.hx += (Math.random() - 0.5) * 50; } else o.dir *= -1; o.nx = 1.2 + Math.random() * 3.5; }
      let rot = 0, dy = 0; if (o.pk > 0) { o.pk -= dt; rot = Math.sin((1 - o.pk / 0.35) * Math.PI * 2) ** 2 * 0.55; }
      if (o.hp > 0) { o.hp -= dt; dy = Math.sin((1 - o.hp / 0.3) * Math.PI) * 18; o.x += (o.hx - o.x) * Math.min(1, dt * 10); }
      s.texture = T.sit; s.position.set(o.x, rail - dy); s.rotation = rot * o.dir; s.scale.set(o.k * o.dir, o.k); return;
    }
    if (o.st === 'flee') { if (o.t < 0) return;
      o.vy -= 260 * dt; o.vx *= 1 + dt * 0.3; o.x += o.vx * dt; o.y += o.vy * dt;
      s.texture = Math.floor(o.t * 16) % 2 ? T.up : T.down; s.position.set(o.x, o.y); s.rotation = Math.atan2(o.vy, Math.abs(o.vx)) * 0.5 * o.dir; s.scale.set(o.k * o.dir, o.k);
      if (o.y < rail - 2200) { o.st = 'away'; o.t = 0; o.wait = 5 + Math.random() * 5; s.visible = false; } return;
    }
    if (o.st === 'away') { if (o.t > o.wait) { o.st = 'back'; o.t = 0; o.dir = Math.random() < 0.5 ? -1 : 1; o.x = o.hx - o.dir * (900 + Math.random() * 400); o.y = rail - 1200 - Math.random() * 300; s.visible = true; } return; }
    if (o.st === 'back') { // regresa planeando (aleteo lento) y se posa en su lugar
      const dx = o.hx - o.x, dy = rail - o.y, d = Math.hypot(dx, dy), v = Math.min(520, 120 + d * 0.9);
      o.x += dx / d * v * dt; o.y += dy / d * v * dt; o.dir = Math.sign(dx) || o.dir;
      s.texture = d < 140 ? T.up : (o.t * 5) % 1 < 0.35 ? (Math.floor(o.t * 14) % 2 ? T.up : T.down) : T.down;
      s.position.set(o.x, o.y); s.rotation = 0; s.scale.set(o.k * o.dir, o.k);
      if (d < 8) { o.st = 'land'; o.t = 0; o.x = o.hx; } return;
    }
    if (o.st === 'land') { const u = Math.min(1, o.t / 0.25), sq = 1 - Math.sin(u * Math.PI) * 0.18; s.texture = T.sit; s.position.set(o.x, rail); s.scale.set(o.k * o.dir / Math.sqrt(sq), o.k * sq); s.rotation = 0; if (u >= 1) { o.st = 'sit'; o.nx = 1 + Math.random() * 2; } }
  });
  return c;
}
// Árboles redondos + cerca de madera + arbustos con flores. Parallax 0.6.
function fenceLayer() {
  const {x0, x1} = BOUNDS, ty = GROUND - 1250, w = x1 - x0, h = GROUND - ty + 30;
  return bake(x0, ty, w, h, 0.55, ctx => {
    const r = rng(77);
    // colina cercana
    ctx.beginPath(); ctx.moveTo(x0, GROUND + 30);
    for (let x = x0; x <= x1 + 40; x += 40) ctx.lineTo(x, GROUND - 520 - 70 * Math.sin(x / 520 + 0.7));
    ctx.lineTo(x1, GROUND + 30); ctx.closePath(); ctx.fillStyle = lin(ctx, 0, GROUND - 600, 0, GROUND, [[0, '#7DBE5E'], [1, '#5E9E45']]); ctx.fill();
    // árboles (tronco + copa de 3 bolas con luz arriba-izq)
    for (let x = x0 + 150; x < x1; x += 520 + r() * 380) {
      const by = GROUND - 520 - 70 * Math.sin(x / 520 + 0.7) + 20, th = 260 + r() * 160, R = 150 + r() * 70;
      ctx.fillStyle = lin(ctx, x - 25, 0, x + 25, 0, [[0, '#8A5A2E'], [1, '#5A3818']]); rr(ctx, x - 24, by - th, 48, th, 14); ctx.fill();
      [[0, -th - R * 0.3, R], [-R * 0.7, -th + R * 0.15, R * 0.75], [R * 0.7, -th + R * 0.2, R * 0.72]].forEach(([dx, dy, rr2]) => {
        ctx.fillStyle = rad(ctx, x + dx - rr2 * 0.35, by + dy - rr2 * 0.4, rr2 * 0.1, rr2 * 1.15, [[0, '#9AD86A'], [0.6, '#5FAE45'], [1, '#3E8436']]);
        ctx.beginPath(); ctx.arc(x + dx, by + dy, rr2, 0, TAU); ctx.fill(); });
    }
    // cerca de tablas
    const fy = GROUND - 400;
    for (let x = x0 - 40; x < x1 + 60; x += 92) {
      ctx.beginPath(); ctx.moveTo(x, GROUND); ctx.lineTo(x, fy + 30); ctx.lineTo(x + 38, fy); ctx.lineTo(x + 76, fy + 30); ctx.lineTo(x + 76, GROUND); ctx.closePath();
      ctx.fillStyle = lin(ctx, x, 0, x + 76, 0, [[0, '#F6E7CF'], [0.5, '#E9D3B0'], [1, '#C9AE86']]); ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = '#8B6B45'; ctx.stroke();
    }
    [fy + 90, fy + 270].forEach(y => { ctx.fillStyle = lin(ctx, 0, y, 0, y + 34, [[0, '#E3CBA4'], [1, '#B89670']]); ctx.fillRect(x0, y, w, 34); ctx.fillStyle = 'rgba(90,60,30,0.35)'; ctx.fillRect(x0, y + 34, w, 8); });
    // arbustos con flores al pie de la cerca
    for (let x = x0; x < x1; x += 160 + r() * 140) {
      const R = 70 + r() * 50;
      ctx.fillStyle = rad(ctx, x - R * 0.3, GROUND - R * 0.9, 0, R * 1.3, [[0, '#7CC456'], [1, '#356F2C']]); ctx.beginPath(); ctx.arc(x, GROUND - R * 0.5, R, Math.PI, 0); ctx.fill();
      for (let i = 0; i < 5; i++) { const fx = x + (r() - 0.5) * R * 1.4, fy2 = GROUND - R * 0.5 - r() * R * 0.8; ctx.fillStyle = ['#FF6F91', '#FFD23F', '#FFFFFF', '#B983FF'][Math.floor(r() * 4)]; ctx.beginPath(); ctx.arc(fx, fy2, 9, 0, TAU); ctx.fill(); ctx.fillStyle = '#FFB000'; ctx.beginPath(); ctx.arc(fx, fy2, 3.5, 0, TAU); ctx.fill(); }
    }
    ctx.fillStyle = lin(ctx, 0, GROUND - 80, 0, GROUND, [[0, 'rgba(40,60,30,0)'], [1, 'rgba(40,60,30,0.3)']]); ctx.fillRect(x0, GROUND - 80, w, 80);
  });
}
// Piso del jardín: borde de pasto con matitas + tierra con piedritas. Parallax 1.
function lawnLayer() {
  const {x0, x1, y1} = BOUNDS, top = GROUND, w = x1 - x0, h = y1 - top + 20;
  return bake(x0, top - 40, w, h + 40, 0.8, ctx => {
    const r = rng(93);
    ctx.fillStyle = lin(ctx, 0, top, 0, y1, [[0, '#8A5A33'], [0.4, '#6E4426'], [1, '#4A2C17']]); ctx.fillRect(x0, top + 30, w, h);
    // vetas de tierra (capas horizontales suaves) + pocas piedras planas con sombra
    for (let y = top + 90; y < y1; y += 60 + r() * 50) { ctx.fillStyle = `rgba(${r() > 0.5 ? '120,80,45' : '60,35,18'},0.25)`; ctx.beginPath(); ctx.moveTo(x0, y);
      for (let x = x0; x <= x1 + 80; x += 80) ctx.lineTo(x, y + Math.sin(x / 210 + y) * 10); ctx.lineTo(x1, y + 18); ctx.lineTo(x0, y + 18); ctx.fill(); }
    for (let i = 0; i < w * h / 60000; i++) { const x = x0 + r() * w, y = top + 90 + r() * (h - 60), R = 10 + r() * 18;
      ctx.fillStyle = 'rgba(30,15,5,0.35)'; ctx.beginPath(); ctx.ellipse(x + 3, y + R * 0.35, R * 1.5, R * 0.5, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = lin(ctx, x, y - R * 0.5, x, y + R * 0.5, [[0, '#A8927A'], [1, '#6E5A48']]); ctx.beginPath(); ctx.ellipse(x, y, R * 1.5, R * 0.55, (r() - 0.5) * 0.3, 0, TAU); ctx.fill(); }
    ctx.fillStyle = lin(ctx, 0, top - 10, 0, top + 60, [[0, '#8FD85E'], [0.5, '#5FB13E'], [1, '#3E8A2C']]); ctx.fillRect(x0, top - 10, w, 70);
    ctx.fillStyle = '#3E8A2C';
    for (let x = x0; x < x1; x += 14) { const hh = 14 + r() * 26; ctx.beginPath(); ctx.moveTo(x, top - 5); ctx.lineTo(x + 7 + r() * 6, top - 5 - hh); ctx.lineTo(x + 14, top - 5); ctx.fill(); }
    ctx.fillStyle = 'rgba(220,255,170,0.55)'; ctx.fillRect(x0, top - 8, w, 5);
    ctx.fillStyle = lin(ctx, 0, top + 58, 0, top + 130, [[0, 'rgba(20,10,5,0.45)'], [1, 'rgba(20,10,5,0)']]); ctx.fillRect(x0, top + 58, w, 72);
  });
}

// ================= MUNDO 3: LA GUARIDA (sótano bajo la casa) =================
// Noche: luz cálida de focos colgantes + luz fría de luna por una ventanita con barrotes. Todo lo que no está iluminado, oscuro.
const LAMPS = [{x: 380, y: 760, ph: 0.3}, {x: 1950, y: 640, ph: 2.1}, {x: 3500, y: 780, ph: 4.4}]; // focos (mundo, parallax 0.35)
const MOON = {x: 1080, y: 120, w: 420, h: 300}; // ventanita del sótano
function tunaCan(ctx, x, y, r) { // lata de atún (cilindro chato visto de lado, etiqueta azul con pescadito)
  const h = r * 0.62;
  ctx.fillStyle = lin(ctx, x - r, 0, x + r, 0, [[0, '#6E7A86'], [0.3, '#E8EEF4'], [0.55, '#AEB9C4'], [1, '#56606B']]); rr(ctx, x - r, y - h, 2 * r, h, r * 0.12); ctx.fill();
  ctx.fillStyle = lin(ctx, x - r, 0, x + r, 0, [[0, '#1F4E8C'], [0.35, '#4C8FE0'], [1, '#173A6A']]); ctx.fillRect(x - r, y - h * 0.8, 2 * r, h * 0.6);
  ctx.fillStyle = '#FFD84A'; ctx.beginPath(); ctx.ellipse(x - r * 0.05, y - h * 0.5, r * 0.32, h * 0.16, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x + r * 0.22, y - h * 0.5); ctx.lineTo(x + r * 0.45, y - h * 0.68); ctx.lineTo(x + r * 0.45, y - h * 0.32); ctx.fill();
  ctx.fillStyle = lin(ctx, x - r, 0, x + r, 0, [[0, '#9AA6B2'], [0.4, '#FFFFFF'], [1, '#7D8894']]); ctx.beginPath(); ctx.ellipse(x, y - h, r, r * 0.2, 0, 0, TAU); ctx.fill();
  ctx.lineWidth = Math.max(2, r * 0.06); ctx.strokeStyle = '#2A2E38'; rr(ctx, x - r, y - h, 2 * r, h, r * 0.12); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(x, y - h, r, r * 0.2, 0, 0, TAU); ctx.stroke();
}
// Pared de ladrillo + vigas del techo + tubería de cobre + ventanita con luna + botín de latas de atún. Parallax 0.35.
function lairWallLayer() {
  const {x0, y0, x1} = BOUNDS, w = x1 - x0, h = GROUND + 120 - y0;
  return bake(x0, y0, w, h, 0.45, ctx => {
    const r = rng(311);
    ctx.fillStyle = '#3A2626'; ctx.fillRect(x0, y0, w, h);
    // ladrillos (filas alternadas, tono variable, junta oscura)
    const BW = 170, BH = 74;
    for (let y = y0 + 160, row = 0; y < y0 + h; y += BH, row++) for (let x = x0 - (row % 2) * BW / 2; x < x1; x += BW) {
      const t = r(), base = t > 0.92 ? '#8A5A44' : t > 0.6 ? '#7A4636' : t > 0.25 ? '#6C3D31' : '#5E352C';
      rr(ctx, x + 4, y + 4, BW - 8, BH - 8, 6); ctx.fillStyle = lin(ctx, x, y, x, y + BH, [[0, shade(base, 18)], [1, shade(base, -22)]]); ctx.fill();
      ctx.fillStyle = 'rgba(255,220,180,0.12)'; ctx.fillRect(x + 8, y + 6, BW - 16, 5);
      if (r() > 0.85) { ctx.fillStyle = 'rgba(30,15,10,0.35)'; ctx.beginPath(); ctx.arc(x + 20 + r() * (BW - 40), y + 18 + r() * (BH - 36), 4 + r() * 6, 0, TAU); ctx.fill(); } // picaduras
    }
    // manchas de humedad que bajan de la tubería
    for (let i = 0; i < 9; i++) { const x = x0 + 200 + r() * (w - 400), yy = GROUND - 1480;
      ctx.fillStyle = lin(ctx, 0, yy, 0, yy + 500 + r() * 400, [[0, 'rgba(25,30,30,0.45)'], [1, 'rgba(25,30,30,0)']]); ctx.beginPath(); ctx.ellipse(x, yy + 300, 60 + r() * 70, 380, 0, 0, TAU); ctx.fill(); }
    // ventanita del sótano con barrotes: cielo de noche, luna, estrellas
    const {x: wx, y: wy, w: ww, h: wh} = MOON;
    ctx.save(); rr(ctx, wx, wy, ww, wh, 14); ctx.clip();
    ctx.fillStyle = lin(ctx, 0, wy, 0, wy + wh, [[0, '#0E1F45'], [1, '#2D4F86']]); ctx.fillRect(wx, wy, ww, wh);
    ctx.fillStyle = rad(ctx, wx + ww * 0.68, wy + wh * 0.35, 0, 200, [[0, 'rgba(210,230,255,0.7)'], [0.3, 'rgba(160,200,255,0.25)'], [1, 'rgba(160,200,255,0)']]); ctx.fillRect(wx, wy, ww, wh);
    ctx.fillStyle = rad(ctx, wx + ww * 0.65, wy + wh * 0.32, 0, 58, [[0, '#FFFFF4'], [1, '#D9E6F5']]); ctx.beginPath(); ctx.arc(wx + ww * 0.68, wy + wh * 0.35, 52, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(150,170,200,0.35)'; [[-14, -10, 10], [12, 14, 7], [-4, 20, 5]].forEach(([dx, dy, R]) => { ctx.beginPath(); ctx.arc(wx + ww * 0.68 + dx, wy + wh * 0.35 + dy, R, 0, TAU); ctx.fill(); });
    for (let i = 0; i < 14; i++) { ctx.fillStyle = `rgba(255,255,255,${0.4 + r() * 0.6})`; ctx.beginPath(); ctx.arc(wx + r() * ww, wy + r() * wh * 0.7, 2 + r() * 2.5, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#1C2A22'; ctx.beginPath(); ctx.moveTo(wx, wy + wh); for (let x = wx; x <= wx + ww; x += 18) ctx.lineTo(x, wy + wh - 30 - r() * 40); ctx.lineTo(wx + ww, wy + wh); ctx.fill(); // pasto visto desde abajo
    ctx.restore();
    ctx.lineWidth = 10; ctx.strokeStyle = '#2A1A16'; rr(ctx, wx, wy, ww, wh, 14); ctx.stroke();
    ctx.lineWidth = 26; ctx.strokeStyle = lin(ctx, wx, wy, wx + ww, wy + wh, [[0, '#7B6A5C'], [1, '#43372F']]); rr(ctx, wx - 16, wy - 16, ww + 32, wh + 32, 22); ctx.stroke();
    for (let i = 1; i < 5; i++) { const bx = wx + i * ww / 5; ctx.fillStyle = lin(ctx, bx - 8, 0, bx + 8, 0, [[0, '#2A2A30'], [0.4, '#77808C'], [1, '#22222A']]); ctx.fillRect(bx - 8, wy, 16, wh); }
    // vigas de madera del techo + postes
    ctx.fillStyle = lin(ctx, 0, y0, 0, y0 + 170, [[0, '#2B1A12'], [0.7, '#5A3A24'], [1, '#3A2416']]); ctx.fillRect(x0, y0, w, 170);
    for (let x = x0 + 60; x < x1; x += 330) { ctx.fillStyle = lin(ctx, x, 0, x + 90, 0, [[0, '#6E4A2E'], [1, '#3A2416']]); ctx.fillRect(x, y0, 90, 210); ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x, y0 + 210, 90, 14); }
    for (const px of [-120, 2750]) { ctx.fillStyle = lin(ctx, px, 0, px + 120, 0, [[0, '#7A5434'], [0.5, '#5C3C24'], [1, '#2E1C10']]); ctx.fillRect(px, y0 + 170, 120, h); ctx.strokeStyle = 'rgba(30,15,5,0.5)'; ctx.lineWidth = 3;
      for (let yy = y0 + 260; yy < y0 + h; yy += 140 + r() * 120) { ctx.beginPath(); ctx.moveTo(px + 20, yy); ctx.quadraticCurveTo(px + 60, yy + 30, px + 100, yy + 6); ctx.stroke(); } }
    // tubería de cobre horizontal con bridas, codo que baja y llave roja
    const py = GROUND - 1500, pipe = (xa, ya, xb, yb, R) => { const horiz = ya === yb;
      ctx.fillStyle = horiz ? lin(ctx, 0, ya - R, 0, ya + R, [[0, '#6E3A1C'], [0.3, '#E89A5A'], [0.5, '#C9763C'], [1, '#5A2C12']]) : lin(ctx, xa - R, 0, xa + R, 0, [[0, '#6E3A1C'], [0.3, '#E89A5A'], [0.5, '#C9763C'], [1, '#5A2C12']]);
      if (horiz) ctx.fillRect(xa, ya - R, xb - xa, 2 * R); else ctx.fillRect(xa - R, ya, 2 * R, yb - ya); };
    pipe(x0, py, x1, py, 30); pipe(x0, py - 120, x1, py - 120, 18);
    for (let x = x0 + 200; x < x1; x += 600) { ctx.fillStyle = lin(ctx, 0, py - 40, 0, py + 40, [[0, '#8A5030'], [0.35, '#F2B07A'], [1, '#4E2510']]); rr(ctx, x - 16, py - 40, 32, 80, 6); ctx.fill(); ctx.fillStyle = '#2A1A16'; ctx.fillRect(x - 4, py + 40, 8, 70); } // bridas + soportes
    pipe(1700, py, 1700, GROUND + 100, 30); pipe(3180, py - 120, 3180, GROUND + 100, 18);
    ctx.fillStyle = rad(ctx, 1700, py, 0, 70, [[0, '#F2B07A'], [1, '#6E3A1C']]); ctx.beginPath(); ctx.arc(1700, py, 46, 0, TAU); ctx.fill();
    ctx.lineWidth = 12; ctx.strokeStyle = '#C8322E'; ctx.beginPath(); ctx.arc(1700, py + 230, 52, 0, TAU); ctx.stroke(); // llave de paso
    ctx.lineWidth = 8; for (let a = 0; a < 3; a++) { ctx.beginPath(); ctx.moveTo(1700, py + 230); ctx.lineTo(1700 + Math.cos(a * 2.1) * 52, py + 230 + Math.sin(a * 2.1) * 52); ctx.stroke(); }
    ctx.fillStyle = '#E0524A'; ctx.beginPath(); ctx.arc(1700, py + 230, 14, 0, TAU); ctx.fill();
    // cartel "SE BUSCA" que hicieron los ratones (gato garabateado con una X roja)
    const sx = 620, sy = GROUND - 1250;
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(-0.06);
    ctx.fillStyle = '#E9DDBF'; ctx.fillRect(-120, -150, 240, 300); ctx.fillStyle = 'rgba(120,90,40,0.25)'; ctx.fillRect(-120, 110, 240, 40);
    ctx.fillStyle = '#5A2A1A'; ctx.font = '44px "Luckiest Guy"'; ctx.textAlign = 'center'; ctx.fillText('SE BUSCA', 0, -95);
    ctx.lineWidth = 6; ctx.strokeStyle = '#3A2A20'; ctx.beginPath(); ctx.arc(0, 10, 62, 0, TAU); ctx.moveTo(-55, -20); ctx.lineTo(-48, -82); ctx.lineTo(-18, -55); ctx.moveTo(55, -20); ctx.lineTo(48, -82); ctx.lineTo(18, -55); ctx.stroke();
    ctx.fillStyle = '#3A2A20'; [[-22, 0], [22, 0]].forEach(([dx, dy]) => { ctx.beginPath(); ctx.arc(dx, dy, 7, 0, TAU); ctx.fill(); });
    ctx.beginPath(); ctx.moveTo(-6, 20); ctx.lineTo(6, 20); ctx.lineTo(0, 28); ctx.fill(); ctx.lineWidth = 3; [[-1, 1]].forEach(() => { for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 18, 30); ctx.lineTo(s * 70, 22); ctx.moveTo(s * 18, 36); ctx.lineTo(s * 70, 42); ctx.stroke(); } });
    ctx.lineWidth = 14; ctx.strokeStyle = 'rgba(205,40,35,0.9)'; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-80, -60); ctx.lineTo(80, 90); ctx.moveTo(80, -60); ctx.lineTo(-80, 90); ctx.stroke();
    ctx.fillStyle = '#9A9AA2'; ctx.beginPath(); ctx.arc(0, -140, 8, 0, TAU); ctx.fill();
    ctx.restore();
    // repisa con el BOTÍN: pirámide de latas de atún robadas (brillan bajo el foco)
    const shx = 3080, shy = GROUND - 1130, shw = 760;
    ctx.fillStyle = rad(ctx, shx + shw / 2, shy - 120, 0, 520, [[0, 'rgba(255,215,120,0.35)'], [1, 'rgba(255,215,120,0)']]); ctx.fillRect(shx - 200, shy - 600, shw + 400, 900);
    const R = 62; for (let row = 0; row < 4; row++) for (let i = 0; i < 5 - row; i++) tunaCan(ctx, shx + 70 + R + row * R + i * 2 * R * 1.02, shy - row * R * 0.62 * 1.05, R);
    rr(ctx, shx, shy, shw, 30, 8); ctx.fillStyle = lin(ctx, 0, shy, 0, shy + 30, [[0, '#9A6A40'], [1, '#5A3A20']]); ctx.fill();
    ctx.fillStyle = '#2A1A10'; ctx.fillRect(shx + 60, shy + 30, 14, 60); ctx.fillRect(shx + shw - 74, shy + 30, 14, 60);
    ctx.fillStyle = lin(ctx, 0, shy + 30, 0, shy + 110, [[0, 'rgba(0,0,0,0.4)'], [1, 'rgba(0,0,0,0)']]); ctx.fillRect(shx, shy + 30, shw, 80);
    // charcos de luz cálida de los focos sobre la pared + oscuridad general arriba y en los bordes
    ctx.save(); ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = lin(ctx, 0, y0, 0, GROUND + 120, [[0, 'rgba(40,40,70,1)'], [0.35, 'rgba(110,100,130,1)'], [1, 'rgba(90,80,110,1)']]); ctx.fillRect(x0, y0, w, h);
    ctx.restore(); ctx.save(); ctx.globalCompositeOperation = 'screen';
    LAMPS.forEach(L => { ctx.fillStyle = rad(ctx, L.x, L.y + 80, 0, 1100, [[0, 'rgba(255,190,110,0.55)'], [0.35, 'rgba(230,140,70,0.22)'], [1, 'rgba(200,110,50,0)']]); ctx.fillRect(L.x - 1200, y0, 2400, h); });
    ctx.fillStyle = rad(ctx, wx + ww / 2, wy + wh / 2, 0, 700, [[0, 'rgba(120,160,230,0.35)'], [1, 'rgba(120,160,230,0)']]); ctx.fillRect(wx - 700, y0, ww + 1400, 1400);
    ctx.restore();
  });
}
// Focos colgantes que se mecen (con halo y cono de luz aditivos) + haz de luna con polvo + gotas de la tubería. Parallax 0.35.
function lampLayer() {
  const c = new Container(), r = rng(57), {y0} = BOUNDS;
  const glowT = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 128; const k = cv.getContext('2d');
    k.fillStyle = rad(k, 64, 64, 0, 64, [[0, 'rgba(255,240,200,1)'], [0.15, 'rgba(255,210,130,0.8)'], [0.5, 'rgba(255,170,80,0.18)'], [1, 'rgba(255,150,60,0)']]); k.fillRect(0, 0, 128, 128); return Texture.from(cv); })();
  const coneT = (() => { const cv = document.createElement('canvas'); cv.width = 200; cv.height = 300; const k = cv.getContext('2d');
    k.filter = 'blur(6px)'; k.beginPath(); k.moveTo(85, 0); k.lineTo(115, 0); k.lineTo(195, 295); k.lineTo(5, 295); k.closePath();
    k.fillStyle = lin(k, 0, 0, 0, 300, [[0, 'rgba(255,215,140,0.5)'], [0.5, 'rgba(255,200,120,0.18)'], [1, 'rgba(255,190,110,0)']]); k.fill(); return Texture.from(cv); })();
  const bulbT = (() => { const cv = document.createElement('canvas'); cv.width = 120; cv.height = 190; const k = cv.getContext('2d');
    k.fillStyle = lin(k, 40, 0, 80, 0, [[0, '#3A3A40'], [0.5, '#8A8A94'], [1, '#2A2A30']]); rr(k, 42, 0, 36, 50, 6); k.fill(); // socket
    k.fillStyle = lin(k, 20, 40, 100, 40, [[0, '#4A5A3A'], [0.4, '#7E9A5E'], [1, '#2E3A24']]); k.beginPath(); k.moveTo(48, 40); k.lineTo(72, 40); k.lineTo(116, 108); k.lineTo(4, 108); k.closePath(); k.fill(); // pantalla de lámina verde
    k.lineWidth = 4; k.strokeStyle = '#1E2618'; k.stroke();
    k.fillStyle = rad(k, 60, 128, 0, 40, [[0, '#FFFFFF'], [0.5, '#FFF2B8'], [1, '#FFC860']]); k.beginPath(); k.arc(60, 126, 30, 0, TAU); k.fill();
    return Texture.from(cv); })();
  const lamps = LAMPS.map(L => { const p = new Container(); p.position.set(L.x, y0 + 140); c.addChild(p); const len = L.y - (y0 + 140);
    const cord = new Sprite(Texture.WHITE); cord.tint = 0x15100C; cord.width = 7; cord.height = len; cord.x = -3.5; p.addChild(cord);
    const cone = new Sprite(coneT); cone.anchor.set(0.5, 0); cone.scale.set(6.5, 5.5); cone.y = len + 90; cone.blendMode = 'add'; cone.alpha = 0.55;
    const glow = new Sprite(glowT); glow.anchor.set(0.5); glow.scale.set(5.5); glow.y = len + 100; glow.blendMode = 'add';
    const bulb = new Sprite(bulbT); bulb.anchor.set(0.5, 0); bulb.scale.set(1.6); bulb.y = len - 10;
    p.addChild(cone, bulb, glow); return {p, glow, cone, ph: L.ph, fl: 0}; });
  // polvo en el haz de luna (luz fría que baja en diagonal desde la ventanita)
  const {x: wx, y: wy, w: ww, h: wh} = MOON;
  const shaft = new Sprite((() => { const cv = document.createElement('canvas'); cv.width = 260; cv.height = 260; const k = cv.getContext('2d'); k.filter = 'blur(5px)';
    k.beginPath(); k.moveTo(10, 10); k.lineTo(52, 10); k.lineTo(250, 250); k.lineTo(140, 250); k.closePath();
    k.fillStyle = lin(k, 0, 10, 0, 250, [[0, 'rgba(170,200,255,0.5)'], [1, 'rgba(170,200,255,0)']]); k.fill(); return Texture.from(cv); })());
  shaft.scale.set(ww / 42, 9); shaft.position.set(wx - 10 * ww / 42, wy + wh * 0.4); shaft.blendMode = 'add'; shaft.alpha = 0.5; c.addChildAt(shaft, 0);
  const moteT = glowT, motes = [];
  for (let i = 0; i < 34; i++) { const s = new Sprite(moteT); s.anchor.set(0.5); s.blendMode = 'add'; s.tint = 0xCFE0FF; c.addChild(s); motes.push({s, u: r(), v: r(), ph: r() * TAU, sz: 0.08 + r() * 0.1, dv: 0.01 + r() * 0.015}); }
  // gotas que caen de las bridas de la tubería
  const dropT = (() => { const cv = document.createElement('canvas'); cv.width = 16; cv.height = 26; const k = cv.getContext('2d');
    k.fillStyle = lin(k, 0, 0, 16, 0, [[0, 'rgba(150,200,230,0.9)'], [0.4, 'rgba(240,250,255,1)'], [1, 'rgba(90,140,180,0.9)']]); k.beginPath(); k.moveTo(8, 0); k.quadraticCurveTo(16, 18, 8, 25); k.quadraticCurveTo(0, 18, 8, 0); k.fill(); return Texture.from(cv); })();
  const drips = [500, 1700, 2900].map((x, i) => { const s = new Sprite(dropT); s.anchor.set(0.5, 0); s.scale.set(1.6); c.addChild(s); return {s, x: x + 20, y0: GROUND - 1460, t: -i * 1.3, v: 0}; });
  let T = 0;
  // estruendo (explosión, clavado, jefe que cae): los focos se columpian y parpadean un instante
  c.jolt = (k = 1) => lamps.forEach(L => { L.sw = Math.min(0.22, (L.sw || 0) + k * (0.07 + Math.random() * 0.05)); L.swT = 0; L.jf = 0.08 + Math.random() * 0.12; });
  c.update = dt => { T += dt;
    lamps.forEach((L, i) => { L.p.rotation = Math.sin(T * 0.9 + L.ph) * 0.035 + Math.sin(T * 0.37 + L.ph * 2) * 0.015;
      if (L.sw > 0.002) { L.swT += dt; L.p.rotation += L.sw * Math.sin(L.swT * 3.1 + 0.4); L.sw *= Math.exp(-dt * 0.8); }
      if (L.jf > 0) { L.jf -= dt; L.glow.alpha = L.cone.alpha = Math.random() < 0.5 ? 0.15 : 0.6; return; }
      if (i === 1) { L.fl -= dt; if (L.fl <= 0) { L.fl = Math.random() < 0.25 ? 0.06 : 2 + Math.random() * 5; if (L.fl < 0.07) SFX.buzz(0.6); } } // el foco del centro parpadea de vez en cuando
      const on = i === 1 && L.fl < 0.07 ? 0.35 : 1; L.glow.alpha = (0.85 + Math.sin(T * 9 + L.ph) * 0.04) * on; L.cone.alpha = 0.5 * on; });
    shaft.alpha = 0.45 + Math.sin(T * 0.5) * 0.05;
    motes.forEach(o => { o.ph += dt; o.v += o.dv * dt; if (o.v > 1) { o.v -= 1; o.u = Math.random(); }
      const x = wx + o.u * ww + o.v * 1150 + Math.sin(o.ph * 0.8) * 14, y = wy + wh * 0.4 + o.v * 1150; o.s.position.set(x, y); o.s.scale.set(o.sz);
      o.s.alpha = (0.35 + 0.65 * Math.abs(Math.sin(o.ph * 1.3))) * (1 - o.v) * Math.min(1, o.v * 8); });
    drips.forEach(d => { d.t += dt; if (d.t < 0) { d.s.visible = false; return; }
      if (d.t < 1.2) { d.s.visible = true; const g = d.t / 1.2; d.s.position.set(d.x, d.y0); d.s.scale.set(1.6 * g, 1.6 * g); d.v = 0; d.s.alpha = 1; return; } // la gota se forma
      d.v += 2200 * dt; d.s.y += d.v * dt; d.s.scale.set(1.3, 2); d.s.alpha = Math.max(0, 1 - (d.s.y - d.y0) / 700);
      if (d.s.y > d.y0 + 700) { d.t = -1.5 - Math.random() * 3; SFX.drip(0.3 + Math.random() * 0.3); } });
  };
  return c;
}
// Murciélagos colgados de cabeza de la tubería de cobre del sótano: se mecen, parpadean, a veces estiran un ala;
// con un estruendo se sueltan y huyen revoloteando en zigzag y ~8–12 s después regresan y se vuelven a colgar. Parallax 0.35.
function batLayer() {
  const {x0, x1} = BOUNDS, r = rng(77), c = new Container(), pipeY = GROUND - 1470;
  const mk = (w, h, draw) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const k = cv.getContext('2d'); k.lineJoin = 'round'; draw(k); return Texture.from(cv); };
  const BODY = '#3B2E45', WING = '#2A2032', EDGE = '#120C18';
  const eyes = (k, x, y, open) => { if (open) { [-1, 1].forEach(sx => { k.fillStyle = '#FFD84A'; k.beginPath(); k.arc(x + sx * 7, y, 4.6, 0, TAU); k.fill(); k.fillStyle = '#1A1008'; k.beginPath(); k.arc(x + sx * 7, y + 0.8, 2, 0, TAU); k.fill(); }); }
    else { k.strokeStyle = '#FFD84A'; k.lineWidth = 2.2; [-1, 1].forEach(sx => { k.beginPath(); k.moveTo(x + sx * 7 - 4, y); k.lineTo(x + sx * 7 + 4, y); k.stroke(); }); } };
  // colgado: patitas arriba (ancla), cuerpo envuelto en las alas, cabeza abajo con orejas hacia abajo
  const hang = (open, stretch) => mk(110, 110, k => { k.translate(55, 8); k.lineWidth = 3; k.strokeStyle = EDGE;
    k.beginPath(); k.moveTo(-5, 0); k.lineTo(-5, 10); k.moveTo(5, 0); k.lineTo(5, 10); k.stroke(); // patitas
    if (stretch) { k.fillStyle = WING; k.beginPath(); k.moveTo(6, 16); k.lineTo(50, 8); k.lineTo(44, 24); k.lineTo(50, 40); k.lineTo(36, 44); k.lineTo(14, 52); k.closePath(); k.fill(); k.stroke(); }
    k.fillStyle = WING; k.beginPath(); k.moveTo(0, 8); k.bezierCurveTo(22, 12, 24, 48, 0, 62); k.bezierCurveTo(-24, 48, -22, 12, 0, 8); k.fill(); k.stroke();
    k.strokeStyle = 'rgba(120,100,140,0.5)'; k.lineWidth = 2; k.beginPath(); k.moveTo(0, 14); k.lineTo(0, 54); k.stroke(); k.strokeStyle = EDGE; k.lineWidth = 3;
    k.fillStyle = BODY; k.beginPath(); k.arc(0, 66, 14, 0, TAU); k.fill(); k.stroke(); // cabeza
    k.beginPath(); [-1, 1].forEach(sx => { k.moveTo(sx * 5, 77); k.lineTo(sx * 13, 94); k.lineTo(sx * 13, 74); }); k.fill(); k.stroke(); // orejas (hacia abajo)
    eyes(k, 0, 62, open); });
  // volando: alas arriba / abajo
  const fly = up => mk(150, 100, k => { k.translate(75, 50); k.lineWidth = 3; k.strokeStyle = EDGE; k.fillStyle = WING;
    [-1, 1].forEach(sx => { k.beginPath(); k.moveTo(sx * 8, -2);
      if (up) { k.lineTo(sx * 40, -38); k.lineTo(sx * 70, -30); k.lineTo(sx * 58, -16); k.lineTo(sx * 50, -6); k.lineTo(sx * 36, -10); k.lineTo(sx * 26, 4); }
      else { k.lineTo(sx * 40, 4); k.lineTo(sx * 68, 30); k.lineTo(sx * 52, 30); k.lineTo(sx * 44, 38); k.lineTo(sx * 32, 26); k.lineTo(sx * 20, 12); }
      k.closePath(); k.fill(); k.stroke(); });
    k.fillStyle = BODY; k.beginPath(); k.ellipse(0, 4, 13, 17, 0, 0, TAU); k.fill(); k.stroke();
    k.beginPath(); [-1, 1].forEach(sx => { k.moveTo(sx * 4, -10); k.lineTo(sx * 11, -28); k.lineTo(sx * 13, -8); }); k.fill(); k.stroke();
    eyes(k, 0, -4, true); k.fillStyle = '#FFF'; k.beginPath(); k.moveTo(-4, 6); k.lineTo(-2, 11); k.lineTo(0, 6); k.moveTo(4, 6); k.lineTo(2, 11); k.lineTo(0, 6); k.fill(); }); // colmillitos
  const T = {hang: hang(true), blink: hang(false), stretch: hang(true, true), up: fly(true), down: fly(false)}, items = [];
  for (let gx = x0 + 650 + r() * 300; gx < x1 - 300; gx += 650 + r() * 700) {
    if (LAMPS.some(L => Math.abs(L.x - gx) < 160)) continue; // no encima de los cables de los focos
    const n = 1 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) { const s = new Sprite(T.hang); s.anchor.set(0.5, 0.07); c.addChild(s); const hx = gx + i * (44 + r() * 26);
      items.push({s, hx, x: hx, y: pipeY, st: 'hang', ph: r() * TAU, nx: 1 + r() * 4, ev: 0, k: 1.2 + r() * 0.35, t: 0}); }
  }
  c.jolt = (k = 1, x = 0) => { let any = false;
    items.forEach(o => { if (o.st !== 'hang' && o.st !== 'land') return; const d = Math.abs(o.x - x * 0.35); any = true; // la onda llega primero a los cercanos
      o.st = 'drop'; o.t = -Math.min(0.5, d / 6000) - Math.random() * 0.15; o.dir = Math.random() < 0.5 ? -1 : 1; o.vx = 0; o.vy = 0; o.zz = Math.random() * TAU; });
    if (any) SFX.squeak(); };
  c.update = dt => items.forEach(o => {
    o.t += dt; const s = o.s;
    if (o.st === 'hang') { o.ph += dt;
      if ((o.nx -= dt) <= 0) { o.ev = Math.random() < 0.7 ? -0.14 : 0.9; o.nx = 1.5 + Math.random() * 4; } // parpadeo o estirón de ala
      let tx = T.hang; if (o.ev < 0) { o.ev += dt; tx = T.blink; } else if (o.ev > 0) { o.ev -= dt; tx = T.stretch; }
      s.texture = tx; s.position.set(o.x, pipeY); s.rotation = Math.sin(o.ph * 1.3) * 0.08; s.scale.set(o.k, o.k * (1 + Math.sin(o.ph * 2.2) * 0.02)); return;
    }
    if (o.st === 'drop') { if (o.t < 0) { s.rotation = Math.sin(o.t * 60) * 0.15; return; } // se sacude antes de soltarse
      if (o.t < 0.22) { o.y += 900 * o.t * dt; s.texture = T.hang; s.position.set(o.x, o.y); s.rotation = o.dir * o.t * 14; return; } // cae y se voltea
      o.st = 'flee'; o.t = 0; o.vx = o.dir * (300 + Math.random() * 200); o.vy = -(260 + Math.random() * 160); }
    if (o.st === 'flee') { o.zz += dt * 7; o.x += (o.vx + Math.sin(o.zz) * 260) * dt; o.y += (o.vy + Math.cos(o.zz * 1.3) * 220) * dt; o.vy -= 60 * dt;
      s.texture = Math.floor(o.t * 18) % 2 ? T.up : T.down; s.anchor.set(0.5); s.position.set(o.x, o.y); s.rotation = Math.sin(o.zz) * 0.3; s.scale.set(o.k, o.k);
      if (o.t > 4) { o.st = 'away'; o.t = 0; o.wait = 4 + Math.random() * 5; s.visible = false; } return; }
    if (o.st === 'away') { if (o.t > o.wait) { o.st = 'back'; o.t = 0; o.dir = Math.random() < 0.5 ? -1 : 1; o.x = o.hx - o.dir * (900 + Math.random() * 400); o.y = pipeY - 300 + Math.random() * 600; s.visible = true; } return; }
    if (o.st === 'back') { o.zz += dt * 6; const dx = o.hx - o.x, dy = pipeY + 40 - o.y, d = Math.hypot(dx, dy), v = Math.min(480, 90 + d * 0.9);
      o.x += dx / d * v * dt + Math.sin(o.zz) * 120 * dt * Math.min(1, d / 200); o.y += dy / d * v * dt;
      s.texture = Math.floor(o.t * 16) % 2 ? T.up : T.down; s.position.set(o.x, o.y); s.rotation = Math.sin(o.zz) * 0.2;
      if (d < 10) { o.st = 'land'; o.t = 0; o.x = o.hx; } return; }
    if (o.st === 'land') { const u = Math.min(1, o.t / 0.3); s.texture = T.hang; s.anchor.set(0.5, 0.07); s.position.set(o.x, pipeY); s.rotation = Math.sin(u * Math.PI * 3) * 0.25 * (1 - u); s.scale.set(o.k, o.k * (1 - Math.sin(u * Math.PI) * 0.15));
      if (u >= 1) { o.st = 'hang'; o.nx = 1 + Math.random() * 2; } }
  });
  return c;
}
// Fondo medio: cajas apiladas, frascos en anaquel, calentador de agua, telarañas, agujero de ratón iluminado. Parallax 0.65.
const HOLES = [1000, 3400]; // agujeros de ratón en el zoclo (cratesLayer)
function cratesLayer() {
  const {x0, x1} = BOUNDS, ty = GROUND - 1150, w = x1 - x0, h = GROUND - ty + 30;
  const c = new Container(); c.addChild(cratesBake(x0, x1, ty, w, h));
  // ojitos que brillan dentro de cada agujero: parpadean, miran a los lados y a veces se esconden
  const eyeT = (() => { const cv = document.createElement('canvas'); cv.width = 40; cv.height = 40; const k = cv.getContext('2d');
    k.fillStyle = rad(k, 20, 20, 0, 20, [[0, 'rgba(255,255,220,1)'], [0.35, 'rgba(255,230,120,0.9)'], [1, 'rgba(255,200,60,0)']]); k.fillRect(0, 0, 40, 40); return Texture.from(cv); })();
  const pairs = HOLES.map((mx, i) => { const p = new Container(); p.position.set(mx, GROUND - 52);
    const es = [-16, 16].map(dx => { const e = new Sprite(eyeT); e.anchor.set(0.5); e.x = dx; e.scale.set(0.75); e.blendMode = 'add'; p.addChild(e); return e; });
    c.addChild(p); return {p, es, t: 1 + i * 2.3, blink: 0, look: 0, lookT: 0, hide: 0}; });
  c.update = dt => pairs.forEach(o => {
    o.t -= dt; if (o.t <= 0) { o.t = 2 + Math.random() * 4; if (Math.random() < 0.2) o.hide = 1.5 + Math.random() * 2.5; else o.blink = 0.14; }
    o.lookT -= dt; if (o.lookT <= 0) { o.lookT = 1 + Math.random() * 2.5; o.look = (Math.random() - 0.5) * 22; }
    o.blink = Math.max(0, o.blink - dt); o.hide = Math.max(0, o.hide - dt);
    o.p.x += ((o.look + HOLES[pairs.indexOf(o)]) - o.p.x) * Math.min(1, dt * 6);
    const sy = o.hide > 0 ? 0 : o.blink > 0 ? 0.12 : 0.75; o.es.forEach(e => { e.scale.y += (sy - e.scale.y) * Math.min(1, dt * 25); e.alpha = 0.9; });
  });
  return c;
}
function cratesBake(x0, x1, ty, w, h) {
  return bake(x0, ty, w, h, 0.55, ctx => {
    const r = rng(131);
    const crate = (x, y, cw, chh) => { // caja de madera (huacal) oscura
      ctx.fillStyle = lin(ctx, x, y, x + cw, y + chh, [[0, '#6A4A30'], [1, '#3A2616']]); ctx.fillRect(x, y, cw, chh);
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; for (let yy = y + chh / 3; yy < y + chh - 4; yy += chh / 3) ctx.fillRect(x, yy - 3, cw, 6);
      ctx.strokeStyle = '#2A1A0E'; ctx.lineWidth = 6; ctx.strokeRect(x + 3, y + 3, cw - 6, chh - 6); ctx.beginPath(); ctx.moveTo(x + 8, y + 8); ctx.lineTo(x + cw - 8, y + chh - 8); ctx.stroke();
      ctx.fillStyle = 'rgba(255,210,150,0.18)'; ctx.fillRect(x + 6, y + 6, cw - 12, 8); };
    const box = (x, y, bw, bh) => { ctx.fillStyle = lin(ctx, x, y, x + bw, y + bh, [[0, '#8E6A44'], [1, '#5A4028']]); ctx.fillRect(x, y, bw, bh);
      ctx.fillStyle = 'rgba(200,170,110,0.35)'; ctx.fillRect(x + bw * 0.42, y, bw * 0.16, bh); ctx.strokeStyle = '#33220F'; ctx.lineWidth = 5; ctx.strokeRect(x, y, bw, bh); };
    // calentador de agua (izq, detrás de la resortera)
    const hx = 120, hw = 300, hy = GROUND - 1000;
    ctx.fillStyle = lin(ctx, hx, 0, hx + hw, 0, [[0, '#5E6A70'], [0.35, '#B8C4C8'], [1, '#3A4246']]); rr(ctx, hx, hy, hw, GROUND - hy, 60); ctx.fill(); ctx.strokeStyle = '#1E2428'; ctx.lineWidth = 6; ctx.stroke();
    ctx.fillStyle = '#E8E2D0'; ctx.beginPath(); ctx.arc(hx + hw / 2, hy + 260, 50, 0, TAU); ctx.fill(); ctx.stroke(); // manómetro
    ctx.strokeStyle = '#C8322E'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(hx + hw / 2, hy + 260); ctx.lineTo(hx + hw / 2 + 30, hy + 235); ctx.stroke();
    ctx.fillStyle = 'rgba(255,140,40,0.85)'; rr(ctx, hx + hw / 2 - 50, GROUND - 180, 100, 40, 10); ctx.fill(); // flamita del piloto
    ctx.fillStyle = '#5FA8FF'; ctx.beginPath(); ctx.ellipse(hx + hw / 2, GROUND - 160, 18, 10, 0, 0, TAU); ctx.fill();
    // pilas de cajas y huacales
    [[700, 3], [1250, 2], [2250, 4], [2900, 2], [3850, 3]].forEach(([x, n]) => { let y = GROUND;
      for (let i = 0; i < n; i++) { const bw = 230 + r() * 120, bh = 150 + r() * 70, ox = (r() - 0.5) * 50; y -= bh; (r() > 0.45 ? crate : box)(x + ox - bw / 2, y, bw, bh); }
      // telaraña en la esquina de arriba
      const tx = x + 110, tY = y; ctx.strokeStyle = 'rgba(230,230,240,0.35)'; ctx.lineWidth = 2;
      for (let a = 0; a <= 4; a++) { ctx.beginPath(); ctx.moveTo(tx, tY); ctx.lineTo(tx - Math.cos(a * Math.PI / 8) * 120, tY + Math.sin(a * Math.PI / 8) * 120); ctx.stroke(); }
      for (let k = 1; k <= 3; k++) { ctx.beginPath(); for (let a = 0; a <= 4; a++) { const R = k * 36 + (a % 2) * 5; ctx[a ? 'lineTo' : 'moveTo'](tx - Math.cos(a * Math.PI / 8) * R, tY + Math.sin(a * Math.PI / 8) * R); } ctx.stroke(); } });
    // anaquel metálico con frascos de conserva
    const ax = 1600, aw = 520; [GROUND - 330, GROUND - 660].forEach(y => {
      let cx = ax + 30; while (cx < ax + aw - 90) { const jw = 70 + r() * 40, jh = 90 + r() * 70, col = ['#C9562E', '#E0A030', '#7AA040', '#B03A50'][Math.floor(r() * 4)];
        rr(ctx, cx, y - jh, jw, jh, 14); ctx.fillStyle = lin(ctx, cx, 0, cx + jw, 0, [[0, shade(col, 10)], [1, shade(col, -60)]]); ctx.fill();
        ctx.fillStyle = '#8A8A90'; ctx.fillRect(cx + 4, y - jh - 12, jw - 8, 16); ctx.fillStyle = 'rgba(255,255,255,0.3)'; rr(ctx, cx + jw * 0.18, y - jh + 10, jw * 0.16, jh - 24, 5); ctx.fill(); cx += jw + 14 + r() * 20; }
      ctx.fillStyle = lin(ctx, 0, y, 0, y + 22, [[0, '#9AA0A8'], [1, '#4E545C']]); ctx.fillRect(ax, y, aw, 22); });
    ctx.fillStyle = '#3E444C'; ctx.fillRect(ax, GROUND - 760, 18, 760); ctx.fillRect(ax + aw - 18, GROUND - 760, 18, 760);
    // agujero de ratón en el zoclo, con luz cálida adentro
    ctx.fillStyle = lin(ctx, 0, GROUND - 90, 0, GROUND, [[0, '#4A3424'], [1, '#2A1C12']]); ctx.fillRect(x0, GROUND - 90, w, 90);
    ctx.fillStyle = 'rgba(255,220,170,0.15)'; ctx.fillRect(x0, GROUND - 90, w, 6);
    for (const mx of HOLES) { ctx.fillStyle = rad(ctx, mx, GROUND - 30, 0, 90, [[0, '#FFC870'], [0.6, '#A0602A'], [1, '#2A1408']]); ctx.beginPath(); ctx.moveTo(mx - 55, GROUND); ctx.lineTo(mx - 55, GROUND - 60); ctx.arc(mx, GROUND - 60, 55, Math.PI, 0); ctx.lineTo(mx + 55, GROUND); ctx.fill();
      ctx.fillStyle = 'rgba(255,190,100,0.25)'; ctx.beginPath(); ctx.ellipse(mx, GROUND, 120, 22, 0, 0, TAU); ctx.fill(); }
    // oscurecer todo (está más lejos de los focos que el juego) + sombra al pie
    ctx.save(); ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = 'rgba(30,20,40,0.38)'; ctx.fillRect(x0, ty, w, h); ctx.restore();
    ctx.fillStyle = lin(ctx, 0, GROUND - 120, 0, GROUND, [[0, 'rgba(10,5,15,0)'], [1, 'rgba(10,5,15,0.5)']]); ctx.fillRect(x0, GROUND - 120, w, 120);
  });
}
// Piso de concreto: borde gastado, grietas, manchas, coladera. Parallax 1.
function concreteLayer() {
  const {x0, x1, y1} = BOUNDS, top = GROUND, w = x1 - x0, h = y1 - top + 20;
  return bake(x0, top - 12, w, h + 12, 0.8, ctx => {
    const r = rng(271);
    ctx.fillStyle = lin(ctx, 0, top, 0, y1, [[0, '#7A736C'], [0.08, '#5E5852'], [0.5, '#46413D'], [1, '#2A2624']]); ctx.fillRect(x0, top - 12, w, h + 12);
    for (let i = 0; i < 60; i++) { const x = x0 + r() * w, y = top + 30 + r() * (h - 40), R = 20 + r() * 90; ctx.fillStyle = `rgba(${r() > 0.5 ? '20,18,16' : '140,130,120'},${0.08 + r() * 0.1})`; ctx.beginPath(); ctx.ellipse(x, y, R * 1.8, R * 0.5, 0, 0, TAU); ctx.fill(); }
    for (let i = 0; i < w * h / 4000; i++) { ctx.fillStyle = r() > 0.5 ? 'rgba(0,0,0,0.25)' : 'rgba(200,190,180,0.2)'; ctx.fillRect(x0 + r() * w, top + r() * h, 3, 3); }
    ctx.strokeStyle = 'rgba(20,15,12,0.6)'; ctx.lineWidth = 3; // grietas
    for (let i = 0; i < 14; i++) { let x = x0 + r() * w, y = top + 2; ctx.beginPath(); ctx.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 60; y += 15 + r() * 30; ctx.lineTo(x, y); } ctx.stroke(); }
    for (let x = x0 + 600; x < x1; x += 900) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x, top, 4, h); ctx.fillStyle = 'rgba(200,190,180,0.12)'; ctx.fillRect(x + 4, top, 3, h); } // juntas de colado
    const dx = 2350, dy = top + 120; ctx.fillStyle = '#26221F'; ctx.beginPath(); ctx.ellipse(dx, dy, 90, 26, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = '#8A8580'; ctx.lineWidth = 6; ctx.stroke(); // coladera
    ctx.lineWidth = 4; for (let k = -3; k <= 3; k++) { ctx.beginPath(); ctx.moveTo(dx + k * 22, dy - 22 + Math.abs(k) * 2); ctx.lineTo(dx + k * 22, dy + 22 - Math.abs(k) * 2); ctx.stroke(); }
    ctx.fillStyle = 'rgba(225,215,200,0.55)'; ctx.fillRect(x0, top - 12, w, 5); // filo iluminado
    ctx.fillStyle = lin(ctx, 0, top, 0, top + 90, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.25)']]); ctx.fillRect(x0, top, w, 90);
    ctx.save(); ctx.globalCompositeOperation = 'screen'; LAMPS.forEach(L => { const x = L.x; ctx.fillStyle = rad(ctx, x, top, 0, 700, [[0, 'rgba(255,180,100,0.22)'], [1, 'rgba(255,180,100,0)']]); ctx.fillRect(x - 700, top - 12, 1400, 400); }); ctx.restore();
  });
}
// Primer plano oscuro desenfocado del sótano: tubo con codo (izq) y esquina de caja con telaraña (der)
function lairFg(side) {
  const S = 700, c = document.createElement('canvas'); c.width = S; c.height = S; const ctx = c.getContext('2d');
  ctx.filter = 'blur(10px)';
  if (side < 0) { ctx.fillStyle = '#1E1410'; ctx.fillRect(30, S - 700, 100, 720); ctx.fillStyle = '#2C1E16'; ctx.fillRect(14, S - 420, 132, 46); ctx.fillRect(14, S - 160, 132, 46); } // tubo vertical con abrazaderas
  else { ctx.fillStyle = '#1A120E'; ctx.fillRect(0, S - 330, 380, 360); ctx.fillStyle = '#2A1C14'; ctx.fillRect(0, S - 330, 380, 40);
    ctx.strokeStyle = 'rgba(200,200,210,0.25)'; ctx.lineWidth = 3; for (let a = 0; a <= 4; a++) { ctx.beginPath(); ctx.moveTo(380, S - 330); ctx.lineTo(380 + Math.cos(Math.PI - a * Math.PI / 8) * 200, S - 330 - Math.sin(a * Math.PI / 8) * 200); ctx.stroke(); } }
  const s = new Sprite(Texture.from(c)); s.anchor.set(side < 0 ? 0 : 1, 1); if (side > 0) s.scale.x = -1;
  return s;
}

export function buildBackground(theme = 'kitchen') {
  if (theme === 'lair') {
    const lamps = lampLayer(), crates = cratesLayer(), bats = batLayer();
    const layers = [{node: lairWallLayer(), f: 0.35}, {node: bats, f: 0.35}, {node: lamps, f: 0.35}, {node: crates, f: 0.65}, {node: concreteLayer(), f: 1}];
    const fg = new Container(); const fl = lairFg(-1), fr = lairFg(1); fg.addChild(fl, fr);
    return {layers, fg, fl, fr, update: dt => { lamps.update(dt); crates.update(dt); bats.update(dt); }, jolt: (k, x) => { lamps.jolt(k); bats.jolt(k, x); }, bats};
  }
  if (theme === 'garden') {
    const clouds = cloudLayer(), flies = butterflyLayer(), birds = birdLayer();
    const layers = [{node: skyLayer(), f: 0.15}, {node: clouds, f: 0.2}, {node: fenceLayer(), f: 0.6}, {node: birds, f: 0.6}, {node: flies, f: 0.85}, {node: lawnLayer(), f: 1}];
    const fg = new Container(); const fl = foliage(-1), fr = foliage(1); fg.addChild(fl, fr);
    return {layers, fg, fl, fr, update: dt => { clouds.update(dt); flies.update(dt); birds.update(dt); }, jolt: (k, x) => { flies.jolt(k, x); birds.jolt(k, x); }, birds};
  }
  const motes = motesLayer(), tools = utensilLayer(), jars = jarLayer(), kettle = kettleLayer(), clock = catClockLayer();
  const layers = [
    {node: wallLayer(), f: 0.35},
    {node: jars, f: 0.35},
    {node: tools, f: 0.35},
    {node: kettle, f: 0.35},
    {node: clock, f: 0.35},
    {node: motes, f: 0.35},
    {node: tileLayer(), f: 0.75},
    {node: counterLayer(), f: 1},
  ];
  const fg = new Container(); const fl = foliage(-1), fr = foliage(1); fg.addChild(fl, fr);
  return {layers, fg, fl, fr, update: dt => { motes.update(dt); tools.update(dt); jars.update(dt); kettle.update(dt); clock.update(dt); }, jolt: k => { tools.jolt(k); jars.jolt(k); kettle.jolt(k); clock.jolt(k); }, kettle};
}
