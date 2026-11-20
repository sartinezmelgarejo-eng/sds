// Oído en la mano · PROTOTIPO (sin conexión a Oído). Todo es de mentira salvo la batería sintetizada.
'use strict';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const app = $('#app'), capas = $('#capas');

let P = proyectoInicial();
P.radio.k = [0.5, 0.25, 0.3, 0.0];
P.radio.seco = false;
P.radio.fx = [{ uid: 'f900', plug: plug('ValhallaSupermassive').id, preset: 'Infinito', on: true, v: rnd8('vs') }];

const ui = {
  tab: 'ritmo', vistaT: 'ritmo', fila: 0, compas: 0, radioModo: 'fx',
  pista: null, plug: null, sel: P.pistas[2].uid, ordenar: false, hoja: null, br: null,
  rec: false, desde: 0, sinClick: 0, sel0: null,
};

// ---------- historial (↶) ----------
const hist = [];
function foto() { return JSON.stringify(P); }
function guardar() { hist.push(foto()); if (hist.length > 100) hist.shift(); }
function confirmar(s0) { if (s0 && s0 !== foto()) { hist.push(s0); if (hist.length > 100) hist.shift(); } }
function deshacer() {
  if (!hist.length) return aviso('Nada que deshacer');
  P = JSON.parse(hist.pop()); validarUi(); aplicarSonido(); render(); aviso('↶ Deshecho');
}
function validarUi() {
  if (ui.pista && !getPista(ui.pista)) { ui.pista = null; ui.plug = null; }
  if (ui.plug && ui.pista && !getFx(getPista(ui.pista), ui.plug)) ui.plug = null;
  if (!getPista(ui.sel)) ui.sel = P.pistas[0] ? P.pistas[0].uid : 'tm';
  if (P.clip >= P.ritmo.length) P.clip = 0;
  if (ui.compas >= patron().compases) ui.compas = 0;
}

// ---------- acceso a datos ----------
function pistaActual() { return modo() === 'tablet' ? ui.sel : (ui.pista || ui.sel); }
function getPista(uid) {
  if (uid === 'tm') return P.master;
  if (uid === 'radio') return { uid: 'radio', nombre: 'LA RADIO', tipo: 'RADIO', color: '#ff4a14', fx: P.radio.fx, vol: 1, pan: 0 };
  return P.pistas.find(p => p.uid === uid);
}
function getFx(pista, uid) { if (!pista) return null; if (pista.inst && pista.inst.uid === uid) return pista.inst; return pista.fx.find(f => f.uid === uid); }
function plugDe(fx) { return PLUGINS.find(p => p.id === fx.plug); }
function presetsDe(pl) { return PRESETS_DE[pl.nombre] || PRESETS_POR_TIPO[pl.tipo] || []; }
function patron() { return P.ritmo[P.clip]; }
function rejDe(fila) { return REJILLAS.find(r => r.id === fila.rej); }
function nuevoFx(pl, preset) { return { uid: 'f' + (P.nid++), plug: pl.id, preset: preset || presetsDe(pl)[0] || 'Por defecto', on: true, v: rnd8(pl.nombre + preset) }; }
function pistaBateria() { return P.pistas.find(p => p.tipo === 'BATERIA'); }
function tipoIcono(t) { return { MIDI: '🎹', AUDIO: '🎤', BATERIA: '🥁', MASTER: '◎', RADIO: '📻' }[t] || ''; }
function subtitulo(p) {
  const n = p.fx.length + ' efecto' + (p.fx.length === 1 ? '' : 's');
  if (p.inst) return plugDe(p.inst).nombre + ' · ' + n;
  if (p.entrada) return p.entrada + ' · ' + n;
  return n;
}

// ---------- sonido ----------
Sonido.ponerFuente(() => {
  const pat = patron(), b = pistaBateria();
  const callada = !b || b.m || (P.pistas.some(p => p.s) && !b.s);
  if (callada) return { patron: Object.assign({}, pat, { filas: pat.filas.map(f => Object.assign({}, f, { m: true })) }), solo: false };
  return { patron: pat, solo: pat.filas.some(f => f.s) };
});
Sonido.alGolpe((i, t) => {
  const ms = Math.max(0, (t - Sonido.ahora()) * 1000);
  setTimeout(() => destello(i), ms);
});
function destello(i) {
  $$(`[data-flash="${i}"]`).forEach(el => { el.classList.remove('golpe'); void el.offsetWidth; el.classList.add('golpe'); });
}
function aplicarSonido() {
  const b = pistaBateria();
  if (b && b.inst) Sonido.ponerKit(b.inst.preset);
  const v = b ? (b.inst && !b.inst.on ? 0.0001 : b.vol * 1.1) * P.master.vol * 1.25 : 0.8;
  Sonido.volumen(clamp(v, 0.0001, 1.2));
}
function oirPaso(f, g) { Sonido.iniciar(); Sonido.pad(f, g ? g.f : 100, g ? g.tono : 0, 0, g ? g.largo : 1); destello(f); }

// ---------- modo de pantalla ----------
function modo() {
  if (ui.modo && document.activeElement && document.activeElement.tagName === 'INPUT') return ui.modo; // teclado abierto: no cambiar
  const w = innerWidth, h = innerHeight;
  if (Math.min(w, h) >= 700 && Math.max(w, h) >= 1000) return 'tablet';
  return w > h ? 'acostado' : 'depie';
}

// ---------- RENDER ----------
function render() {
  const m = modo(); ui.modo = m;
  document.body.dataset.modo = m;
  document.body.dataset.orient = innerWidth > innerHeight ? 'h' : 'v';
  app.innerHTML = m === 'tablet' ? vistaTablet() : vistaTelefono(m);
  renderCapas();
  despues();
}

const TABS = [['ritmo', '▦', 'RITMO'], ['radio', '📻', 'RADIO'], ['pistas', '🎚', 'PISTAS'], ['cancion', '▤', 'CANCIÓN']];
const TITULO_TAB = { ritmo: '▦ RITMO', radio: '📻 RADIO', pistas: '🎚 PISTAS', cancion: '▤ CANCIÓN' };

function botonesTransporte(m) {
  const t = Sonido.tocando;
  const play = `<button class="bt-play ${t ? 'tocando' : ''}" data-a="play" aria-label="tocar o pausar">${t ? '❚❚' : '▶'}</button>`;
  const rec = `<button class="bt-rec ${ui.rec ? 'on' : ''}" data-a="rec"><span class="punto"></span>${m === 'acostado' ? '' : (ui.rec ? ' GRABANDO' : ' GRABAR')}</button>`;
  const trk = `<button class="bt-track" data-a="nuevo-track">＋ TRACK</button>`;
  if (m === 'acostado') return `<nav class="transporte">${play}${rec}<button data-a="undo" style="font-size:20px">↶</button>${trk}</nav>`;
  return `<nav class="transporte">${rec}${play}${trk}</nav>`;
}
function pestanas() {
  return `<nav class="pestanas">${TABS.map(([id, ico, n]) => `<button class="${ui.tab === id ? 'on' : ''}" data-a="tab" data-v="${id}"><span class="ico">${ico}</span>${n}</button>`).join('')}</nav>`;
}
function letrero() { return `<span class="letrero">PROTOTIPO ·<br>sin conexión a Oído</span>`; }
function botonTempo() { return `<button data-a="hoja" data-v="tempo" class="mono">${P.tempo} BPM</button>`; }

function vistaTelefono(m) {
  const cont = contenidoTab(m);
  if (m === 'acostado') {
    return `${pestanas()}<div class="centro"><header class="cabeza"><span class="titulo">${TITULO_TAB[ui.tab]}</span>${letrero()}<span class="esp"></span>${botonTempo()}</header><main class="contenido">${cont}</main></div>${botonesTransporte(m)}`;
  }
  return `<header class="cabeza"><span class="titulo">Oído</span>${letrero()}<span class="esp"></span>${botonTempo()}<button data-a="undo" aria-label="deshacer" style="font-size:20px;min-width:52px">↶</button></header>
    <main class="contenido">${cont}</main>${botonesTransporte(m)}${pestanas()}`;
}
function contenidoTab(m) {
  switch (ui.tab) {
    case 'ritmo': return vistaRitmo(m);
    case 'radio': return vistaRadio(m);
    case 'pistas':
      if (ui.pista && ui.plug) return paginaPlugin(ui.pista, ui.plug);
      if (ui.pista) return paginaPista(ui.pista);
      return m === 'acostado' ? vistaMezcla(false) : listaPistas();
    case 'cancion': return m === 'acostado' ? vistaArreglo() : vistaCancionLista();
  }
  return '';
}

// ---------- ▦ RITMO (teléfono) ----------
function chipsSonidos(clase = 'sonidos') {
  const pat = patron();
  return `<div class="${clase}">${PADS.map((pd, i) => {
    const f = pat.filas[i];
    return `<button class="sonido ${ui.fila === i ? 'elegido' : ''} ${f.m ? 'mudo' : ''}" style="--c:${pd.color}" data-pd="sonido" data-f="${i}" data-flash="${i}"><span class="barra" style="background:${pd.color}"></span>${pd.nombre}${f.s ? ' S' : ''}</button>`;
  }).join('')}</div>`;
}
function herramRitmo() {
  const pat = patron(), f = pat.filas[ui.fila];
  return `<div class="herram">
    <button class="clip" data-a="hoja" data-v="patrones"><span class="chico">PATRÓN</span><span>${esc(pat.nombre.replace('patrón ', ''))} ▾</span></button>
    <div class="compases">${Array.from({ length: pat.compases }, (_, c) => `<button class="${ui.compas === c ? 'on' : ''}" data-a="compas" data-v="${c}">${c + 1}</button>`).join('')}</div>
    <button class="ms-son ${f.m ? 'on' : ''}" style="--c:${PADS[ui.fila].color}" data-a="fila-m" aria-label="silenciar este sonido">M</button>
    <button class="ms-son ${f.s ? 'on' : ''}" style="--c:${PADS[ui.fila].color}" data-a="fila-s" aria-label="solo este sonido">S</button>
    <button data-a="hoja" data-v="fila" aria-label="más opciones" style="font-size:20px">⋯</button>
  </div>`;
}
function vistaRitmo(m) {
  const pat = patron(), fila = pat.filas[ui.fila], n = rejDe(fila).n;
  const filas = m === 'acostado' ? (n <= 16 ? 2 : 4) : 4;
  const cols = n / filas;
  return `<div class="ritmo">
    ${chipsSonidos(m === 'acostado' ? 'sonidos ocho' : 'sonidos')}
    ${herramRitmo()}
    <div class="rejilla" style="grid-template-columns:repeat(${cols},1fr);grid-template-rows:repeat(${filas},1fr)" data-fila="${ui.fila}">${celdas(ui.fila, ui.compas)}</div>
    ${m === 'depie' ? `<div class="ayuda">toca = poner o quitar · arrastra = pintar varios · <b>mantén</b> un golpe = afinarlo</div>` : ''}
  </div>`;
}
function otrosEn(fi, c, n) { // por paso: cuántos otros sonidos tienen golpe en ese rato
  const pat = patron(), res = Array.from({ length: n }, () => 0);
  pat.filas.forEach((g, j) => {
    if (j === fi) return;
    const ng = rejDe(g).n, pasos = g.pasos[c] || [];
    pasos.forEach((gp, q) => { if (gp) { const p = Math.floor(q * n / ng + 1e-6); if (p < n) res[p]++; } });
  });
  return res;
}
function celdas(fi, c) {
  const pat = patron(), fila = pat.filas[fi], n = rejDe(fila).n, porT = n / 4;
  const otros = otrosEn(fi, c, n), color = PADS[fi].color;
  let h = '';
  for (let p = 0; p < n; p++) {
    const t = Math.floor(p / porT);
    h += `<div class="paso ${t % 2 ? 't1' : ''} ${fila.pasos[c][p] ? 'lleno' : ''}" data-pd="paso" data-f="${fi}" data-c="${c}" data-p="${p}" style="--c:${color}">${interiorPaso(fila.pasos[c][p], p % porT === 0 ? t + 1 : '', otros[p])}</div>`;
  }
  return h;
}
function interiorPaso(g, num, otros) {
  let h = num !== '' ? `<span class="num">${num}</span>` : '';
  h += '<span class="aro"></span>';
  if (g) {
    h += `<span class="fuerza" style="top:${100 - Math.round(g.f / 127 * 100)}%"></span>`;
    const inf = [];
    if (g.ad) inf.push((g.ad > 0 ? '→' : '←') + Math.abs(g.ad));
    if (g.tono) inf.push((g.tono > 0 ? '+' : '') + g.tono);
    if (g.largo > 1) inf.push('×' + g.largo);
    if (inf.length) h += `<span class="info">${inf.join('<br>')}</span>`;
    if (g.rep > 1) h += `<span class="rep">${'<i></i>'.repeat(g.rep)}</span>`;
  } else if (otros) h += `<span class="otros">${'<i></i>'.repeat(Math.min(otros, 7))}</span>`;
  return h;
}
function pintarCelda(el) {
  const f = +el.dataset.f, c = +el.dataset.c, p = +el.dataset.p;
  const fila = patron().filas[f], n = rejDe(fila).n, porT = n / 4, g = fila.pasos[c][p];
  el.classList.toggle('lleno', !!g);
  el.innerHTML = interiorPaso(g, p % porT === 0 ? Math.floor(p / porT) + 1 : '', g ? 0 : otrosEn(f, c, n)[p]);
}

