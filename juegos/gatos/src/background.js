// Fondo de la Cocina en capas con parallax (portado de mockup/mockup.html, escalado al nivel largo).
// Cada capa se pinta UNA vez en un canvas offscreen (a resolución reducida si está lejos) -> textura Pixi.
import {Sprite, Texture, Container} from '../vendor/pixi.min.mjs';
import ART from './art.js';
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

function shelf(ctx, x, y, w, seed) {
  const r = rng(seed); const cols = ['#E9A23B', '#5FA8D3', '#D9534F', '#F4F1EA', '#8CC084', '#C98BD8'];
  let cx = x + 30;
  while (cx < x + w - 110) {
    const jw = 70 + r() * 50, jh = 80 + r() * 90, col = cols[Math.floor(r() * cols.length)];
    rr(ctx, cx, y - jh, jw, jh, 16); ctx.fillStyle = lin(ctx, cx, 0, cx + jw, 0, [[0, shade(col, 30)], [1, shade(col, -40)]]); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; rr(ctx, cx + jw * 0.15, y - jh + 10, jw * 0.18, jh - 20, 6); ctx.fill();
    cx += jw + 18 + r() * 30;
  }
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
    shelf(ctx, -150, 1050, 900, 3);
    windowAt(ctx, 900, 250, 1000, 780, 5);
    cabinets(ctx, 2350, 80, 4, 360, 760);
    shelf(ctx, 2400, 1200, 1300, 9);
    ctx.fillStyle = 'rgba(255,240,215,0.2)'; ctx.fillRect(x0, y0, w, h); // velo atmosférico
  });
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
    const r = rng(41);
    for (let i = 0; i < 9; i++) { // nubes esponjosas
      const cx = x0 + r() * w, cy = y0 + 150 + r() * 650, k = 0.7 + r() * 0.9;
      [[0, 0, 90], [-90, 25, 65], [95, 20, 70], [-40, -40, 70], [50, -35, 60]].forEach(([dx, dy, R]) => {
        ctx.fillStyle = rad(ctx, cx + dx * k - R * k * 0.3, cy + dy * k - R * k * 0.4, 0, R * k * 1.3, [[0, '#FFFFFF'], [1, '#D7ECFA']]);
        ctx.beginPath(); ctx.arc(cx + dx * k, cy + dy * k, R * k, 0, TAU); ctx.fill(); });
    }
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
    for (let i = 0; i < w * h / 9000; i++) { const x = x0 + r() * w, y = top + 70 + r() * h, R = 6 + r() * 16;
      ctx.fillStyle = lin(ctx, x, y - R, x, y + R, [[0, '#B8A48E'], [1, '#7A6655']]); ctx.beginPath(); ctx.ellipse(x, y, R * 1.3, R, r() * 3, 0, TAU); ctx.fill(); }
    ctx.fillStyle = lin(ctx, 0, top - 10, 0, top + 60, [[0, '#8FD85E'], [0.5, '#5FB13E'], [1, '#3E8A2C']]); ctx.fillRect(x0, top - 10, w, 70);
    ctx.fillStyle = '#3E8A2C';
    for (let x = x0; x < x1; x += 14) { const hh = 14 + r() * 26; ctx.beginPath(); ctx.moveTo(x, top - 5); ctx.lineTo(x + 7 + r() * 6, top - 5 - hh); ctx.lineTo(x + 14, top - 5); ctx.fill(); }
    ctx.fillStyle = 'rgba(220,255,170,0.55)'; ctx.fillRect(x0, top - 8, w, 5);
    ctx.fillStyle = lin(ctx, 0, top + 58, 0, top + 130, [[0, 'rgba(20,10,5,0.45)'], [1, 'rgba(20,10,5,0)']]); ctx.fillRect(x0, top + 58, w, 72);
  });
}

export function buildBackground(theme = 'kitchen') {
  if (theme === 'garden') {
    const layers = [{node: skyLayer(), f: 0.15}, {node: fenceLayer(), f: 0.6}, {node: lawnLayer(), f: 1}];
    const fg = new Container(); const fl = foliage(-1), fr = foliage(1); fg.addChild(fl, fr);
    return {layers, fg, fl, fr};
  }
  const layers = [
    {node: wallLayer(), f: 0.35},
    {node: tileLayer(), f: 0.75},
    {node: counterLayer(), f: 1},
  ];
  const fg = new Container(); const fl = foliage(-1), fr = foliage(1); fg.addChild(fl, fr);
  return {layers, fg, fl, fr};
}
