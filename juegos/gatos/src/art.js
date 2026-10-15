// art.js — arte procedural "Gatos Furiosos" (estilo AB2: bisel, luz cálida arriba-izq, sombras frías).
// Reutilizable por el juego: cada función dibuja en un ctx 2D en coordenadas locales.
'use strict';

const ART = (() => {
  const TAU = Math.PI * 2;
  const LIGHT = {x: -0.6, y: -0.8}; // luz cálida desde arriba-izquierda (la ventana)

  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function lin(ctx, x0, y0, x1, y1, stops) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g;
  }
  function rad(ctx, x, y, r0, r1, stops, x1, y1) {
    const g = ctx.createRadialGradient(x, y, r0, x1 ?? x, y1 ?? y, r1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g;
  }
  // ruido determinista para vetas/motas
  function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

  // ---------- sombras ----------
  function contactShadow(ctx, cx, y, w, strength = 0.38) {
    ctx.save();
    ctx.fillStyle = rad(ctx, cx, y, 0, w * 0.6, [[0, `rgba(40,28,60,${strength})`], [1, 'rgba(40,28,60,0)']]);
    ctx.translate(cx, y); ctx.scale(1, 0.18); ctx.beginPath(); ctx.arc(0, 0, w * 0.6, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // ---------- MATERIALES ----------

  // Caja de cuetes (= TNT de AB2): huacal rojo con cohetes asomando, etiqueta amarilla "CUETES" y mecha. Explota al romperse.
  function cuetes(ctx, x, y, w, h, opt = {}) {
    const {damage = 0, seed = 1} = opt;
    const R = rng(seed), r = Math.min(w, h) * 0.08, top = h * 0.24;
    ctx.save();
    // cohetes que asoman por arriba (detrás del frente de la caja)
    const cols = ['#2F7BE0', '#3DBE4A', '#FFC52E', '#E8459A', '#8A4DE0'];
    const nR = Math.max(3, Math.round(w / 34));
    for (let i = 0; i < nR; i++) {
      const cx = x + w * (i + 0.5) / nR + (R() - 0.5) * 6, rw = Math.min(20, w / nR * 0.55), ry = y + top * (0.15 + R() * 0.35), c = cols[(i + seed) % cols.length];
      ctx.fillStyle = lin(ctx, cx - rw / 2, 0, cx + rw / 2, 0, [[0, shade(c, 40)], [0.5, c], [1, shade(c, -60)]]);
      ctx.fillRect(cx - rw / 2, ry + rw * 0.6, rw, top + 10);
      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(cx - rw / 2, ry + rw * 1.2, rw, rw * 0.35);
      ctx.beginPath(); ctx.moveTo(cx - rw / 2 - 2, ry + rw * 0.65); ctx.lineTo(cx, ry - rw * 0.5); ctx.lineTo(cx + rw / 2 + 2, ry + rw * 0.65); ctx.closePath();
      ctx.fillStyle = shade(c, -25); ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#2A1F3D'; ctx.stroke();
      ctx.strokeRect(cx - rw / 2, ry + rw * 0.6, rw, top + 10);
    }
    // cuerpo: tablas pintadas de rojo
    const by = y + top;
    rr(ctx, x, by, w, h - top, r);
    ctx.fillStyle = lin(ctx, x, by, x + w * 0.4, y + h, [[0, '#F0563A'], [0.5, '#C9301E'], [1, '#8A1A12']]); ctx.fill();
    ctx.save(); ctx.clip();
    const nP = Math.max(2, Math.round((h - top) / 46));
    for (let i = 1; i < nP; i++) { const py = by + (h - top) * i / nP; ctx.fillStyle = 'rgba(70,10,5,0.55)'; ctx.fillRect(x, py - 2, w, 3); ctx.fillStyle = 'rgba(255,190,160,0.25)'; ctx.fillRect(x, py + 1, w, 2); }
    for (let i = 0; i < w * h / 700; i++) { ctx.fillStyle = `rgba(90,15,5,${0.08 + R() * 0.14})`; ctx.fillRect(x + R() * w, by + R() * (h - top), 3 + R() * 8, 1.2); }
    // etiqueta amarilla con letrero y un cohetito dibujado
    const lw = w * 0.78, lh = Math.min((h - top) * 0.5, w * 0.36), lx = x + (w - lw) / 2, ly = by + (h - top - lh) / 2;
    ctx.save(); ctx.translate(lx + lw / 2, ly + lh / 2); ctx.rotate((R() - 0.5) * 0.08);
    rr(ctx, -lw / 2, -lh / 2, lw, lh, lh * 0.18); ctx.fillStyle = '#FFE14A'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#2A1F3D'; ctx.stroke();
    ctx.fillStyle = '#C9301E'; ctx.font = `${Math.round(Math.min(lh * 0.62, lw / 4.6))}px "Luckiest Guy"`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('CUETES', 0, lh * 0.06);
    ctx.restore();
    // bisel interior
    ctx.lineWidth = r * 0.9;
    ctx.strokeStyle = lin(ctx, x, by, x + w, y + h, [[0, 'rgba(255,215,190,0.7)'], [0.5, 'rgba(255,215,190,0)'], [0.55, 'rgba(60,5,0,0)'], [1, 'rgba(60,5,0,0.6)']]);
    rr(ctx, x + r * 0.45, by + r * 0.45, w - r * 0.9, h - top - r * 0.9, r * 0.7); ctx.stroke();
    cracks(ctx, x, by, w, h - top, damage, seed, 'rgba(50,5,0,0.95)', 'rgba(255,200,170,0.6)');
    ctx.restore();
    // esquineros de lámina
    ctx.fillStyle = '#C9CDD6'; ctx.strokeStyle = '#2A1F3D'; ctx.lineWidth = 2;
    for (const [cx, cy] of [[x, by], [x + w, by], [x, y + h], [x + w, y + h]]) { ctx.beginPath(); ctx.arc(cx + (cx === x ? 7 : -7), cy + (cy === by ? 7 : -7), 4, 0, TAU); ctx.fill(); ctx.stroke(); }
    rr(ctx, x, by, w, h - top, r); ctx.lineWidth = 3; ctx.strokeStyle = '#4A0E08'; ctx.stroke();
    // mecha enroscada
    ctx.lineCap = 'round'; ctx.strokeStyle = '#3A2A1A'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x + w - 10, by + 4);
    ctx.bezierCurveTo(x + w + 6, by - 4, x + w - 4, by - 16, x + w + 8, by - 20); ctx.stroke();
    ctx.restore();
  }
  // Cartón (= madera). damage 0..3
  function cardboard(ctx, x, y, w, h, opt = {}) {
    const {damage = 0, seed = 1, tape = true, label = true} = opt;
    const R = rng(seed), r = Math.min(w, h) * 0.08;
    ctx.save();
    // cuerpo con gradiente de luz
    rr(ctx, x, y, w, h, r);
    ctx.fillStyle = lin(ctx, x, y, x + w * 0.4, y + h, [[0, '#E9BC7E'], [0.45, '#C99257'], [1, '#93622F']]);
    ctx.fill();
    ctx.clip();
    // corrugado sutil
    ctx.globalAlpha = 0.10; ctx.strokeStyle = '#6B4320'; ctx.lineWidth = 2;
    for (let i = x + 6; i < x + w; i += 9) { ctx.beginPath(); ctx.moveTo(i, y); ctx.lineTo(i + 3, y + h); ctx.stroke(); }
    ctx.globalAlpha = 1;
    // motas
    for (let i = 0; i < w * h / 900; i++) { ctx.fillStyle = `rgba(90,55,25,${0.08 + R() * 0.12})`; ctx.fillRect(x + R() * w, y + R() * h, 2 + R() * 3, 1.5 + R() * 2); }
    // cinta canela
    if (tape) {
      const tw = Math.max(16, w * 0.16);
      ctx.fillStyle = 'rgba(238,214,150,0.85)'; ctx.fillRect(x + w / 2 - tw / 2, y, tw, h);
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x + w / 2 - tw / 2 + 2, y, tw * 0.25, h);
    }
    // etiqueta "FRÁGIL" / flechitas
    if (label && w > 120 && h > 90) {
      ctx.save(); ctx.translate(x + w * 0.22, y + h * 0.62); ctx.rotate(-0.08);
      ctx.strokeStyle = 'rgba(150,40,40,0.75)'; ctx.lineWidth = 3; ctx.strokeRect(-w * 0.13, -h * 0.13, w * 0.26, h * 0.26);
      ctx.fillStyle = 'rgba(150,40,40,0.75)'; ctx.font = `${Math.round(h * 0.11)}px "Lilita One"`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('FRÁGIL', 0, 0); ctx.restore();
    }
    // bisel interior: luz arriba-izq, sombra abajo-der
    ctx.lineWidth = r * 0.9;
    ctx.strokeStyle = lin(ctx, x, y, x + w, y + h, [[0, 'rgba(255,240,205,0.75)'], [0.5, 'rgba(255,240,205,0)'], [0.55, 'rgba(70,40,15,0)'], [1, 'rgba(70,40,15,0.6)']]);
    rr(ctx, x + r * 0.45, y + r * 0.45, w - r * 0.9, h - r * 0.9, r * 0.7); ctx.stroke();
    cracks(ctx, x, y, w, h, damage, seed, 'rgba(70,40,15,0.9)', 'rgba(255,225,170,0.6)');
    ctx.restore();
    rr(ctx, x, y, w, h, r); ctx.lineWidth = 3; ctx.strokeStyle = '#5A3818'; ctx.stroke();
  }

  // Frasco de vidrio (= vidrio)
  function jar(ctx, x, y, w, h, opt = {}) {
    const {damage = 0, seed = 3, lid = '#C8452F'} = opt;
    const neck = h * 0.12, r = w * 0.22;
    ctx.save();
    // cuerpo translúcido
    rr(ctx, x, y + neck, w, h - neck, r);
    ctx.fillStyle = lin(ctx, x, y, x + w, y + h, [[0, 'rgba(205,240,255,0.55)'], [0.5, 'rgba(150,215,240,0.38)'], [1, 'rgba(90,160,200,0.55)']]);
    ctx.fill();
    ctx.save(); ctx.clip();
    // fondo más espeso
    ctx.fillStyle = 'rgba(80,150,190,0.35)'; ctx.fillRect(x, y + h - h * 0.08, w, h * 0.08);
    // brillo especular diagonal
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath(); ctx.moveTo(x + w * 0.16, y + neck + 10); ctx.lineTo(x + w * 0.30, y + neck + 10); ctx.lineTo(x + w * 0.22, y + h - 14); ctx.lineTo(x + w * 0.10, y + h - 14); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x + w * 0.36, y + neck + 14, w * 0.06, h * 0.55);
    cracks(ctx, x, y + neck, w, h - neck, damage, seed, 'rgba(255,255,255,0.95)', 'rgba(60,120,160,0.6)');
    ctx.restore();
    // borde interior blanco
    rr(ctx, x + 4, y + neck + 4, w - 8, h - neck - 8, r * 0.8); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.stroke();
    rr(ctx, x, y + neck, w, h - neck, r); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(40,95,130,0.95)'; ctx.stroke();
    // tapa
    rr(ctx, x - 4, y, w + 8, neck + 4, 8);
    ctx.fillStyle = lin(ctx, 0, y, 0, y + neck, [[0, shade(lid, 40)], [0.5, lid], [1, shade(lid, -45)]]); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = shade(lid, -80); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; rr(ctx, x + 4, y + 4, w * 0.5, 5, 3); ctx.fill();
    ctx.restore();
  }

  // Lata (= piedra / metal). tuna=true -> etiqueta de atún
  function can(ctx, x, y, w, h, opt = {}) {
    const {damage = 0, seed = 5, tuna = true, gold = false} = opt;
    const e = Math.min(h * 0.16, w * 0.12);
    ctx.save();
    const metal = gold ? [[0, '#7A5A12'], [0.18, '#F7DE86'], [0.35, '#FFF6CC'], [0.55, '#D9AE3C'], [1, '#6B4A0C']]
                       : [[0, '#5D6773'], [0.18, '#C9D3DE'], [0.35, '#F4F8FB'], [0.55, '#A9B4C0'], [1, '#4A535E']];
    // lado
    ctx.beginPath(); ctx.rect(x, y + e / 2, w, h - e);
    ctx.ellipse(x + w / 2, y + h - e / 2, w / 2, e / 2, 0, 0, Math.PI);
    ctx.fillStyle = lin(ctx, x, 0, x + w, 0, metal); ctx.fill();
    // etiqueta
    if (tuna) {
      const ly = y + h * 0.26, lh = h * 0.5;
      ctx.fillStyle = lin(ctx, x, 0, x + w, 0, [[0, '#123E73'], [0.3, '#2D7BD0'], [0.45, '#5FA8F0'], [0.65, '#2569B8'], [1, '#0E3260']]);
      ctx.fillRect(x, ly, w, lh);
      ctx.fillStyle = '#F2C230'; ctx.fillRect(x, ly, w, lh * 0.12); ctx.fillRect(x, ly + lh * 0.88, w, lh * 0.12);
      // pez
      ctx.save(); ctx.translate(x + w * 0.5, ly + lh * 0.5); const s = Math.min(w, lh) * 0.32;
      ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.ellipse(-s * 0.1, 0, s * 0.62, s * 0.36, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(s * 0.45, 0); ctx.lineTo(s * 0.85, -s * 0.32); ctx.lineTo(s * 0.85, s * 0.32); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#123E73'; ctx.beginPath(); ctx.arc(-s * 0.45, -s * 0.07, s * 0.07, 0, TAU); ctx.fill();
      ctx.restore();
      if (w > 110) { ctx.fillStyle = '#FFFFFF'; ctx.font = `${Math.round(lh * 0.2)}px "Luckiest Guy"`; ctx.textAlign = 'center'; ctx.fillText('ATÚN', x + w / 2, ly + lh * 0.86); }
    }
    // costillas
    ctx.strokeStyle = 'rgba(40,45,55,0.35)'; ctx.lineWidth = 2;
    [0.14, 0.2, 0.82, 0.88].forEach(t => { ctx.beginPath(); ctx.moveTo(x, y + h * t); ctx.lineTo(x + w, y + h * t); ctx.stroke(); });
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    cracks(ctx, x, y, w, h, damage, seed, 'rgba(30,30,40,0.9)', 'rgba(255,255,255,0.6)'); ctx.restore();
    // tapa
    ctx.beginPath(); ctx.ellipse(x + w / 2, y + e / 2, w / 2, e / 2, 0, 0, TAU);
    ctx.fillStyle = lin(ctx, x, y, x + w, y + e, gold ? [[0, '#FFF3C2'], [1, '#C79A2A']] : [[0, '#F4F8FB'], [1, '#8D99A6']]); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + w / 2, y + e / 2, w * 0.38, e * 0.32, 0, 0, TAU); ctx.strokeStyle = 'rgba(60,65,75,0.45)'; ctx.lineWidth = 2; ctx.stroke();
    // contorno
    ctx.beginPath(); ctx.ellipse(x + w / 2, y + e / 2, w / 2, e / 2, 0, Math.PI, TAU); ctx.lineTo(x + w, y + h - e / 2);
    ctx.ellipse(x + w / 2, y + h - e / 2, w / 2, e / 2, 0, 0, Math.PI); ctx.closePath();
    ctx.lineWidth = 3; ctx.strokeStyle = gold ? '#5A3E08' : '#2E343C'; ctx.stroke();
    ctx.restore();
  }

  // ---------- MATERIALES DEL JARDÍN (mismas físicas que cartón/frasco/lata, otra piel) ----------
  // Madera (= cartón): tablas de huacal clavadas, vetas y nudos
  function plank(ctx, x, y, w, h, opt = {}) {
    const {damage = 0, seed = 1} = opt;
    const R = rng(seed * 31 + 7), r = Math.min(w, h) * 0.07, vert = h > w * 1.4;
    ctx.save();
    rr(ctx, x, y, w, h, r);
    ctx.fillStyle = lin(ctx, x, y, x + w * 0.4, y + h, [[0, '#E2A866'], [0.5, '#C07F3F'], [1, '#8A5226']]);
    ctx.fill(); ctx.clip();
    // tablas (franjas) con separación oscura
    const len = vert ? h : w, thick = vert ? w : h, n = Math.max(1, Math.round(thick / 46));
    for (let i = 0; i < n; i++) {
      const a = i * thick / n, b = thick / n;
      const tone = R() * 0.14 - 0.07;
      ctx.fillStyle = tone > 0 ? `rgba(255,230,180,${tone})` : `rgba(80,40,10,${-tone})`;
      if (vert) ctx.fillRect(x + a, y, b, h); else ctx.fillRect(x, y + a, w, b);
      if (i) { ctx.fillStyle = 'rgba(60,30,8,0.55)'; if (vert) ctx.fillRect(x + a - 1.5, y, 3, h); else ctx.fillRect(x, y + a - 1.5, w, 3); }
      // vetas onduladas
      ctx.strokeStyle = 'rgba(90,48,15,0.28)'; ctx.lineWidth = 1.6;
      for (let v = 0; v < 3; v++) {
        const o = a + b * (0.2 + R() * 0.6), ph = R() * 6, amp = 1.5 + R() * 3;
        ctx.beginPath();
        for (let s = 0; s <= len; s += 8) { const q = o + Math.sin(s / 40 + ph) * amp; vert ? ctx.lineTo(x + q, y + s) : ctx.lineTo(x + s, y + q); }
        ctx.stroke();
      }
      // nudo
      if (len > 120 && R() < 0.7) {
        const s = len * (0.2 + R() * 0.6), q = a + b * 0.5, nx = vert ? x + q : x + s, ny = vert ? y + s : y + q, nr = Math.min(b * 0.22, 9);
        ctx.fillStyle = rad(ctx, nx, ny, 0, nr * 1.6, [[0, 'rgba(70,35,10,0.8)'], [0.5, 'rgba(110,60,20,0.5)'], [1, 'rgba(110,60,20,0)']]);
        ctx.beginPath(); ctx.ellipse(nx, ny, vert ? nr : nr * 1.7, vert ? nr * 1.7 : nr, 0, 0, TAU); ctx.fill();
      }
    }
    // travesaños con clavos en piezas grandes (huacal)
    if (w > 120 && h > 120) {
      ctx.fillStyle = 'rgba(70,35,10,0.35)';
      [0.12, 0.88].forEach(t => ctx.fillRect(x, y + h * t - 10, w, 20));
      ctx.fillStyle = 'rgba(255,220,170,0.25)';
      [0.12, 0.88].forEach(t => ctx.fillRect(x, y + h * t - 10, w, 4));
    }
    const nails = [];
    if (vert) nails.push([w / 2, 12], [w / 2, h - 12]); else nails.push([12, h / 2], [w - 12, h / 2]);
    nails.forEach(([px, py]) => { ctx.fillStyle = '#4B4F57'; ctx.beginPath(); ctx.arc(x + px, y + py, 3.6, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(x + px - 1, y + py - 1, 1.3, 0, TAU); ctx.fill(); });
    ctx.lineWidth = r * 0.9;
    ctx.strokeStyle = lin(ctx, x, y, x + w, y + h, [[0, 'rgba(255,235,195,0.7)'], [0.5, 'rgba(255,235,195,0)'], [0.55, 'rgba(60,30,8,0)'], [1, 'rgba(60,30,8,0.6)']]);
    rr(ctx, x + r * 0.45, y + r * 0.45, w - r * 0.9, h - r * 0.9, r * 0.7); ctx.stroke();
    cracks(ctx, x, y, w, h, damage, seed, 'rgba(55,25,5,0.95)', 'rgba(255,215,160,0.6)');
    ctx.restore();
    rr(ctx, x, y, w, h, r); ctx.lineWidth = 3; ctx.strokeStyle = '#4E2A0E'; ctx.stroke();
  }

  // Maceta de barro (= frasco/vidrio): terracota con borde, se rompe fácil
  function pot(ctx, x, y, w, h, opt = {}) {
    const {damage = 0, seed = 3} = opt;
    const R = rng(seed * 53 + 1), rim = Math.min(h * 0.16, 34), ins = w * 0.09;
    ctx.save();
    // planta que se asoma (solo en macetas paradas)
    if (h > w * 0.9) {
      const lc = ['#4FAE3A', '#3C8F2C', '#6CC44A'];
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i - 2) * 0.42, L = rim * (1.2 + R() * 0.5);
        ctx.save(); ctx.translate(x + w / 2 + (i - 2) * w * 0.08, y + rim * 0.5); ctx.rotate(a + Math.PI / 2);
        ctx.fillStyle = lc[i % 3]; ctx.beginPath(); ctx.ellipse(0, -L * 0.5, L * 0.22, L * 0.55, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(30,70,20,0.6)'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
      }
    }
    // cuerpo cónico
    const body = () => { ctx.beginPath(); ctx.moveTo(x + 2, y + rim); ctx.lineTo(x + w - 2, y + rim); ctx.lineTo(x + w - ins, y + h - 6); ctx.quadraticCurveTo(x + w - ins, y + h, x + w - ins - 6, y + h); ctx.lineTo(x + ins + 6, y + h); ctx.quadraticCurveTo(x + ins, y + h, x + ins, y + h - 6); ctx.closePath(); };
    body();
    ctx.fillStyle = lin(ctx, x, 0, x + w, 0, [[0, '#8E3F1E'], [0.22, '#E07B45'], [0.4, '#F29A62'], [0.7, '#C8602F'], [1, '#7A3315']]); ctx.fill();
    ctx.save(); body(); ctx.clip();
    for (let i = 0; i < w * h / 500; i++) { ctx.fillStyle = `rgba(${R() < 0.5 ? '90,35,12' : '255,200,160'},${0.08 + R() * 0.1})`; ctx.beginPath(); ctx.arc(x + R() * w, y + rim + R() * (h - rim), 1 + R() * 2, 0, TAU); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(x + w * 0.22, y + rim + 6, w * 0.07, h - rim - 18);
    ctx.fillStyle = 'rgba(70,25,8,0.18)'; ctx.fillRect(x, y + h * 0.82, w, h * 0.18);
    cracks(ctx, x, y + rim, w, h - rim, damage, seed, 'rgba(70,25,8,0.95)', 'rgba(255,190,150,0.6)');
    ctx.restore();
    body(); ctx.lineWidth = 3; ctx.strokeStyle = '#5A220A'; ctx.stroke();
    // borde grueso
    rr(ctx, x - 3, y, w + 6, rim, 6);
    ctx.fillStyle = lin(ctx, 0, y, 0, y + rim, [[0, '#F7A673'], [0.5, '#D86A36'], [1, '#93421C']]); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = '#5A220A'; ctx.stroke();
    ctx.fillStyle = 'rgba(255,235,210,0.5)'; rr(ctx, x + 3, y + 3, w * 0.55, 4, 2); ctx.fill();
    if (damage) { ctx.save(); rr(ctx, x - 3, y, w + 6, rim, 6); ctx.clip(); cracks(ctx, x, y, w, rim * 2, Math.min(damage, 2), seed + 1, 'rgba(70,25,8,0.9)', 'rgba(255,190,150,0.5)'); ctx.restore(); }
    ctx.restore();
  }

  // Piedra (= lata): bloque de piedra de río con musgo, facetado
  function stone(ctx, x, y, w, h, opt = {}) {
    const {damage = 0, seed = 5} = opt;
    const R = rng(seed * 71 + 3), r = Math.min(w, h) * 0.22;
    ctx.save();
    // contorno irregular
    const pts = [], N = 14;
    for (let i = 0; i < N; i++) {
      const a = i / N * TAU, c = Math.cos(a), s = Math.sin(a);
      const k = 1 / Math.max(Math.abs(c) / (w / 2), Math.abs(s) / (h / 2));
      const j = 1 - R() * 0.05 - (Math.abs(c) > 0.6 && Math.abs(s) > 0.6 ? 0.1 : 0);
      pts.push([x + w / 2 + c * k * j, y + h / 2 + s * k * j]);
    }
    const shape = () => { ctx.beginPath(); pts.forEach(([a, b], i) => { const [na, nb] = pts[(i + 1) % N]; const mx = (a + na) / 2, my = (b + nb) / 2; i ? ctx.quadraticCurveTo(a, b, mx, my) : ctx.moveTo(mx, my); }); const [a, b] = pts[0], [na, nb] = pts[1]; ctx.quadraticCurveTo(a, b, (a + na) / 2, (b + nb) / 2); ctx.closePath(); };
    shape();
    ctx.fillStyle = lin(ctx, x, y, x + w * 0.5, y + h, [[0, '#C9C6BE'], [0.45, '#9C988F'], [1, '#5F5C57']]); ctx.fill();
    ctx.save(); shape(); ctx.clip();
    // facetas
    for (let i = 0; i < 5; i++) {
      const fx = x + R() * w, fy = y + R() * h, fr = Math.min(w, h) * (0.25 + R() * 0.3);
      ctx.fillStyle = R() < 0.5 ? 'rgba(255,255,245,0.10)' : 'rgba(40,38,35,0.12)';
      ctx.beginPath(); ctx.moveTo(fx, fy - fr); ctx.lineTo(fx + fr, fy - fr * 0.2); ctx.lineTo(fx + fr * 0.4, fy + fr); ctx.lineTo(fx - fr * 0.8, fy + fr * 0.4); ctx.closePath(); ctx.fill();
    }
    // motas
    for (let i = 0; i < w * h / 260; i++) { ctx.fillStyle = `rgba(${R() < 0.5 ? '40,38,35' : '240,238,230'},${0.1 + R() * 0.15})`; ctx.beginPath(); ctx.arc(x + R() * w, y + R() * h, 0.8 + R() * 1.8, 0, TAU); ctx.fill(); }
    // musgo arriba
    for (let i = 0; i < w / 9; i++) {
      const mx = x + R() * w, my = y + R() * Math.min(h * 0.22, 26), mr = 4 + R() * 8;
      ctx.fillStyle = rad(ctx, mx, my, 0, mr, [[0, 'rgba(120,175,60,0.9)'], [0.7, 'rgba(85,140,45,0.6)'], [1, 'rgba(85,140,45,0)']]);
      ctx.beginPath(); ctx.arc(mx, my, mr, 0, TAU); ctx.fill();
    }
    ctx.lineWidth = r * 0.5;
    ctx.strokeStyle = lin(ctx, x, y, x + w, y + h, [[0, 'rgba(255,255,245,0.55)'], [0.5, 'rgba(255,255,245,0)'], [0.55, 'rgba(30,28,25,0)'], [1, 'rgba(30,28,25,0.55)']]);
    shape(); ctx.stroke();
    cracks(ctx, x, y, w, h, damage, seed, 'rgba(30,28,25,0.95)', 'rgba(255,255,245,0.55)');
    ctx.restore();
    shape(); ctx.lineWidth = 3; ctx.strokeStyle = '#3B3935'; ctx.stroke();
    ctx.restore();
  }

  // Aspiradora robot (jefe final): disco visto de lado, defensa, luces rojas, cepillo. damage 0..3 = abolladuras/chispas
  function robot(ctx, x, y, w, h, opt = {}) {
    const {damage = 0, seed = 9, led = '#FF3B3B'} = opt;
    const r = h * 0.45;
    ctx.save();
    // ruedas
    [0.24, 0.76].forEach(t => { ctx.fillStyle = '#1C1D22'; ctx.beginPath(); ctx.arc(x + w * t, y + h - h * 0.12, h * 0.17, 0, TAU); ctx.fill(); ctx.fillStyle = '#4A4C55'; ctx.beginPath(); ctx.arc(x + w * t, y + h - h * 0.12, h * 0.07, 0, TAU); ctx.fill(); });
    // cuerpo
    rr(ctx, x, y + h * 0.08, w, h * 0.78, r);
    ctx.fillStyle = lin(ctx, 0, y, 0, y + h, [[0, '#6E7280'], [0.2, '#3B3E48'], [0.6, '#24262E'], [1, '#121318']]); ctx.fill();
    ctx.save(); rr(ctx, x, y + h * 0.08, w, h * 0.78, r); ctx.clip();
    // tapa superior brillante
    ctx.fillStyle = lin(ctx, x, 0, x + w, 0, [[0, 'rgba(255,255,255,0.05)'], [0.3, 'rgba(255,255,255,0.35)'], [0.5, 'rgba(255,255,255,0.08)'], [1, 'rgba(255,255,255,0.02)']]);
    ctx.fillRect(x, y + h * 0.08, w, h * 0.16);
    // defensa (franja gris)
    ctx.fillStyle = lin(ctx, 0, y + h * 0.42, 0, y + h * 0.66, [[0, '#9AA0AE'], [0.5, '#C9CED9'], [1, '#6B7180']]);
    ctx.fillRect(x, y + h * 0.42, w, h * 0.22);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; for (let i = x + 20; i < x + w; i += 26) ctx.fillRect(i, y + h * 0.44, 3, h * 0.18);
    // "ojos" LED (mirada malvada)
    [0.36, 0.64].forEach((t, i) => {
      const ex = x + w * t, ey = y + h * 0.3;
      ctx.fillStyle = rad(ctx, ex, ey, 0, h * 0.2, [[0, 'rgba(255,90,90,0.9)'], [1, 'rgba(255,40,40,0)']]); ctx.beginPath(); ctx.arc(ex, ey, h * 0.2, 0, TAU); ctx.fill();
      ctx.fillStyle = led; ctx.save(); ctx.translate(ex, ey); ctx.rotate(i ? -0.25 : 0.25);
      ctx.beginPath(); ctx.ellipse(0, 0, h * 0.09, h * 0.045, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#FFE0E0'; ctx.beginPath(); ctx.ellipse(-h * 0.02, -h * 0.01, h * 0.03, h * 0.015, 0, 0, TAU); ctx.fill(); ctx.restore();
    });
    // abolladuras y chispas según daño
    const R = rng(seed * 13 + 5);
    for (let i = 0; i < damage * 3; i++) {
      const dx = x + w * (0.1 + R() * 0.8), dy = y + h * (0.15 + R() * 0.6), dr = h * (0.06 + R() * 0.08);
      ctx.fillStyle = rad(ctx, dx - dr * 0.3, dy - dr * 0.3, 0, dr, [[0, 'rgba(0,0,0,0.55)'], [1, 'rgba(0,0,0,0)']]); ctx.beginPath(); ctx.arc(dx, dy, dr, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(220,225,235,0.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(dx, dy, dr * 0.8, 3.6, 5.2); ctx.stroke();
    }
    cracks(ctx, x, y + h * 0.1, w, h * 0.7, Math.max(0, damage - 1), seed, 'rgba(10,10,12,0.95)', 'rgba(200,210,230,0.5)');
    ctx.restore();
    rr(ctx, x, y + h * 0.08, w, h * 0.78, r); ctx.lineWidth = 4; ctx.strokeStyle = '#0B0C10'; ctx.stroke();
    // cepillo lateral
    ctx.strokeStyle = '#E8C14A'; ctx.lineWidth = 3;
    for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(x + w * 0.9, y + h * 0.86); ctx.lineTo(x + w * 0.9 + i * 6, y + h); ctx.stroke(); }
    // antena
    ctx.strokeStyle = '#2A2C33'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x + w * 0.85, y + h * 0.1); ctx.lineTo(x + w * 0.92, y - h * 0.02); ctx.stroke();
    ctx.fillStyle = led; ctx.beginPath(); ctx.arc(x + w * 0.92, y - h * 0.02, 5, 0, TAU); ctx.fill();
    ctx.restore();
  }

  function cracks(ctx, x, y, w, h, n, seed, dark, light) {
    if (!n) return;
    const R = rng(seed * 97 + 13);
    for (let k = 0; k < n * 2; k++) {
      let px = x + w * (0.2 + R() * 0.6), py = y + h * (0.15 + R() * 0.3);
      const pts = [[px, py]];
      for (let i = 0; i < 4 + n; i++) { px += (R() - 0.5) * w * 0.25; py += h * (0.08 + R() * 0.12); pts.push([px, py]); }
      [[light, 1.5, 1.5], [dark, 2.6, 0]].forEach(([c, lw, off]) => {
        ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.beginPath();
        pts.forEach(([a, b], i) => i ? ctx.lineTo(a + off, b + off) : ctx.moveTo(a + off, b + off)); ctx.stroke();
      });
    }
  }

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16), c = v => Math.max(0, Math.min(255, v + amt));
    return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`;
  }

  // ---------- RATONES ----------
  // kind: 'small' | 'thimble' | 'boss'
  function mouse(ctx, cx, cy, r, kind = 'small', opt = {}) {
    const {look = 1, grin = true, expr = 'normal', noPupils = false, bruise = 0} = opt; // expr: normal | blink | scared | laugh · bruise 0..2 (golpeado, como los cerdos de AB2)
    ctx.save(); ctx.translate(cx, cy);
    const outline = '#2B2F45';
    // cola
    ctx.strokeStyle = '#E79AA6'; ctx.lineWidth = r * 0.12; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(r * 0.7, r * 0.55); ctx.bezierCurveTo(r * 1.5, r * 0.6, r * 1.5, -r * 0.2, r * 1.15, -r * 0.35); ctx.stroke();
    // orejas
    [[-1, -0.62], [1, -0.62]].forEach(([s]) => {
      ctx.beginPath(); ctx.arc(s * r * 0.72, -r * 0.72, r * 0.5, 0, TAU);
      ctx.fillStyle = lin(ctx, 0, -r * 1.2, 0, -r * 0.3, [[0, '#C3CAD4'], [1, '#868F9C']]); ctx.fill();
      ctx.lineWidth = r * 0.07; ctx.strokeStyle = outline; ctx.stroke();
      ctx.beginPath(); ctx.arc(s * r * 0.72, -r * 0.7, r * 0.3, 0, TAU); ctx.fillStyle = lin(ctx, 0, -r, 0, -r * 0.4, [[0, '#FFC2CC'], [1, '#E8899A']]); ctx.fill();
    });
    // cuerpo
    ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.92, 0, 0, TAU);
    ctx.fillStyle = rad(ctx, -r * 0.35, -r * 0.45, r * 0.1, r * 1.25, [[0, '#E3E8EE'], [0.45, '#AEB6C2'], [1, '#6D7584']]); ctx.fill();
    ctx.lineWidth = r * 0.07; ctx.strokeStyle = outline; ctx.stroke();
    // panza clara
    ctx.beginPath(); ctx.ellipse(0, r * 0.38, r * 0.55, r * 0.42, 0, 0, TAU); ctx.fillStyle = 'rgba(245,240,235,0.65)'; ctx.fill();
    // ojo morado (golpeado fuerte): moretón alrededor del ojo izquierdo
    if (bruise >= 2) { ctx.beginPath(); ctx.ellipse(-r * 0.34, -r * 0.12, r * 0.34, r * 0.38, -0.2, 0, TAU);
      ctx.fillStyle = rad(ctx, -r * 0.34, -r * 0.12, r * 0.15, r * 0.38, [[0, 'rgba(90,40,120,0.85)'], [0.7, 'rgba(110,60,140,0.55)'], [1, 'rgba(110,60,140,0)']]); ctx.fill(); }
    // ojos
    const closedEye = (s, up) => { ctx.beginPath(); ctx.arc(s * r, -r * 0.1 + (up ? r * 0.06 : -r * 0.04), r * 0.17, up ? Math.PI * 1.1 : 0.2, up ? Math.PI * 1.9 : Math.PI - 0.2); ctx.lineWidth = r * 0.07; ctx.strokeStyle = outline; ctx.lineCap = 'round'; ctx.stroke(); };
    if (expr === 'blink') [-0.33, 0.33].forEach(s => closedEye(s, false));
    else if (expr === 'laugh') [-0.33, 0.33].forEach(s => closedEye(s, true));
    else if (expr === 'scared') [-0.33, 0.33].forEach(s => {
      ctx.beginPath(); ctx.ellipse(s * r, -r * 0.16, r * 0.26, r * 0.33, 0, 0, TAU); ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.lineWidth = r * 0.04; ctx.strokeStyle = outline; ctx.stroke();
      if (!noPupils) { ctx.beginPath(); ctx.arc(s * r + look * r * 0.05 - r * 0.04, -r * 0.14, r * 0.06, 0, TAU); ctx.fillStyle = '#1B1D2A'; ctx.fill(); }
    });
    else [[-0.33], [0.33]].forEach(([s]) => {
      ctx.beginPath(); ctx.ellipse(s * r, -r * 0.12, r * 0.22, r * 0.27, 0, 0, TAU); ctx.fillStyle = '#FFFFFF'; ctx.fill();
      ctx.lineWidth = r * 0.04; ctx.strokeStyle = outline; ctx.stroke();
      if (noPupils) return;
      ctx.beginPath(); ctx.arc(s * r + look * r * 0.08 - r * 0.06, -r * 0.08, r * 0.1, 0, TAU); ctx.fillStyle = '#1B1D2A'; ctx.fill();
      ctx.beginPath(); ctx.arc(s * r + look * r * 0.08 - r * 0.09, -r * 0.13, r * 0.035, 0, TAU); ctx.fillStyle = '#FFF'; ctx.fill();
    });
    // cejas: pícaras (normal/blink/laugh) o levantadas de susto
    ctx.strokeStyle = outline; ctx.lineWidth = r * 0.08; ctx.lineCap = 'round';
    if (expr === 'scared') { ctx.beginPath(); ctx.moveTo(-r * 0.55, -r * 0.55); ctx.lineTo(-r * 0.18, -r * 0.66); ctx.moveTo(r * 0.55, -r * 0.55); ctx.lineTo(r * 0.18, -r * 0.66); ctx.stroke(); }
    else { ctx.beginPath(); ctx.moveTo(-r * 0.55, -r * 0.47); ctx.lineTo(-r * 0.15, -r * 0.36); ctx.moveTo(r * 0.55, -r * 0.47); ctx.lineTo(r * 0.15, -r * 0.36); ctx.stroke(); }
    // nariz + bigotes
    ctx.beginPath(); ctx.ellipse(0, r * 0.18, r * 0.13, r * 0.1, 0, 0, TAU); ctx.fillStyle = rad(ctx, -r * 0.04, r * 0.14, 0, r * 0.14, [[0, '#FFB3C1'], [1, '#D9566E']]); ctx.fill();
    ctx.strokeStyle = 'rgba(40,45,60,0.7)'; ctx.lineWidth = r * 0.025;
    [-1, 1].forEach(s => [[-0.05], [0.08]].forEach(([dy]) => { ctx.beginPath(); ctx.moveTo(s * r * 0.18, r * (0.22 + dy)); ctx.lineTo(s * r * 0.85, r * (0.12 + dy * 2.2)); ctx.stroke(); }));
    // sonrisa con dientes
    if (expr === 'scared') { // boca en "O"
      ctx.beginPath(); ctx.ellipse(0, r * 0.45, r * 0.12, r * 0.15, 0, 0, TAU); ctx.fillStyle = '#3A1A26'; ctx.fill(); ctx.lineWidth = r * 0.045; ctx.strokeStyle = outline; ctx.stroke();
    } else if (expr === 'laugh') { // carcajada: boca abierta con lengua
      ctx.beginPath(); ctx.moveTo(-r * 0.3, r * 0.3); ctx.quadraticCurveTo(0, r * 0.32, r * 0.3, r * 0.3); ctx.quadraticCurveTo(r * 0.25, r * 0.72, 0, r * 0.72); ctx.quadraticCurveTo(-r * 0.25, r * 0.72, -r * 0.3, r * 0.3); ctx.closePath();
      ctx.fillStyle = '#5A1E2E'; ctx.fill(); ctx.lineWidth = r * 0.05; ctx.strokeStyle = outline; ctx.stroke();
      ctx.save(); ctx.clip(); ctx.beginPath(); ctx.ellipse(0, r * 0.7, r * 0.18, r * 0.14, 0, 0, TAU); ctx.fillStyle = '#F2788C'; ctx.fill(); ctx.restore();
      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(-r * 0.09, r * 0.31, r * 0.08, r * 0.1); ctx.fillRect(r * 0.01, r * 0.31, r * 0.08, r * 0.1);
    } else if (grin) {
      ctx.beginPath(); ctx.arc(0, r * 0.3, r * 0.22, 0.15, Math.PI - 0.15); ctx.lineWidth = r * 0.05; ctx.strokeStyle = outline; ctx.stroke();
      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(-r * 0.08, r * 0.45, r * 0.07, r * 0.1); ctx.fillRect(r * 0.01, r * 0.45, r * 0.07, r * 0.1);
    }
    // brillo de borde (rim light)
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.93, r * 0.85, 0, Math.PI * 1.1, Math.PI * 1.55); ctx.lineWidth = r * 0.06; ctx.strokeStyle = 'rgba(255,250,235,0.7)'; ctx.stroke();
    if (bruise >= 1) { // curita en el cachete
      ctx.save(); ctx.translate(r * 0.56, r * 0.2); ctx.rotate(0.65 + (bruise - 1) * 0.3);
      rr(ctx, -r * 0.24, -r * 0.08, r * 0.48, r * 0.16, r * 0.08); ctx.fillStyle = '#F2C79A'; ctx.fill(); ctx.lineWidth = r * 0.03; ctx.strokeStyle = '#8A5A34'; ctx.stroke();
      ctx.fillStyle = '#FBE6CC'; ctx.fillRect(-r * 0.07, -r * 0.065, r * 0.14, r * 0.13);
      ctx.fillStyle = 'rgba(138,90,52,0.5)'; for (const dx of [-0.17, -0.12, 0.12, 0.17]) { ctx.beginPath(); ctx.arc(dx * r, 0, r * 0.012, 0, TAU); ctx.fill(); }
      ctx.restore();
      if (bruise >= 2) { ctx.save(); ctx.translate(-r * 0.62, r * 0.32); ctx.rotate(-0.7); // segunda curita en cruz
        for (const a of [0, Math.PI / 2]) { ctx.save(); ctx.rotate(a); rr(ctx, -r * 0.18, -r * 0.06, r * 0.36, r * 0.12, r * 0.06); ctx.fillStyle = '#F2C79A'; ctx.fill(); ctx.lineWidth = r * 0.025; ctx.strokeStyle = '#8A5A34'; ctx.stroke(); ctx.restore(); }
        ctx.restore(); }
    }
    // gorros: con golpes se abollan y quedan chuecos
    const hatTilt = (x, y, f, dent = true) => { ctx.save(); ctx.translate(x, y); ctx.rotate(bruise >= 2 ? 0.28 : bruise ? 0.1 : 0); if (bruise >= 2) ctx.translate(r * 0.08, -r * 0.03); f(); if (bruise && dent) dents(ctx, r, bruise); ctx.restore(); };
    if (opt.hat === 'none') {} // perdió el gorro de un golpe (sale volando aparte)
    else if (opt.hat === 'miner') hatTilt(0, -r * 0.6, () => minerHat(ctx, 0, 0, r));
    else if (opt.hat === 'acorn') hatTilt(0, -r * 0.62, () => acornCap(ctx, 0, 0, r));
    else if (kind === 'thimble') hatTilt(0, -r * 0.62, () => thimble(ctx, 0, 0, r));
    if (kind === 'boss') hatTilt(0, -r * 0.82, () => crown(ctx, 0, 0, r), false); // la corona solo se ladea
    ctx.restore();
  }
  // abolladuras y grietas sobre un gorro (coordenadas locales del gorro, centro ~ (0, -0.25r))
  function dents(ctx, r, n) {
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.ellipse(r * 0.22, -r * 0.3, r * 0.13, r * 0.09, 0.4, 0, TAU); ctx.fillStyle = 'rgba(30,30,45,0.35)'; ctx.fill(); // hundido
    ctx.beginPath(); ctx.arc(r * 0.2, -r * 0.33, r * 0.11, Math.PI * 1.1, Math.PI * 1.7); ctx.lineWidth = r * 0.035; ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.stroke();
    const crack = pts => { ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x * r, y * r) : ctx.moveTo(x * r, y * r)); ctx.lineWidth = r * 0.04; ctx.strokeStyle = '#2B2F45'; ctx.stroke(); };
    crack([[0.22, -0.3], [0.08, -0.42], [0.12, -0.52]]);
    if (n >= 2) { crack([[0.22, -0.3], [0.4, -0.18], [0.36, -0.04]]); crack([[-0.35, -0.05], [-0.2, -0.2], [-0.26, -0.34], [-0.12, -0.46]]);
      ctx.beginPath(); ctx.ellipse(-r * 0.2, -r * 0.18, r * 0.1, r * 0.07, -0.3, 0, TAU); ctx.fillStyle = 'rgba(30,30,45,0.3)'; ctx.fill(); }
    ctx.restore();
  }
  // solo el gorro (el que sale volando cuando un ratón queda muy golpeado), con sus abolladuras
  function hat(ctx, x, y, r, which) { ctx.save(); ctx.translate(x, y); ({miner: minerHat, acorn: acornCap, thimble})[which](ctx, 0, 0, r); dents(ctx, r, 2); ctx.restore(); }
  function thimble(ctx, x, y, r) {
    ctx.save(); ctx.translate(x, y);
    ctx.beginPath(); ctx.moveTo(-r * 0.62, r * 0.18); ctx.quadraticCurveTo(-r * 0.62, -r * 0.62, 0, -r * 0.66); ctx.quadraticCurveTo(r * 0.62, -r * 0.62, r * 0.62, r * 0.18); ctx.closePath();
    ctx.fillStyle = lin(ctx, -r * 0.6, 0, r * 0.6, 0, [[0, '#6E7783'], [0.25, '#E9EEF3'], [0.45, '#FFFFFF'], [0.7, '#AAB4BF'], [1, '#59616C']]); ctx.fill();
    ctx.save(); ctx.clip(); ctx.fillStyle = 'rgba(60,65,75,0.35)';
    for (let yy = -r * 0.55; yy < r * 0.1; yy += r * 0.13) for (let xx = -r * 0.6; xx < r * 0.6; xx += r * 0.13) { ctx.beginPath(); ctx.arc(xx + ((yy / r * 7) % 2 ? r * 0.06 : 0), yy, r * 0.035, 0, TAU); ctx.fill(); }
    ctx.restore();
    ctx.lineWidth = r * 0.06; ctx.strokeStyle = '#2B2F45'; ctx.stroke();
    rr(ctx, -r * 0.68, r * 0.1, r * 1.36, r * 0.16, r * 0.08); ctx.fillStyle = lin(ctx, -r, 0, r, 0, [[0, '#7D8794'], [0.4, '#F2F5F8'], [1, '#69727E']]); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  // casco de minero (ratones de La Guarida): casco amarillo rayado y lamparita al frente (la luz va aparte, aditiva)
  function minerHat(ctx, x, y, r) {
    ctx.save(); ctx.translate(x, y); const o = '#2B2F45';
    ctx.beginPath(); ctx.ellipse(0, r * 0.16, r * 0.82, r * 0.17, 0, 0, TAU); // ala
    ctx.fillStyle = lin(ctx, 0, 0, 0, r * 0.32, [[0, '#F7C934'], [1, '#B98512']]); ctx.fill(); ctx.lineWidth = r * 0.06; ctx.strokeStyle = o; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-r * 0.6, r * 0.14); ctx.bezierCurveTo(-r * 0.62, -r * 0.62, r * 0.62, -r * 0.62, r * 0.6, r * 0.14); ctx.closePath(); // domo
    ctx.fillStyle = lin(ctx, -r * 0.6, 0, r * 0.6, 0, [[0, '#C98E10'], [0.3, '#FFE36A'], [0.5, '#FFD23A'], [1, '#A86F08']]); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-r * 0.07, -r * 0.44); ctx.lineTo(r * 0.07, -r * 0.44); ctx.lineTo(r * 0.09, r * 0.1); ctx.lineTo(-r * 0.09, r * 0.1); ctx.closePath(); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fill(); // cresta
    ctx.beginPath(); ctx.ellipse(-r * 0.28, -r * 0.2, r * 0.1, r * 0.2, -0.5, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fill(); // brillo
    rr(ctx, -r * 0.2, -r * 0.2, r * 0.4, r * 0.3, r * 0.08); ctx.fillStyle = lin(ctx, 0, -r * 0.2, 0, r * 0.1, [[0, '#7A8290'], [1, '#3D434F']]); ctx.fill(); ctx.lineWidth = r * 0.05; ctx.stroke(); // lámpara
    ctx.beginPath(); ctx.arc(0, -r * 0.05, r * 0.12, 0, TAU); ctx.fillStyle = rad(ctx, 0, -r * 0.05, 0, r * 0.12, [[0, '#FFFFFF'], [0.6, '#FFF2A0'], [1, '#FFC23A']]); ctx.fill(); ctx.lineWidth = r * 0.035; ctx.stroke();
    ctx.restore();
  }
  // gorrito de bellota (ratones del Jardín): cúpula café con escamas en rombo, palito y una hojita
  function acornCap(ctx, x, y, r) {
    ctx.save(); ctx.translate(x, y - r * 0.06); ctx.rotate(-0.14); ctx.scale(1.22, 1.22); const o = '#2B2F45';
    ctx.beginPath(); ctx.moveTo(-r * 0.66, r * 0.16); ctx.bezierCurveTo(-r * 0.7, -r * 0.5, r * 0.7, -r * 0.5, r * 0.66, r * 0.16); ctx.quadraticCurveTo(0, r * 0.3, -r * 0.66, r * 0.16); ctx.closePath();
    ctx.fillStyle = lin(ctx, -r * 0.6, -r * 0.4, r * 0.5, r * 0.2, [[0, '#C08A4E'], [0.5, '#8E5B2C'], [1, '#5C3818']]); ctx.fill();
    ctx.save(); ctx.clip(); ctx.strokeStyle = 'rgba(50,28,10,0.45)'; ctx.lineWidth = r * 0.035;
    for (let i = -6; i <= 6; i++) { ctx.beginPath(); ctx.moveTo(i * r * 0.16 - r * 0.5, r * 0.3); ctx.lineTo(i * r * 0.16 + r * 0.5, -r * 0.6); ctx.stroke(); ctx.beginPath(); ctx.moveTo(i * r * 0.16 + r * 0.5, r * 0.3); ctx.lineTo(i * r * 0.16 - r * 0.5, -r * 0.6); ctx.stroke(); }
    ctx.beginPath(); ctx.ellipse(-r * 0.25, -r * 0.18, r * 0.16, r * 0.09, -0.4, 0, TAU); ctx.fillStyle = 'rgba(255,230,190,0.35)'; ctx.fill(); ctx.restore();
    ctx.lineWidth = r * 0.06; ctx.strokeStyle = o; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -r * 0.34); ctx.quadraticCurveTo(r * 0.04, -r * 0.5, r * 0.13, -r * 0.56); ctx.lineWidth = r * 0.11; ctx.lineCap = 'round'; ctx.strokeStyle = o; ctx.stroke(); ctx.lineWidth = r * 0.055; ctx.strokeStyle = '#7A4C22'; ctx.stroke(); // palito
    ctx.beginPath(); ctx.moveTo(r * 0.1, -r * 0.5); ctx.quadraticCurveTo(r * 0.45, -r * 0.78, r * 0.62, -r * 0.48); ctx.quadraticCurveTo(r * 0.38, -r * 0.3, r * 0.1, -r * 0.5); ctx.closePath(); // hojita
    ctx.fillStyle = lin(ctx, r * 0.1, -r * 0.7, r * 0.6, -r * 0.4, [[0, '#9BE05A'], [1, '#4E9A2A']]); ctx.fill(); ctx.lineWidth = r * 0.045; ctx.strokeStyle = o; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(r * 0.14, -r * 0.5); ctx.quadraticCurveTo(r * 0.38, -r * 0.56, r * 0.56, -r * 0.5); ctx.lineWidth = r * 0.02; ctx.strokeStyle = 'rgba(30,70,20,0.6)'; ctx.stroke();
    ctx.restore();
  }
  function crown(ctx, x, y, r) {
    ctx.save(); ctx.translate(x, y);
    ctx.beginPath(); ctx.moveTo(-r * 0.5, r * 0.15); ctx.lineTo(-r * 0.55, -r * 0.35); ctx.lineTo(-r * 0.25, -r * 0.1); ctx.lineTo(0, -r * 0.45); ctx.lineTo(r * 0.25, -r * 0.1); ctx.lineTo(r * 0.55, -r * 0.35); ctx.lineTo(r * 0.5, r * 0.15); ctx.closePath();
    ctx.fillStyle = lin(ctx, 0, -r * 0.45, 0, r * 0.15, [[0, '#FFF1A8'], [0.5, '#F4C430'], [1, '#B8860B']]); ctx.fill();
    ctx.lineWidth = r * 0.05; ctx.strokeStyle = '#6B4A0C'; ctx.stroke();
    ctx.restore();
  }

  // ---------- GATOS ----------
  // Construye un sprite (canvas) del gato: cuerpo procedural + cara real recortada + contorno compartido + luz.
  // img: cutout con alfa. fur: [claro, medio, oscuro]. expr: 'angry' | 'calm' | 'sleepy'
  // Párpados cerrados sobre la foto real: se copia un parche del pelo de la frente (encima del ojo),
  // se pega sobre el ojo con borde difuminado y se dibuja la línea curva de las pestañas.
  function blinkLids(g, img, eyes, hx, hy, hw, hh) {
    const [[x0, y0], [x1, y1]] = eyes, sep = Math.hypot((x1 - x0) * hw, (y1 - y0) * hh), ang = Math.atan2((y1 - y0) * hh, (x1 - x0) * hw);
    const rx = sep * 0.25, ry = sep * 0.16, W = Math.ceil(rx * 2.6), H = Math.ceil(ry * 2.6), sx = img.width / hw, sy = img.height / hh;
    eyes.forEach(([ex, ey]) => {
      const pc = document.createElement('canvas'); pc.width = W; pc.height = H; const k = pc.getContext('2d');
      // parche de la frente: mismo tamaño, desplazado hacia arriba (perpendicular a la línea de los ojos)
      const ox = ex * hw + Math.sin(ang) * ry * 2.1, oy = ey * hh - Math.cos(ang) * ry * 2.1;
      k.translate(W / 2, H / 2); k.rotate(-ang);
      k.drawImage(img, (ox - W) * sx, (oy - H) * sy, W * 2 * sx, H * 2 * sy, -W, -H, W * 2, H * 2);
      k.setTransform(1, 0, 0, 1, 0, 0);
      // máscara elíptica difuminada
      k.globalCompositeOperation = 'destination-in'; k.translate(W / 2, H / 2); k.scale(1, ry / rx);
      const m = k.createRadialGradient(0, 0, 0, 0, 0, rx * 1.2); m.addColorStop(0, '#000'); m.addColorStop(0.72, '#000'); m.addColorStop(1, 'rgba(0,0,0,0)');
      k.fillStyle = m; k.fillRect(-W, -H * 4, W * 2, H * 8);
      // sombrita bajo el párpado (le da volumen)
      k.setTransform(1, 0, 0, 1, 0, 0); k.globalCompositeOperation = 'source-atop';
      k.fillStyle = lin(k, 0, H * 0.3, 0, H * 0.75, [[0, 'rgba(40,25,15,0)'], [1, 'rgba(40,25,15,0.35)']]); k.fillRect(0, 0, W, H);
      g.save(); g.translate(hx + ex * hw, hy + ey * hh); g.rotate(ang);
      g.drawImage(pc, -W / 2, -H / 2);
      g.lineCap = 'round'; g.strokeStyle = 'rgba(30,18,10,0.85)'; g.lineWidth = Math.max(2, sep * 0.04);
      g.beginPath(); g.moveTo(-rx * 0.9, ry * 0.05); g.quadraticCurveTo(0, ry * 0.7, rx * 0.9, ry * 0.05); g.stroke();
      g.restore();
    });
  }
  function buildCatSprite(img, fur, size, expr, eyes) {
    // El gato ES su cabeza (como los pájaros de AB): cara real recortada + cola y patitas + contorno compartido + luz.
    const S = size, hw = S, hh = hw * img.height / img.width, pad = S * 0.16;
    const cw = hw + pad * 2 + S * 0.25, ch = hh + pad * 2 + S * 0.1;
    const c = document.createElement('canvas'); c.width = cw; c.height = ch; const g = c.getContext('2d');
    const hx = pad, hy = pad, cx = hx + hw / 2, base = hy + hh;
    const extras = (k, solid) => {
      k.save(); k.lineCap = 'round';
      // cola detrás, saliendo abajo-derecha
      k.lineWidth = S * 0.13; k.strokeStyle = solid || lin(k, cx, base, cx + S * 0.7, base - S * 0.5, [[0, fur[1]], [1, fur[2]]]);
      k.beginPath(); k.moveTo(cx + hw * 0.3, base - hh * 0.12); k.bezierCurveTo(cx + hw * 0.62, base - hh * 0.05, cx + hw * 0.72, base - hh * 0.45, cx + hw * 0.6, base - hh * 0.62); k.stroke();
      k.restore();
    };
    const paws = (k, solid) => {
      [[-0.2], [0.2]].forEach(([sx]) => { k.beginPath(); k.ellipse(cx + sx * hw, base - S * 0.02, S * 0.12, S * 0.075, 0, 0, TAU);
        k.fillStyle = solid || lin(k, 0, base - S * 0.1, 0, base + S * 0.05, [[0, fur[0]], [1, fur[1]]]); k.fill();
        if (!solid) { k.strokeStyle = 'rgba(60,40,25,0.45)'; k.lineWidth = S * 0.012; [-0.04, 0, 0.04].forEach(dx => { k.beginPath(); k.moveTo(cx + sx * hw + dx * S, base - S * 0.05); k.lineTo(cx + sx * hw + dx * S, base); k.stroke(); }); } });
    };
    const sil = document.createElement('canvas'); sil.width = cw; sil.height = ch; const s = sil.getContext('2d');
    s.drawImage(img, hx, hy, hw, hh); paws(s, '#000');
    const ol = Math.max(3, S * 0.03);
    const tint = document.createElement('canvas'); tint.width = cw; tint.height = ch; const t = tint.getContext('2d');
    t.drawImage(sil, 0, 0); t.globalCompositeOperation = 'source-in'; t.fillStyle = '#3A2414'; t.fillRect(0, 0, cw, ch);
    for (let a = 0; a < 20; a++) g.drawImage(tint, Math.cos(a / 20 * TAU) * ol, Math.sin(a / 20 * TAU) * ol);
    g.drawImage(img, hx, hy, hw, hh); paws(g);
    if (expr === 'blink' && eyes) blinkLids(g, img, eyes, hx, hy, hw, hh);
    // sombreado del mundo (luz arriba-izq, sombra fría abajo-der), solo sobre el sprite
    g.save(); g.globalCompositeOperation = 'source-atop';
    g.fillStyle = rad(g, hx + hw * 0.3, hy + hh * 0.25, S * 0.1, S * 0.95, [[0, 'rgba(255,238,205,0.16)'], [0.55, 'rgba(255,238,205,0)'], [1, 'rgba(45,30,80,0.42)']]); g.fillRect(0, 0, cw, ch);
    g.restore();
    // rim light en el borde que mira a la luz
    const rim = document.createElement('canvas'); rim.width = cw; rim.height = ch; const rk = rim.getContext('2d');
    rk.drawImage(sil, 0, 0); rk.globalCompositeOperation = 'source-in'; rk.fillStyle = '#FFF4D7'; rk.fillRect(0, 0, cw, ch);
    rk.globalCompositeOperation = 'destination-out'; rk.drawImage(sil, ol * 1.3, ol * 1.5);
    g.save(); g.globalAlpha = 0.6; g.globalCompositeOperation = 'source-atop'; g.drawImage(rim, 0, 0); g.restore();
    if (expr === 'angry' && eyes) {
      g.save(); g.lineCap = 'round';
      eyes.forEach(([ex, ey], i) => {
        const px = hx + ex * hw, py = hy + ey * hh - S * 0.085, d = i === 0 ? 1 : -1;
        [['#FFF4D7', S * 0.06], ['#2A170B', S * 0.04]].forEach(([col, lw]) => { g.strokeStyle = col; g.lineWidth = lw;
          g.beginPath(); g.moveTo(px - d * S * 0.08, py - S * 0.04); g.lineTo(px + d * S * 0.06, py + S * 0.02); g.stroke(); });
      });
      g.restore();
    }
    return {canvas: c, ox: cx, oy: base + S * 0.05, cy: hy + hh * 0.55};
  }

  // ---------- RESORTERA (tenedor de madera) ----------
  function slingshotBack(ctx, x, y, h) {
    const w = h * 0.11;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const wood = (k, x0, y0, x1, y1, lw) => {
      k.lineWidth = lw + 6; k.strokeStyle = '#3E220E'; k.beginPath(); k.moveTo(x0, y0); k.lineTo(x1, y1); k.stroke();
      k.lineWidth = lw; k.strokeStyle = lin(k, x0 - lw, 0, x0 + lw, 0, [[0, '#E2A465'], [0.5, '#B8732F'], [1, '#7A4518']]); k.beginPath(); k.moveTo(x0, y0); k.lineTo(x1, y1); k.stroke();
    };
    wood(ctx, x, y, x, y - h * 0.55, w);           // mango
    wood(ctx, x, y - h * 0.5, x + h * 0.2, y - h, w * 0.8); // brazo trasero
    ctx.restore();
  }
  function slingshotFront(ctx, x, y, h) {
    const w = h * 0.11;
    ctx.save(); ctx.lineCap = 'round';
    ctx.lineWidth = w * 0.8 + 6; ctx.strokeStyle = '#3E220E'; ctx.beginPath(); ctx.moveTo(x, y - h * 0.5); ctx.lineTo(x - h * 0.2, y - h); ctx.stroke();
    ctx.lineWidth = w * 0.8; ctx.strokeStyle = lin(ctx, x - h * 0.25, 0, x, 0, [[0, '#F0B878'], [0.5, '#C07A35'], [1, '#7E4719']]); ctx.beginPath(); ctx.moveTo(x, y - h * 0.5); ctx.lineTo(x - h * 0.2, y - h); ctx.stroke();
    // trapo de cocina amarrado (cuadritos rojos)
    ctx.save(); ctx.translate(x, y - h * 0.5);
    rr(ctx, -w * 0.9, -w * 0.55, w * 1.8, w * 1.1, w * 0.3); ctx.fillStyle = '#F4F1EA'; ctx.fill(); ctx.clip();
    ctx.fillStyle = 'rgba(200,50,50,0.75)';
    for (let i = -3; i < 4; i++) { ctx.fillRect(i * w * 0.4, -w, w * 0.18, w * 2); ctx.fillRect(-w, i * w * 0.4, w * 2, w * 0.18); }
    ctx.restore();
    ctx.restore();
  }
  function band(ctx, x0, y0, x1, y1, w) {
    ctx.save(); ctx.lineCap = 'round'; ctx.lineWidth = w + 4; ctx.strokeStyle = '#2A1607'; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.lineWidth = w; ctx.strokeStyle = '#6B3A1A'; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.restore();
  }

  // ---------- UI ----------
  function strokedText(ctx, txt, x, y, size, fill = '#FFFFFF', align = 'center', font = 'Luckiest Guy') {
    ctx.save(); ctx.font = `${size}px "${font}"`; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    ctx.fillStyle = 'rgba(20,20,45,0.9)'; ctx.fillText(txt, x, y + size * 0.09);           // sombra dura
    ctx.lineWidth = size * 0.16; ctx.strokeStyle = '#1F2240'; ctx.strokeText(txt, x, y);
    ctx.fillStyle = typeof fill === 'string' ? fill : fill(ctx, y, size); ctx.fillText(txt, x, y);
    ctx.restore();
  }
  function button(ctx, x, y, w, h, top, bottom, icon) {
    ctx.save();
    rr(ctx, x, y + h * 0.1, w, h, h * 0.32); ctx.fillStyle = shade(bottom, -60); ctx.fill();           // base 3D
    rr(ctx, x, y, w, h, h * 0.32); ctx.fillStyle = lin(ctx, 0, y, 0, y + h, [[0, top], [1, bottom]]); ctx.fill();
    ctx.lineWidth = h * 0.07; ctx.strokeStyle = '#1F2240'; ctx.stroke();
    rr(ctx, x + w * 0.1, y + h * 0.08, w * 0.8, h * 0.36, h * 0.18); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fill(); // brillo
    if (icon) icon(ctx, x + w / 2, y + h / 2, h);
    ctx.restore();
  }
  function star(ctx, x, y, r, filled) {
    ctx.save(); ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? r * 0.48 : r; ctx.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); }
    ctx.closePath(); ctx.fillStyle = filled ? lin(ctx, 0, y - r, 0, y + r, [[0, '#FFF3A0'], [1, '#F2A900']]) : 'rgba(30,35,70,0.45)'; ctx.fill();
    ctx.lineWidth = r * 0.14; ctx.strokeStyle = '#1F2240'; ctx.stroke(); ctx.restore();
  }

  return {rr, lin, rad, rng, shade, contactShadow, cardboard, cuetes, jar, can, plank, pot, stone, robot, mouse, hat, buildCatSprite, slingshotBack, slingshotFront, band, strokedText, button, star, TAU};
})();

export default ART;