// ---------- 📻 RADIO ----------
function filaEstacion(extra = '') {
  const e = ESTACIONES[P.radio.estacion];
  return `<div class="estacion"><button class="flecha" data-a="est" data-v="-1" aria-label="estación anterior">◀</button>
    <button class="nombre" data-a="hoja" data-v="estaciones">📻 ${esc(e.nombre)} <small>· ${esc(e.lugar)} ▾</small></button>
    <button class="flecha" data-a="est" data-v="1" aria-label="estación siguiente">▶</button>${extra}</div>`;
}
const FX_RADIO = ['FILTRO', 'ECO', 'REVERB', 'ROMPE'];
function xyHTML(i) {
  const k = P.radio.k, x = k[i * 2], y = k[i * 2 + 1];
  const et = i === 0 ? ['FILTRO ↔', 'ECO ↕'] : ['REVERB ↔', 'ROMPE ↕'];
  return `<div class="xy" data-pd="xy" data-i="${i}"><span class="et">${et[0]} · ${et[1]}</span><span class="et2">${i === 0 ? 'graves ← → agudos' : 'seco ← → mojado'}</span><span class="bola" style="--c:${i === 0 ? 'var(--naranja)' : 'var(--tinta)'};left:${6 + x * 88}%;top:${6 + (1 - y) * 88}%"></span></div>`;
}
function perillasRadio(cls = 'perillas-fx') {
  return `<div class="${cls}">${FX_RADIO.map((n, i) => perillaHTML('rk:' + i, n)).join('')}</div>`;
}
function vistaRadio(m) {
  const seg = `<div class="seg"><button class="${ui.radioModo === 'tira' ? 'on' : ''}" data-a="radio-modo" data-v="tira">〰 TIRA</button><button class="${ui.radioModo === 'fx' ? 'on' : ''}" data-a="radio-modo" data-v="fx">✋ FX</button></div>`;
  const pie = `<div class="radio-pie"><button class="${P.radio.seco ? 'on' : ''}" data-a="seco">${P.radio.seco ? '✓ ' : ''}SECO</button><button data-a="cadena-radio">PLUGINS (${P.radio.fx.length}) ›</button></div>`;
  if (ui.radioModo === 'fx') {
    if (m === 'acostado') {
      return `<div class="radio">${filaEstacion(`<div class="seg" style="width:220px"><button data-a="radio-modo" data-v="tira">〰 TIRA</button><button class="on" data-a="radio-modo" data-v="fx">✋ FX</button></div>`)}
        <div class="xys" style="grid-template-columns:1fr 170px 1fr">${xyHTML(0)}<div style="display:flex;flex-direction:column;gap:6px;justify-content:space-between">${perillasRadio('perillas-fx dos')}<div class="radio-pie" style="flex-direction:column;gap:6px"><button class="${P.radio.seco ? 'on' : ''}" data-a="seco" style="min-height:44px">SECO</button><button data-a="cadena-radio" style="min-height:44px">PLUGINS (${P.radio.fx.length}) ›</button></div></div>${xyHTML(1)}</div></div>`;
    }
    return `<div class="radio">${filaEstacion()}${seg}<div class="xys">${xyHTML(0)}${xyHTML(1)}</div>${perillasRadio()}${pie}</div>`;
  }
  const frases = `<div class="frases">${P.frases.map(f => `<button style="--c:${f.color}" data-a="frase" data-v="${f.n}">${f.n} · ${esc(f.nombre)}<small>${f.c} c</small></button>`).join('')}</div>`;
  const eso = `<div class="radio-pie"><button class="naranja eso" data-a="eso" style="flex:2">¡ESO! · 4 c</button><button class="${P.radio.seco ? 'on' : ''}" data-a="seco">SECO</button></div>`;
  if (m === 'acostado') {
    return `<div class="radio">${filaEstacion(`<div class="seg" style="width:220px"><button class="on" data-a="radio-modo" data-v="tira">〰 TIRA</button><button data-a="radio-modo" data-v="fx">✋ FX</button></div>`)}
      <div class="tira" data-pd="tira"><canvas></canvas></div><div style="display:flex;gap:8px"><button class="naranja eso" data-a="eso" style="min-width:150px">¡ESO! · 4 c</button>${frases}</div></div>`;
  }
  return `<div class="radio">${filaEstacion()}${seg}<div class="tira" data-pd="tira"><canvas></canvas></div>
    <div class="ayuda">arrastra sobre la onda = guardar ese pedazo como frase (al compás)</div>${eso}${frases}</div>`;
}

// ---------- 🎚 PISTAS ----------
function listaPistas() {
  const filas = P.pistas.map((p, i) => `<div class="renglon" data-i="${i}">
      <span class="color" style="background:${p.color}"></span>
      <span class="asa-ord" data-pd="asa">≡</span>
      <div class="nom" data-a="abrir-pista" data-v="${p.uid}"><b>${tipoIcono(p.tipo)} ${esc(p.nombre)}</b><span>${esc(subtitulo(p))}</span></div>
      <button class="ms m ${p.m ? 'on' : ''}" data-a="m" data-v="${p.uid}">M</button>
      <button class="ms s ${p.s ? 'on' : ''}" data-a="s" data-v="${p.uid}">S</button>
    </div>`).join('');
  const ms = P.master;
  return `<div class="desliza"><div class="lista">
    <div class="seccion-t"><span>${P.pistas.length} PISTAS · toca una = sus plugins y volumen</span></div>
    <div class="lista" style="padding:0" data-lista="pistas">${filas}</div>
    <div class="ayuda">≡ arrastra = cambiar el orden</div>
    <div class="renglon"><span class="color" style="background:${ms.color}"></span><span class="asa-ord"></span><div class="nom" data-a="abrir-pista" data-v="tm"><b>◎ MASTER</b><span>${esc(subtitulo(ms))}</span></div></div>
    <button class="grande" data-a="nuevo-track">＋ NUEVA PISTA</button>
  </div></div>`;
}
function paginaPista(uid) {
  const p = getPista(uid); if (!p) return '';
  const tablet = modo() === 'tablet';
  const renglonFx = (fx, i, esInst) => {
    const pl = plugDe(fx);
    return `<div class="renglon ${fx.on ? '' : 'apagado'}" ${esInst ? '' : `data-i="${i}" data-pd="fila-fx" data-uid="${fx.uid}"`}>
      <span class="color" style="background:${p.color}"></span>
      ${esInst ? '<span class="asa-ord" style="font-size:20px">🎹</span>' : '<span class="asa-ord" data-pd="asa">≡</span>'}
      <div class="nom" data-a="abrir-plug" data-v="${fx.uid}"><b>${esc(pl.nombre)}</b><span>${esc(fx.preset)} · ${esc(NOMBRE_TIPO[pl.tipo])}</span></div>
      <button class="bt-power ${fx.on ? 'encendido' : 'apagado'}" data-a="power" data-v="${fx.uid}"><span class="i">⏻</span>${fx.on ? 'PRENDIDO' : 'APAGADO'}</button>
      <button class="mas" data-a="hoja" data-v="menu-fx" data-x="${fx.uid}" aria-label="opciones">⋯</button>
    </div>`;
  };
  const esRadio = uid === 'radio', esMaster = uid === 'tm';
  return `<div style="display:flex;flex-direction:column;height:100%">
    <div class="pagina-cab">${tablet ? '' : `<button class="volver" data-a="volver" aria-label="volver">←</button>`}
      <button class="nombre-pista" style="--c:${p.color}" ${esRadio || esMaster ? '' : 'data-a="hoja" data-v="nombre"'}>${tipoIcono(p.tipo)} ${esc(p.nombre)} ${esRadio || esMaster ? '' : '<small>✎</small>'}</button></div>
    <div class="desliza"><div class="lista">
      ${esRadio ? '<div class="ayuda" style="text-align:left">Plugins que van DESPUÉS de los 4 FX de la radio (FILTRO · ECO · REVERB · ROMPE).</div>' : `
      ${deslGrande('vol:' + uid, 'VOLUMEN', p.color, esMaster ? '' : `<button class="ms m ${p.m ? 'on' : ''}" data-a="m" data-v="${uid}">M</button><button class="ms s ${p.s ? 'on' : ''}" data-a="s" data-v="${uid}">S</button>`)}
      ${esMaster ? '' : deslGrande('pan:' + uid, 'PANEO', p.color)}`}
      ${p.entrada ? `<button data-a="hoja" data-v="entrada" style="justify-content:space-between;min-height:54px"><span class="chico">ENTRADA</span><span>${esc(p.entrada)} ▾</span></button>` : ''}
      ${p.inst ? `<div class="seccion-t"><span>INSTRUMENTO</span></div>${renglonFx(p.inst, 0, true)}` : ''}
      <div class="seccion-t"><span>EFECTOS (${p.fx.length}) · en orden, de arriba abajo</span></div>
      <div class="lista" style="padding:0" data-lista="fx:${uid}">${p.fx.map((f, i) => renglonFx(f, i, false)).join('') || '<div class="vacio" style="padding:12px">Sin efectos todavía.</div>'}</div>
      ${p.fx.length ? '<div class="ayuda">⏻ = prender/apagar · ≡ arrastra = cambiar orden · desliza ← = quitar</div>' : ''}
      <button class="grande" data-a="agregar-fx">＋ AGREGAR EFECTO</button>
      ${p.tipo === 'BATERIA' ? '<button data-a="tab" data-v="ritmo" style="min-height:54px">▦ EDITAR SU RITMO</button>' : ''}
      ${esRadio && !tablet ? '<button data-a="tab" data-v="radio" style="min-height:54px">📻 VOLVER A LA RADIO</button>' : ''}
    </div></div></div>`;
}
function paginaPlugin(uid, fxuid) {
  const p = getPista(uid), fx = getFx(p, fxuid); if (!fx) return '';
  const pl = plugDe(fx), esInst = p.inst && p.inst.uid === fxuid, nombres = PERILLAS_POR_TIPO[pl.tipo];
  const fav = (P.favPresets[pl.nombre] || []).includes(fx.preset);
  return `<div style="display:flex;flex-direction:column;height:100%">
    <div class="pagina-cab"><button class="volver" data-a="volver" aria-label="volver">←</button>
      <button class="nombre-pista" style="--c:${p.color}" data-a="volver">${esc(p.nombre)} <small>› ${esc(pl.nombre)}</small></button></div>
    <div class="desliza"><div class="lista">
      <div style="display:flex;align-items:center;gap:10px"><div style="flex:1;min-width:0"><div style="font-size:21px">${esc(pl.nombre)}</div><div class="chico">${esc(pl.fab)} · ${esc(NOMBRE_TIPO[pl.tipo])}${esInst ? ' · INSTRUMENTO' : ''}</div></div>
        <button class="bt-power ${fx.on ? 'encendido' : 'apagado'}" data-a="power" data-v="${fx.uid}" style="min-width:96px;min-height:56px"><span class="i">⏻</span>${fx.on ? 'PRENDIDO' : 'APAGADO'}</button></div>
      <div class="preset-barra"><button class="flecha" data-a="preset-paso" data-v="-1" aria-label="preset anterior">‹</button>
        <button class="preset" data-a="hoja" data-v="presets"><span>${fav ? '★ ' : ''}${esc(fx.preset)}</span>▾</button>
        <button class="flecha" data-a="preset-paso" data-v="1" aria-label="preset siguiente">›</button></div>
      <div class="cara-plug" style="${fx.on ? '' : 'opacity:.45'}"><div class="cab"><span>PERILLAS</span><span>${esc(fx.preset)}</span></div>
        <div class="perillas">${nombres.map((n, i) => perillaHTML(`fx:${uid}:${fx.uid}:${i}`, n)).join('')}</div></div>
      <div class="ayuda">arrastra una perilla ↕ · ${modo() === 'tablet' ? 'en la app de verdad aquí va la CARA REAL del plugin' : 'en la tablet: la CARA REAL del plugin'}</div>
      <div class="opciones"><button data-a="cambiar-fx" data-v="${fx.uid}">⇄ CAMBIAR PLUGIN</button>${esInst ? '' : `<button data-a="quitar-fx" data-v="${fx.uid}">🗑 QUITAR</button>`}</div>
    </div></div></div>`;
}

