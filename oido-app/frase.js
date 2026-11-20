// Oído en la mano · HOJA FRASE (editar una frase de la radio). Todo de mentira salvo el sonido (WebAudio).
// Usa lo de app.js en tiempo de ejecución (P, ui, esc, $, $$, guardar, confirmar, foto, aviso, render, seguir, modo…);
// app.js la engancha con Object.assign(ACC, FraseEd.acc) y Object.assign(PD, FraseEd.pd).
//
// Modelo de una frase (en P.frases; lo que falte lo pone `completar` de forma determinista):
//   n, nombre, color, c (largo en compases, para el cuadrito), est (estación de origen), pista (uid o nada)
//   real  = { tempo, uno }  ← lo que «de verdad» tiene el audio de mentira (para la onda y el sonido)
//   tempo = SU tempo (el detectado; se corrige con ↕, ×2, ÷2) · uno = segundo donde cae su «1»
//   iniB, finB = inicio y fin en TIEMPOS (negras) contados desde el «1»; pegados al compás = múltiplos de 4
//   cae = 'proy' (suena al tempo del proyecto) | 'suyo' · seco (sin los FX de la radio) · banda = todo|graves|medios|agudos
'use strict';

const FraseEd = (() => {
  const TEMPOS_REALES = [92.6, 123.4, 87.1, 101.3, 76.8, 128.2, 97.5, 110.4];
  const PROG = [0, -4, 5, 3]; // acordes de la radio de mentira (semitonos sobre La)
  const BANDAS = [['todo', 'TODO'], ['graves', 'GRAVES'], ['medios', 'MEDIOS'], ['agudos', 'AGUDOS']];
  const hash = x => { let h = (x * 2654435761) >>> 0; h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; h ^= h >>> 13; return h >>> 0; };
  const mod = (a, b) => ((a % b) + b) % b;
  const fmtT = t => (Math.abs(t - Math.round(t)) < 0.05 ? String(Math.round(t)) : t.toFixed(1).replace('.', ','));
  const fmtC = c => (Math.abs(c - Math.round(c)) < 0.01 ? String(Math.round(c)) : c.toFixed(1).replace('.', ','));

  let st = null;  // lo que suena: { n, src, tNext, anclas, timer }
  let G = null;   // grafo WebAudio de la frase

  // ---------- datos ----------
  function completar(f, est) {
    if (f.tempo) return f;
    const h = hash(f.n * 7919 + 13);
    const real = { tempo: TEMPOS_REALES[(f.n - 1) % TEMPOS_REALES.length], uno: 20 + (h % 500) / 100 };
    const error = (f.n % 2 ? 1 : -1) * (0.09 + (h % 13) / 100); // el detector se equivocó un poco con el «1»
    const tempo = f.n === 2 ? Math.round(real.tempo / 2 * 10) / 10 : Math.round(real.tempo); // la 2 salió a la mitad
    Object.assign(f, {
      est: est !== undefined ? est : (P.radio ? P.radio.estacion : 0), real, tempo, uno: real.uno + error,
      iniB: 0, finB: (f.c || 4) * 4, cae: 'proy', seco: P.radio ? !!P.radio.seco : false, banda: 'todo', pista: f.pista || null,
    });
    return f;
  }
  function frase(n) { const f = P.frases.find(x => x.n === n); return f ? completar(f) : null; }
  function actual() { return ui.frase ? frase(ui.frase) : null; }
  function geo(f) { const beat = 60 / f.tempo; return { beat, bar: 4 * beat, ini: f.uno + f.iniB * beat, fin: f.uno + f.finB * beat }; }
  function largo(f) { return (f.finB - f.iniB) / 4; }
  function largoTxt(f) {
    const b = f.finB - f.iniB, c = Math.floor(b / 4 + 1e-6), t = Math.round((b - c * 4) * 10) / 10;
    if (t < 0.05) return `${c} compás${c === 1 ? '' : 'es'}`;
    return (c ? `${c} c + ` : '') + `${fmtT(t)} tiempo${t === 1 ? '' : 's'} (libre)`;
  }
  function actualizarC(f) { f.c = Math.round(largo(f) * 100) / 100; }
  function normalizar(f) { // el «1» = la raya de compás en (o antes de) el inicio
    const k = Math.floor(f.iniB / 4 + 1e-6); if (!k) return;
    f.uno += k * 4 * 60 / f.tempo; f.iniB -= 4 * k; f.finB -= 4 * k;
  }
  function vista(f) {
    const g = geo(f), m = Math.max(g.bar * 0.6, (g.fin - g.ini) * 0.12);
    ui.frV = { n: f.n, a: g.ini - m, b: g.fin + m };
  }
  function pistaDe(f) {
    let p = f.pista && P.pistas.find(x => x.uid === f.pista);
    if (!p) p = P.pistas.find(x => x.nombre === f.nombre);
    if (!p) p = P.pistas.find(x => x.entrada === '📻 la radio') || P.pistas.find(x => x.tipo === 'AUDIO');
    return p || null;
  }
  // golpes del audio de mentira (corcheas del tempo REAL; el más fuerte cae en el «1» de verdad)
  function eventos(f, t0, t1) {
    const e = 30 / f.real.tempo, ru = f.real.uno, out = [];
    for (let k = Math.ceil((t0 - ru) / e - 1e-9); ru + k * e < t1; k++) {
      const t = ru + k * e, pos = mod(k, 8), bar = Math.floor(k / 8), h = hash(f.n * 131 + bar * 7 + 1000);
      const nota = PROG[mod(bar, 4)];
      if (pos === 0) { out.push({ t, tipo: 'bombo', a: 1 }); out.push({ t, tipo: 'acorde', a: 0.85, nota }); }
      else if (pos === 2 || pos === 6) out.push({ t, tipo: 'caja', a: pos === 6 ? 0.74 : 0.68 });
      else if (pos === 4) out.push({ t, tipo: 'bombo', a: 0.58 });
      else if (pos === 3) { if (h % 3) out.push({ t, tipo: 'bombo', a: 0.5 }); if (h % 2) out.push({ t, tipo: 'acorde', a: 0.4, nota }); }
      else out.push({ t, tipo: 'hat', a: pos === 7 ? 0.3 : 0.22 });
    }
    return out;
  }
  const DEC = { bombo: 0.2, caja: 0.13, hat: 0.035, acorde: 0.28 };

  // ---------- HTML ----------
  function html(lay) {
    const f = actual(); if (!f) return '';
    if (!ui.frV || ui.frV.n !== f.n) vista(f);
    const e = ESTACIONES[f.est] || ESTACIONES[0];
    return `<div class="frase lay-${lay}" data-frase="${f.n}">
      <div class="fr-cab"><span class="fr-num" style="--c:${f.color}">${f.n}</span>
        <button class="fr-nom" data-a="fr-renombrar" aria-label="cambiar el nombre">FRASE «${esc(f.nombre)}» <small>✎</small></button>
        <span class="fr-de">📻 ${esc(e.nombre)}</span>
        <button class="fr-x" data-a="fr-cerrar" aria-label="cerrar">✕</button></div>
      <div class="fr-onda" data-pd="fr-onda"><canvas class="base"></canvas><canvas class="fr-play-cv"></canvas></div>
      <div class="ayuda fr-ayuda"><b>INICIO</b> y <b>FIN</b>: arrástralos (se pegan al compás · <b>mantén</b> = libre y fino) · arrastra la <b>onda</b> ↔ = mover el <b style="color:var(--naranja)">«1»</b></div>
      <div class="fr-ctl">${controles(f)}</div>
      <div class="fr-barra">${barra(f)}</div>
    </div>`;
  }
  function controles(f) {
    const proy = P.tempo, t = fmtT(f.tempo), cae = f.cae === 'proy', L = largo(f);
    const seg = (items, cls = '') => `<div class="fr-seg ${cls}">${items.join('')}</div>`;
    const ren = ui.frRen ? `<div class="seccion-t"><span>NOMBRE</span></div><div class="fr-fila fr-ren"><input id="in-frase" value="${esc(f.nombre)}" maxlength="10" autocomplete="off" enterkeyhint="done"><button class="naranja" data-a="fr-nombre-ok">✓ LISTO</button></div>` : '';
    return `${ren}
      <div class="seccion-t"><span>TEMPO</span><span>arrastra ↕ · mantén = fino</span></div>
      <div class="fr-fila"><div class="fr-bpm" data-pd="fr-tempo"><span>♩ <span data-fr="tempo">${t}</span></span>${cae ? `<span class="flecha">→ ${proy}</span>` : ''}<small>↕</small></div>
        <button data-a="fr-x" data-v="0.5" aria-label="la mitad">÷2</button><button data-a="fr-x" data-v="2" aria-label="el doble">×2</button></div>
      <div class="seccion-t"><span>SUENA A</span></div>
      ${seg([`<button class="${cae ? '' : 'on'}" data-a="fr-cae" data-v="suyo">SU TEMPO<small>♩ ${t}, tal cual</small></button>`,
             `<button class="${cae ? 'on' : ''}" data-a="fr-cae" data-v="proy">AL PROYECTO<small>♩ ${proy}, con tu canción</small></button>`])}
      <div class="seccion-t"><span>LARGO</span><span data-fr="largo">${largoTxt(f)}</span></div>
      ${seg([1, 2, 4, 8].map(n => `<button class="${Math.abs(L - n) < 1e-6 ? 'on' : ''}" data-a="fr-largo" data-v="${n}">${n}<small>compás${n > 1 ? 'es' : ''}</small></button>`))}
      <div class="seccion-t"><span>SONIDO</span></div>
      ${seg([`<button class="${f.seco ? 'on' : ''}" data-a="fr-seco" data-v="1">SECO<small>sin los FX de la radio</small></button>`,
             `<button class="${f.seco ? '' : 'on'}" data-a="fr-seco" data-v="0">CON FX<small>como sonó</small></button>`])}
      <div class="seccion-t"><span>BANDA</span><span>qué parte del sonido</span></div>
      ${seg(BANDAS.map(([id, n]) => `<button class="${f.banda === id ? 'on' : ''}" data-a="fr-banda" data-v="${id}">${n}</button>`), 'cuatro')}
      <div class="fr-fila fr-fin"><button data-a="fr-renombrar">✎ NOMBRE</button><button data-a="fr-borrar">🗑 BORRAR FRASE</button></div>`;
  }
  function barra(f) {
    const p = pistaDe(f), on = st && st.n === f.n, c = Math.floor(compasActualCancion() / 4) + 1;
    return `<button class="fr-play ${on ? 'on' : ''}" data-a="fr-oir">${on ? '■ PARAR' : '▶ OÍR EN LOOP'}</button>
      <button class="fr-clic ${ui.frClic ? 'on' : ''}" data-a="fr-clic" aria-label="clic del compás">CLIC</button>
      ${p ? `<button class="fr-pista" style="--c:${p.color}" data-a="fr-pista">→ PISTA ${esc(p.nombre)}<small>en el compás ${c}</small></button>` : '<button class="fr-pista" disabled>sin pista</button>'}`;
  }
  function refrescar(soloOnda) {
    const f = actual(), box = $('.frase'); if (!f || !box) return;
    if (!soloOnda) {
      const ctl = $('.fr-ctl', box), sc = ctl.scrollTop; ctl.innerHTML = controles(f); ctl.scrollTop = sc;
      $('.fr-barra', box).innerHTML = barra(f);
      $$(`.frases [data-v="${f.n}"] small`).forEach(s => s.textContent = fmtC(f.c) + ' c · ✎');
    }
    dibujar();
  }
  function cuadritos() {
    return `<div class="frases">${P.frases.map(f => `<button class="${ui.frase === f.n ? 'elegida' : ''}" style="--c:${f.color}" data-a="frase" data-v="${f.n}">${f.n} · ${esc(f.nombre)}<small>${fmtC(f.c)} c · ✎</small></button>`).join('')}</div>`;
  }

  // ---------- dibujo ----------
  const RUL = 26, BOT = 40, TAB = 64;
  function medidas(box) {
    const r = box.getBoundingClientRect(), v = ui.frV;
    return { r, W: r.width, H: r.height, sx: (v.b - v.a) / r.width, X: t => (t - v.a) / ((v.b - v.a) / r.width) };
  }
  function rr(g, x, y, w, h, rad) { g.beginPath(); g.moveTo(x + rad, y); g.arcTo(x + w, y, x + w, y + h, rad); g.arcTo(x + w, y + h, x, y + h, rad); g.arcTo(x, y + h, x, y, rad); g.arcTo(x, y, x + w, y, rad); g.closePath(); }
  function dibujar() {
    const box = $('.fr-onda'), f = actual(); if (!box || !f) return;
    if (!ui.frV || ui.frV.n !== f.n) vista(f);
    const { W, H, sx, X } = medidas(box); if (W < 10) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    $$('canvas', box).forEach(c => { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); });
    const g = $('canvas.base', box).getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const v = ui.frV, G2 = geo(f), top = RUL, bot = H - BOT, mid = (top + bot) / 2, amp = (bot - top) / 2 - 6;
    const xi = X(G2.ini), xf = X(G2.fin);
    g.fillStyle = '#fbf8f2'; g.fillRect(0, 0, W, H);
    g.fillStyle = f.color; g.fillRect(xi, top, xf - xi, bot - top);
    g.fillStyle = '#efe8da'; g.fillRect(0, 0, W, RUL); g.fillRect(0, bot, W, BOT);
    // onda (envolvente de los golpes de mentira)
    const env = new Float32Array(Math.ceil(W) + 1);
    eventos(f, v.a - 0.5, v.b).forEach(e => {
      const d = DEC[e.tipo], a = (e.tipo === 'acorde' ? e.a * 0.55 : e.a) ** 2; // al cuadrado: el golpe fuerte se ve
      for (let x = Math.max(0, Math.ceil(X(e.t))); x < env.length; x++) {
        const dt = v.a + x * sx - e.t; if (dt > d * 5) break;
        const y = a * Math.exp(-dt / d); if (y > env[x]) env[x] = y;
      }
    });
    for (let x = 0; x < W; x += 2) {
      const t = v.a + x * sx, ruido = 0.04 + (hash(Math.floor(t * 300)) % 100) / 1600;
      const y = Math.min(1, Math.max(env[x], env[x + 1] || 0) + ruido) * amp;
      g.fillStyle = x >= xi && x <= xf ? '#2a2723' : '#b9b1a3'; g.fillRect(x, mid - y, 1.6, y * 2);
    }
    // rejilla del compás (a SU tempo, desde el «1»)
    g.font = '700 12px ui-monospace, Menlo, monospace'; g.textBaseline = 'middle';
    const k0 = Math.ceil((v.a - f.uno) / G2.beat), k1 = Math.floor((v.b - f.uno) / G2.beat);
    for (let k = k0; k <= k1; k++) {
      const x = X(f.uno + k * G2.beat);
      if (mod(k, 4)) { g.fillStyle = 'rgba(29,29,29,.18)'; g.fillRect(x - 0.5, top, 1, bot - top); continue; }
      const c = k / 4 - Math.floor(f.iniB / 4 + 1e-6) + 1, dentro = x >= xi - 1 && x < xf - 4;
      if (k === 0) continue; // el «1» se dibuja encima
      g.fillStyle = dentro ? '#1d1d1d' : '#a29a8b'; g.fillRect(x - 1, 0, 2, bot);
      if (dentro) g.fillText(String(c), x + 5, RUL / 2 + 1);
    }
    // el «1»
    const xu = X(f.uno);
    if (xu > -40 && xu < W + 40) {
      g.fillStyle = '#ff4a14'; g.fillRect(xu - 1.5, 0, 3, bot);
      rr(g, xu - 2, 3, 38, RUL - 6, 6); g.fill();
      g.fillStyle = '#fff'; g.fillText('«1»', xu + 4, RUL / 2 + 1);
    }
    // asas INICIO / FIN
    [[xi, 'INICIO', 1], [xf, 'FIN', -1]].forEach(([x, n, lado]) => {
      const activa = ui.frDrag && ui.frDrag.que === (lado > 0 ? 'ini' : 'fin');
      g.fillStyle = activa ? '#4f86c6' : '#1d1d1d'; g.fillRect(x - 2, top, 4, bot - top + 4);
      const tx = lado > 0 ? x - 2 : x + 2 - TAB; rr(g, tx, bot + 4, TAB, BOT - 8, 8); g.fill();
      g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText((lado > 0 ? '◀ ' : '') + n + (lado < 0 ? ' ▶' : ''), tx + TAB / 2, bot + BOT / 2); g.textAlign = 'left';
    });
    // rótulo del gesto
    if (ui.frDrag) {
      const d = ui.frDrag, txt = (d.que === 'uno' ? '«1»' : d.que === 'ini' ? 'INICIO' : 'FIN') + (d.fino ? ' · LIBRE, fino' : d.que === 'uno' ? ' · se pega al golpe' : ' · al compás');
      g.font = '700 13px ui-monospace, Menlo, monospace'; const w = Math.min(W - 12, g.measureText(txt).width + 16);
      g.fillStyle = d.fino ? '#4f86c6' : '#1d1d1d'; rr(g, W - w - 6, top + 6, w, 26, 7); g.fill();
      g.fillStyle = '#fff'; g.fillText(txt, W - w + 2, top + 19);
    }
    dibujarCabezal();
  }
  function dibujarCabezal() {
    const box = $('.fr-onda'), cv = box && $('canvas.fr-play-cv', box), f = actual(); if (!cv || !f) return;
    const g = cv.getContext('2d'), dpr = cv.width / Math.max(1, box.getBoundingClientRect().width);
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
    if (!st || st.n !== f.n || !Sonido.ctx) return;
    const src = srcAhora(); if (src === null) return;
    const { X, H } = medidas(box), x = X(src);
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.fillStyle = '#4f86c6'; g.fillRect(x - 1.5, RUL, 3, H - RUL - BOT);
    g.beginPath(); g.moveTo(x - 7, RUL); g.lineTo(x + 7, RUL); g.lineTo(x, RUL + 9); g.fill();
  }

  // ---------- gestos ----------
  const pd = {
    'fr-onda'(e, el) {
      e.preventDefault();
      const f = actual(); if (!f) return;
      const { r, sx, X, H } = medidas(el), x = e.clientX - r.left, y = e.clientY - r.top, G0 = geo(f);
      const xi = X(G0.ini), xf = X(G0.fin);
      let que = 'uno';
      if (y > H - BOT && x >= xi - 4 && x <= xi + TAB) que = 'ini';
      else if (y > H - BOT && x <= xf + 4 && x >= xf - TAB) que = 'fin';
      else if (Math.min(Math.abs(x - xi), Math.abs(x - xf)) < 30) que = Math.abs(x - xi) <= Math.abs(x - xf) ? 'ini' : 'fin';
      const s0 = foto(), base = { iniB: f.iniB, finB: f.finB, uno: f.uno }, v = ui.frV;
      let movio = false, x0 = e.clientX;
      ui.frDrag = { que, fino: false }; dibujar();
      const tm = setTimeout(() => { if (!movio && ui.frDrag) { ui.frDrag.fino = true; dibujar(); } }, 420);
      seguir(e, ev => {
        const dx = ev.clientX - x0;
        if (!movio && Math.abs(dx) > 6) { movio = true; clearTimeout(tm); }
        if (!movio) return;
        const fino = ui.frDrag.fino, dsec = dx * sx * (fino ? 0.25 : 1);
        if (que === 'uno') {
          let u = base.uno + dsec;
          if (!fino) { const rb = 60 / f.real.tempo, t = f.real.uno + Math.round((u - f.real.uno) / rb) * rb; if (Math.abs(t - u) < 14 * sx) u = t; }
          f.uno = u;
        } else {
          const beat = 60 / f.tempo, k = que === 'ini' ? 'iniB' : 'finB';
          let b = base[k] + dsec / beat;
          b = clamp(b, (v.a - f.uno) / beat, (v.b - f.uno) / beat);
          if (!fino) b = Math.round(b / 4) * 4;
          const min = fino ? 0.25 : 4;
          if (que === 'ini') b = Math.min(b, f.finB - min); else b = Math.max(b, f.iniB + min);
          f[k] = b;
        }
        actualizarC(f); dibujar();
        const l = $('[data-fr="largo"]'); if (l) l.textContent = largoTxt(f);
      }, () => {
        clearTimeout(tm); ui.frDrag = null;
        if (que === 'uno') normalizar(f); else if (que === 'ini') normalizar(f);
        vista(f); confirmar(s0); refrescar();
      });
    },
    'fr-tempo'(e, el) {
      e.preventDefault();
      const f = actual(); if (!f) return;
      const s0 = foto(), y0 = e.clientY, t0 = f.tempo; let movio = false, fino = false;
      el.classList.add('apretado');
      const tm = setTimeout(() => { if (!movio) { fino = true; el.classList.add('fino'); } }, 420);
      seguir(e, ev => {
        const dy = y0 - ev.clientY;
        if (!movio && Math.abs(dy) > 5) { movio = true; clearTimeout(tm); }
        if (!movio) return;
        f.tempo = clamp(fino ? Math.round((t0 + dy / 8 * 0.1) * 10) / 10 : Math.round(t0 + dy / 8), 30, 300);
        const s = $('[data-fr="tempo"]'); if (s) s.textContent = fmtT(f.tempo);
        dibujar();
      }, () => { clearTimeout(tm); el.classList.remove('apretado', 'fino'); vista(f); confirmar(s0); refrescar(); });
    },
  };

  // ---------- acciones (toques) ----------
  function con(fn) { return (v, el) => { const f = actual(); if (f) fn(f, v, el); }; }
  const acc = {
    'fr-cerrar'() { if (modo() === 'tablet') { parar(); ui.frase = null; ui.frRen = false; render(); } else cerrarHoja(); },
    'fr-x': con((f, v) => {
      const k = +v, t = clamp(Math.round(f.tempo * k * 10) / 10, 30, 300); if (t === f.tempo) return;
      guardar(); const r = t / f.tempo; f.tempo = t; f.iniB *= r; f.finB *= r; normalizar(f); actualizarC(f); vista(f); refrescar();
      aviso(`♩ ${fmtT(t)} · la misma onda, ahora ${largoTxt(f)}`);
    }),
    'fr-cae': con((f, v) => { if (f.cae === v) return; guardar(); f.cae = v; refrescar(); aviso(v === 'proy' ? `Suena a ♩ ${P.tempo}, cae con tu canción` : `Suena a SU tempo (♩ ${fmtT(f.tempo)})`); }),
    'fr-largo': con((f, v) => { guardar(); f.finB = f.iniB + +v * 4; actualizarC(f); vista(f); refrescar(); }),
    'fr-seco': con((f, v) => { guardar(); f.seco = v === '1'; refrescar(); if (st) aplicarGrafo(f); }),
    'fr-banda': con((f, v) => { guardar(); f.banda = v; refrescar(); if (st) aplicarGrafo(f); }),
    'fr-oir': con(f => { if (st && st.n === f.n) parar(); else oir(f); refrescar(true); const b = $('.fr-barra'); if (b) b.innerHTML = barra(f); }),
    'fr-clic': con(f => { ui.frClic = !ui.frClic; const b = $('.fr-barra'); if (b) b.innerHTML = barra(f); }),
    'fr-pista': con(f => {
      const p = pistaDe(f); if (!p) return;
      guardar();
      const c = Math.floor(compasActualCancion() / 4) + 1, n = Math.max(1, Math.ceil(f.c - 1e-6));
      p.regiones = p.regiones || []; p.regiones.push([c, Math.min(c + n - 1, COMPASES_CANCION), f.nombre]);
      if (modo() === 'tablet') { const c0 = $('.fr-ctl'), sc = c0 ? c0.scrollTop : 0; render(); const c1 = $('.fr-ctl'); if (c1) c1.scrollTop = sc; }
      aviso(`→ ${p.nombre}: «${f.nombre}» en el compás ${c}`, true);
    }),
    'fr-renombrar': con(() => {
      ui.frRen = true; refrescar();
      const ctl = $('.fr-ctl'); if (ctl) ctl.scrollTop = 0;
      const i = $('#in-frase'); if (i) { i.focus(); i.select(); }
    }),
    'fr-nombre-ok': con(f => {
      const i = $('#in-frase'), n = ((i && i.value) || '').trim().toUpperCase().slice(0, 10);
      if (i) i.blur();
      if (n && n !== f.nombre) { guardar(); f.nombre = n; }
      ui.frRen = false; render();
    }),
    'fr-borrar': con(f => {
      guardar(); P.frases.splice(P.frases.indexOf(f), 1);
      parar(); ui.frase = null; ui.frRen = false; if (ui.hoja && ui.hoja.tipo === 'frase') ui.hoja = null;
      render(); aviso(`🗑 frase ${f.n} «${f.nombre}» borrada`, true);
    }),
  };

  function abrir(n) {
    const f = frase(n); if (!f) return;
    if (st && st.n !== n) parar();
    ui.frase = n; ui.frRen = false; vista(f);
    if (modo() === 'tablet') { ui.plug = null; render(); return; }
    $$('.aviso').forEach(e => e.remove()); ui.hoja = { tipo: 'frase' }; render();
  }

  // ---------- sonido (WebAudio: la frase de mentira en loop) ----------
  function grafo() {
    const ctx = Sonido.ctx; if (!ctx) return null;
    if (G && G.ctx === ctx) return G;
    const n = {
      ctx, bus: ctx.createGain(), banda: ctx.createBiquadFilter(), seco: ctx.createGain(), fx: ctx.createGain(),
      lp: ctx.createBiquadFilter(), sh: ctx.createWaveShaper(), del: ctx.createDelay(2), fb: ctx.createGain(), delW: ctx.createGain(),
      out: ctx.createGain(), comp: ctx.createDynamicsCompressor(), clic: ctx.createGain(), k3: -1,
    };
    n.out.gain.value = 0.5; n.clic.gain.value = 0.35; n.lp.type = 'lowpass'; n.delW.gain.value = 0.5;
    n.bus.connect(n.banda); n.banda.connect(n.seco); n.banda.connect(n.lp); n.lp.connect(n.sh); n.sh.connect(n.fx);
    n.seco.connect(n.out); n.fx.connect(n.out); n.fx.connect(n.del); n.del.connect(n.fb); n.fb.connect(n.del); n.del.connect(n.delW); n.delW.connect(n.out);
    n.out.connect(n.comp); n.clic.connect(n.comp); n.comp.connect(ctx.destination);
    n.ruido = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = n.ruido.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    G = n; return G;
  }
  function aplicarGrafo(f) {
    const n = grafo(); if (!n) return;
    const t = n.ctx.currentTime, k = P.radio.k, b = n.banda;
    const tipo = { todo: 'allpass', graves: 'lowpass', medios: 'bandpass', agudos: 'highpass' }[f.banda] || 'allpass';
    b.type = tipo; b.frequency.setValueAtTime({ todo: 1000, graves: 250, medios: 1000, agudos: 4000 }[f.banda] || 1000, t); b.Q.value = f.banda === 'medios' ? 0.5 : 0.7;
    n.seco.gain.setTargetAtTime(f.seco ? 1 : 0, t, 0.02); n.fx.gain.setTargetAtTime(f.seco ? 0 : 0.9, t, 0.02);
    n.lp.frequency.setTargetAtTime(400 * Math.pow(30, k[0]), t, 0.05);
    n.fb.gain.setTargetAtTime(0.15 + 0.5 * k[1], t, 0.05);
    n.del.delayTime.setTargetAtTime(Math.min(1.9, 0.75 * 60 / (f.cae === 'proy' ? P.tempo : f.tempo)), t, 0.05);
    if (Math.abs(n.k3 - k[3]) > 0.01) {
      n.k3 = k[3]; const a = 1 + k[3] * 30, c = new Float32Array(1024);
      for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; c[i] = Math.tanh(a * x) / Math.tanh(a); }
      n.sh.curve = c;
    }
  }
  function voz(e, cuando) {
    const n = G, ctx = n.ctx, g = ctx.createGain(); g.connect(n.bus);
    const env = (pico, dec, a = 0.002) => { g.gain.setValueAtTime(0.0001, cuando); g.gain.exponentialRampToValueAtTime(pico, cuando + a); g.gain.exponentialRampToValueAtTime(0.0001, cuando + a + dec); };
    const osc = (tipo, fr, dur) => { const o = ctx.createOscillator(); o.type = tipo; o.frequency.setValueAtTime(fr, cuando); o.start(cuando); o.stop(cuando + dur + 0.05); return o; };
    const ruido = dur => { const s = ctx.createBufferSource(); s.buffer = n.ruido; s.loop = true; s.start(cuando, Math.random() * 0.5); s.stop(cuando + dur + 0.05); return s; };
    if (e.tipo === 'bombo') { const o = osc('sine', 150, 0.35); o.frequency.exponentialRampToValueAtTime(48, cuando + 0.12); o.connect(g); env(e.a * 0.9, 0.3); }
    else if (e.tipo === 'caja') { const s = ruido(0.2), f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1900; f.Q.value = 0.8; s.connect(f); f.connect(g); const o = osc('triangle', 185, 0.1); o.connect(g); env(e.a * 0.55, 0.16); }
    else if (e.tipo === 'hat') { const s = ruido(0.06), f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7500; s.connect(f); f.connect(g); env(e.a * 0.5, 0.04, 0.001); }
    else if (e.tipo === 'acorde') {
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1800; f.connect(g);
      [0, 3, 7, 12].forEach(s => { const o = osc('sawtooth', 220 * Math.pow(2, (e.nota + s) / 12), 0.6); const go = ctx.createGain(); go.gain.value = 0.16; o.connect(go); go.connect(f); });
      const b = osc('sine', 55 * Math.pow(2, e.nota / 12), 0.6); b.connect(g);
      env(e.a * 0.5, 0.45, 0.006);
    }
  }
  function clicA(cuando, fuerte) {
    const ctx = G.ctx, o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'square'; o.frequency.value = fuerte ? 1800 : 1100;
    o.connect(g); g.connect(G.clic); g.gain.setValueAtTime(0.0001, cuando); g.gain.exponentialRampToValueAtTime(fuerte ? 0.5 : 0.25, cuando + 0.001); g.gain.exponentialRampToValueAtTime(0.0001, cuando + 0.03);
    o.start(cuando); o.stop(cuando + 0.05);
  }
  function estira(f) { return f.cae === 'proy' ? f.tempo / P.tempo : 1; } // segundos que suena cada segundo de la frase
  function oir(f) {
    if (!Sonido.iniciar() || !grafo()) { aviso('Este navegador no tiene sonido'); return; }
    parar(); aplicarGrafo(f);
    const ctx = G.ctx, g = geo(f);
    let t = ctx.currentTime + 0.06;
    if (Sonido.tocando && f.cae === 'proy') { const p = Sonido.posicion(), sig = Math.ceil(p / 4 - 1e-6) * 4; t = Math.max(t, ctx.currentTime + (sig - p) * 60 / P.tempo); }
    G.out.gain.cancelScheduledValues(ctx.currentTime); G.out.gain.setValueAtTime(0.0001, ctx.currentTime); G.out.gain.linearRampToValueAtTime(0.5, t);
    st = { n: f.n, src: g.ini, tNext: t, anclas: [] };
    st.timer = setInterval(tic, 25); tic();
  }
  function tic() {
    const f = st && frase(st.n); if (!f) return parar();
    const ctx = G.ctx, g = geo(f), s = estira(f), horizonte = ctx.currentTime + 0.15;
    while (st.tNext < horizonte) {
      if (st.src >= g.fin - 1e-6 || st.src < g.ini - 1e-6) st.src = g.ini;
      const span = Math.min(0.05, g.fin - st.src);
      st.anclas.push({ t: st.tNext, src: st.src, s });
      eventos(f, st.src, st.src + span).forEach(e => voz(e, st.tNext + (e.t - st.src) * s));
      if (ui.frClic) {
        for (let k = Math.ceil((st.src - f.uno) / g.beat - 1e-9); f.uno + k * g.beat < st.src + span; k++) clicA(st.tNext + (f.uno + k * g.beat - st.src) * s, mod(k, 4) === 0);
      }
      st.src += span; st.tNext += span * s;
    }
    const ahora = ctx.currentTime; while (st.anclas.length > 2 && st.anclas[1].t <= ahora) st.anclas.shift();
  }
  function srcAhora() {
    const ahora = G.ctx.currentTime; let a = null;
    for (const x of st.anclas) { if (x.t <= ahora) a = x; else break; }
    return a ? a.src + (ahora - a.t) / a.s : null;
  }
  function parar() {
    if (!st) return;
    clearInterval(st.timer); st = null;
    if (G) { const t = G.ctx.currentTime; G.out.gain.setValueAtTime(0.0001, t); G.out.gain.setTargetAtTime(0.5, t + 0.25, 0.01); }
    dibujarCabezal();
  }
  function cuadro() { if (st) dibujarCabezal(); }

  return { completar, frase, abrir, html, cuadritos, dibujar, refrescar, cuadro, parar, acc, pd, fmtC, get sonando() { return st ? st.n : null; } };
})();
