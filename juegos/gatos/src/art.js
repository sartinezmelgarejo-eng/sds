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
    const {look = 1, grin = true} = opt;
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
    // ojos
    [[-0.33], [0.33]].forEach(([s]) => {
      ctx.beginPath(); ctx.ellipse(s * r, -r * 0.12, r * 0.22, r * 0.27, 0, 0, TAU); ctx.fillStyle = '#FFFFFF'; ctx.fill();
      ctx.lineWidth = r * 0.04; ctx.strokeStyle = outline; ctx.stroke();
      ctx.beginPath(); ctx.arc(s * r + look * r * 0.08 - r * 0.06, -r * 0.08, r * 0.1, 0, TAU); ctx.fillStyle = '#1B1D2A'; ctx.fill();
      ctx.beginPath(); ctx.arc(s * r + look * r * 0.08 - r * 0.09, -r * 0.13, r * 0.035, 0, TAU); ctx.fillStyle = '#FFF'; ctx.fill();
    });
    // cejas pícaras
    ctx.strokeStyle = outline; ctx.lineWidth = r * 0.08;
    ctx.beginPath(); ctx.moveTo(-r * 0.55, -r * 0.47); ctx.lineTo(-r * 0.15, -r * 0.36); ctx.moveTo(r * 0.55, -r * 0.47); ctx.lineTo(r * 0.15, -r * 0.36); ctx.stroke();
    // nariz + bigotes
    ctx.beginPath(); ctx.ellipse(0, r * 0.18, r * 0.13, r * 0.1, 0, 0, TAU); ctx.fillStyle = rad(ctx, -r * 0.04, r * 0.14, 0, r * 0.14, [[0, '#FFB3C1'], [1, '#D9566E']]); ctx.fill();
    ctx.strokeStyle = 'rgba(40,45,60,0.7)'; ctx.lineWidth = r * 0.025;
    [-1, 1].forEach(s => [[-0.05], [0.08]].forEach(([dy]) => { ctx.beginPath(); ctx.moveTo(s * r * 0.18, r * (0.22 + dy)); ctx.lineTo(s * r * 0.85, r * (0.12 + dy * 2.2)); ctx.stroke(); }));
    // sonrisa con dientes
    if (grin) {
      ctx.beginPath(); ctx.arc(0, r * 0.3, r * 0.22, 0.15, Math.PI - 0.15); ctx.lineWidth = r * 0.05; ctx.strokeStyle = outline; ctx.stroke();
      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(-r * 0.08, r * 0.45, r * 0.07, r * 0.1); ctx.fillRect(r * 0.01, r * 0.45, r * 0.07, r * 0.1);
    }
    // brillo de borde (rim light)
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.93, r * 0.85, 0, Math.PI * 1.1, Math.PI * 1.55); ctx.lineWidth = r * 0.06; ctx.strokeStyle = 'rgba(255,250,235,0.7)'; ctx.stroke();
    if (kind === 'thimble') thimble(ctx, 0, -r * 0.62, r);
    if (kind === 'boss') crown(ctx, 0, -r * 0.82, r);
    ctx.restore();
  }
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

  return {rr, lin, rad, rng, shade, contactShadow, cardboard, jar, can, mouse, buildCatSprite, slingshotBack, slingshotFront, band, strokedText, button, star, TAU};
})();

export default ART;