// ---------- deslizadores, perillas ----------
function descr(k) {
  const [t] = k.split(':');
  if (t === 'vol') return { min: 0, max: 1, fmt: v => v < 0.005 ? '−∞' : (20 * Math.log10(v / 0.72) * 1.2).toFixed(1) + ' dB' };
  if (t === 'pan') return { min: -1, max: 1, centro: true, fmt: v => Math.abs(v) < 0.02 ? 'centro' : (v < 0 ? 'izq ' : 'der ') + Math.round(Math.abs(v) * 100) };
  if (t === 'g') {
    const campo = k.split(':')[4];
    if (campo === 'f') return { min: 1, max: 127, ent: true, fmt: v => Math.round(v) };
    if (campo === 'ad') return { min: -60, max: 60, ent: true, centro: true, iman: 4, fmt: v => Math.round(v) === 0 ? 'a tiempo' : Math.abs(Math.round(v)) + ' ms ' + (v > 0 ? 'después' : 'antes') };
    if (campo === 'largo') return { min: 1, max: 4, ent: true, fmt: v => '×' + Math.round(v) };
    if (campo === 'tono') return { min: -12, max: 12, ent: true, centro: true, fmt: v => (v > 0 ? '+' : '') + Math.round(v) + ' st' };
  }
  if (t === 'swing') return { min: 50, max: 75, ent: true, fmt: v => Math.round(v) + ' %' };
  if (t === 'tempo') return { min: 60, max: 180, ent: true, fmt: v => Math.round(v) + ' BPM' };
  return { min: 0, max: 1, fmt: v => Math.round(v * 100) };
}
function valor(k) {
  const a = k.split(':');
  switch (a[0]) {
    case 'vol': return getPista(a[1]).vol;
    case 'pan': return getPista(a[1]).pan;
    case 'g': { const g = patron().filas[+a[1]].pasos[+a[2]][+a[3]]; return g ? g[a[4]] : 0; }
    case 'fx': { const fx = getFx(getPista(a[1]), a[2]); return fx ? fx.v[+a[3]] : 0; }
    case 'rk': return P.radio.k[+a[1]];
    case 'swing': return patron().swing;
    case 'tempo': return P.tempo;
  }
  return 0;
}
function poner(k, v) {
  const a = k.split(':'), d = descr(k);
  v = clamp(v, d.min, d.max); if (d.ent) v = Math.round(v);
  switch (a[0]) {
    case 'vol': getPista(a[1]).vol = v; aplicarSonido(); break;
    case 'pan': getPista(a[1]).pan = v; break;
    case 'g': { const g = patron().filas[+a[1]].pasos[+a[2]][+a[3]]; if (g) g[a[4]] = v; break; }
    case 'fx': { const fx = getFx(getPista(a[1]), a[2]); if (fx) fx.v[+a[3]] = v; break; }
    case 'rk': P.radio.k[+a[1]] = v; break;
    case 'swing': patron().swing = v; break;
    case 'tempo': P.tempo = v; Sonido.cambiarTempo(v); $$('[data-a="hoja"][data-v="tempo"]').forEach(b => b.textContent = v + ' BPM'); break;
  }
}
function deslInterior(k) {
  const d = descr(k), v = valor(k), fr = (v - d.min) / (d.max - d.min);
  const rel = d.centro ? `left:${Math.min(fr, 0.5) * 100}%;width:${Math.abs(fr - 0.5) * 100}%` : `width:${fr * 100}%`;
  return `${d.centro ? '<div class="cero"></div>' : ''}<div class="relleno" style="${rel}"></div><div class="perilla-h" style="left:${clamp(fr * 100, 4, 96)}%"></div>`;
}
function deslMini(k, color) { return `<div class="pista-desl" data-pd="desl" data-k="${k}" style="--c:${color}">${deslInterior(k)}</div>`; }
function deslGrande(k, et, color, extra = '', abs = false) {
  return `<div class="desl"><div class="et"><span>${et}</span><b data-val="${k}">${descr(k).fmt(valor(k))}</b></div>
    <div class="fila-pista"><div class="pista-desl" data-pd="desl" data-k="${k}" ${abs ? 'data-abs="1"' : ''} style="--c:${color}">${deslInterior(k)}</div>${extra}</div></div>`;
}
function refrescarDesl(k) {
  $$(`.pista-desl[data-k="${k}"]`).forEach(el => el.innerHTML = deslInterior(k));
  $$(`[data-val="${k}"]`).forEach(el => el.textContent = descr(k).fmt(valor(k)));
}
function arco(fr) {
  const a0 = -225, a1 = a0 + 270 * fr, r = 26, cx = 34, cy = 34;
  const pt = a => [cx + r * Math.cos(a * Math.PI / 180), cy + r * Math.sin(a * Math.PI / 180)];
  const [x0, y0] = pt(a0), [x1, y1] = pt(a1), [xe, ye] = pt(45);
  const big = 270 * fr > 180 ? 1 : 0;
  return `<path d="M${x0} ${y0} A${r} ${r} 0 1 1 ${xe} ${ye}" stroke="currentColor" opacity=".22" stroke-width="7" fill="none" stroke-linecap="round"/>` +
    (fr > 0.005 ? `<path d="M${x0} ${y0} A${r} ${r} 0 ${big} 1 ${x1} ${y1}" stroke="var(--naranja)" stroke-width="7" fill="none" stroke-linecap="round"/>` : '') +
    `<circle cx="${cx}" cy="${cy}" r="15" fill="currentColor" opacity=".12"/><line x1="${cx}" y1="${cy}" x2="${cx + 14 * Math.cos(a1 * Math.PI / 180)}" y2="${cy + 14 * Math.sin(a1 * Math.PI / 180)}" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>`;
}
function perillaHTML(k, nombre) {
  return `<div class="perilla" data-pd="perilla" data-k="${k}"><svg viewBox="0 0 68 68">${arco(valor(k))}</svg><span>${esc(nombre)}</span><span class="v" data-val="${k}">${Math.round(valor(k) * 100)}</span></div>`;
}
function refrescarPerilla(k) {
  $$(`.perilla[data-k="${k}"]`).forEach(el => { el.querySelector('svg').innerHTML = arco(valor(k)); el.querySelector('.v').textContent = Math.round(valor(k) * 100); });
}

// ---------- 🎚 MEZCLA (tiras verticales) ----------
function vistaMezcla(compacta) {
  const canales = [...P.pistas, P.master].map(p => `<div class="canal" style="--c:${p.color}"><div class="tapa"></div>
      <div class="fader" data-pd="fader" data-k="vol:${p.uid}"><div class="riel"></div><div class="med" data-med="${p.uid}" style="height:0"></div><div class="tope" style="top:${tope(p.vol)}%"></div></div>
      ${p.uid === 'tm' ? '' : `<div class="ms2"><button class="m ${p.m ? 'on' : ''}" data-a="m" data-v="${p.uid}">M</button><button class="s ${p.s ? 'on' : ''}" data-a="s" data-v="${p.uid}">S</button></div>`}
      <button class="nomc" data-a="abrir-pista" data-v="${p.uid}">${esc(p.nombre)} ›</button></div>`).join('');
  return `<div class="mezcla">${canales}${compacta ? '<button class="grande" data-a="nuevo-track" style="width:90px;flex:none;height:auto;writing-mode:vertical-rl">＋ NUEVA PISTA</button>' : ''}</div>`;
}
function tope(v) { return 10 + (1 - v) * 80; }

// ---------- ▤ CANCIÓN ----------
function compasActualCancion() {
  const total = COMPASES_CANCION * 4;
  const b = ((ui.desde + (Sonido.tocando ? Sonido.posicion() : 0)) % total + total) % total;
  return b;
}
function vistaCancionLista() {
  const b = compasActualCancion(), c = Math.floor(b / 4) + 1;
  return `<div class="desliza"><div class="lista">
    <div class="seccion-t"><span>TEMPO</span></div>
    <div class="tempo-caja"><button data-a="tempo" data-v="-1">−</button><span class="num mono">${P.tempo}<span class="chico"> BPM</span></span><button data-a="tempo" data-v="1">＋</button></div>
    <div class="seccion-t"><span>SECCIONES · toca = saltar ahí</span><span data-compas-txt>compás ${c} de ${COMPASES_CANCION}</span></div>
    <div class="secciones">${SECCIONES.map((s, i) => `<button class="secc ${c >= s.desde && c <= s.hasta ? 'actual' : ''}" style="--c:${s.color}" data-a="saltar" data-v="${s.desde}" data-secc="${i}"><span>${s.nombre}</span><span class="chico">c ${s.desde}–${s.hasta}</span></button>`).join('')}</div>
    <div class="ayuda">acuesta el teléfono para ver la canción entera</div>
  </div></div>`;
}
function vistaArreglo() {
  const N = COMPASES_CANCION, pct = c => (c - 1) / N * 100;
  return `<div class="arreglo">
    <div class="arr-secc"><span class="chico" style="align-self:center">toca = ir</span><div class="barra">${SECCIONES.map(s => `<button style="--c:${s.color};left:${pct(s.desde)}%;width:calc(${(s.hasta - s.desde + 1) / N * 100}% - 3px)" data-a="saltar" data-v="${s.desde}">${s.nombre}</button>`).join('')}</div></div>
    <div class="arr-filas">${P.pistas.map(p => `<div class="arr-fila" style="--c:${p.color}"><div class="n" data-a="abrir-pista" data-v="${p.uid}">${esc(p.nombre)}</div><div class="carril">${(p.regiones || []).map(([a, b, n]) => `<div class="reg" style="left:${pct(a)}%;width:calc(${(b - a + 1) / N * 100}% - 2px)">${esc(n)}</div>`).join('')}</div></div>`).join('')}
      <div class="cabezal" data-cabezal style="left:calc(80px + (100% - 80px) * 0)"></div></div>
  </div>`;
}

// ---------- TABLET ----------
function vistaTablet() {
  const t = Sonido.tocando;
  const vistas = [['ritmo', '▦ RITMO'], ['radio', '📻 RADIO'], ['cancion', '▤ CANCIÓN'], ['mezcla', '🎚 MEZCLA']];
  const barra = `<header class="t-barra"><span class="titulo">Oído</span>
    <button class="bt-play ${t ? 'tocando' : ''}" data-a="play">${t ? '❚❚' : '▶'}</button>
    <button class="bt-rec ${ui.rec ? 'on' : ''}" data-a="rec"><span class="punto"></span> ${ui.rec ? 'GRABANDO' : 'GRABAR'}</button>
    <button data-a="undo" style="font-size:20px">↶</button>${botonTempo()}
    <div class="vistas">${vistas.map(([id, n]) => `<button class="${ui.vistaT === id ? 'on' : ''}" data-a="vistaT" data-v="${id}">${n}</button>`).join('')}</div>
    <span class="esp"></span><span class="letrero">PROTOTIPO · sin conexión a Oído</span>
    <button class="naranja" data-a="nuevo-track">＋ TRACK</button></header>`;
  const lista = `<aside class="t-pistas">${[...P.pistas, P.master].map(p => `<div class="t-pista ${ui.sel === p.uid ? 'elegida' : ''}">
      <span class="color" style="background:${p.color}"></span><div class="nom" data-a="sel" data-v="${p.uid}">${tipoIcono(p.tipo)} ${esc(p.nombre)}<small>${esc(subtitulo(p))}</small></div>
      ${p.uid === 'tm' ? '' : `<button class="ms m ${p.m ? 'on' : ''}" data-a="m" data-v="${p.uid}">M</button><button class="ms s ${p.s ? 'on' : ''}" data-a="s" data-v="${p.uid}">S</button>`}</div>`).join('')}
      <button class="grande" data-a="nuevo-track" style="margin:10px;width:auto">＋ NUEVA PISTA</button>
      <div class="t-pista ${ui.sel === 'radio' ? 'elegida' : ''}"><span class="color" style="background:#ff4a14"></span><div class="nom" data-a="sel" data-v="radio">📻 PLUGINS DE LA RADIO<small>${P.radio.fx.length} efecto(s)</small></div></div></aside>`;
  let centro = '';
  if (ui.vistaT === 'ritmo') centro = ritmoTablet();
  else if (ui.vistaT === 'radio') centro = `<div class="radio">${filaEstacion()}<div class="tira" data-pd="tira" style="flex:1"><canvas></canvas></div>
      <div style="display:flex;gap:8px"><button class="naranja eso" data-a="eso" style="min-width:180px">¡ESO! · 4 c</button><div class="frases" style="flex:1">${P.frases.map(f => `<button style="--c:${f.color}" data-a="frase" data-v="${f.n}">${f.n} · ${esc(f.nombre)}<small>${f.c} c</small></button>`).join('')}</div></div>
      <div class="xys" style="grid-template-columns:1fr 190px 1fr;flex:1.3">${xyHTML(0)}<div style="display:flex;flex-direction:column;justify-content:center;gap:10px">${perillasRadio('perillas-fx dos')}<button class="${P.radio.seco ? 'on' : ''}" data-a="seco">SECO</button><button data-a="cadena-radio">PLUGINS (${P.radio.fx.length}) ›</button></div>${xyHTML(1)}</div></div>`;
  else if (ui.vistaT === 'cancion') centro = vistaArreglo();
  else centro = vistaMezcla(false);
  const panel = `<section class="t-panel">${ui.plug ? paginaPlugin(ui.sel, ui.plug) : paginaPista(ui.sel)}</section>`;
  return barra + lista + `<main class="t-centro">${centro}</main>` + panel;
}
function ritmoTablet() {
  const pat = patron();
  const filas = pat.filas.map((f, i) => {
    const n = rejDe(f).n;
    return `<div class="t-fila"><button class="cab sonido ${ui.fila === i ? 'elegido' : ''} ${f.m ? 'mudo' : ''}" style="--c:${PADS[i].color}" data-pd="sonido" data-f="${i}" data-flash="${i}" data-solo-elige="1"><span class="barra"></span>${PADS[i].nombre} <span class="chico" style="margin-left:auto;color:inherit;opacity:.7">${f.rej}</span></button>
      <div class="pasos rejilla" style="grid-template-columns:repeat(${n},1fr)" data-fila="${i}">${celdas(i, ui.compas)}</div></div>`;
  }).join('');
  return `<div class="t-ritmo"><div class="ritmo-herram herram">
      <button class="clip" data-a="hoja" data-v="patrones" style="flex:none;min-width:170px"><span class="chico">PATRÓN</span><span>${esc(pat.nombre)} ▾</span></button>
      <span class="chico">COMPÁS</span><div class="compases">${Array.from({ length: pat.compases }, (_, c) => `<button class="${ui.compas === c ? 'on' : ''}" data-a="compas" data-v="${c}">${c + 1}</button>`).join('')}</div>
      <span class="esp" style="flex:1"></span><span class="chico">${PADS[ui.fila].nombre}:</span>
      <button class="${pat.filas[ui.fila].m ? 'on' : ''}" data-a="fila-m">M</button><button class="${pat.filas[ui.fila].s ? 'on' : ''}" data-a="fila-s">S</button>
      <button data-a="hoja" data-v="fila">⋯ OPCIONES</button></div>
    <div class="t-filas">${filas}</div>
    <div class="ayuda">toca = poner o quitar · arrastra = pintar · mantén un golpe = afinarlo · los pads de abajo suenan (con ● GRABAR quedan en el patrón)</div>
    <div class="t-pads">${PADS.map((pd, i) => `<button class="sonido" style="--c:${pd.color}" data-pd="pad" data-f="${i}" data-flash="${i}"><span class="barra" style="background:${pd.color}"></span>${pd.nombre}</button>`).join('')}</div></div>`;
}

// ---------- HOJAS ----------
function abrirHoja(tipo, x) { $$('.aviso').forEach(e => e.remove()); ui.hoja = { tipo, x }; renderCapas(); }
function cerrarHoja() {
  if (ui.hoja && ui.hoja.s0) confirmar(ui.hoja.s0);
  if (ui.hoja && ui.hoja.tipo === 'browser' && ui.br && ui.br.s0) { P = JSON.parse(ui.br.s0); validarUi(); }
  ui.hoja = null; ui.br = null; $$('.paso.editando').forEach(e => e.classList.remove('editando')); render();
}
function renderCapas() {
  if (!ui.hoja) { capas.innerHTML = ''; return; }
  const h = ui.hoja; let cont = '', completa = false;
  switch (h.tipo) {
    case 'paso': cont = hojaPaso(h.x); break;
    case 'fila': cont = hojaFila(); break;
    case 'patrones': cont = hojaPatrones(); break;
    case 'tempo': cont = hojaTempo(); break;
    case 'nuevo': cont = hojaNuevo(); break;
    case 'nombre': cont = hojaNombre(); break;
    case 'entrada': cont = hojaEntrada(); break;
    case 'menu-fx': cont = hojaMenuFx(h.x); break;
    case 'presets': cont = hojaPresets(); completa = true; break;
    case 'estaciones': cont = hojaEstaciones(); completa = true; break;
    case 'browser': cont = hojaBrowser(); completa = true; break;
  }
  capas.innerHTML = `<div class="velo" data-a="cerrar-hoja"></div><div class="hoja ${completa ? 'completa' : ''}">${completa ? '' : '<div class="asa" data-pd="cerrar-desl"></div>'}${cont}</div>`;
  $$('.hoja .tit', capas).forEach(t => t.dataset.pd = 'cerrar-desl');
}
const cerrarX = `<button data-a="cerrar-hoja" aria-label="cerrar" style="min-width:52px;font-size:18px">✕</button>`;

function hojaPaso(x) {
  const { f, c, p } = x, pat = patron(), g = pat.filas[f].pasos[c][p];
  if (!g) return `<div class="tit">Sin golpe<span class="esp"></span>${cerrarX}</div>`;
  const base = `g:${f}:${c}:${p}:`, col = PADS[f].color;
  const n = rejDe(pat.filas[f]).n, porT = n / 4;
  return `<div class="tit"><span style="width:16px;height:16px;border-radius:4px;background:${col}"></span>${PADS[f].nombre} · tiempo ${Math.floor(p / porT) + 1}.${p % porT + 1}<span class="esp"></span>${cerrarX}</div>
    <div class="cuerpo">
    ${deslGrande(base + 'f', 'FUERZA', col, '', true)}
    ${deslGrande(base + 'ad', 'ADELANTO / ATRASO', col, '', true)}
    ${h_mas(x, g, base, col)}
    <div class="opciones"><button data-a="quitar-golpe">🗑 QUITAR GOLPE</button><button class="naranja" data-a="cerrar-hoja">✓ LISTO</button></div></div>`;
}
function h_mas(x, g, base, col) {
  if (!ui.hoja.mas) return `<button data-a="paso-mas" style="width:100%;margin-bottom:12px;min-height:50px">MÁS: LARGO · REPITE · TONO ▾</button>`;
  return `${deslGrande(base + 'largo', 'LARGO', col, '', true)}<div class="desl"><div class="et"><span>REPITE (redoble)</span><b>${g.rep}×</b></div><div class="opciones">${[1, 2, 3, 4].map(r => `<button class="${g.rep === r ? 'on' : ''}" data-a="rep" data-v="${r}">${r}</button>`).join('')}</div></div>
    ${deslGrande(base + 'tono', 'TONO', col, '', true)}`;
}
function hojaFila() {
  const pat = patron(), f = pat.filas[ui.fila], b = pistaBateria();
  return `<div class="tit"><span style="width:16px;height:16px;border-radius:4px;background:${PADS[ui.fila].color}"></span>${PADS[ui.fila].nombre}<span class="esp"></span>${cerrarX}</div><div class="cuerpo">
    <div class="seccion-t">REJILLA DE ESTE SONIDO</div><div class="opciones" style="margin-top:6px">${REJILLAS.map(r => `<button class="${f.rej === r.id ? 'on' : ''}" data-a="rej" data-v="${r.id}">${r.id}</button>`).join('')}</div>
    <div class="opciones"><button data-a="limpiar" data-v="compas">LIMPIAR COMPÁS ${ui.compas + 1}</button><button data-a="limpiar" data-v="fila">LIMPIAR TODO</button></div>
    <div class="seccion-t">PATRÓN «${esc(pat.nombre)}»</div>
    ${deslGrande('swing', 'SWING', '#1d1d1d', '', true)}
    <div class="seccion-t" style="margin-top:0">COMPASES</div><div class="opciones" style="margin-top:6px">${[1, 2, 4].map(n => `<button class="${pat.compases === n ? 'on' : ''}" data-a="compases" data-v="${n}">${n}</button>`).join('')}</div>
    ${b ? `<div class="seccion-t" style="margin-top:0">KIT (preset de ${esc(plugDe(b.inst).nombre)})</div><div class="opciones" style="margin-top:6px">${Object.keys(Sonido.KITS).map(k => `<button class="${b.inst.preset === k ? 'on' : ''}" data-a="kit" data-v="${esc(k)}" style="flex:1 1 40%">${esc(k)}</button>`).join('')}</div>` : ''}
  </div>`;
}
function hojaPatrones() {
  return `<div class="tit">PATRONES de la batería<span class="esp"></span>${cerrarX}</div><div class="cuerpo"><div class="secciones">
    ${P.ritmo.map((r, i) => `<button class="secc ${P.clip === i ? 'actual' : ''}" style="--c:${P.clip === i ? '#fde3d8' : 'var(--papel)'}" data-a="clip" data-v="${i}"><span>${esc(r.nombre)}</span><span class="chico">${r.compases} compás${r.compases > 1 ? 'es' : ''}</span></button>`).join('')}
    <button class="grande" data-a="clip-nuevo">＋ PATRÓN NUEVO (copia de este)</button></div></div>`;
}
function hojaTempo() {
  return `<div class="tit">TEMPO<span class="esp"></span>${cerrarX}</div><div class="cuerpo">
    <div class="tempo-caja"><button data-a="tempo" data-v="-1">−</button><span class="num mono" data-val="tempo">${P.tempo}</span><button data-a="tempo" data-v="1">＋</button></div>
    ${deslGrande('tempo', 'arrastra', '#1d1d1d', '', true)}
    <button data-a="tap" style="width:100%;min-height:80px;font-size:20px">👆 TOCA AL RITMO (TAP)</button></div>`;
}
function hojaNuevo() {
  return `<div class="tit">＋ NUEVA PISTA<span class="esp"></span>${cerrarX}</div><div class="cuerpo"><div class="tres">
    <button data-a="nt" data-v="AUDIO"><span class="ico">🎤</span><span>AUDIO<small>voz, guitarra, la radio, este teléfono</small></span></button>
    <button data-a="nt" data-v="MIDI"><span class="ico">🎹</span><span>INSTRUMENTO<small>Serum, Keyscape, Omnisphere…</small></span></button>
    <button data-a="nt" data-v="BATERIA"><span class="ico">🥁</span><span>BATERÍA<small>8 sonidos + pasos</small></span></button></div></div>`;
}
function hojaNombre() {
  const p = getPista(pistaActual());
  return `<div class="tit">NOMBRE Y COLOR<span class="esp"></span>${cerrarX}</div><div class="cuerpo">
    <div class="opciones"><button data-a="quitar-pista">🗑 QUITAR PISTA</button><button class="naranja" data-a="nombre-ok" style="flex:2">✓ LISTO</button></div>
    <div class="colores">${COLORES.map(c => `<button class="${p.color === c ? 'on' : ''}" style="--c:${c}" data-a="color" data-v="${c}" aria-label="color"></button>`).join('')}</div>
    <div class="buscador"><input id="in-nombre" value="${esc(p.nombre)}" maxlength="14" autocomplete="off" enterkeyhint="done"></div></div>`;
}
function hojaEntrada() {
  const p = getPista(pistaActual());
  const ops = ['Apollo · entrada 1', 'Apollo · entrada 2', 'Apollo · entradas 1+2', '📻 la radio', '📱 iPhone de Samuel', '◎ lo que suena (master)'];
  return `<div class="tit">ENTRADA de ${esc(p.nombre)}<span class="esp"></span>${cerrarX}</div><div class="cuerpo"><div class="secciones">
    ${ops.map(o => `<button class="secc ${p.entrada === o ? 'actual' : ''}" style="--c:var(--papel)" data-a="entrada" data-v="${esc(o)}"><span>${esc(o)}</span></button>`).join('')}</div></div>`;
}
function hojaMenuFx(uid) {
  const p = getPista(pistaActual()), fx = getFx(p, uid); if (!fx) return '';
  const pl = plugDe(fx), esInst = p.inst && p.inst.uid === uid;
  return `<div class="tit">${esc(pl.nombre)}<span class="esp"></span>${cerrarX}</div><div class="cuerpo"><div class="tres">
    <button data-a="abrir-plug" data-v="${uid}"><span class="ico">🎛</span><span>ABRIR<small>perillas y presets</small></span></button>
    <button data-a="cambiar-fx" data-v="${uid}"><span class="ico">⇄</span><span>CAMBIAR POR OTRO<small>abre el buscador de plugins</small></span></button>
    <button data-a="power" data-v="${uid}"><span class="ico">⏻</span><span>${fx.on ? 'APAGAR' : 'PRENDER'}<small>${fx.on ? 'deja de sonar, no se borra' : 'vuelve a sonar'}</small></span></button>
    ${esInst ? '' : `<button data-a="quitar-fx" data-v="${uid}"><span class="ico">🗑</span><span>QUITAR<small>se puede deshacer</small></span></button>`}</div></div>`;
}
function hojaPresets() {
  const p = getPista(pistaActual()), fx = getFx(p, ui.plug); if (!fx) return '';
  const pl = plugDe(fx), favs = P.favPresets[pl.nombre] || [];
  const lista = [...presetsDe(pl)].sort((a, b) => (favs.includes(b) - favs.includes(a)));
  return `<div class="tit">PRESETS · ${esc(pl.nombre)}<span class="esp"></span>${cerrarX}</div>
    <div class="cuerpo">${lista.map(pr => `<div class="res ${fx.preset === pr ? 'probando' : ''}"><div class="nom" data-a="preset" data-v="${esc(pr)}"><b>${esc(pr)}</b><span>${fx.preset === pr ? 'puesto ahora' : 'toca = ponerlo y oírlo'}</span></div><button class="estrella ${favs.includes(pr) ? 'on' : ''}" data-a="preset-fav" data-v="${esc(pr)}">★</button></div>`).join('')}</div>
    <div class="barra-prueba"><button class="ok" style="--c:${p.color}" data-a="cerrar-hoja">✓ LISTO</button></div>`;
}
function hojaEstaciones() {
  return `<div class="tit">📻 ESTACIONES<span class="esp"></span>${cerrarX}</div>
    <div class="buscador"><input id="in-est" placeholder="país, ciudad, estación o género" autocomplete="off" enterkeyhint="search"></div>
    <div class="cuerpo" id="res-est">${resEstaciones('')}</div>`;
}
function resEstaciones(q) {
  const n = norm(q);
  const l = ESTACIONES.map((e, i) => [e, i]).filter(([e]) => !n || norm(e.nombre + ' ' + e.lugar + ' ' + e.pais + ' ' + e.genero).includes(n));
  return l.map(([e, i]) => `<div class="res ${P.radio.estacion === i ? 'probando' : ''}"><div class="nom" data-a="estacion" data-v="${i}"><b>${esc(e.nombre)}</b><span>${esc(e.lugar)} · ${esc(e.pais)} · ${esc(e.genero)}</span></div></div>`).join('') || '<div class="vacio">Nada con eso.</div>';
}

// ---------- BROWSER de plugins y presets ----------
function abrirBrowser(modoB, pistaUid, fxUid) {
  const inst = modoB === 'instrumento' || modoB === 'nueva';
  ui.br = { modo: modoB, pista: pistaUid, uid: fxUid || null, q: '', filtro: 'fav', inst, verPresets: null, s0: null, prueba: null };
  if (modoB === 'cambiar') { const fx = getFx(getPista(pistaUid), fxUid); ui.br.inst = !!(getPista(pistaUid).inst && getPista(pistaUid).inst.uid === fxUid); ui.br.prueba = null; ui.br.actual = fx.plug; }
  abrirHoja('browser');
}
function hojaBrowser() {
  const b = ui.br, p = b.pista ? getPista(b.pista) : null;
  const tit = { efecto: `＋ EFECTO para ${p ? esc(p.nombre) : ''}`, cambiar: `⇄ CAMBIAR en ${p ? esc(p.nombre) : ''}`, instrumento: `🎹 INSTRUMENTO`, nueva: '🎹 ELIGE EL INSTRUMENTO' }[b.modo];
  const tipos = b.inst ? ['SINTE', 'PIANO', 'SAMPLER', 'BATERIA'] : ['REVERB', 'DELAY', 'EQ', 'COMP', 'SATURA', 'MODULA', 'FILTRO', 'LIMITA', 'MULTI'];
  const fabs = [...new Set(PLUGINS.filter(x => x.instr === b.inst).map(x => x.fab))];
  const chip = (id, n) => `<button class="${b.filtro === id ? 'on' : ''}" data-a="br-filtro" data-v="${esc(id)}">${n}</button>`;
  const barra = b.prueba ? `<div class="barra-prueba"><button data-a="br-cancelar">✕ NO</button><button class="ok" style="--c:${p ? p.color : '#1d1d1d'}" data-a="br-ok"><span>✓ QUEDARSE<br><small style="font-size:12px;opacity:.85">${esc(PLUGINS.find(x => x.id === b.prueba.plug).nombre)}${b.prueba.preset ? ' · ' + esc(b.prueba.preset) : ''}</small></span></button></div>` :
    `<div class="ayuda" style="padding-top:8px">${b.inst && b.modo !== 'cambiar' ? 'toca uno = listo' : 'toca uno = lo pruebas en la pista (suena ya) · luego ✓ QUEDARSE'}</div>`;
  return `<div class="tit">${tit}<span class="esp"></span><button data-a="br-cancelar" style="min-width:52px;font-size:18px" aria-label="cerrar">✕</button></div>
    <div class="buscador"><input id="in-br" placeholder="buscar plugin o preset…" value="${esc(b.q)}" autocomplete="off" enterkeyhint="search"></div>
    <div class="chips">${chip('fav', '★ FAVORITOS')}${chip('rec', '🕘 RECIENTES')}${chip('todos', 'TODOS')}${tipos.map(t => chip('tipo:' + t, NOMBRE_TIPO[t])).join('')}${fabs.map(f => chip('fab:' + f, f)).join('')}</div>
    <div class="cuerpo" id="br-res">${resultadosBrowser()}</div>${barra}`;
}
function resultadosBrowser() {
  const b = ui.br, base = PLUGINS.filter(x => x.instr === b.inst);
  const fila = (pl, preset) => {
    if (preset) return filaPreset(pl, preset);
    const fav = P.favs.includes(pl.id), probando = b.prueba && b.prueba.plug === pl.id && (!preset || b.prueba.preset === preset);
    const sub = preset ? `${pl.nombre} · preset` : `${pl.fab} · ${NOMBRE_TIPO[pl.tipo]}`;
    return `<div class="res ${probando ? 'probando' : ''}"><div class="nom" data-a="br-elegir" data-v="${pl.id}" data-x="${preset ? esc(preset) : ''}"><b>${esc(preset || pl.nombre)}</b><span>${esc(sub)}</span></div>
      ${preset ? '' : `<button class="estrella ${fav ? 'on' : ''}" data-a="br-estrella" data-v="${pl.id}" aria-label="favorito">★</button>`}</div>` +
      (!preset && b.prueba && b.prueba.plug === pl.id && !b.q.trim() ? `<div class="sub-presets"><div class="seccion-t" style="margin:4px 0 2px 14px">PRESETS DE ${esc(pl.nombre)}</div>${presetsDe(pl).map(pr => filaPreset(pl, pr)).join('')}</div>` : '');
  };
  const filaPreset = (pl, pr) => `<div class="res pre ${b.prueba && b.prueba.plug === pl.id && b.prueba.preset === pr ? 'probando' : ''}"><div class="nom" data-a="br-elegir" data-v="${pl.id}" data-x="${esc(pr)}"><b>${esc(pr)}</b></div></div>`;
  if (b.verPresets) {
    const pl = PLUGINS.find(x => x.id === b.verPresets);
    return `<button data-a="br-presets" data-v="" style="width:100%;justify-content:flex-start;margin-bottom:6px">← ${esc(pl.nombre)} · ${presetsDe(pl).length} presets</button>` +
      fila(pl, null) + presetsDe(pl).map(pr => fila(pl, pr)).join('');
  }
  let l;
  if (b.q.trim()) {
    const q = norm(b.q.trim());
    const enDonde = (b.filtro === 'fav' || b.filtro === 'rec') ? base : filtrar(base, b.filtro);
    const pls = enDonde.filter(x => norm(x.nombre + ' ' + x.fab + ' ' + NOMBRE_TIPO[x.tipo]).includes(q));
    const prs = [];
    enDonde.filter(x => PRESETS_DE[x.nombre] || x.fab === 'Oído').forEach(x => presetsDe(x).forEach(pr => { if (norm(pr).includes(q)) prs.push([x, pr]); }));
    const h = pls.map(x => fila(x)).join('') + (prs.length ? `<div class="seccion-t">PRESETS (${prs.length})</div>` + prs.slice(0, 40).map(([x, pr]) => fila(x, pr)).join('') : '');
    return h || `<div class="vacio">Nada con «${esc(b.q)}».<br>Prueba con el tipo: reverb, delay, sinte…</div>`;
  }
  l = filtrar(base, b.filtro);
  if (!l.length) return `<div class="vacio">${b.filtro === 'fav' ? 'Aún no tienes favoritos aquí: toca ★ en cualquier plugin.' : 'Nada todavía.'}</div>`;
  return l.map(x => fila(x)).join('');
}
function filtrar(base, f) {
  let l;
  if (f === 'fav') l = P.favs.map(id => PLUGINS.find(x => x.id === id)).filter(x => x && base.includes(x));
  else if (f === 'rec') l = P.recientes.map(id => PLUGINS.find(x => x.id === id)).filter(x => x && base.includes(x));
  else if (f === 'todos') l = [...base].sort((a, c) => a.nombre.localeCompare(c.nombre));
  else if (f.startsWith('tipo:')) l = base.filter(x => x.tipo === f.slice(5));
  else if (f.startsWith('fab:')) l = base.filter(x => x.fab === f.slice(4));
  return l || base;
}
function brElegir(plugId, preset) {
  const b = ui.br, pl = PLUGINS.find(x => x.id === plugId);
  if (!b.s0) b.s0 = foto();
  if (b.modo === 'nueva') {
    const s0 = b.s0; b.s0 = null;
    const t = crearPista('MIDI', { inst: nuevoFx(pl, preset) }, pl.nombre.toUpperCase().slice(0, 10));
    confirmar(s0); reciente(pl.id); ui.hoja = null; ui.br = null; irAPista(t.uid);
    aviso(`＋ ${t.nombre} creada`, true); return;
  }
  const p = getPista(b.pista);
  if (b.modo === 'instrumento' || (b.modo === 'cambiar' && b.inst)) {
    const old = p.inst; p.inst = nuevoFx(pl, preset); if (old) p.inst.uid = old.uid;
  } else if (b.modo === 'efecto') {
    if (!b.uid) { const fx = nuevoFx(pl, preset); p.fx.push(fx); b.uid = fx.uid; }
    else Object.assign(getFx(p, b.uid), { plug: pl.id, preset: preset || presetsDe(pl)[0] || 'Por defecto', on: true, v: rnd8(pl.nombre + preset) });
  } else if (b.modo === 'cambiar') {
    Object.assign(getFx(p, b.uid), { plug: pl.id, preset: preset || presetsDe(pl)[0] || 'Por defecto', on: true, v: rnd8(pl.nombre + preset) });
  }
  if (b.inst && b.modo !== 'cambiar') { const s0 = b.s0; b.s0 = null; confirmar(s0); reciente(pl.id); ui.hoja = null; ui.br = null; aplicarSonido(); render(); aviso(`🎹 ${pl.nombre} en ${p.nombre}`, true); return; }
  b.prueba = { plug: pl.id, preset: preset || null };
  aplicarSonido();
  const sc = $('#br-res') ? $('#br-res').scrollTop : 0;
  render();
  if ($('#br-res')) $('#br-res').scrollTop = sc;
}
function brOk() {
  const b = ui.br, p = getPista(b.pista), pl = PLUGINS.find(x => x.id === b.prueba.plug);
  const s0 = b.s0; b.s0 = null; confirmar(s0); reciente(pl.id);
  ui.hoja = null; ui.br = null; render();
  aviso(`✓ ${pl.nombre} en ${p.nombre}`, true);
}
function reciente(id) { P.recientes = [id, ...P.recientes.filter(x => x !== id)].slice(0, 12); }

// ---------- pistas: crear, abrir ----------
function crearPista(tipo, extra, nombreBase) {
  const usados = P.pistas.map(p => p.color);
  const color = COLORES.find(c => !usados.includes(c)) || COLORES[P.pistas.length % COLORES.length];
  let base = nombreBase || { AUDIO: 'AUDIO', MIDI: 'INSTR', BATERIA: 'BATERÍA' }[tipo], nombre = base, k = 2;
  while (P.pistas.some(p => p.nombre === nombre)) nombre = base + ' ' + (k++);
  const t = Object.assign({ uid: 't' + (P.nid++), nombre, tipo, color, vol: 0.72, pan: 0, m: false, s: false, fx: [], regiones: [] }, extra);
  P.pistas.push(t);
  return t;
}
function irAPista(uid) {
  if (modo() === 'tablet') { ui.sel = uid; ui.plug = null; }
  else { ui.tab = 'pistas'; ui.pista = uid; ui.plug = null; }
  render();
}

// ---------- AVISOS ----------
let tAviso = null;
function aviso(txt, conDeshacer) {
  $$('.aviso').forEach(e => e.remove());
  const d = document.createElement('div'); d.className = 'aviso';
  d.innerHTML = `<span>${esc(txt)}</span>${conDeshacer ? '<button data-a="undo">DESHACER</button>' : ''}`;
  document.body.appendChild(d);
  if (!conDeshacer) d.style.pointerEvents = 'none';
  clearTimeout(tAviso); tAviso = setTimeout(() => d.remove(), conDeshacer ? 8000 : 2200);
}

// ---------- ACCIONES (toques simples) ----------
const ACC = {
  play() {
    Sonido.iniciar(); aplicarSonido();
    if (Sonido.tocando) { ui.desde = compasActualCancion(); Sonido.parar(); ui.rec = false; }
    else Sonido.tocar(P.tempo);
    refrescarTransporte();
  },
  rec() {
    ui.rec = !ui.rec;
    if (ui.rec) {
      if (!Sonido.tocando) ACC.play();
      aviso(ui.tab === 'ritmo' || modo() === 'tablet' ? '● GRABANDO: toca los sonidos y quedan en el patrón' : '● Grabaría en Oído (prototipo)');
    } else aviso('● grabación apagada');
    refrescarTransporte();
  },
  undo: deshacer,
  'nuevo-track'() { abrirHoja('nuevo'); },
  tab(v) { if (ui.tab === v || v !== 'pistas') { ui.pista = null; } ui.tab = v; ui.plug = null; render(); },
  vistaT(v) { ui.vistaT = v; render(); },
  compas(v) { ui.compas = +v; render(); },
  'fila-m'() { guardar(); const f = patron().filas[ui.fila]; f.m = !f.m; render(); },
  'fila-s'() { guardar(); const f = patron().filas[ui.fila]; f.s = !f.s; render(); },
  hoja(v, el) { if (v === 'nombre' && modo() !== 'tablet' && !ui.pista) return; abrirHoja(v, el.dataset.x); },
  'cerrar-hoja'() { cerrarHoja(); },
  'abrir-pista'(v) { if (modo() === 'tablet') { ui.sel = v; ui.plug = null; render(); } else { ui.tab = 'pistas'; ui.pista = v; ui.plug = null; render(); $('.desliza') && ($('.desliza').scrollTop = 0); } },
  sel(v) { ui.sel = v; ui.plug = null; render(); },
  volver() {
    if (ui.plug) ui.plug = null;
    else if (ui.pista === 'radio') { ui.pista = null; ui.tab = 'radio'; }
    else ui.pista = null;
    render();
  },
  'abrir-plug'(v) { ui.hoja = null; if (modo() !== 'tablet' && !ui.pista) ui.pista = ui.sel; ui.plug = v; render(); },
  power(v) {
    const p = getPista(pistaActual()), fx = getFx(p, v); if (!fx) return;
    guardar(); fx.on = !fx.on; ui.hoja = null; aplicarSonido(); render();
    aviso(`${plugDe(fx).nombre} ${fx.on ? 'PRENDIDO' : 'APAGADO'}`);
  },
  'quitar-fx'(v) {
    const p = getPista(pistaActual()), i = p.fx.findIndex(f => f.uid === v); if (i < 0) return;
    guardar(); const [fx] = p.fx.splice(i, 1); if (ui.plug === v) ui.plug = null; ui.hoja = null; render();
    aviso(`🗑 ${plugDe(fx).nombre} quitado`, true);
  },
  'cambiar-fx'(v) { ui.hoja = null; abrirBrowser('cambiar', pistaActual(), v); },
  'agregar-fx'() { abrirBrowser('efecto', pistaActual()); },
  m(v) { guardar(); const p = getPista(v); p.m = !p.m; aplicarSonido(); render(); },
  s(v) { guardar(); const p = getPista(v); p.s = !p.s; aplicarSonido(); render(); },
  ordenar() { ui.ordenar = !ui.ordenar; render(); },
  'preset-paso'(v) {
    const p = getPista(pistaActual()), fx = getFx(p, ui.plug), l = presetsDe(plugDe(fx));
    guardar(); const i = l.indexOf(fx.preset); fx.preset = l[((i < 0 ? 0 : i + +v) + l.length) % l.length]; fx.v = rnd8(fx.plug + fx.preset);
    aplicarSonido(); render();
  },
  preset(v) {
    const p = getPista(pistaActual()), fx = getFx(p, ui.plug);
    guardar(); fx.preset = v; fx.v = rnd8(fx.plug + v); aplicarSonido(); renderCapas(); render();
  },
  'preset-fav'(v) {
    const p = getPista(pistaActual()), fx = getFx(p, ui.plug), n = plugDe(fx).nombre;
    const l = P.favPresets[n] = P.favPresets[n] || []; const i = l.indexOf(v); if (i >= 0) l.splice(i, 1); else l.push(v);
    const sc = $('.hoja .cuerpo').scrollTop; renderCapas(); $('.hoja .cuerpo').scrollTop = sc;
  },
  'radio-modo'(v) { ui.radioModo = v; render(); },
  est(v) { P.radio.estacion = (P.radio.estacion + +v + ESTACIONES.length) % ESTACIONES.length; render(); const e = ESTACIONES[P.radio.estacion]; aviso(`📻 ${e.nombre} · ${e.lugar}`); },
  estacion(v) { P.radio.estacion = +v; ui.hoja = null; render(); const e = ESTACIONES[+v]; aviso(`📻 ${e.nombre} · ${e.lugar} (de mentira)`); },
  seco() { P.radio.seco = !P.radio.seco; render(); aviso(P.radio.seco ? 'SECO: lo que samplees se guarda SIN los FX' : 'Lo que samplees se guarda CON los FX'); },
  'cadena-radio'() { if (modo() === 'tablet') { ui.sel = 'radio'; ui.plug = null; } else { ui.tab = 'pistas'; ui.pista = 'radio'; ui.plug = null; } render(); },
  eso() { guardar(); nuevaFrase(4); },
  frase(v) { aviso(`Frase ${v} sonaría en Oído (prototipo: sin audio de la radio)`); },
  tempo(v) { guardar(); poner('tempo', P.tempo + +v); render(); },
  tap() {
    const t = performance.now(); ui.taps = (ui.taps || []).filter(x => t - x < 2500); ui.taps.push(t);
    if (ui.taps.length >= 3) { const d = (ui.taps[ui.taps.length - 1] - ui.taps[0]) / (ui.taps.length - 1); poner('tempo', 60000 / d); renderCapas(); }
  },
  saltar(v) { ui.desde = (+v - 1) * 4 - (Sonido.tocando ? Sonido.posicion() : 0); render(); aviso(`→ compás ${v}`); },
  clip(v) { P.clip = +v; ui.compas = 0; ui.hoja = null; Sonido.reiniciarPasos(); render(); },
  'clip-nuevo'() {
    guardar(); const c = JSON.parse(JSON.stringify(patron())); c.nombre = 'patrón ' + String.fromCharCode(65 + P.ritmo.length);
    P.ritmo.push(c); P.clip = P.ritmo.length - 1; ui.compas = 0; ui.hoja = null; Sonido.reiniciarPasos(); render(); aviso(`＋ ${c.nombre}`, true);
  },
  rej(v) {
    guardar(); const f = patron().filas[ui.fila], n0 = rejDe(f).n, n1 = REJILLAS.find(r => r.id === v).n;
    f.pasos = f.pasos.map(c => { const nc = Array(n1).fill(null); c.forEach((g, q) => { if (g) { const p = Math.round(q * n1 / n0) % n1; nc[p] = nc[p] || g; } }); return nc; });
    f.rej = v; Sonido.reiniciarPasos(); render();
  },
  limpiar(v) {
    guardar(); const f = patron().filas[ui.fila], n = rejDe(f).n;
    if (v === 'compas') f.pasos[ui.compas] = Array(n).fill(null); else f.pasos = f.pasos.map(() => Array(n).fill(null));
    ui.hoja = null; render(); aviso('Limpio', true);
  },
  compases(v) {
    guardar(); const pat = patron(), n1 = +v;
    pat.filas.forEach(f => { const n = rejDe(f).n; const nuevo = []; for (let c = 0; c < n1; c++) nuevo.push(f.pasos[c] ? f.pasos[c] : f.pasos[c % f.pasos.length].map(g => g && Object.assign({}, g))); f.pasos = nuevo; });
    pat.compases = n1; if (ui.compas >= n1) ui.compas = 0; Sonido.reiniciarPasos(); render();
  },
  kit(v) { guardar(); const b = pistaBateria(); b.inst.preset = v; aplicarSonido(); render(); oirPaso(0); setTimeout(() => oirPaso(1), 180); },
  'paso-mas'() { ui.hoja.mas = true; renderCapas(); },
  rep(v) { guardar(); const { f, c, p } = ui.hoja.x; const g = patron().filas[f].pasos[c][p]; g.rep = +v; renderCapas(); refrescarCeldas(); oirPaso(f, g); },
  'quitar-golpe'() { guardar(); const { f, c, p } = ui.hoja.x; patron().filas[f].pasos[c][p] = null; ui.hoja = null; render(); },
  nt(v) {
    if (v === 'MIDI') { ui.hoja = null; abrirBrowser('nueva'); return; }
    guardar(); ui.hoja = null;
    const t = v === 'AUDIO' ? crearPista('AUDIO', { entrada: 'Apollo · entrada 1' }) : crearPista('BATERIA', { inst: nuevoFx(plug('Batería de Oído'), 'Boom Bap') });
    irAPista(t.uid); aviso(`＋ ${t.nombre} creada`, true);
  },
  color(v) { const p = getPista(pistaActual()); if (!ui.hoja.s0) ui.hoja.s0 = foto(); p.color = v; renderCapas(); render(); },
  'nombre-ok'() {
    const p = getPista(pistaActual()), inp = $('#in-nombre');
    const s0 = ui.hoja.s0 || foto();
    const n = (inp.value || '').trim().toUpperCase().slice(0, 14); if (n) p.nombre = n;
    confirmar(s0); ui.hoja = null; render();
  },
  'quitar-pista'() {
    const uid = pistaActual(), i = P.pistas.findIndex(p => p.uid === uid); if (i < 0) return;
    const s0 = ui.hoja.s0 || foto(); const [p] = P.pistas.splice(i, 1); confirmar(s0);
    ui.hoja = null; ui.pista = null; ui.plug = null; validarUi(); render(); aviso(`🗑 ${p.nombre} quitada`, true);
  },
  entrada(v) { guardar(); getPista(pistaActual()).entrada = v; ui.hoja = null; render(); },
  'br-filtro'(v) { ui.br.filtro = v; ui.br.verPresets = null; renderCapas(); },
  'br-elegir'(v, el) { brElegir(v, el.dataset.x || null); },
  'br-estrella'(v) { const i = P.favs.indexOf(v); if (i >= 0) P.favs.splice(i, 1); else P.favs.push(v); const sc = $('#br-res').scrollTop; $('#br-res').innerHTML = resultadosBrowser(); $('#br-res').scrollTop = sc; },
  'br-presets'(v) { ui.br.verPresets = v || null; renderCapas(); $('#br-res').scrollTop = 0; },
  'br-ok'() { brOk(); },
  'br-cancelar'() { cerrarHoja(); },
};

function nuevaFrase(c, desde) {
  const e = ESTACIONES[P.radio.estacion], n = P.frases.length + 1;
  const col = ['#f8d3c4', '#d6e2f0', '#dcebd6', '#eadcf2', '#f6e7bf', '#d3eeec'][n % 6];
  P.frases.push({ n, nombre: e.nombre.split(' ')[0].toUpperCase().slice(0, 8), c, color: col });
  ui.marca = desde !== undefined ? [desde, desde + c] : [8 - c, 8];
  render(); aviso(`¡ESO! frase ${n} · ${c} c de ${e.nombre}${P.radio.seco ? ' (seca)' : ' (con FX)'}`, true);
}
function refrescarTransporte() {
  $$('.bt-play').forEach(b => { b.classList.toggle('tocando', Sonido.tocando); b.textContent = Sonido.tocando ? '❚❚' : '▶'; });
  $$('.bt-rec').forEach(b => { b.classList.toggle('on', ui.rec); if (b.textContent.trim()) b.innerHTML = `<span class="punto"></span> ${ui.rec ? 'GRABANDO' : 'GRABAR'}`; });
}
function refrescarCeldas() { $$('.paso').forEach(pintarCelda); }

// ---------- eventos: clic ----------
document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]'); if (!el) return;
  if (Date.now() - ui.sinClick < 350) return;
  const f = ACC[el.dataset.a]; if (f) { e.preventDefault(); f(el.dataset.v, el); }
});
document.addEventListener('input', e => {
  if (e.target.id === 'in-br') { ui.br.q = e.target.value; ui.br.verPresets = null; $('#br-res').innerHTML = resultadosBrowser(); }
  if (e.target.id === 'in-est') $('#res-est').innerHTML = resEstaciones(e.target.value);
});
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.id === 'in-nombre') ACC['nombre-ok']();
  if (e.key === 'Enter' && e.target.tagName === 'INPUT') e.target.blur();
});
['pointerup', 'touchend', 'click'].forEach(t => document.addEventListener(t, () => Sonido.iniciar(), { capture: true, passive: true }));
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('dblclick', e => e.preventDefault());
document.addEventListener('contextmenu', e => { if (!e.target.closest('input')) e.preventDefault(); });

// ---------- eventos: arrastres (pointer events, multitoque) ----------
function seguir(e, mueve, suelta) {
  const id = e.pointerId;
  const mv = ev => { if (ev.pointerId === id) mueve(ev); };
  const up = ev => {
    if (ev.pointerId !== id) return;
    removeEventListener('pointermove', mv); removeEventListener('pointerup', up); removeEventListener('pointercancel', up);
    suelta(ev, ev.type === 'pointercancel');
  };
  addEventListener('pointermove', mv); addEventListener('pointerup', up); addEventListener('pointercancel', up);
}
document.addEventListener('pointerdown', e => {
  const el = e.target.closest('[data-pd]'); if (!el) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  const h = PD[el.dataset.pd]; if (h) h(e, el);
});

const PD = {
  'cerrar-desl'(e, el) {
    if (e.target.closest('button')) return;
    const hoja = el.closest('.hoja'), y0 = e.clientY;
    seguir(e, ev => { const dy = Math.max(0, ev.clientY - y0); hoja.style.transform = (modo() === 'depie' || hoja.classList.contains('completa') ? '' : 'translateX(-50%) ') + `translateY(${dy}px)`; },
      (ev, cancel) => { const dy = ev.clientY - y0; hoja.style.transform = ''; if (!cancel && dy > 80) { ui.sinClick = Date.now(); if (ui.hoja && ui.hoja.tipo === 'browser') cerrarHoja(); else cerrarHoja(); } });
  },
  paso(e, el) {
    e.preventDefault();
    const f = +el.dataset.f, c = +el.dataset.c, p = +el.dataset.p, fila = patron().filas[f];
    const s0 = foto(), x0 = e.clientX, y0 = e.clientY;
    let intencion = null, movio = false, mantuvo = false; const vistos = new Set([p]);
    if (!fila.pasos[c][p]) {
      fila.pasos[c][p] = golpe(100); intencion = 'poner'; pintarCelda(el);
      if (!Sonido.tocando) oirPaso(f, fila.pasos[c][p]);
    }
    el.classList.add('apretado', 'manteniendo');
    const tm = setTimeout(() => {
      if (movio) return;
      mantuvo = true; el.classList.remove('apretado', 'manteniendo');
      if (!fila.pasos[c][p]) fila.pasos[c][p] = golpe(100);
      confirmar(s0);
      el.classList.add('editando');
      $$('.aviso').forEach(e => e.remove()); ui.hoja = { tipo: 'paso', x: { f, c, p } }; renderCapas();
    }, 500);
    const enCelda = ev => {
      const t = document.elementFromPoint(ev.clientX, ev.clientY);
      const ce = t && t.closest('.paso'); if (!ce || +ce.dataset.f !== f || +ce.dataset.c !== c) return;
      const q = +ce.dataset.p; if (vistos.has(q)) return; vistos.add(q);
      const g = fila.pasos[c][q];
      if (intencion === 'poner' && !g) { fila.pasos[c][q] = golpe(100); pintarCelda(ce); if (!Sonido.tocando) oirPaso(f); }
      else if (intencion === 'quitar' && g) { fila.pasos[c][q] = null; pintarCelda(ce); }
    };
    seguir(e, ev => {
      if (mantuvo) return;
      if (!movio && Math.hypot(ev.clientX - x0, ev.clientY - y0) > 18) {
        const t = document.elementFromPoint(ev.clientX, ev.clientY), ce = t && t.closest('.paso');
        if (ce === el) return; // sigue en su celda: el pulgar tiembla, no es arrastre
        movio = true; clearTimeout(tm); el.classList.remove('manteniendo', 'apretado');
        if (!intencion) intencion = 'quitar'; // la celda de origen solo se quita con un toque
      }
      if (movio) enCelda(ev);
    }, (ev, cancel) => {
      clearTimeout(tm); el.classList.remove('apretado', 'manteniendo');
      if (mantuvo) return;
      if (!movio && !intencion && !cancel) { fila.pasos[c][p] = null; pintarCelda(el); }
      confirmar(s0);
      $$('.rejilla').forEach(r => $$('.paso', r).forEach(pintarCelda));
    });
  },
  sonido(e, el) {
    const f = +el.dataset.f;
    Sonido.iniciar();
    if (ui.rec && Sonido.tocando && modo() !== 'tablet') { grabarGolpe(f); el.classList.add('apretado'); seguir(e, () => { }, () => el.classList.remove('apretado')); return; }
    oirPaso(f);
    if (ui.fila !== f) { ui.fila = f; render(); }
  },
  pad(e, el) {
    e.preventDefault(); const f = +el.dataset.f; Sonido.iniciar();
    if (ui.rec && Sonido.tocando) grabarGolpe(f); else oirPaso(f);
    el.classList.add('apretado'); seguir(e, () => { }, () => el.classList.remove('apretado'));
  },
  desl(e, el) {
    e.preventDefault();
    const k = el.dataset.k, d = descr(k), r = el.getBoundingClientRect(), s0 = foto(), abs = !!el.dataset.abs;
    let v0 = valor(k), x0 = e.clientX;
    const deX = x => d.min + clamp((x - r.left) / r.width, 0, 1) * (d.max - d.min);
    if (abs) { poner(k, iman(d, deX(e.clientX))); refrescarDesl(k); refrescarCeldaDeK(k); }
    seguir(e, ev => {
      let v = abs ? deX(ev.clientX) : v0 + (ev.clientX - x0) / r.width * (d.max - d.min);
      poner(k, iman(d, v)); refrescarDesl(k); refrescarCeldaDeK(k);
    }, () => {
      confirmar(s0);
      if (k.startsWith('g:')) { const a = k.split(':'); oirPaso(+a[1], patron().filas[+a[1]].pasos[+a[2]][+a[3]]); }
    });
  },
  fader(e, el) {
    e.preventDefault();
    const k = el.dataset.k, r = el.getBoundingClientRect(), s0 = foto(), v0 = valor(k), y0 = e.clientY;
    const t = el.querySelector('.tope');
    seguir(e, ev => { poner(k, v0 - (ev.clientY - y0) / (r.height * 0.8)); t.style.top = tope(valor(k)) + '%'; }, () => confirmar(s0));
  },
  perilla(e, el) {
    e.preventDefault();
    const k = el.dataset.k, s0 = foto(), v0 = valor(k), x0 = e.clientX, y0 = e.clientY;
    seguir(e, ev => {
      poner(k, v0 + ((ev.clientX - x0) - (ev.clientY - y0)) / 220); refrescarPerilla(k);
      if (k.startsWith('rk:')) refrescarXY();
    }, () => confirmar(s0));
  },
  xy(e, el) {
    e.preventDefault();
    const i = +el.dataset.i, r = el.getBoundingClientRect(), s0 = foto();
    const mover = ev => {
      P.radio.k[i * 2] = clamp(((ev.clientX - r.left) / r.width - 0.06) / 0.88, 0, 1);
      P.radio.k[i * 2 + 1] = clamp(1 - ((ev.clientY - r.top) / r.height - 0.06) / 0.88, 0, 1);
      refrescarXY(); refrescarPerilla('rk:' + i * 2); refrescarPerilla('rk:' + (i * 2 + 1));
    };
    el.classList.add('activo'); mover(e);
    seguir(e, mover, () => { el.classList.remove('activo'); confirmar(s0); });
  },
  asa(e, el) {
    e.preventDefault(); e.stopPropagation();
    const lista = el.closest('[data-lista]'), filas = $$(':scope > .renglon[data-i]', lista);
    const row = el.closest('.renglon'), i0 = filas.indexOf(row), alto = row.offsetHeight + 8, y0 = e.clientY;
    const sc = row.closest('.desliza'), st0 = sc ? sc.scrollTop : 0;
    let dest = i0, ultY = e.clientY; row.classList.add('arrastrando');
    const mover = () => {
      const dy = ultY - y0 + (sc ? sc.scrollTop - st0 : 0); row.style.transform = `translateY(${dy}px) scale(1.02)`;
      dest = clamp(i0 + Math.round(dy / alto), 0, filas.length - 1);
      filas.forEach((f, j) => { if (f === row) return; f.style.transform = (j > i0 && j <= dest) ? `translateY(${-alto}px)` : (j < i0 && j >= dest) ? `translateY(${alto}px)` : ''; f.style.transition = 'transform .12s'; });
    };
    const auto = setInterval(() => {
      if (!sc) return; const r = sc.getBoundingClientRect();
      if (ultY < r.top + 60) sc.scrollTop -= 8; else if (ultY > r.bottom - 60) sc.scrollTop += 8; else return;
      mover();
    }, 16);
    seguir(e, ev => { ultY = ev.clientY; mover(); }, () => {
      clearInterval(auto);
      filas.forEach(f => { f.style.transform = ''; f.style.transition = ''; }); row.classList.remove('arrastrando');
      if (dest !== i0) {
        guardar();
        const k = lista.dataset.lista, arr = k === 'pistas' ? P.pistas : getPista(k.slice(3)).fx;
        arr.splice(dest, 0, arr.splice(i0, 1)[0]);
      }
      ui.sinClick = Date.now(); render();
    });
  },
  'fila-fx'(e, el) {
    if (e.target.closest('button') || e.target.closest('[data-pd="asa"]')) return;
    const x0 = e.clientX, y0 = e.clientY; let horiz = null, dx = 0;
    seguir(e, ev => {
      dx = ev.clientX - x0; const dy = ev.clientY - y0;
      if (horiz === null && Math.hypot(dx, dy) > 10) horiz = Math.abs(dx) > Math.abs(dy) * 1.3;
      if (horiz && dx < 0) { el.style.transform = `translateX(${dx}px)`; el.style.opacity = clamp(1 + dx / 300, 0.35, 1); el.style.background = dx < -100 ? '#f7c7bd' : ''; }
    }, (ev, cancel) => {
      el.style.transform = ''; el.style.opacity = ''; el.style.background = '';
      if (horiz) ui.sinClick = Date.now();
      if (horiz && dx < -100 && !cancel) ACC['quitar-fx'](el.dataset.uid);
    });
  },
  tira(e, el) {
    e.preventDefault();
    const r = el.getBoundingClientRect(), bar = x => clamp(Math.floor((x - r.left) / r.width * 8), 0, 7);
    const a = bar(e.clientX); ui.marca = [a, a + 1]; dibujarTira();
    seguir(e, ev => { const b = bar(ev.clientX); ui.marca = [Math.min(a, b), Math.max(a, b) + 1]; dibujarTira(); },
      (ev, cancel) => { if (cancel) return; const [x, y] = ui.marca; guardar(); nuevaFrase(y - x, x); });
  },
};
function iman(d, v) { if (d.iman && Math.abs(v) < d.iman) return 0; return v; }
function refrescarCeldaDeK(k) {
  if (!k.startsWith('g:')) return;
  const a = k.split(':');
  $$(`.paso[data-f="${a[1]}"][data-c="${a[2]}"][data-p="${a[3]}"]`).forEach(pintarCelda);
}
function refrescarXY() {
  $$('.xy').forEach(el => { const i = +el.dataset.i, b = el.querySelector('.bola'); b.style.left = 6 + P.radio.k[i * 2] * 88 + '%'; b.style.top = 6 + (1 - P.radio.k[i * 2 + 1]) * 88 + '%'; });
}
function grabarGolpe(f) {
  const pat = patron(), fila = pat.filas[f], n = rejDe(fila).n, largo = pat.compases * 4;
  const b = ((Sonido.posicion() % largo) + largo) % largo;
  const g = Math.round(b / (4 / n)) % (pat.compases * n), c = Math.floor(g / n), p = g % n;
  oirPaso(f);
  if (!fila.pasos[c][p]) { guardar(); fila.pasos[c][p] = golpe(100); $$(`.paso[data-f="${f}"][data-c="${c}"][data-p="${p}"]`).forEach(pintarCelda); }
}

// ---------- dibujo: tira de la radio ----------
function dibujarTira() {
  const cv = $('.tira canvas'); if (!cv) return;
  const r = cv.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
  cv.width = r.width * dpr; cv.height = r.height * dpr;
  const g = cv.getContext('2d'); g.scale(dpr, dpr);
  const W = r.width, H = r.height; g.clearRect(0, 0, W, H);
  if (ui.marca) { g.fillStyle = 'rgba(255,74,20,.18)'; g.fillRect(ui.marca[0] / 8 * W, 0, (ui.marca[1] - ui.marca[0]) / 8 * W, H); g.strokeStyle = '#ff4a14'; g.lineWidth = 3; g.strokeRect(ui.marca[0] / 8 * W + 1.5, 1.5, (ui.marca[1] - ui.marca[0]) / 8 * W - 3, H - 3); }
  let s = 1234 + P.radio.estacion * 977; const rnd = () => (s = (s * 1103515245 + 12345) >>> 0) / 4294967296;
  const n = Math.floor(W / 3);
  g.fillStyle = '#6d675d';
  for (let i = 0; i < n; i++) {
    const x = i * 3, fase = (i % (n / 8)) / (n / 8);
    const a = (0.25 + 0.55 * rnd()) * (0.6 + 0.4 * Math.abs(Math.sin(fase * Math.PI * 4))) * (H / 2 - 14);
    g.fillRect(x, H / 2 + 6 - a, 2, a * 2);
  }
  g.fillStyle = '#1d1d1d'; g.font = '700 11px ui-monospace, Menlo, monospace';
  for (let c = 0; c < 8; c++) { const x = c / 8 * W; g.fillRect(x, 0, c ? 1.5 : 0, H); g.fillText(String(c + 1), x + 4, 13); }
  if (ui.marca) { g.fillStyle = '#ff4a14'; g.fillText(`frase · ${ui.marca[1] - ui.marca[0]} c`, ui.marca[0] / 8 * W + 6, H - 8); }
}
function despues() {
  dibujarTira();
  const el = $('.paso.editando'); if (el && !ui.hoja) el.classList.remove('editando');
}

// ---------- cuadro a cuadro: lo que suena ----------
let ultSuena = [];
function cuadro() {
  requestAnimationFrame(cuadro);
  const tocando = Sonido.tocando;
  ultSuena.forEach(el => el.classList.remove('suena')); ultSuena = [];
  if (!tocando) { $$('[data-med]').forEach(m => m.style.height = '0'); return; }
  const pat = patron(), largo = pat.compases * 4, b = ((Sonido.posicion() % largo) + largo) % largo, c = Math.floor(b / 4);
  $$('.rejilla').forEach(r => {
    const fi = +r.dataset.fila, n = rejDe(pat.filas[fi]).n, p = Math.floor((b % 4) / (4 / n));
    const cel = r.querySelector(`.paso[data-c="${c}"][data-p="${p}"]`);
    if (cel) { cel.classList.add('suena'); ultSuena.push(cel); }
  });
  $$('.compases button').forEach((bt, i) => { if (i === c) { bt.classList.add('suena'); ultSuena.push(bt); } });
  const cs = compasActualCancion(), N = COMPASES_CANCION * 4;
  $$('[data-cabezal]').forEach(k => k.style.left = `calc(80px + (100% - 80px) * ${cs / N})`);
  const ct = $('[data-compas-txt]'); const cc = Math.floor(cs / 4) + 1;
  if (ct && ct.textContent !== `compás ${cc} de ${COMPASES_CANCION}`) {
    ct.textContent = `compás ${cc} de ${COMPASES_CANCION}`;
    $$('.secc[data-secc]').forEach(s => { const x = SECCIONES[+s.dataset.secc]; s.classList.toggle('actual', cc >= x.desde && cc <= x.hasta); });
  }
  const t = performance.now() / 1000;
  $$('[data-med]').forEach((m, i) => {
    const p = getPista(m.dataset.med); if (!p) return;
    const v = p.m ? 0 : p.vol * (0.55 + 0.35 * Math.abs(Math.sin(t * (3 + i) + i)) + 0.1 * Math.random());
    m.style.height = `calc((100% - 20px) * ${clamp(v, 0, 1)})`;
  });
}

// ---------- girar / cambiar tamaño ----------
let tRes = null, modoAnt = modo(), dimAnt = innerWidth + 'x' + innerHeight;
addEventListener('resize', () => {
  clearTimeout(tRes);
  tRes = setTimeout(() => {
    const d = innerWidth + 'x' + innerHeight; if (d === dimAnt) return; dimAnt = d;
    const m = modo();
    if (document.activeElement && document.activeElement.tagName === 'INPUT' && m === modoAnt) return; // teclado abierto: no redibujar
    if (ui.hoja && ui.hoja.tipo === 'paso') ui.hoja = null; // la lupa se cierra al girar; el paso queda
    modoAnt = m; render();
  }, 120);
});

// teclado de iOS: la capa de hojas sigue al área visible
if (window.visualViewport) {
  const vv = window.visualViewport;
  const ajustar = () => { capas.style.top = vv.offsetTop + 'px'; capas.style.height = vv.height + 'px'; capas.style.bottom = 'auto'; };
  vv.addEventListener('resize', ajustar); vv.addEventListener('scroll', ajustar);
}

// arrancar
aplicarSonido();
render();
requestAnimationFrame(cuadro);
