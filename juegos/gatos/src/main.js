// Gatos Furiosos — esqueleto del juego: Pixi v8 (render) + Matter 0.20 (física, global `Matter`).
import {Application, Container, Sprite, Texture, Graphics} from '../vendor/pixi.min.mjs';
import ART from './art.js';
import {LEVEL_W, GROUND, BOUNDS, X0, GRAVITY, STEP_MS, V_UNIT, CAT_R, SLING, CATS, LEVELS, WORLDS} from './config.js';
import {buildBackground} from './background.js';
import {Camera} from './camera.js';
import {Slingshot} from './sling.js';
import {FX} from './fx.js';
import * as SFX from './sfx.js';
import {Text} from '../vendor/pixi.min.mjs';
import {UI} from './ui.js';
import {Menus} from './menus.js';

const {Engine, Bodies, Body, Composite, Sleeping} = Matter;
const loadImg = src => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });

// ---------- texturas procedurales ----------
function canvasTex(w, h, draw, res = 1) {
  const c = document.createElement('canvas'); c.width = Math.ceil(w * res); c.height = Math.ceil(h * res);
  const k = c.getContext('2d'); k.scale(res, res); draw(k); return Texture.from(c);
}
const PAD = 14; // margen para contorno/sombra en texturas de bloques
const TEXC = new Map();
const cached = (key, make) => { if (!TEXC.has(key)) TEXC.set(key, make()); return TEXC.get(key); };
// pieles por mundo: misma física, otro material visual (Jardín: madera / maceta de barro / piedra)
const SKIN = {kitchen: {box: 'box', jar: 'jar', can: 'can', rock: 'canball', shelf: 'wood'}, garden: {box: 'wood', jar: 'pot', can: 'stone', rock: 'boulder', shelf: 'stone'}, lair: {box: 'wood', jar: 'jar', can: 'stone', rock: 'boulder', shelf: 'stone'}};
function blockTex(t, w, h, seed, damage = 0) {
  return cached(`b|${t}|${w}|${h}|${seed}|${damage}`, () => canvasTex(w + PAD * 2, h + PAD * 2, k => {
    if (t === 'canball' || t === 'boulder') ART.ball(k, PAD, PAD, w, {seed, damage, kind: t});
    else if (t === 'robot') ART.robot(k, PAD, PAD, w, h, {seed, damage});
    else if (t === 'tnt') ART.cuetes(k, PAD, PAD, w, h, {seed, damage});
    else if (t === 'wood') ART.plank(k, PAD, PAD, w, h, {seed, damage});
    else if (t === 'pot') ART.pot(k, PAD, PAD, w, h, {seed, damage});
    else if (t === 'stone') ART.stone(k, PAD, PAD, w, h, {seed, damage});
    else if (t === 'wall' || t === 'wallx') ART.wall(k, PAD, PAD, w, h, {seed, grass: t === 'wall'});   // wallx = sin pasto (Guarida)
    else if (t === 'box') ART.cardboard(k, PAD, PAD, w, h, {seed, damage, label: w > 150 && h > 150, tape: h > 100});
    else if (t === 'jar') ART.jar(k, PAD, PAD, w, h, {seed, damage, lid: seed % 2 ? '#3D8BD8' : '#C8452F'});
    else ART.can(k, PAD, PAD, w, h, {seed, damage});
  }, 1.5));
}
function mouseTex(kind, r, expr = 'normal', noPupils = false, hat = null, bruise = 0) {
  const S = r * 3.2;
  return cached(`m|${kind}|${r}|${expr}|${noPupils}|${hat}|${bruise}`, () => canvasTex(S, S, k => ART.mouse(k, S / 2, S / 2, r, kind, {look: -1, expr, noPupils, hat, bruise}), 1.5));
}
const hatTex = (which, r) => cached(`hat|${which}|${r}`, () => canvasTex(r * 2.2, r * 2, k => ART.hat(k, r * 1.1, r * 1.25, r, which), 1.5));
// las 4 caras de un ratón (normal/susto sin pupilas: las pupilas van aparte y siguen al gato) para un nivel de golpes
const mouseFaces = (k, r, hat, bruise = 0) => Object.fromEntries(['normal', 'blink', 'scared', 'laugh', 'flinch'].map(e => [e, mouseTex(k, r, e, e === 'normal' || e === 'scared', hat, bruise)]));
function catTex(img, fur, eyes, expr, size = CAT_R * 2.3 * 2, hat) { // se hornea al doble para que aguante el zoom
  const sp = ART.buildCatSprite(img, fur, size, expr, eyes, hat);
  return {tex: Texture.from(sp.canvas), ax: sp.ox / sp.canvas.width, ay: sp.cy / sp.canvas.height, footY: (sp.oy - sp.cy) / 2};
}

async function main() {
  const app = new Application();
  await app.init({resizeTo: window, background: '#2b1d14', antialias: true, resolution: Math.min(devicePixelRatio || 1, 2), autoDensity: true, textureGCActive: false}); // sin GC de texturas: en iPad la re-subida desde canvas dejaba la pantalla en negro
  document.getElementById('stage').appendChild(app.canvas);
  await Promise.all([document.fonts.load('40px "Luckiest Guy"'), document.fonts.load('40px "Lilita One"')]).catch(() => {});

  const eyes = await (await fetch('assets/cats/eyes.json')).json();
  const levels = {};
  await Promise.all(LEVELS.map(async id => { levels[id] = await (await fetch(`levels/${id}.json`)).json(); }));
  let levelId = new URLSearchParams(location.search).get('level'); if (!levels[levelId]) levelId = LEVELS[0];
  let level = levels[levelId];
  const imgs = {};
  await Promise.all(Object.entries(CATS).map(async ([n, c]) => { imgs[n] = await loadImg(c.img); }));
  const catT = {};
  // SOMBREROS (AB2): cada gato puede llevar uno (localStorage 'gatos.hats' = {omi: 'party', ...}); se hornea en todas sus caras
  const hats = (() => { try { return JSON.parse(localStorage.getItem('gatos.hats') || '{}'); } catch (e) { return {}; } })();
  const flyImgs = {};
  for (const [n, c] of Object.entries(CATS)) if (c.flyImg) flyImgs[n] = await loadImg(c.flyImg);
  function bakeCat(n) {
    const c = CATS[n], e = eyes[n], ey = [e.eyeL, e.eyeR], h = ART.HATS.includes(hats[n]) ? hats[n] : 'none', D = CAT_R * 2.3 * 2;
    const old = catT[n]; catT[n] = {calm: catTex(imgs[n], c.fur, ey, 'calm', D, h), angry: catTex(imgs[n], c.fur, ey, 'angry', D, h), blink: catTex(imgs[n], c.fur, ey, 'blink', D, h)};
    const fi = flyImgs[n];
    if (fi) { const fe = eyes[n + '-up'], fy = [fe.eyeL, fe.eyeR]; catT[n].fly = catTex(fi, c.fur, fy, 'angry', D, h); catT[n].dizzy = catTex(fi, c.fur, fy, 'blink', D, h);
      // Omi inflado: textura 4× más grande para que no se pixele al crecer
      if (n === 'omi') catT[n].puff = catTex(fi, c.fur, fy, 'angry', D * 3.2, h); }
    return old;
  }
  for (const n of Object.keys(CATS)) bakeCat(n);
  // cambiar sombrero: re-hornea las caras y reconstruye el nivel (cartas, fila y resortera toman las texturas nuevas)
  // las texturas viejas se destruyen en el siguiente buildLevel (cuando ya nadie las usa; sin GC de texturas se acumularían)
  const staleTex = [];
  function setHat(n, h) { hats[n] = h; try { localStorage.setItem('gatos.hats', JSON.stringify(hats)); } catch (e) {} const old = bakeCat(n);
    if (old) staleTex.push(...Object.values(old).map(o => o.tex));
    const i = ['mako', 'omi', 'miu'].indexOf(n); if (i >= 0) { const b = bigCat(n); staleTex.push(bigCats[i].tex, bigCats[i].blink); for (const k of Object.keys(bigCats[i])) delete bigCats[i][k]; Object.assign(bigCats[i], b); } }

  const eyeImg = await loadImg('assets/omi-eye.jpg');
  const bigCat = n => { const e = eyes[n], h = hats[n] || 'none'; const t = catTex(imgs[n], CATS[n].fur, [e.eyeL, e.eyeR], 'calm', 440, h); t.blink = catTex(imgs[n], CATS[n].fur, [e.eyeL, e.eyeR], 'blink', 440, h).tex; return t; };
  const bigCats = ['mako', 'omi', 'miu'].map(bigCat);

  // ---------- escena ----------
  const cam = new Camera();
  const BGS = {}; let bgTheme = 'kitchen', bg = BGS.kitchen = buildBackground('kitchen');
  const bgRoot = new Container();
  const world = new Container();                 // capa de juego (parallax 1)
  const behind = new Container(), actors = new Container(), front = new Container();
  // capa de la resortera: madera trasera, liga trasera, bolsa, gato, liga delantera, madera delantera (encima de los gatos en espera)
  const slingRoot = new Container(), slingBack = new Container(), slingCat = new Container(), slingFront = new Container();
  slingRoot.addChild(slingBack, slingCat, slingFront);
  world.addChild(behind, actors, slingRoot, front);
  app.stage.addChild(bgRoot, world, bg.fg);
  let wraps = [], curLayers = null, curBg = null;
  // cambia el fondo según el mundo del nivel (las capas de cada mundo se hornean una vez y se guardan)
  function useBg(theme) {
    if (wraps.length && theme === bgTheme) return;
    bgTheme = theme; const nb = BGS[theme] || (BGS[theme] = buildBackground(theme));
    bgRoot.removeChildren().forEach(c => c.destroy()); curLayers = nb.layers; curBg = nb;
    if (nb.fg !== bg.fg) { const old = bg, i = app.stage.getChildIndex(bg.fg); app.stage.removeChild(bg.fg); app.stage.addChildAt(nb.fg, i); bg = nb; if (wraps.length) resize();
      // memoria (iPad): el fondo del mundo anterior se destruye; se vuelve a hornear si se regresa a ese mundo
      for (const k in BGS) if (BGS[k] === old) delete BGS[k];
      const kill = o => o.destroy({children: true, texture: true, textureSource: true});
      old.layers.forEach(l => kill(l.node)); kill(old.fg);
      for (const [k, t] of TEXC) if (k.startsWith('b|')) { t.destroy(true); TEXC.delete(k); } }
    wraps = nb.layers.map(l => { const c = new Container(); bgRoot.addChild(c); c.addChild(l.node); return c; });
  }
  useBg(bgTheme);
  const vignette = new Sprite(canvasTex(512, 512, k => {
    k.fillStyle = ART.rad(k, 256, 230, 150, 380, [[0, 'rgba(20,10,40,0)'], [1, 'rgba(20,10,40,0.5)']]); k.fillRect(0, 0, 512, 512);
  }));
  app.stage.addChild(vignette);
  // destello blanco de pantalla en explosiones (da sensación de "bloom")
  const flashSp = new Sprite(Texture.WHITE); flashSp.alpha = 0; app.stage.addChild(flashSp); let screenFlash = 0;

  // sombras de contacto (se reutiliza una textura)
  const shadowTex = canvasTex(256, 64, k => { k.fillStyle = ART.rad(k, 128, 32, 0, 128, [[0, 'rgba(40,28,60,0.42)'], [1, 'rgba(40,28,60,0)']]); k.save(); k.translate(128, 32); k.scale(1, 0.25); k.beginPath(); k.arc(0, 0, 128, 0, Math.PI * 2); k.fill(); k.restore(); });
  const lvlBehind = new Container(); // sombras del nivel (se limpian al reiniciar)
  const contactShadow = (x, w, parent = lvlBehind) => { const s = new Sprite(shadowTex); s.anchor.set(0.5); s.width = w; s.height = w * 0.25; s.position.set(x, GROUND); parent.addChild(s); return s; };

  // resortera (parte trasera detrás del gato, delantera encima)
  const slH = SLING.h, slTexW = slH * 0.9;
  const slBack = new Sprite(canvasTex(slTexW, slH + 20, k => ART.slingshotBack(k, slTexW / 2, slH + 10, slH), 2));
  const slFront = new Sprite(canvasTex(slTexW, slH + 20, k => ART.slingshotFront(k, slTexW / 2, slH + 10, slH), 2));
  [slBack, slFront].forEach(s => { s.scale.set(0.5); s.position.set(SLING.x - slTexW / 2, GROUND - slH - 10); });
  contactShadow(SLING.x, 200, behind); behind.addChild(lvlBehind);
  slingBack.addChild(slBack); slingFront.addChild(slFront);

  // ---------- física ----------
  const engine = Engine.create({enableSleeping: true, positionIterations: 10, velocityIterations: 8});
  engine.gravity.y = 1; engine.gravity.scale = GRAVITY;
  const ground = Bodies.rectangle(LEVEL_W / 2, GROUND + 200, BOUNDS.x1 - BOUNDS.x0 + 4000, 400, {isStatic: true, friction: 1, label: 'ground'});
  Composite.add(engine.world, ground);
  const dyn = []; // {body, sprite, shadow, mat, life, max, ...}
  // Daño (research): vida base × material; daño = velocidad de cierre × factor de masa × fragilidad
  const LIFE = {tnt: 2.5, box: 13, jar: 7, can: 30, robot: 16, small: 4.5, thimble: 9, boss: 13};
  const AUTO_POWER = 1.5; // s tras el primer golpe
  const FRAGILE = {tnt: 1.5, box: 1, jar: 1.6, can: 0.55, robot: 0.8, mouse: 1};
  const PTS = {tnt: 500, box: 500, jar: 500, can: 1000, robot: 20000, mouse: 5000};
  const MAT = {tnt: {density: 0.0012, friction: 0.9}, box: {density: 0.0012, friction: 0.9}, jar: {density: 0.0016, friction: 0.35}, can: {density: 0.004, friction: 0.8}, robot: {density: 0.005, friction: 0.9}};
  let acc = 0, time = 0;
  // ---------- resortera + turnos ----------
  const sling = new Slingshot(slingBack, slingFront);
  slingFront.setChildIndex(sling.gFront, 0); // la liga delantera va bajo el brazo delantero de madera
  const trail = new Container(); behind.addChild(trail);
  const fx = new FX(front);
  const dizzyC = new Container(); front.addChild(dizzyC); // estrellitas de mareo
  // tutorial (como AB2): en el primer nivel, si nunca lo ha ganado, una manita enseña a jalar la resortera hacia atrás
  const handTex = canvasTex(120, 150, k => {
    k.lineJoin = 'round'; k.lineCap = 'round';
    const glove = () => { k.beginPath(); k.moveTo(38, 70); k.lineTo(38, 22); k.arc(50, 22, 12, Math.PI, 0); k.lineTo(62, 62);
      k.arcTo(98, 58, 100, 90, 18); k.lineTo(100, 108); k.quadraticCurveTo(100, 140, 66, 140); k.lineTo(52, 140); k.quadraticCurveTo(22, 140, 18, 104); k.lineTo(14, 86); k.quadraticCurveTo(12, 70, 26, 72); k.closePath(); };
    glove(); k.lineWidth = 12; k.strokeStyle = '#2A1F3D'; k.stroke(); k.fillStyle = '#FFFFFF'; k.fill();
    k.strokeStyle = 'rgba(42,31,61,0.35)'; k.lineWidth = 4; [[62, 66, 62, 92], [80, 62, 80, 92]].forEach(([a, b, c, d]) => { k.beginPath(); k.moveTo(a, b); k.lineTo(c, d); k.stroke(); });
    k.fillStyle = 'rgba(200,215,240,0.6)'; k.beginPath(); k.ellipse(84, 118, 12, 16, 0, 0, 7); k.fill();
  }, 2);
  const hand = new Sprite(handTex); hand.anchor.set(0.42, 0.1); hand.scale.set(0.9); hand.visible = false; front.addChild(hand);
  let tutT = 0, tutDone = false, readyIdle = 0, swapT = 0;
  // cartas de GATO NUEVO: gatos ya presentados (en pruebas con ?nofly no salen, salvo ?card)
  const metCats = new Set((() => { try { return JSON.parse(localStorage.getItem('gatos.met') || '[]'); } catch (e) { return []; } })());
  const CARDS = /[?&]card/.test(location.search) || !/[?&]nofly/.test(location.search);
  const swappedEver = () => { try { return !!localStorage.getItem('gatos.swapped'); } catch (e) { return true; } };
  function updateTutorial(dt) {
    const want = levelId === LEVELS[0] && !tutDone && state === 'ready' && !sling.aiming && !localStorage.getItem('gatos.best.' + LEVELS[0]);
    if (sling.aiming && levelId === LEVELS[0]) tutDone = true;
    hand.visible = want;
    const letGo = () => { if (sling.held) { sling.held = false; sling.pull = {x: 0, y: 0}; sling.pv = {x: 0, y: 0}; } }; // la bolsa regresa sola con el resorte
    // pista para elegir gato: si el jugador duda >3.5 s y nunca ha cambiado de gato, la manita toca a uno de la fila
    readyIdle = state === 'ready' && !sling.aiming ? readyIdle + dt : 0;
    const tq = !want && levelId !== LEVELS[0] && readyIdle > 3.5 && onSling && !swappedEver() && queue.find(q => q.name !== onSling.name && !q.hop);
    const tcd = tq && cards.get(tq.id); cardHand.visible = !!tcd;
    if (tcd) { swapT += dt; const c = swapT % 1.8, u = Math.min(1, c / 0.45), e = 1 - Math.pow(1 - u, 3);
      // la manita (encima del HUD) toca la CARTA de ese gato en el mazo de abajo
      cardHand.position.set(tcd.x + 10 + (1 - e) * 70, tcd.y - 10 + (1 - e) * 90);
      cardHand.alpha = c < 0.2 ? c / 0.2 : c > 1.45 ? Math.max(0, 1 - (c - 1.45) / 0.3) : 1;
      const press = c > 0.55 && c < 0.75; cardHand.scale.set(0.8 * (press ? 0.86 : 1));
      if (press && !tq.hintHop) { tq.hintHop = true; tcd.pop = 0.3; }
      if (!press) tq.hintHop = false;
    } else swapT = 0;
    if (!want) { tutT = 0; letGo(); return; }
    tutT += dt; const c = tutT % 2.2, r = sling.rest;
    const u = c < 0.35 ? 0 : c < 1.45 ? (c - 0.35) / 1.1 : 1, e = 1 - Math.pow(1 - u, 3);
    hand.position.set(r.x - e * 210, r.y + e * 90);
    // como en AB2: la manita de verdad estira la bolsa (y el gato se aplasta); al soltar, la bolsa rebota sin disparar
    if (c >= 0.35 && c < 1.8 && onSling && !onSling.hop) { sling.held = true; sling.aimTo({x: hand.x, y: hand.y}); }
    else letGo();
    hand.alpha = c < 0.25 ? c / 0.25 : c > 1.8 ? Math.max(0, 1 - (c - 1.8) / 0.3) : 1;
    hand.scale.set(0.9 * (c < 0.35 ? 1.15 - 0.15 * c / 0.35 : 1)); // "presiona" al inicio
  }
  // pista de poder (AB2): la primera vez que cada gato vuela, una manita "toca" junto a él con un anillo y ¡TOCA!, hasta que el jugador use el poder
  const tapped = new Set((() => { try { return JSON.parse(localStorage.getItem('gatos.tapped') || '[]'); } catch (e) { return []; } })());
  const tapHint = new Container(); tapHint.visible = false; front.addChild(tapHint);
  const tapRing = new Graphics().circle(0, 0, 40).stroke({width: 12, color: 0x1F2240, alpha: 0.5}).circle(0, 0, 40).stroke({width: 7, color: 0xFFE27A}); tapHint.addChild(tapRing);
  const tapHand = new Sprite(handTex); tapHand.anchor.set(0.42, 0.1); tapHint.addChild(tapHand);
  const tapTxt = new Text({text: '¡TOCA!', style: {fontFamily: 'Luckiest Guy', fontSize: 54, fill: '#FFE27A', stroke: {color: '#1F2240', width: 10, join: 'round'}}}); tapTxt.anchor.set(0.5, 1); tapHint.addChild(tapTxt);
  let tapT = 0;
  function updateTapHint(dt) {
    const f = flying, on = CARDS && f && !f.hit && !f.power && !tapped.has(f.q.name) && f.t > 0.45 && !ui.cardOpen;
    tapHint.visible = !!on; if (!on) { tapT = 0; return; }
    tapT += dt; const c = tapT % 0.8, p = f.body.position, k = 1 / cam.zoom, press = c > 0.3 && c < 0.45;
    tapHint.position.set(p.x + 46 * k, p.y + 22 * k); tapHint.scale.set(k);
    tapHint.alpha = Math.min(1, tapT / 0.2);
    tapHand.position.set(press ? 0 : 6, press ? 2 : 12); tapHand.scale.set(press ? 0.36 : 0.42);
    const rr = c < 0.3 ? 0 : (c - 0.3) / 0.5; tapRing.visible = c >= 0.3; tapRing.scale.set(0.3 + rr * 0.8); tapRing.alpha = 1 - rr;
    tapTxt.position.set(48, -18); tapTxt.scale.set(0.62 + (press ? 0.12 : 0) + Math.sin(tapT * 6) * 0.03);
  }
  const dizzyTex = canvasTex(64, 64, k => { k.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 12 : 27; k.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); } k.closePath();
    k.lineJoin = 'round'; k.lineWidth = 7; k.strokeStyle = '#2A1F3D'; k.stroke(); k.fillStyle = '#FFE14A'; k.fill(); k.fillStyle = 'rgba(255,255,255,0.7)'; k.beginPath(); k.arc(27, 25, 5, 0, 7); k.fill(); }, 2);
  fx.under = new Container(); world.addChildAt(fx.under, world.getChildIndex(actors)); // estelas detrás de los gatos
  let score = 0, shownScore = 0;
  const hud = new Container(); app.stage.addChild(hud);
  const scoreLbl = new Text({text: 'PUNTOS', style: {fontFamily: 'Luckiest Guy', fontSize: 34, fill: '#FFE27A', stroke: {color: '#1F2240', width: 7, join: 'round'}}});
  const scoreTxt = new Text({text: '0', style: {fontFamily: 'Luckiest Guy', fontSize: 66, fill: '#FFFFFF', stroke: {color: '#1F2240', width: 11, join: 'round'}, dropShadow: {color: '#1F2240', distance: 5, angle: Math.PI / 2, blur: 0, alpha: 0.9}}});
  scoreLbl.anchor.set(1, 0); scoreTxt.anchor.set(1, 0); hud.addChild(scoreLbl, scoreTxt);
  const addScore = (v, x, y, color, big, k) => { score += v; fx.points(x, y, v, color, big, k); SFX.points(); };
  // ---------- Destructómetro (AB2): romper bloques llena la barra; al llenarse cae un GATO EXTRA a la fila ----------
  // umbrales = 38 % y 80 % de los puntos de bloques del nivel (máx. 2 gatos extra por intento)
  const MW = 380, MH = 38;
  const meter = new Container(); hud.addChild(meter);
  const meterG = new Graphics(), meterFill = new Graphics(), meterShine = new Graphics();
  meterG.roundRect(-MW - 12, -MH / 2 - 8, MW + 24, MH + 22, 26).fill(0x1F2240);                 // base 3D
  meterG.roundRect(-MW - 12, -MH / 2 - 12, MW + 24, MH + 24, 26).fill(0x2E3488).stroke({color: 0x1F2240, width: 7});
  meterG.roundRect(-MW, -MH / 2, MW, MH, 18).fill(0x14163A);
  meterShine.roundRect(-MW + 8, -MH / 2 + 5, MW - 16, 9, 5).fill({color: 0xFFFFFF, alpha: 0.35});
  const badge = new Graphics(); badge.circle(0, 0, 50).fill(0x1F2240); badge.circle(0, -4, 50).fill(0xFFD860).stroke({color: 0x1F2240, width: 7}); badge.circle(0, -4, 38).fill(0xFFF3C4);
  badge.x = -MW - 30; badge.y = 0;
  const badgeCat = new Sprite(); badgeCat.anchor.set(0.5); badgeCat.position.set(badge.x, -6);
  const meterLbl = new Text({text: 'DESTRUCCIÓN', style: {fontFamily: 'Luckiest Guy', fontSize: 26, fill: '#FFE27A', stroke: {color: '#1F2240', width: 6, join: 'round'}}}); meterLbl.anchor.set(1, 1); meterLbl.position.set(-14, -MH / 2 - 12);
  meter.addChild(meterG, meterFill, meterShine, badge, badgeCat, meterLbl);
  const extraTxt = new Text({text: '¡GATO EXTRA!', style: {fontFamily: 'Luckiest Guy', fontSize: 120, fill: '#FFE27A', stroke: {color: '#1F2240', width: 20, join: 'round'}, dropShadow: {color: '#1F2240', distance: 10, angle: Math.PI / 2, blur: 0, alpha: 0.95}}});
  extraTxt.anchor.set(0.5); extraTxt.visible = false; app.stage.addChild(extraTxt);
  const meterState = {pts: 0, shown: 0, total: 1, step: 0, next: 'omi', flash: 0, pulse: 0, extraT: -1};
  const METER_STEPS = [0.38, 0.8];
  function pickBonusCat() { const ns = Object.keys(CATS); meterState.next = ns[Math.floor(Math.random() * ns.length)]; const t = catT[meterState.next].calm; badgeCat.texture = t.tex; badgeCat.anchor.set(t.ax, 0.42); badgeCat.scale.set(70 / t.tex.width * 1.15); }
  function resetMeter() {
    meterState.total = Math.max(1, level.blocks.reduce((s, b) => s + (b.patrol || b.static ? 0 : PTS[b.t === 'rock' ? 'can' : b.t] || 0), 0));
    Object.assign(meterState, {pts: 0, shown: 0, step: 0, flash: 0, pulse: 0, extraT: -1}); extraTxt.visible = false; meter.visible = true; pickBonusCat();
  }
  function wreck(v) {
    const m = meterState; if (m.step >= METER_STEPS.length) return;
    m.pts += v; m.pulse = 0.25;
    if (m.pts >= m.total * METER_STEPS[m.step]) {
      m.step++; m.flash = 0.6; m.extraT = 0; extraTxt.visible = true; giveExtraCat(m.next);
      if (m.step < METER_STEPS.length) setTimeout(pickBonusCat, 700);
    }
  }
  function meterFrac() { const m = meterState, lo = m.step ? METER_STEPS[m.step - 1] : 0, hi = METER_STEPS[Math.min(m.step, METER_STEPS.length - 1)];
    return m.step >= METER_STEPS.length ? 1 : Math.max(0, Math.min(1, (m.shown / m.total - lo) / (hi - lo))); }
  // el gato extra cae del cielo al final de la fila con un puf de estrellas
  function giveExtraCat(n) {
    const i = queue.length, x = slotX(i, i + 1), t = catT[n].calm, sp = new Sprite(t.tex); sp.anchor.set(t.ax, t.ay); sp.scale.set(0.5);
    const y1 = GROUND - t.footY; sp.position.set(x, y1 - 650); actors.addChild(sp);
    const q = {name: n, sprite: sp, shadow: contactShadow(x, 170), x, phase: Math.random() * 6, extra: true, id: ++qid,
      hop: {t: -0.6, dur: 0.5, x0: x, y0: y1 - 650, x1: x, y1, h: 0, fall: true, onEnd: () => { if (deckA > 0.5) return; fx.smoke(x, GROUND - 20, 70, 10); fx.burst('star', x, GROUND - 140, 12, 520, {up: 260, size: 1.0, life: 0.8}); SFX.pop(); SFX.meow(i); cam.shake(6); }}};
    queue.forEach((o, j) => { const nx = slotX(j, i + 1); if (Math.abs(nx - o.x) > 1) { o.hop = {t: -j * 0.08, dur: 0.4, x0: o.sprite.x, y0: o.sprite.y, x1: nx, y1: o.sprite.y, h: 50}; o.x = nx; } });
    // la carita sale de la insignia del Destructómetro y vuela en arco hacia su lugar en la fila (como la carta de AB2)
    const g0 = badge.getGlobalPosition(), card = new Sprite(badgeCat.texture); card.anchor.copyFrom(badgeCat.anchor); app.stage.addChild(card);
    flyCards.push({sp: card, t: 0, x0: g0.x, y0: g0.y, wx: x, s0: badgeCat.scale.x * hud.scale.x, qid: q.id}); sp.alpha = 1 - deckA;
    queue.push(q); SFX.star(2); setTimeout(() => SFX.star(1), 120);
    // si ya había perdido (sin gatos) pero el panel no ha salido, el turno sigue
    if (state === 'lose' && !resultsShown) { state = 'between'; turnWait = 1.2; laughAll = 1.3; SFX.duck(0); }
  }
  const flyCards = [];
  function updateMeter(rdt) {
    for (const c of flyCards) { c.t += rdt; const u = Math.min(1, c.t / 0.55), e = u * u * (3 - 2 * u), cd = deckA > 0.5 && cards.get(c.qid), tgt = cd ? cd.getGlobalPosition() : toScreen(c.wx, GROUND - 650);
      c.sp.position.set(c.x0 + (tgt.x - c.x0) * e, c.y0 + (tgt.y - c.y0) * e - Math.sin(u * Math.PI) * 140 * hud.scale.x);
      c.sp.scale.set(c.s0 * (1 + Math.sin(u * Math.PI) * 0.6)); c.sp.rotation = -u * Math.PI * 2; c.sp.alpha = u > 0.85 ? (1 - u) / 0.15 : 1;
      if (c.t > 0.6 && !c.sp.destroyed) { const cd = deckA > 0.5 && cards.get(c.qid); if (cd) { cd.pop = 0.3; } else fx.burst('star', c.wx, GROUND - 650, 8, 400, {size: 0.8, life: 0.5}); c.sp.destroy(); } }
    for (let i = flyCards.length - 1; i >= 0; i--) if (flyCards[i].sp.destroyed) flyCards.splice(i, 1);
    const m = meterState; if (m.shown < m.pts) m.shown = Math.min(m.pts, m.shown + Math.max(40, (m.pts - m.shown) * rdt * 5));
    const f = meterFrac(), full = m.step >= METER_STEPS.length;
    meterFill.clear();
    if (f > 0.01) { const w = Math.max(MH, MW * f);
      meterFill.roundRect(-MW, -MH / 2, w, MH, 18).fill(full ? 0x8FE05A : 0xFFB02E);
      meterFill.roundRect(-MW, -MH / 2, w, MH * 0.5, 18).fill({color: full ? 0xC8F59A : 0xFFE27A, alpha: 0.85}); }
    if (m.flash > 0) { m.flash -= rdt; meterFill.roundRect(-MW, -MH / 2, MW, MH, 18).fill({color: 0xFFFFFF, alpha: Math.max(0, m.flash / 0.6) * 0.9}); }
    if (m.pulse > 0) m.pulse -= rdt;
    const ps = 1 + Math.max(0, m.pulse) * 0.25 + (m.flash > 0 ? Math.sin(m.flash * 30) * 0.06 : 0);
    badge.scale.set(ps); badgeCat.scale.set(ps * 70 / (badgeCat.texture.width || 1) * 1.15); badgeCat.alpha = full ? 0.35 : 1;
    if (m.extraT >= 0) { m.extraT += rdt; const u = m.extraT;
      const sc = Math.min(app.screen.width / 2048, app.screen.height / 1536) * 1.25, uin = Math.min(1, u / 0.35), uout = Math.max(0, (u - 1.5) / 0.35);
      extraTxt.position.set(app.screen.width / 2, app.screen.height * 0.24 - uout * 60 * sc); extraTxt.scale.set(sc * (0.3 + 0.7 * backOutE(uin)) * (1 + Math.sin(u * 9) * 0.03));
      extraTxt.rotation = Math.sin(u * 5) * 0.04; extraTxt.alpha = 1 - uout;
      if (u > 1.85) { m.extraT = -1; extraTxt.visible = false; } }
  }
  // ---------- estrellas del HUD (AB2): bajo los puntos, se encienden en orden al cruzar los umbrales del nivel ----------
  // encendidas = (puntos ≥ 2★) + (puntos ≥ 3★) + (ganó) → la 1ª se prende con el primer umbral o al caer el último ratón
  const SR = 30, starOffT = canvasTex(80, 80, k => ART.star(k, 40, 42, SR, false), 2), starOnT = canvasTex(80, 80, k => ART.star(k, 40, 42, SR, true), 2);
  const sparkT = canvasTex(32, 32, k => { k.fillStyle = '#FFF6C0'; k.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i % 2 ? 4 : 15; k.lineTo(16 + Math.cos(a) * r, 16 + Math.sin(a) * r); } k.fill(); });
  const hudStars = new Container(); hud.addChild(hudStars);
  const hStar = [0, 1, 2].map(i => { const off = new Sprite(starOffT), on = new Sprite(starOnT); for (const o of [off, on]) { o.anchor.set(0.5, 0.525); o.scale.set(0.5); o.x = (i - 2) * 66 - 30; hudStars.addChild(o); }
    // relleno parcial (AB2): la siguiente estrella se va llenando de oro desde abajo conforme suben los puntos
    const fill = new Sprite(starOnT), mk = new Graphics(); fill.anchor.set(0.5, 0.525); fill.scale.set(0.5); fill.x = on.x; fill.alpha = 0.6; fill.tint = 0xFFE9A0;
    hudStars.addChildAt(fill, hudStars.getChildIndex(on)); hudStars.addChild(mk); fill.mask = mk; fill.visible = false;
    on.visible = false; return {off, on, fill, mk, fr: 0, t: -1}; });
  const hudSparks = []; let starsLit = 0;
  function resetHudStars() { starsLit = 0; for (const s of hStar) { s.on.visible = false; s.t = -1; s.fr = 0; s.fill.visible = false; } for (const p of hudSparks) p.destroy(); hudSparks.length = 0; }
  function updateHudStars(rdt) {
    const st = level?.stars || [0, 1e9, 1e9];
    { const k = (shownScore >= st[1]) + (shownScore >= st[2]), prev = k ? st[1] : 0, fr = k < 2 && starsLit < 3 ? Math.max(0, Math.min(1, (shownScore - prev) / Math.max(1, st[k + 1] - prev))) : 0;
      hStar.forEach((s, i) => { const tgt = i === starsLit ? fr : 0; s.fr += (tgt - s.fr) * Math.min(1, rdt * 8); if (tgt === 0 && i !== starsLit) s.fr = 0;
        s.fill.visible = s.fr > 0.01 && !s.on.visible; if (!s.fill.visible) return;
        const h = s.fill.height, top = -h * 0.525 + h * 0.08, bot = h * 0.475 - h * 0.06, y = bot - (bot - top) * s.fr;
        s.mk.clear().rect(s.fill.x - h / 2, y, h, bot - y + 4).fill(0xFFFFFF); }); }
    const want = Math.min(3, (shownScore >= st[1]) + (shownScore >= st[2]) + (state === 'win'));
    if (want > starsLit && hStar[starsLit].t < 0) { const s = hStar[starsLit]; s.on.visible = true; s.t = 0; SFX.star(starsLit);
      for (let j = 0; j < 9; j++) { const p = new Sprite(sparkT), a = j / 9 * Math.PI * 2 + Math.random() * 0.4, v = 160 + Math.random() * 140; p.anchor.set(0.5); p.position.set(s.on.x, 0);
        p.vx = Math.cos(a) * v; p.vy = Math.sin(a) * v - 60; p.life = 0.5 + Math.random() * 0.2; p.t = 0; hudStars.addChild(p); hudSparks.push(p); }
      starsLit++; }
    for (const s of hStar) if (s.t >= 0) { s.t += rdt; const u = Math.min(1, s.t / 0.45);
      s.on.scale.set(0.5 * (u < 1 ? Math.max(0.05, backOutE(u, 2.6)) : 1) * (1 + Math.max(0, 0.6 - s.t) * 0.5)); s.on.rotation = (1 - u) * -0.9; if (u >= 1 && s.t > 0.6) s.t = -2; }
    for (let i = hudSparks.length - 1; i >= 0; i--) { const p = hudSparks[i]; p.t += rdt; p.x += p.vx * rdt; p.y += p.vy * rdt; p.vy += 300 * rdt; p.vx *= 0.96;
      p.rotation += rdt * 6; p.alpha = Math.max(0, 1 - p.t / p.life); p.scale.set(0.6 + p.alpha * 0.6); if (p.t >= p.life) { p.destroy(); hudSparks.splice(i, 1); } }
  }
  const backOutE = (u, s = 1.9) => 1 + (s + 1) * Math.pow(u - 1, 3) + s * Math.pow(u - 1, 2);
  const PTS_COL = {tnt: '#FFB07A', robot: '#FF9A8A', box: '#FFD08A', jar: '#BDEBFF', can: '#E6E9F0', mouse: '#A8F06A'};
  let started = 0, slow = 0, lastFocus = 0; // segundos desde que arrancó el nivel (el primer segundo no hay daño)

  // aspiradora robot: patrulla entre patrol[0] y patrol[1] con aceleración suave; un golpe fuerte la aturde 0.8 s
  // entrada del jefe (durante el sobrevuelo): la aspiradora con la Rata Jefa cae del techo, azota, rebota y la Jefa se burla
  const ENTER_DROP = 1500, ENTER_T0 = 0.35, ENTER_FALL = 0.62;
  function enterRobot(d, dt) {
    const e = d.enter, r = dyn.find(o => o.ride && !o.dead); e.t += dt;
    const skip = state !== 'intro'; // si saltan el sobrevuelo, llega de inmediato
    let u = skip ? 1 : Math.max(0, (e.t - ENTER_T0) / ENTER_FALL), y;
    if (u < 1) y = e.y - ENTER_DROP * (1 - u * u);       // caída acelerada
    else { const k = Math.min(1, (e.t - ENTER_T0 - ENTER_FALL) / 0.45); y = e.y - (skip ? 0 : Math.sin(k * Math.PI) * 70 * (1 - k)); // rebotito
      if (!e.landed) { e.landed = true; if (!skip) { cam.shake(26, 0.5); SFX.slam(); SFX.boom(); startle(d.body.position.x, 1); fx.smoke(d.body.position.x, GROUND - 10, d.w * 0.28, 8);
        fx.burst('smoke', d.body.position.x, GROUND - 20, 14, 900, {dir: Math.PI, spread: 0.35, up: 40, g: -40, drag: 3, life: 1.0, size: 1.2, grow: 1.5});
        fx.burst('smoke', d.body.position.x, GROUND - 20, 14, 900, {dir: 0, spread: 0.35, up: 40, g: -40, drag: 3, life: 1.0, size: 1.2, grow: 1.5}); }
        if (r) { r.laugh = 1.8; setTimeout(() => { SFX.villain(); SFX.giggle(); }, skip ? 0 : 280); if (!skip) say(r, '¡EL ATÚN\nES MÍO!', 2.4); } }
      if (k >= 1 || skip) { d.enter = null; if (r) r.enter = null; Body.setPosition(d.body, {x: d.body.position.x, y: e.y}); Body.setVelocity(d.body, {x: 0, y: 0}); return; } }
    Body.setPosition(d.body, {x: d.body.position.x, y}); Body.setVelocity(d.body, {x: 0, y: 0}); Body.setAngle(d.body, u < 1 ? Math.sin(e.t * 9) * 0.05 * u : 0);
    if (r) { Body.setPosition(r.body, {x: r.body.position.x, y: y + e.ry}); Body.setVelocity(r.body, {x: 0, y: 0}); if (u < 1) r.hurt = 0.3; }
    d.bar.alpha = u >= 1 ? 1 : 0;
  }
  // globo de diálogo de cómic sobre un ratón (cae con rebote, sigue al ratón y se desvanece)
  const bubbles = [];
  const sayT = {};
  function say(d, text, dur, sc = 1) {
    const c = new Container(), t = new Text({text, style: {fontFamily: 'Luckiest Guy', fontSize: 64, fill: '#2B2F45', align: 'center', lineHeight: 64}}); t.anchor.set(0.5, 0.42);
    const w = t.width + 80, h = t.height + 56, g = new Graphics();
    g.roundRect(-w / 2 + 6, -h / 2 + 10, w, h, 46).fill({color: 0x1F2240, alpha: 0.35});
    g.poly([-10, h / 2 - 6, 44, h / 2 - 6, -60, h / 2 + 62]).fill(0xFFFFFF).stroke({color: 0x1F2240, width: 9, join: 'round'});
    g.roundRect(-w / 2, -h / 2, w, h, 46).fill(0xFFFFFF).stroke({color: 0x1F2240, width: 9}); g.rect(-4, h / 2 - 12, 42, 14).fill(0xFFFFFF);
    c.addChild(g, t); front.addChild(c); bubbles.push({c, d, t: 0, dur, h, sc});
  }
  function updateBubbles(dt) {
    for (let i = bubbles.length - 1; i >= 0; i--) { const b = bubbles[i]; b.t += dt; const u = Math.min(1, b.t / 0.35), out = Math.max(0, (b.t - b.dur) / 0.25);
      if (b.d.dead || out >= 1) { b.c.destroy({children: true}); bubbles.splice(i, 1); continue; }
      const p = b.d.body.position; b.c.position.set(p.x + 70 * b.sc, p.y - b.d.h * 0.5 - (b.h / 2 + 180) * b.sc + Math.sin(b.t * 3) * 6);
      b.c.scale.set(Math.max(0.05, backOutE(u, 2.4)) * (1 - out * 0.3) * b.sc); b.c.alpha = 1 - out; b.c.rotation = Math.sin(b.t * 4) * 0.03; }
  }
  function driveRobot(d, dt) {
    if (d.enter) { enterRobot(d, dt); return; }
    const b = d.body, p = b.position, hp = d.life / d.max;
    if (d.stun > 0) { d.stun -= dt;
      // la Rata Jefa se recupera del susto y se burla ("¡ni me hiciste nada!")
      if (d.stun <= 0) { const r = dyn.find(o => o.ride); if (r && !r.dead) { r.laugh = 1.3; SFX.giggle();
        if (d.life / d.max > 0.3 && !bubbles.some(b => b.d === r) && Math.random() < 0.6) say(r, ['¡NI ME\nHICISTE NADA!', '¡JA! ¿ESO\nES TODO?', '¡MÁS FUERTE,\nGATITOS!'][Math.floor(Math.random() * 3)], 1.6); } } }
    else {
      if (p.x > d.patrol[1]) d.dir = -1; else if (p.x < d.patrol[0]) d.dir = 1;
      d.vx += (d.dir * d.speed - d.vx) * Math.min(1, dt * 2.2);
      Body.setVelocity(b, {x: d.vx / 60, y: b.velocity.y});
      if (Math.abs(b.angle) < 0.6) { Body.setAngularVelocity(b, 0); Body.setAngle(b, b.angle * (1 - Math.min(1, dt * 4))); } // estabilizador
      d.dust -= dt; if (d.dust <= 0 && Math.abs(d.vx) > 60) { d.dust = 0.14; fx.smoke(p.x - Math.sign(d.vx) * d.w * 0.45, p.y + d.h * 0.4, 16, 1); }
    }
    // dañada: humo oscuro (<60 %) y chispas eléctricas (<30 %) que salen de la carcasa
    d.fume = (d.fume || 0) - dt;
    if (hp < 0.6 && d.fume <= 0) {
      d.fume = hp < 0.3 ? 0.16 : 0.32; const n0 = fx.parts.length;
      const bk = -(d.dir || 1); // sale por la parte de atrás (no tapa la cara de la Rata Jefa)
      fx.burst('smoke', p.x + bk * d.w * 0.44, p.y - d.h * 0.15, 1, 30, {dir: Math.atan2(-1, bk * 0.9), spread: 0.5, up: 60, g: -110, drag: 1.4, life: 1.5, size: 1.0, grow: 2.0});
      for (let i = n0; i < fx.parts.length; i++) { fx.parts[i].s.tint = hp < 0.3 ? 0x3E3844 : 0x6E6874; fx.parts[i].maxA = 0.85; }
    }
    d.zapT = (d.zapT ?? 0.5) - dt;
    if (hp < 0.3 && d.zapT <= 0) {
      d.zapT = 0.25 + Math.random() * 0.5; const sx = p.x + (Math.random() - 0.5) * d.w * 0.8, sy = p.y - d.h * 0.1 + (Math.random() - 0.5) * d.h * 0.5;
      fx.burst('zap', sx, sy, 7, 520, {up: 120, size: 0.9, life: 0.35, drag: 2.5, g: 600}); SFX.zap();
      d.sprite.tint = 0xBFE6FF; d.zapFlash = 0.06;
    }
    if (d.zapFlash > 0 && (d.zapFlash -= dt) <= 0) d.sprite.tint = 0xFFFFFF;
    // barra de vida sobre la Rata Jefa
    const k = Math.max(0, d.life / d.max), W = 260, H = 26, x = p.x - W / 2, y = p.y - d.h / 2 - 230;
    d.bar.clear().roundRect(x - 6, y - 6, W + 12, H + 12, 14).fill({color: 0x1F2240}).roundRect(x, y, W, H, 9).fill({color: 0x4A2030})
      .roundRect(x, y, Math.max(H, W * k), H, 9).fill({color: k > 0.5 ? 0x6BE04A : k > 0.25 ? 0xFFC83A : 0xFF4A3A}).roundRect(x + 6, y + 4, Math.max(8, W * k - 12), 6, 3).fill({color: 0xFFFFFF, alpha: 0.4});
  }
  function damage(d, amount, k) {
    if (d.enter) return; // el jefe es invulnerable mientras hace su entrada
    if (d.patrol && amount > 2 && !d.dead) {
      // golpe a la aspiradora: se frena en seco y la Rata Jefa se espanta y grita
      d.stun = 0.8; const r = dyn.find(o => o.ride); if (r && !r.dead) { r.hurt = 0.5; r.laugh = 0; SFX.squeak(); }
    }
    if (d.dead) return;
    d.life -= amount;
    if (d.mat !== 'mouse' && d.life > 0) {
      const st = Math.min(3, Math.floor((1 - d.life / d.max) * 4)); // 4 estados de grieta
      if (st !== d.dmg) { d.dmg = st; d.sprite.texture = d.texs[st]; }
    }
    if (d.mat === 'mouse' && d.life > 0) d.hurt = 0.35; // temblor al recibir golpe (tarea 5: cara de susto)
    if (d.life <= 0) destroyDyn(d);
  }
  function destroyDyn(d) {
    d.dead = true; const p = d.body.position;
    Composite.remove(engine.world, d.body); d.sprite.destroy(); d.shadow.destroy();
    dyn.splice(dyn.indexOf(d), 1);
    dyn.forEach(o => Sleeping.set(o.body, false)); // lo que estaba encima debe caer
    if (d.mat === 'mouse') {
      fx.smoke(p.x, p.y, d.w * 0.6, 12); SFX.poof(); turnKills++;
      // los vecinos voltean asustados hacia el puf (sin mueca), como los cerdos de AB2 cuando cae uno de los suyos
      for (const o of dyn) if (o.mat === 'mouse' && !o.dead && o !== d && !o.shock && Math.hypot(o.body.position.x - p.x, o.body.position.y - p.y) < 700) o.shock = {x: p.x, y: p.y, t: -0.1 - Math.random() * 0.15, fl: 0, look: 1.1, side: 1};
      // un vecino que sobrevive se lamenta (de vez en cuando, con pausa entre globos para no saturar)
      if (time - (sayT.mourn || -9) > 3 && Math.random() < 0.45) { const nb = dyn.filter(o => o.mat === 'mouse' && !o.dead && !o.ride && !bubbles.some(b => b.d === o) && Math.hypot(o.body.position.x - p.x, o.body.position.y - p.y) < 800);
        if (nb.length) { sayT.mourn = time; const o = nb[Math.floor(Math.random() * nb.length)]; o.hurt = 0.35;
          setTimeout(() => { if (!o.dead && dyn.includes(o)) say(o, ['¡NOOO!', '¡PACO!\n¡NOOO!', '¡SE LLEVARON\nA BETO!', '¡RETIRADA!'][Math.floor(Math.random() * 4)], 1.3, 0.72); }, 250); } }
      if (!dyn.some(o => o.mat === 'mouse' || o.mat === 'robot')) { slow = 1.1; // cámara lenta breve en el último ratón
        if (flying && cam.mode === 'follow') { cam.follow({position: {x: p.x, y: p.y - 80}}, 2.3); lastFocus = 1.3; } } // y la cámara se acerca a él (AB2)
      // los gatos en espera festejan con un brinco (escalonado), como los pájaros de AB2
      queue.forEach((q, i) => { q.alert = Math.max(q.alert || 0, 0.8); if (!q.hop) q.hop = {t: -0.15 - i * 0.1, dur: 0.5, x0: q.sprite.x, y0: q.sprite.y, x1: q.sprite.x, y1: q.sprite.y, h: 110}; });
      addScore(PTS.mouse, p.x, p.y - d.h * 0.6, PTS_COL.mouse, true);
    } else {
      const n = Math.round(Math.min(26, 6 + d.w * d.h / 1500));
      fx.burst(d.skin, p.x, p.y, n, 420, {w: d.w * 0.8, h: d.h * 0.8, size: d.mat === 'jar' ? 0.9 : 1.1});
      fx.smoke(p.x, p.y, Math.max(d.w, d.h) * 0.35, d.mat === 'jar' ? 3 : 6);
      SFX.breakSfx(d.skin);
      if (d.mat === 'tnt') booms.push({x: p.x, y: p.y, t: 0.07}); // caja de cuetes: explota (en cadena, con un respiro entre cada una)
      if (d.mat === 'robot') { d.bar.destroy(); fx.explosion(p.x, p.y, 240); fx.ring(p.x, p.y, 380, 0xFFB0A0); fx.burst('can', p.x, p.y, 22, 900, {up: 300, size: 1.3}); cam.shake(40); cam.punch(0.07); SFX.boom(); screenFlash = 0.12; startle(p.x, 1);
        if (!dyn.some(o => o.mat === 'mouse' || o.mat === 'robot')) slow = 1.1; }
      addScore(PTS[d.mat], p.x, p.y - d.h * 0.3, PTS_COL[d.mat]);
      if (d.mat !== 'robot') wreck(PTS[d.mat]);
    }
  }
  const byBody = b => dyn.find(o => o.body === b);
  // Aplastamiento: un ratón con algo pesado encima que se sigue moviendo (resbalando, rodando) recibe daño continuo
  function crush(dt) {
    for (const pr of engine.pairs.list) {
      if (!pr.isActive) continue;
      for (const [me, other] of [[pr.bodyA, pr.bodyB], [pr.bodyB, pr.bodyA]]) {
        if (me.label !== 'mouse' || other.isStatic || other.position.y > me.position.y - 10) continue;
        const d = byBody(me); if (!d) continue;
        const heavy = other.mass / me.mass, mov = other.speed + Math.abs(other.angularVelocity) * 30;
        if (heavy < 1.5 || mov < 0.25) continue;
        damage(d, dt * Math.min(8, Math.sqrt(heavy) * (1 + mov) * 1.4));
      }
    }
  }

  // ---------- CAJA DE CUETES (= TNT de AB2) ----------
  // al romperse: explosión que daña y empuja alrededor (puede encadenar otras cajas) + cohetes que salen volando y truenan en el aire
  const booms = [], rockets = []; let warnedTnt = false, turnKills = 0;
  const FW = [0xFF4A6A, 0x4AB8FF, 0x6BE04A, 0xFFE14A, 0xD06BFF, 0xFFFFFF];
  function updateBooms(dt) {
    for (let i = booms.length - 1; i >= 0; i--) { const b = booms[i]; if ((b.t -= dt) > 0) continue; booms.splice(i, 1);
      fx.explosion(b.x, b.y, 210); fx.ring(b.x, b.y, 340, 0xFFD0A0); fx.burst('tnt', b.x, b.y, 16, 760, {up: 280, size: 1.1});
      blast(b.x, b.y, 320, 25, 30, {can: 1.3, tnt: 3, robot: 3}); // a la aspiradora le pega fuerte (premio por el timing)
      cam.shake(26); cam.punch(0.05); SFX.boom(); SFX.crackle(); screenFlash = 0.1; startle(b.x, 0.8);
      const n = 3 + Math.floor(Math.random() * 2);
      for (let j = 0; j < n; j++) { const a = -Math.PI / 2 + (j - (n - 1) / 2) * 0.42 + (Math.random() - 0.5) * 0.25, v = 900 + Math.random() * 350;
        rockets.push({x: b.x, y: b.y - 30, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, life: 0.55 + Math.random() * 0.35, col: FW[(j + Math.floor(Math.random() * 6)) % FW.length], wig: Math.random() * 6}); } }
    for (let i = rockets.length - 1; i >= 0; i--) { const r = rockets[i]; r.t += dt;
      r.vy += 500 * dt; r.x += (r.vx + Math.sin(r.t * 22 + r.wig) * 140) * dt; r.y += r.vy * dt;
      fx.streak(r.x, r.y, 15, r.col); if (Math.random() < 0.5) fx.burst('zap', r.x, r.y, 1, 120, {up: 0, size: 0.5, life: 0.3, g: 400});
      // si el cohete se mete en un bloque o ratón truena ahí: le pega y, si es otra caja de cuetes, la enciende
      const hitD = r.t > 0.08 && dyn.find(d => !d.dead && !d.enter && d.mat !== 'robot' && Matter.Bounds.contains(d.body.bounds, r) && Matter.Vertices.contains(d.body.vertices, r));
      if (hitD) { r.t = r.life; damage(hitD, hitD.mat === 'tnt' ? 99 : 3 * FRAGILE[hitD.mat], 10); Sleeping.set(hitD.body, false);
        Body.setVelocity(hitD.body, {x: hitD.body.velocity.x + r.vx / 240, y: hitD.body.velocity.y + r.vy / 240}); cam.shake(8); }
      if (r.t >= r.life) { rockets.splice(i, 1);
        // trueno de cuete: chispas de color en esfera + destello
        const n0 = fx.parts.length; fx.burst('star', r.x, r.y, 22, 620, {up: 0, g: 260, drag: 1.6, life: 1.0, size: 0.55});
        for (let k = n0; k < fx.parts.length; k++) fx.parts[k].s.tint = k % 3 ? r.col : 0xFFFFFF;
        fx.ring(r.x, r.y, 150, r.col, 0.3); SFX.firework(); } }
  }

  // ---------- PODERES (tap en el aire una sola vez, antes del primer contacto) ----------
  // Onda radial: empuje ~ (1 - d/R), daño ~ (1 - d/R) × fragilidad × bonus por material
  function blast(x, y, R, push, dmg, bonus = {}) {
    if (R >= 200) shockMice(x, y, R);
    for (const d of [...dyn]) {
      const p = d.body.position, dx = p.x - x, dy = p.y - y, dist = Math.hypot(dx, dy);
      if (dist > R + Math.max(d.w, d.h) / 2) continue;
      const k = Math.max(0.15, 1 - dist / R), m = Math.min(1.6, Math.sqrt(40 / d.body.mass));
      Sleeping.set(d.body, false);
      const ux = dist > 1 ? dx / dist : 0, uy = dist > 1 ? dy / dist : -1;
      Body.setVelocity(d.body, {x: d.body.velocity.x + ux * push * k * m, y: d.body.velocity.y + (uy - 0.35) * push * k * m});
      Body.setAngularVelocity(d.body, d.body.angularVelocity + (Math.random() - 0.5) * 0.3 * k);
      damage(d, dmg * k * FRAGILE[d.mat] * (bonus[d.mat] ?? 1), push);
      // AB2: lo que sobrevive pegadito a la explosión queda tiznado de hollín (el ratón además echa humito un rato)
      if (dmg > 0 && R >= 200 && !d.dead && dist < R * 0.75 && d.mat !== 'robot') { d.soot = Math.max(d.soot || 0, 1 - dist / (R * 0.75) * 0.4); d.sootT = 0; }
    }
  }
  // hollín: oscurece el sprite y se va limpiando despacio (los bloques se quedan un poco tiznados)
  function updateSoot(d, dt) {
    if (!d.soot) return; d.sootT += dt;
    const keep = d.mat === 'mouse' ? 0 : 0.35, v = keep + (d.soot - keep) * Math.max(0, 1 - Math.max(0, d.sootT - 2.5) / 5);
    const c = Math.round(255 - 150 * v), b = Math.round(255 - 165 * v); if (!d.zapFlash) d.sprite.tint = (c << 16) | (c << 8) | b;
    if (d.mat === 'mouse' && d.sootT < 4.5 && Math.random() < dt * 5) { const p = d.body.position; const n0 = fx.parts.length; // humito que sube de la cabeza
      fx.burst('smoke', p.x + (Math.random() - 0.5) * d.w * 0.4, p.y - d.h * 0.45, 1, 30, {up: 70, g: -60, drag: 1.5, life: 1.1, size: 0.22 + d.w / 900, grow: 1.5});
      for (let i = n0; i < fx.parts.length; i++) { fx.parts[i].s.tint = 0x5A5560; fx.parts[i].maxA = 0.6; fx.parts[i].s.alpha = 0; } }
    if (v <= keep + 0.001) d.soot = d.mat === 'mouse' ? 0 : d.soot;
  }
  const furTex = canvasTex(64, 64, k => { k.strokeStyle = '#F4EEE4'; k.lineWidth = 7; k.lineCap = 'round'; k.beginPath(); k.moveTo(8, 50); k.quadraticCurveTo(30, 6, 56, 20); k.stroke(); k.strokeStyle = 'rgba(120,100,80,0.8)'; k.lineWidth = 3; k.stroke(); });
  fx.T.fur = [furTex];
  const flash = (x, y, r, color) => { fx.burst('smoke', x, y, 1, 0, {up: 0, g: 0, life: 0.25, size: r / 40, grow: 0.8}); const s = fx.parts[fx.parts.length - 1].s; s.tint = color; };

  function activatePower(f) {
    const b = f.body, p = b.position, name = f.q.name;
    if (!f.hit && !tapped.has(name)) { tapped.add(name); try { localStorage.setItem('gatos.tapped', JSON.stringify([...tapped])); } catch (e) {} }
    // en el rastro queda una nube de puntitos donde se usó el poder (como el "puff" del Angry Birds clásico)
    if (!f.hit) { const c = new Sprite(dotTex); c.anchor.set(0.5); c.scale.set(0.7); c.position.set(p.x, p.y); trail.addChild(c);
      for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2 + 0.3, d = new Sprite(dotTex); d.anchor.set(0.5); d.scale.set(0.24 + (k % 2) * 0.08); d.position.set(p.x + Math.cos(a) * 42, p.y + Math.sin(a) * 42); trail.addChild(d); } }
    if (name === 'mako') { // 💥 Bola de pelos: explota
      fx.explosion(p.x, p.y, 200); fx.ring(p.x, p.y, 320, 0xFFF1C8);
      screenFlash = 0.12;
      fx.burst('fur', p.x, p.y, 26, 900, {up: 120, size: 1.4, life: 1.4, drag: 1.5});
      blast(p.x, p.y, 280, 26, 34, {can: 1.6});
      cam.shake(34, 0.5); cam.punch(0.07); SFX.boom(); startle(p.x, 1);
      f.exploded = true; f.sprite.visible = false; Composite.remove(engine.world, b); f.still = 99;
    } else if (name === 'omi') { // 🐡 Esponjado: se infla ~4×, empuja, se desinfla a los 2 s
      f.inflate = {t: 0, k: 1}; SFX.inflate();
    } else if (name === 'miu') { // ⚡ Clavado: loop de 270° hacia arriba y picada vertical
      const a0 = Math.atan2(b.velocity.y, b.velocity.x);
      f.loop = {t: 0, a0, a1: -1.5 * Math.PI, dur: 0.55, v: 1150}; SFX.swoosh();
    }
  }
  function updatePower(f, dt) {
    const b = f.body;
    if (f.inflate) {
      const I = f.inflate; I.t += dt;
      // tiempos del Bubbles original (AB/AB2): se infla de golpe con rebote elástico, aguanta inflado ~2.5 s
      // y se desinfla como globo suelto (sale disparado haciendo zigzag mientras se encoge) hasta que truena
      const T_IN = 0.16, T_SET = 0.42, T_HOLD = 2.6, T_DEF = 0.8;
      let target;
      if (I.t < T_IN) { const u = I.t / T_IN; target = 1 + 3.45 * (1 - (1 - u) * (1 - u)); }          // 1 → 4.45 muy rápido
      else if (I.t < T_SET) { const u = (I.t - T_IN) / (T_SET - T_IN); target = 4 + 0.45 * Math.cos(u * Math.PI * 1.5) * (1 - u); } // rebote 4.45 → 3.8 → 4
      else if (I.t < T_HOLD) target = 4 + Math.sin((I.t - T_SET) * 5) * 0.04;                         // respira inflado
      else target = Math.max(1, 4 - 3 * Math.pow(Math.min(1, (I.t - T_HOLD) / T_DEF), 0.7));         // se desinfla
      if (Math.abs(target - I.k) > 0.005) { Body.scale(b, target / I.k, target / I.k); I.k = target; }
      if (!I.pushed && I.t >= T_IN * 0.6) { I.pushed = true; blast(b.position.x, b.position.y, CAT_R * 4.6, 17, 10, {box: 1.5, can: 0.5}); cam.shake(12); fx.ring(b.position.x, b.position.y, CAT_R * 4.8, 0xFFFFFF, 0.3); fx.burst('fur', b.position.x, b.position.y, 14, 500, {up: 60, life: 1}); }
      if (!I.deflated && I.t > T_HOLD) { I.deflated = true; SFX.deflate(); I.dir = -Math.PI / 2 + (Math.random() - 0.5) * 1.2; }
      if (I.deflated && I.t < T_HOLD + T_DEF) { // globo suelto: empuje que cambia de dirección a tirones
        I.dir += (Math.random() - 0.5) * 9 * dt + Math.sin(I.t * 23) * 4 * dt;
        const v = 520 / 1000 * V_UNIT; Body.setVelocity(b, {x: b.velocity.x * 0.8 + Math.cos(I.dir) * v * 0.2, y: b.velocity.y * 0.8 + Math.sin(I.dir) * v * 0.2});
        Body.setAngularVelocity(b, 0.25);
        if (Math.random() < 0.5) fx.burst('fur', b.position.x, b.position.y, 1, 160, {up: 0, life: 0.6, size: 0.8});
      }
      if (I.t > T_HOLD + T_DEF) { fx.smoke(b.position.x, b.position.y, CAT_R * 1.4, 7); SFX.pop(); cam.shake(4); f.inflate = null; } // ¡pop! y queda chiquito
      // con más de 1.6× usa la textura grande (misma proporción de ancla)
      const P = catT[f.q.name].puff, big = P && I.k > 1.6, T = big ? P : flyTex(f.q.name);
      if (f.sprite.texture !== T.tex) f.sprite.texture = T.tex;
      const r = big ? catT[f.q.name].fly.tex.width / P.tex.width : 1;
      f.sprite.scale.set(0.5 * r * I.k * (I.deflated ? 1 + Math.sin(I.t * 60) * 0.05 : 1), 0.5 * r * I.k * (I.deflated ? 1 - Math.sin(I.t * 60) * 0.05 : 1));
    }
    if (f.loop) {
      const L = f.loop; L.t += dt; const u = Math.min(1, L.t / L.dur);
      const a = L.a0 + (L.a1 - L.a0) * u; // gira "hacia arriba" (ángulo decreciente) hasta apuntar abajo
      Body.setVelocity(b, {x: Math.cos(a) * L.v / 1000 * V_UNIT, y: Math.sin(a) * L.v / 1000 * V_UNIT});
      f.sprite.rotation = a + Math.PI / 2;
      if (u >= 1) { f.loop = null; f.dive = true; Body.setVelocity(b, {x: 0, y: 2700 / 1000 * V_UNIT}); }
    }
    if (f.dive && !f.hit) f.sprite.rotation = 0;
    // estela tipo Silver: puntos cada ~22 u durante el loop y la picada
    if (f.loop || (f.dive && !f.hit)) {
      const p = b.position, L = f.lastStreak || (f.lastStreak = {x: p.x, y: p.y}), d = Math.hypot(p.x - L.x, p.y - L.y);
      for (let k = 1; k <= Math.floor(d / 22); k++) fx.streak(L.x + (p.x - L.x) * k * 22 / d, L.y + (p.y - L.y) * k * 22 / d, CAT_R * 0.85, f.dive ? 0xFFFFFF : 0xEDE4FF);
      if (d >= 22) { L.x = p.x; L.y = p.y; }
    }
  }
  // AB2: los ratones cerca de una explosión aprietan los ojos y se encogen (mueca) y luego se quedan viendo el humo con susto;
  // los más lejanos solo voltean asustados. El retraso crece con la distancia (la onda llega después).
  function shockMice(x, y, R) {
    for (const d of dyn) { if (d.mat !== 'mouse' || d.dead) continue;
      const p = d.body.position, dist = Math.hypot(p.x - x, p.y - y); if (dist > R * 4) continue;
      d.shock = {x, y, t: -dist / 2500, fl: dist < R * 2.2 ? 0.55 + 0.35 * (1 - dist / (R * 2.2)) : 0, look: 1.4, side: Math.sign(p.x - x) || 1}; }
  }
  // Ratones vivos: respiran, parpadean, se burlan (carcajada con saltitos) y se asustan si un gato pasa cerca
  let laughAll = 0;
  function animMouse(d, dt) {
    const t = time + d.ph, B = 1 / 1.5;
    let expr = 'normal', hop = 0;
    const fc = flying && !flying.fade ? flying.body : null;
    const near = fc && Math.hypot(fc.position.x - d.body.position.x, fc.position.y - d.body.position.y) < 650 && fc.speed > 3;
    // AB2: si va cayendo o rodando rápido, pone cara de susto y (una vez cada tanto) chilla
    const tumble = !d.ride && !d.body.isSleeping && d.body.speed > 4.5 && started > 1;
    if (tumble && time - (d.yelpT || -9) > 2.5 && d.body.velocity.y > 4) { d.yelpT = time; SFX.squeak(); }
    // AB2: si algo le viene cayendo encima, mira hacia arriba con susto y se encoge (y chilla)
    const mp0 = d.body.position, dg = !d.ride && started > 1 && !tumble ? dyn.find(o => o !== d && o.mat !== 'mouse' && !o.dead && o.body.velocity.y > 3 && mp0.y - o.body.position.y > d.h * 0.4 && mp0.y - o.body.position.y < 600 && Math.abs(o.body.position.x - mp0.x) < 60 + o.w / 2) : null;
    d.cower = Math.max(0, Math.min(1, (d.cower || 0) + (dg ? dt * 9 : -dt * 4)));
    if (dg && time - (d.yelpT || -9) > 2.5) { d.yelpT = time; SFX.squeak(); }
    d.dg = dg;
    const sh = d.shock; let flinch = 0;
    if (sh) { sh.t += dt; if (sh.t > Math.max(sh.fl, sh.look)) d.shock = null; else if (sh.t > 0) flinch = sh.t < sh.fl ? 1 : 0; }
    d.cower = Math.max(d.cower, flinch ? Math.min(1, sh.t * 14) : 0);
    if (flinch) expr = 'flinch';
    else if (d.hurt > 0 || near || tumble || dg || (sh && sh.t > 0)) expr = 'scared';
    else if (d.laugh > 0 || laughAll > 0) {
      d.laugh -= dt; expr = 'laugh';
      if (d.body.isSleeping) hop = Math.abs(Math.sin(t * 13)) * 9; // brinquitos de risa
    } else {
      if (time > d.tauntAt && (state === 'ready' || state === 'loading')) { d.laugh = 1.1; d.tauntAt = time + 5 + Math.random() * 6; }
      if (time > d.blinkAt) { expr = 'blink'; if (time > d.blinkAt + 0.13) d.blinkAt = time + 1.5 + Math.random() * 3.5; }
    }
    // golpeado (AB2): con 2/3 y 1/3 de vida le sale curita, ojo morado y el gorro se abolla y queda chueco
    const bz = d.life < d.max * 0.34 ? 2 : d.life < d.max * 0.67 ? 1 : 0;
    if (bz > d.bz) { const p = d.body.position;
      // muy golpeado: el gorro (dedal / bellota / casco de minero) sale volando, como los cascos de los cerdos de AB2
      if (bz >= 2 && (d.kind !== 'small' || d.hat) && d.hat !== 'none') {
        const which = d.kind === 'boss' ? 'crown' : d.hat || 'thimble', a = d.body.angle - Math.PI / 2, hx = p.x + Math.cos(a) * d.r * (which === 'crown' ? 0.82 : 0.62), hy = p.y + Math.sin(a) * d.r * (which === 'crown' ? 0.82 : 0.62);
        const side = flying && flying.body.position.x < p.x ? 1 : Math.random() < 0.5 ? -1 : 1;
        fx.debris(hatTex(which, d.r), hx, hy, side * (180 + Math.random() * 160), -(620 + Math.random() * 260), {size: 1 / 1.5, rot: d.body.angle, vr: side * (7 + Math.random() * 5)});
        d.hat = 'none'; if (d.beam) { d.beam.visible = false; d.beam = null; } SFX.hit('can', 0.9);
      }
      d.bz = bz; d.mt = mouseFaces(d.kind, d.r, d.hat, bz);
      fx.burst('star', p.x, p.y - d.w * 0.5, 5 + bz * 2, 300, {up: 160, size: 0.45, life: 0.5, drag: 2}); if (d.kind !== 'small' || d.hat) SFX.hit('can', 0.4 + bz * 0.2); }
    const tx = d.mt[expr]; if (d.sprite.texture !== tx) d.sprite.texture = tx;
    // pupilas: miran al gato en vuelo; si no, al gato de la resortera, con miradas de reojo de vez en cuando
    d.pup.normal.visible = expr === 'normal'; d.pup.scared.visible = expr === 'scared';
    if (expr === 'normal' || expr === 'scared') {
      const mp = d.body.position; let tgt = d.dg ? d.dg.body.position : d.shock && d.shock.t > 0 ? d.shock : fc ? fc.position : onSling ? onSling.sprite.position : null, lx = -1, ly = 0;
      if (time > d.glanceAt) { d.glance = {x: Math.random() * 2 - 1, y: Math.random() * 1.4 - 0.9, until: time + 0.6 + Math.random() * 0.8}; d.glanceAt = time + 3 + Math.random() * 5; }
      if (d.glance && time > d.glance.until) d.glance = null;
      if (tgt && (fc || d.dg || d.shock || !d.glance)) { const dx = tgt.x - mp.x, dy = tgt.y - mp.y, L = Math.hypot(dx, dy) || 1, a = -d.body.angle;
        lx = (dx * Math.cos(a) - dy * Math.sin(a)) / L; ly = (dx * Math.sin(a) + dy * Math.cos(a)) / L; }
      else if (d.glance) { lx = d.glance.x; ly = d.glance.y; }
      const k = Math.min(1, dt * (fc ? 14 : 6)); d.look.x += (lx - d.look.x) * k; d.look.y += (ly - d.look.y) * k;
      const R = d.w / 2 * 1.5, sc = expr === 'scared';
      d.pup[expr].position.set(d.look.x * R * (sc ? 0.15 : 0.1), (sc ? -0.16 : -0.09) * R + d.look.y * R * (sc ? 0.2 : 0.13));
    }
    if (d.beam) { // la lamparita del casco alumbra hacia donde mira (sigue al gato como reflector); parpadea un poco
      const ang = Math.atan2(d.look.y * 0.8, d.look.x), cur = d.beam.cone.rotation, da = Math.atan2(Math.sin(ang - cur), Math.cos(ang - cur)); d.beam.cone.rotation = cur + da * Math.min(1, dt * 8);
      d.beam.cone.alpha = (expr === 'blink' || expr === 'laugh' ? 0.55 : 0.8) * (0.9 + 0.1 * Math.sin(t * 23) * Math.sin(t * 7.3)); }
    const br = Math.sin(t * 2.6) * 0.03, sq = expr === 'scared' ? 0.06 : 0;
    const cw = d.cower * 0.16; // encogido: más ancho y chaparro, pegado al piso
    d.sprite.scale.set(B * (1 - br * 0.6 - sq * 0.5 + cw * 0.7), B * (1 + br + sq - cw));
    d.sprite.y += cw * d.h * 0.4;
    if (flinch) { const k = 1 - sh.t / sh.fl; d.sprite.x += sh.side * (Math.min(1, sh.t * 20) * 6 + Math.sin(time * 70) * 3 * k); } // se hace para atrás y tiembla
    d.sprite.y -= hop + br * d.h * 0.25;
  }
  // haz de la lámpara de minero (cono que apunta a +x, se desvanece) y resplandor del foquito
  const beamTex = canvasTex(320, 160, k => { const g = k.createLinearGradient(0, 0, 320, 0); g.addColorStop(0, 'rgba(255,240,170,0.55)'); g.addColorStop(0.35, 'rgba(255,230,150,0.22)'); g.addColorStop(1, 'rgba(255,220,140,0)');
    k.fillStyle = g; k.beginPath(); k.moveTo(0, 74); k.lineTo(320, 0); k.lineTo(320, 160); k.lineTo(0, 86); k.closePath(); k.fill();
    const g2 = k.createLinearGradient(0, 0, 200, 0); g2.addColorStop(0, 'rgba(255,255,230,0.5)'); g2.addColorStop(1, 'rgba(255,255,230,0)'); k.fillStyle = g2; k.beginPath(); k.moveTo(0, 77); k.lineTo(200, 45); k.lineTo(200, 115); k.lineTo(0, 83); k.closePath(); k.fill(); });
  const lampGlowTex = canvasTex(120, 120, k => { const g = k.createRadialGradient(60, 60, 0, 60, 60, 60); g.addColorStop(0, 'rgba(255,250,210,0.95)'); g.addColorStop(0.25, 'rgba(255,225,140,0.45)'); g.addColorStop(1, 'rgba(255,200,100,0)'); k.fillStyle = g; k.fillRect(0, 0, 120, 120); });
  const dotTex = canvasTex(40, 40, k => { k.fillStyle = 'rgba(60,40,70,0.25)'; k.beginPath(); k.arc(22, 23, 15, 0, Math.PI * 2); k.fill(); k.fillStyle = '#FFFFFF'; k.beginPath(); k.arc(19, 19, 15, 0, Math.PI * 2); k.fill(); }, 2);
  const flyTex = n => CATS[n].flyImg ? catT[n].fly : catT[n].angry;

  // gatos en espera (sobre la barra, a la izquierda de la resortera)
  // con más de 3 gatos en la fila se juntan (para que quepan todos en la vista de la resortera)
  const slotX = (i, n = queue.length) => SLING.x - 330 - i * (n <= 3 ? 145 : Math.max(80, 290 / (n - 1)));
  const queue = []; let qid = 0;
  // los gatos de la fila se sobresaltan con los estruendos (explosión, clavado, el jefe que cae): brinquito nervioso,
  // cara de enojo y un temblorcito; los más cercanos al estruendo reaccionan primero (como los pájaros de AB2)
  // En La Guarida (sótano) los estruendos sacuden el techo: cae polvo y piedritas desde arriba de la vista y los focos se columpian
  const gritTex = canvasTex(24, 24, k => { k.fillStyle = '#4A3A2C'; k.beginPath(); k.moveTo(4, 8); k.lineTo(14, 3); k.lineTo(21, 10); k.lineTo(16, 20); k.lineTo(6, 18); k.closePath(); k.fill(); k.fillStyle = '#7A6450'; k.fillRect(8, 7, 6, 4); });
  fx.T.grit = [gritTex];
  function ceilingDust(x, power) {
    const top = cam.toWorld(0, 0).y - 30, w = Math.min(1600, app.screen.width / cam.zoom), n0 = fx.parts.length;
    fx.burst('smoke', x, top, Math.round(6 + 6 * power), 60, {up: -40, g: 90, drag: 1.2, life: 2.2, size: 0.55, grow: 1.6, w, h: 40});
    for (let i = n0; i < fx.parts.length; i++) { const p = fx.parts[i]; p.s.tint = [0xA89482, 0x8E7C6C, 0xC2B2A2][i % 3]; p.delay = 0.08 + Math.random() * 0.5; p.s.alpha = 0; p.maxA = 0.55; }
    const n1 = fx.parts.length;
    fx.burst('grit', x, top, Math.round(10 + 12 * power), 80, {up: -60, drag: 0.3, life: 1.8, size: 1.9, w, h: 30});
    for (let i = n1; i < fx.parts.length; i++) { const p = fx.parts[i]; p.delay = Math.random() * 0.7; p.s.alpha = 0; p.maxA = 1; }
  }
  function startle(x, power = 1) {
    curBg?.jolt?.(power, x); if (bgTheme === 'lair') ceilingDust(x, power);
    queue.forEach((q, i) => { q.alert = Math.max(q.alert || 0, 0.9 + power * 0.4); q.shiver = 0.45;
      if (!q.hop) q.hop = {t: -0.05 - Math.abs(x - q.x) / 9000 - i * 0.05, dur: 0.32, x0: q.sprite.x, y0: q.sprite.y, x1: q.sprite.x, y1: q.sprite.y, h: 30 + power * 30}; });
  }
  let state = 'intro', onSling = null, flying = null, turnWait = 0, endT = 0;
  // el siguiente gato salta a la resortera; los demás avanzan un lugar con saltitos
  function loadNext() {
    const q = queue.shift(); q.shadow.destroy();
    const t = catT[q.name].angry; q.sprite.texture = t.tex; q.sprite.anchor.set(t.ax, t.ay);
    q.hop = {t: 0, dur: 0.6, x0: q.sprite.x, y0: q.sprite.y, x1: sling.rest.x, y1: sling.rest.y, h: 230};
    actors.removeChild(q.sprite); slingCat.addChild(q.sprite); // entre la liga trasera y la delantera
    q.sprite.alpha = 1;
    onSling = q; state = 'loading';
    queue.forEach((o, i) => { o.hop = {t: -0.25 - i * 0.12, dur: 0.45, x0: o.x, y0: o.sprite.y, x1: slotX(i), y1: o.sprite.y, h: 70}; o.x = slotX(i); });
  }
  // como las cartas de AB2: tocar a un gato de la fila lo manda a la resortera y el que estaba ahí regresa a su lugar
  function swapCat(i) {
    const q = queue[i], cur = onSling; if (!q || !cur || q.name === cur.name || (q.hop && q.hop.x0 !== q.hop.x1) || cur.hop || sling.aiming || sling.held) return false;
    q.shadow.destroy(); const ta = catT[q.name].angry; q.sprite.texture = ta.tex; q.sprite.anchor.set(ta.ax, ta.ay); q.alert = 0; q.shiver = 0; q.sprite.rotation = 0;
    actors.removeChild(q.sprite); slingCat.addChild(q.sprite); q.sprite.alpha = 1;
    q.hop = {t: 0, dur: 0.55, x0: q.sprite.x, y0: q.sprite.y, x1: sling.rest.x, y1: sling.rest.y, h: 200};
    const tc = catT[cur.name].calm; cur.sprite.texture = tc.tex; cur.sprite.anchor.set(tc.ax, tc.ay);
    slingCat.removeChild(cur.sprite); actors.addChild(cur.sprite);
    const back = {name: cur.name, sprite: cur.sprite, shadow: contactShadow(q.x, 170), x: q.x, phase: Math.random() * 6, hop: null, extra: cur.extra, id: cur.id};
    back.hop = {t: -0.08, dur: 0.55, x0: cur.sprite.x, y0: cur.sprite.y, x1: q.x, y1: GROUND - tc.footY, h: 160};
    queue[i] = back; onSling = q; state = 'loading'; try { localStorage.setItem('gatos.swapped', '1'); } catch (e) {}
    SFX.meow(i); SFX.pop(); return true;
  }
  // ---------- MAZO DE CARTAS (AB2): abajo a la izquierda una carta por gato; tocar una manda ese gato a la resortera ----------
  // la carta del gato que está en la resortera sube y brilla; al lanzarlo su carta sale volando y las demás se recorren.
  // Las cartas conservan su lugar (orden de llegada); el gato extra del Destructómetro entra como carta nueva.
  const CARD_W = 150, CARD_H = 190, CARD_GAP = 18;
  const CARD_COL = {omi: ['#FFC566', '#E0761C'], mako: ['#8D93B4', '#3A3D58'], miu: ['#8FD6FF', '#2F72D0']};
  const cardBg = n => cached('card.' + n, () => canvasTex(CARD_W + 16, CARD_H + 24, k => {
    const [c1, c2] = CARD_COL[n] || CARD_COL.omi;
    ART.rr(k, 8, 18, CARD_W, CARD_H, 26); k.fillStyle = '#1F2240'; k.fill();                       // base 3D
    ART.rr(k, 8, 8, CARD_W, CARD_H, 26); k.fillStyle = ART.lin(k, 0, 8, 0, 8 + CARD_H, [[0, c1], [1, c2]]); k.fill();
    k.save(); k.clip(); const g = k.createRadialGradient(8 + CARD_W / 2, 80, 6, 8 + CARD_W / 2, 80, 90); g.addColorStop(0, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    k.fillStyle = g; k.fillRect(0, 0, CARD_W + 16, CARD_H); k.fillStyle = 'rgba(20,22,58,0.42)'; k.fillRect(0, CARD_H - 40, CARD_W + 16, 60); k.restore();
    ART.rr(k, 8, 8, CARD_W, CARD_H, 26); k.lineWidth = 7; k.strokeStyle = '#1F2240'; k.stroke();
    ART.rr(k, 17, 16, CARD_W - 18, 30, 14); k.fillStyle = 'rgba(255,255,255,0.22)'; k.fill();
  }, 2));
  const cardGlow = canvasTex(CARD_W + 60, CARD_H + 60, k => { k.shadowColor = '#FFE66A'; k.shadowBlur = 22; ART.rr(k, 30, 30, CARD_W, CARD_H, 28); k.lineWidth = 10; k.strokeStyle = '#FFF2A0'; k.stroke(); k.stroke(); });
  const deck = new Container(); hud.addChild(deck);
  const cards = new Map(); let deckHit = 0, deckA = 1;
  const cardHand = new Sprite(handTex); cardHand.anchor.set(0.42, 0.1); cardHand.visible = false; hud.addChild(cardHand);
  function makeCard(q) {
    const c = new Container(), glow = new Sprite(cardGlow), bg = new Sprite(cardBg(q.name)), t = catT[q.name].calm, face = new Sprite(t.tex);
    glow.anchor.set(0.5); glow.alpha = 0; bg.anchor.set(0.5); bg.scale.set(0.5); face.anchor.set(t.ax, t.ay); face.scale.set(CARD_W / t.tex.width * 1.3); face.position.set(0, -18);
    const name = new Text({text: q.name.toUpperCase(), style: {fontFamily: 'Luckiest Guy', fontSize: 32, fill: '#FFFFFF', stroke: {color: '#1F2240', width: 7, join: 'round'}}}); name.anchor.set(0.5); name.position.set(0, CARD_H / 2 - 26);
    c.addChild(glow, bg, face, name);
    if (q.extra) { const b = new Graphics(); b.circle(0, 2, 24).fill(0x1F2240); b.circle(0, 0, 24).fill(0xFFD860).stroke({color: 0x1F2240, width: 5});
      b.rect(-11, -3.5, 22, 7).fill(0x1F2240); b.rect(-3.5, -11, 7, 22).fill(0x1F2240); b.position.set(CARD_W / 2 - 14, -CARD_H / 2 + 12); c.addChild(b); }
    c.eventMode = 'static'; c.cursor = 'pointer'; c.hitArea = {contains: (x, y) => Math.abs(x) < CARD_W / 2 + 6 && Math.abs(y) < CARD_H / 2 + 10};
    c.on('pointerdown', () => { deckHit = performance.now(); SFX.unlockAudio(); pickCard(q.id); });
    Object.assign(c, {qid: q.id, face, glow, cx: null, lift: 0, pop: 0, enter: 0, wig: 0, gone: 0}); deck.addChild(c); return c;
  }
  function pickCard(id) {
    const c = cards.get(id); if (!c || c.gone) return;
    if (onSling && onSling.id === id) { c.wig = 0.35; return; }                        // ya está en la resortera: solo se menea
    const i = queue.findIndex(q => q.id === id);
    if (state !== 'ready' || i < 0) { c.wig = 0.35; return; }
    if (sling.held) { sling.held = false; sling.pull = {x: 0, y: 0}; sling.pv = {x: 0, y: 0}; }
    if (swapCat(i)) { tutDone = true; c.pop = 0.3; SFX.click(); } else c.wig = 0.35;
  }
  function updateDeck(dt) {
    const live = [...(onSling ? [onSling] : []), ...queue], ids = new Set(live.map(q => q.id));
    for (const q of live) if (!cards.has(q.id)) { const c = makeCard(q); c.enter = 0.001; cards.set(q.id, c); }
    // fuera las cartas de los gatos lanzados: suben girando y se desvanecen
    for (const [id, c] of cards) if (!ids.has(id) && !c.gone) { c.gone = 0.001; SFX.pop(); }
    const sh = app.screen.height / hud.scale.y, order = [...cards.values()].filter(c => !c.gone).sort((a, b) => a.qid - b.qid);
    const n = order.length, step = n > 6 ? Math.max(CARD_W * 0.55, (6 * (CARD_W + CARD_GAP)) / n) : CARD_W + CARD_GAP;
    order.forEach((c, j) => { const tx = 40 + CARD_W / 2 + j * step; c.cx = c.cx == null ? tx : c.cx + (tx - c.cx) * Math.min(1, dt * 10); c.tx = tx; });
    const end = state === 'win' || state === 'lose' || ui.open;
    deckA += ((end ? 0 : 1) - deckA) * Math.min(1, dt * 6); deck.alpha = deckA; deck.visible = deckA > 0.02;
    for (const [id, c] of cards) {
      const sel = onSling && onSling.id === id && !c.gone, by = sh - CARD_H / 2 - 30;
      c.lift += ((sel ? 1 : 0) - c.lift) * Math.min(1, dt * 12);
      c.glow.alpha = c.lift * (0.75 + Math.sin(time * 5) * 0.25);
      let sc = 0.86 + c.lift * 0.14, y = by - c.lift * 34, rot = 0;
      if (c.enter) { c.enter += dt; const u = Math.min(1, c.enter / 0.4); sc *= Math.max(0, backOutE(u)); if (u >= 1) c.enter = 0; }   // entra con rebote
      if (c.pop > 0) { c.pop = Math.max(0, c.pop - dt); sc *= 1 + Math.sin((1 - c.pop / 0.3) * Math.PI) * 0.12; }                       // botecito al tocarla
      if (c.wig > 0) { c.wig -= dt; rot = Math.sin(c.wig * 40) * 0.12 * (c.wig / 0.35); }
      if (c.gone) { c.gone += dt; const u = Math.min(1, c.gone / 0.35); y -= u * 160; sc *= 1 + u * 0.3; rot = -u * 0.6; c.alpha = 1 - u;
        if (u >= 1) { c.destroy({children: true}); cards.delete(id); continue; } }
      // los que no están en la resortera respiran un poquito (como los pájaros en sus cartas)
      if (!sel && !c.gone) c.face.scale.y = c.face.scale.x * (1 + Math.sin(time * 3 + id) * 0.025);
      c.position.set(c.cx, y); c.scale.set(sc); c.rotation = rot;
    }
  }
  function clearDeck() { for (const c of cards.values()) c.destroy({children: true}); cards.clear(); }
  function shoot(v) {
    const q = onSling; onSling = null;
    const p = sling.pouch;
    const body = Bodies.circle(p.x, p.y, CAT_R, {density: 0.004, friction: 0.6, frictionAir: 0, restitution: 0.15, label: 'cat'});
    Body.setVelocity(body, {x: v.x / 1000 * V_UNIT, y: v.y / 1000 * V_UNIT});
    Composite.add(engine.world, body);
    const t = flyTex(q.name); q.sprite.texture = t.tex; q.sprite.anchor.set(t.ax, t.ay);
    slingCat.removeChild(q.sprite); actors.addChild(q.sprite);
    trail.removeChildren().forEach(c => c.destroy()); // el rastro anterior se borra al disparar el nuevo
    turnKills = 0;
    flying = {q, body, sprite: q.sprite, t: 0, still: 0, hit: false, lastDot: {x: p.x, y: p.y}, dots: 0, power: false};
    state = 'flying'; cam.follow(body);
  }
  // fin de turno: ¿ganó? ¿se acabaron los gatos? si no, el siguiente
  function endTurn() {
    endT = 0;
    if (!dyn.some(d => d.mat === 'mouse' || d.mat === 'robot')) { state = 'win'; endT0 = false; SFX.duck(levelId === LEVELS[LEVELS.length - 1] ? 6 : 4); (levelId === LEVELS[LEVELS.length - 1] ? SFX.fanfare : SFX.win)(); return; }
    laughAll = 1.3;
    if (!queue.length) { state = 'lose'; laughAll = 1e9; SFX.duck(4); SFX.giggle(); setTimeout(SFX.lose, 700);
      const alive = dyn.filter(o => o.mat === 'mouse' && !o.dead); if (alive.length) say(alive[Math.floor(Math.random() * alive.length)], '¡JI JI JI!\n¡SIN ATÚN!', 3); return; }
    state = 'between'; turnWait = 0.9;
    // tiro sin ratones caídos: uno se burla cuando la cámara regresa (la vista general muestra la fortaleza)
    if (!turnKills && Math.random() < 0.65) { const alive = dyn.filter(o => o.mat === 'mouse' && !o.dead && !bubbles.some(b => b.d === o));
      if (alive.length) { const o = alive[Math.floor(Math.random() * alive.length)];
        setTimeout(() => { if (!o.dead && dyn.includes(o)) { o.laugh = 1.4; say(o, ['¡FALLASTE!', '¡JA JA!\n¡NI CERCA!', '¡ÁNDALE,\nGATITO!', '¡AQUÍ\nSEGUIMOS!', '¡BUUU!'][Math.floor(Math.random() * 5)], 1.6, 0.85); SFX.giggle(); } }, 650); } }
  }
  let endT0 = false, resultsShown = false; // el panel sale una sola vez por intento (al ir al menú no debe reaparecer)
  function showResults(win) {
    resultsShown = true;
    const key = 'gatos.best.' + levelId; let prev = null;
    try { prev = JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) {}
    const st = level.stars || [0, 1e9, 1e9];
    const stars = win ? 1 + (score >= st[1]) + (score >= st[2]) : 0;
    const record = win && (!prev || score > prev.score);
    if (win) try { localStorage.setItem(key, JSON.stringify({score: Math.max(score, prev?.score || 0), stars: Math.max(stars, prev?.stars || 0)})); } catch (e) {}
    const final = win && levelId === LEVELS[LEVELS.length - 1]; // jefe final vencido: panel especial
    ui.show({win, stars, score, best: Math.max(win ? score : 0, prev?.score || 0), record, name: final ? '¡RECUPERARON TODO EL ATÚN!' : level.name, hasNext: !final, final});
  }
  // compat. con la prueba anterior: GAME.launch(vx, vy) dispara el gato que esté en la resortera
  function launch(vx, vy) { ui.closeCard(true); if (state === 'ready') { tutDone = true; sling.held = false; sling.pouch = {...sling.rest}; shoot({x: vx, y: vy}); } }

  Matter.Events.on(engine, 'collisionStart', ev => {
    for (const pr of ev.pairs) {
      const A = pr.bodyA, B = pr.bodyB, n = pr.collision.normal;
      const closing = Math.abs((A.velocity.x - B.velocity.x) * n.x + (A.velocity.y - B.velocity.y) * n.y);
      if (closing < 1.0) continue;
      for (const [me, other] of [[A, B], [B, A]]) {
        const d = byBody(me); if (!d) continue;
        SFX.hit(d.skin || d.mat, closing / 18);
        // polvo al golpear el piso (bloques y ratones que caen), una vez cada 0.3 s por cuerpo
        if (other === ground && closing > 3 && started > 1 && time - (d.dustT || -9) > 0.3) { d.dustT = time;
          const sp = pr.collision.supports?.[0] || me.position; fx.smoke(sp.x, GROUND - 6, Math.min(70, 18 + closing * 3), Math.round(Math.min(6, 2 + closing * 0.3))); }
        if (started < 1) continue;
        let mf = other.isStatic ? 1.15 : Math.min(1.35, Math.sqrt(2 * other.mass / (other.mass + me.mass)));
        if (d.mat === 'tnt') mf = Math.max(1, mf);   // cuetes como la TNT de AB2: una tabla que les cae encima basta para encenderlos
        damage(d, Math.max(0, closing - (d.mat === 'mouse' ? 0.6 : d.mat === 'tnt' ? 0.5 : 1.2)) * mf * FRAGILE[d.mat], closing); // los ratones resienten hasta los golpes chicos
      }
    }
  });
  Matter.Events.on(engine, 'collisionStart', ev => {
    if (!flying || flying.hit) return;
    for (const pr of ev.pairs) if (pr.bodyA === flying.body || pr.bodyB === flying.body) {
      flying.hit = true; flying.hitT = flying.t; cam.shake(Math.min(18, flying.body.speed * 0.6));
      if (flying.body.speed > 7 && !flying.dive) { const sp = pr.collision.supports?.[0] || flying.body.position; fx.impact(sp.x, sp.y, Math.min(110, 40 + flying.body.speed * 3), Math.random()); }
      if (flying.dive) { // Miu: onda de choque + temblor de estructuras
        const p = flying.body.position; flying.dive = false;
        blast(p.x, p.y + CAT_R, 240, 16, 34, {can: 2.0, box: 0.85}); dyn.forEach(o => { Sleeping.set(o.body, false); Body.setAngularVelocity(o.body, (Math.random() - 0.5) * 0.05); });
        fx.smoke(p.x, p.y + CAT_R, 140, 14); fx.ring(p.x, p.y + CAT_R, 240, 0xCFEFFF, 0.45); cam.shake(30, 0.5); cam.punch(0.06); SFX.slam(); startle(p.x, 0.8);
      }
      break;
    }
  });

  // en cada golpe fuerte el gato suelta mechones de pelo de SU color (como las plumas de AB2)
  Matter.Events.on(engine, 'collisionStart', ev => {
    if (!flying || flying.exploded) return;
    for (const pr of ev.pairs) if (pr.bodyA === flying.body || pr.bodyB === flying.body) {
      const A = pr.bodyA, B = pr.bodyB, n = pr.collision.normal;
      const closing = Math.abs((A.velocity.x - B.velocity.x) * n.x + (A.velocity.y - B.velocity.y) * n.y);
      if (closing < 5 || flying.t - (flying.furT ?? -1) < 0.18) break;
      flying.furT = flying.t; const p = flying.body.position, fur = CATS[flying.q.name].fur, n0 = fx.parts.length;
      fx.burst('fur', p.x, p.y, Math.round(Math.min(12, 3 + closing * 0.4)), 260 + closing * 18, {up: 80, size: 0.9, life: 1.3, drag: 2.2, g: 380, w: CAT_R, h: CAT_R});
      for (let i = n0; i < fx.parts.length; i++) fx.parts[i].s.tint = fur[i % 3];
      // squash al chocar (se recupera solo con el suavizado de escala) y, si es el piso, polvo + "tump" acolchado
      if (!flying.inflate && closing > 7) { const k = Math.min(0.28, closing * 0.012); flying.sprite.scale.set(0.5 * (1 + k), 0.5 * (1 - k)); }
      if ((A === ground || B === ground) && closing > 4) { fx.smoke(p.x, GROUND - 6, Math.min(90, 24 + closing * 3), Math.round(Math.min(8, 3 + closing * 0.3))); SFX.thump(Math.min(1, closing / 20)); }
      break;
    }
  });
  function updateTurn(dt) {
    sling.update(dt);
    if (state === 'loading' && onSling && !onSling.hop) state = 'ready';
    // GATO NUEVO (AB2): la primera vez que cada gato sube a la resortera sale su carta con el poder (el juego se pausa)
    if (state === 'ready' && onSling && !onSling.hop && !ui.cardOpen && CARDS && !metCats.has(onSling.name)) {
      metCats.add(onSling.name); try { localStorage.setItem('gatos.met', JSON.stringify([...metCats])); } catch (e) {} ui.card(onSling.name); }
    // nivel con cajas de cuetes: la primera vez que el jugador puede tirar, un ratón junto a una caja avisa (enseña la mecánica, con humor)
    if (state === 'ready' && !warnedTnt) { warnedTnt = true; const tn = dyn.filter(o => o.mat === 'tnt');
      const ms = tn.length && dyn.filter(o => o.mat === 'mouse' && !o.ride).sort((a, b) => Math.min(...tn.map(t => Math.hypot(t.body.position.x - a.body.position.x, t.body.position.y - a.body.position.y))) - Math.min(...tn.map(t => Math.hypot(t.body.position.x - b.body.position.x, t.body.position.y - b.body.position.y))));
      if (ms && ms.length) { const o = ms[0]; o.hurt = 0.35; setTimeout(() => { if (!o.dead && dyn.includes(o)) { say(o, ['¡NO TOQUEN\nLOS CUETES!', '¡CUIDADO CON\nLOS CUETES!'][Math.floor(Math.random() * 2)], 2.2, 0.8); SFX.squeak(); } }, 400); } }
    if (onSling && !onSling.hop) {
      const p = sling.pouch, pw = sling.power;
      // en la resortera: sigue a la bolsa; al estirar se aplasta en la dirección del jalón y se inclina hacia el tiro
      const tilt = (sling.aiming || sling.held) && pw > 0.05 ? Math.max(-0.45, Math.min(0.45, Math.atan2(-sling.pull.y, -sling.pull.x) * 0.5)) : Math.sin(time * 1.7) * 0.04;
      // impaciencia (AB2): si el jugador tarda, el gato da dobles brinquitos en la bolsa cada ~3 s
      const ip = readyIdle > 6 && !sling.held ? Math.max(0, Math.sin((readyIdle - 6) * 4.2)) ** 3 * (Math.sin((readyIdle - 6) * 2.1) > 0 ? 1 : 0) : 0;
      onSling.sprite.position.set(p.x, p.y - ip * 30); onSling.sprite.rotation = tilt + ip * Math.sin(readyIdle * 9) * 0.08;
      const br = sling.aiming || sling.held ? 0 : Math.sin(time * 3.4) * 0.03 + ip * 0.06;
      onSling.sprite.scale.set(0.5 * (1 - pw * 0.1 - br * 0.5), 0.5 * (1 + pw * 0.07 + br));
    }
    if (flying) {
      const f = flying, b = f.body; f.t += dt;
      // un ratón ve venir al gato y grita (una vez por tiro, no siempre, y nunca dos globos encima)
      if (!f.shout && !f.hit && f.t > 0.5 && b.velocity.x > 2) {
        const sees = dyn.filter(d => d.mat === 'mouse' && !d.dead && !d.ride && !bubbles.some(o => o.d === d) && d.body.position.x > b.position.x && Math.hypot(d.body.position.x - b.position.x, d.body.position.y - b.position.y) < 1400);
        if (sees.length) { f.shout = true; if (Math.random() < 0.7) { const d = sees.reduce((a, o) => a.body.position.x < o.body.position.x ? a : o);
          say(d, ['¡AHÍ\nVIENE!', '¡CUIDADO!', '¡MAMÁÁÁ!', '¡AGÁCHENSE!', '¡UN GATO!'][Math.floor(Math.random() * 5)], 1.3, 0.72); d.hurt = 0.25; SFX.squeak(); } } }
      updatePower(f, dt);
      // auto-poder tras chocar (research/AB2_NIVELES.md §2): Mako 1.5 s parpadeando en rojo el último medio segundo (aviso, como Bomb); Omi 1.5 s
      if (f.hit && !f.power && (f.q.name === 'mako' || f.q.name === 'omi')) { const w = f.t - f.hitT;
        if (f.q.name === 'mako') { const on = w > 1.0 && Math.sin((w - 1.0) * 38) > 0; f.sprite.tint = on ? 0xFF5A4A : 0xFFFFFF; if (on && !f.tick) SFX.click(); f.tick = on; }
        if (w > AUTO_POWER) { f.sprite.tint = 0xFFFFFF; f.power = true; activatePower(f); } }
      f.sprite.position.set(b.position.x, b.position.y);
      if (!f.hit && !f.loop) {
        // en el aire: inclinación hacia la velocidad y estirón según rapidez (squash & stretch)
        const va = Math.atan2(b.velocity.y, b.velocity.x), sp = Math.min(1, b.speed / 28);
        f.sprite.rotation = Math.max(-0.6, Math.min(0.6, va * 0.35)); // sin girar: la cara real se lee mejor
        if (!f.inflate) f.sprite.scale.set(0.5 * (1 + sp * 0.08), 0.5 * (1 - sp * 0.06));
      }
      // rastro de puntitos (uno grande cada 5); sigue durante el loop de Miu y su picada
      if (!f.hit && !f.exploded && Math.hypot(b.position.x - f.lastDot.x, b.position.y - f.lastDot.y) > 46) {
        const d = new Sprite(dotTex); d.anchor.set(0.5); const big = ++f.dots % 5 === 0;
        d.scale.set(big ? 0.32 : 0.2); d.position.set(b.position.x, b.position.y); trail.addChild(d); f.lastDot = {x: b.position.x, y: b.position.y};
      }
      if (f.hit || f.loop) {
        // mareado tras el golpe (AB2): ojos cerrados + estrellitas girando sobre la cabeza
        if (!f.dizzy && !f.inflate && !f.exploded && f.t - f.hitT > 0.15) {
          const T = catT[f.q.name].dizzy || catT[f.q.name].blink; f.sprite.texture = T.tex; f.sprite.anchor.set(T.ax, T.ay);
          f.dizzy = [0, 1, 2].map(i => { const st = new Sprite(dizzyTex); st.anchor.set(0.5); dizzyC.addChild(st); return st; });
        }
        if (f.dizzy) f.dizzy.forEach((st, i) => { const a = f.t * 5 + i * Math.PI * 2 / 3, z = Math.sin(a);
          st.position.set(b.position.x + Math.cos(a) * CAT_R * 0.95, b.position.y - CAT_R * 1.05 + z * CAT_R * 0.22);
          st.scale.set(0.42 + z * 0.1); st.alpha = f.inflate || f.exploded ? 0 : (0.75 + z * 0.25) * f.sprite.alpha; st.rotation = f.t * 4; });
        f.sprite.rotation = b.angle; if (!f.inflate) { f.sprite.scale.x += (0.5 - f.sprite.scale.x) * 0.2; f.sprite.scale.y += (0.5 - f.sprite.scale.y) * 0.2; }
      }
      // fin de turno: todo quieto ~1 s (o 10 s máx, o fuera del nivel)
      const busy = dyn.some(d => !d.body.isSleeping && d.body.speed > 0.4);
      f.still = (b.speed < 0.35 && !busy) ? f.still + dt : 0;
      const gone = b.position.x > BOUNDS.x1 + 300 || b.position.x < BOUNDS.x0 - 300;
      if (f.exploded) { const busy2 = dyn.some(d => !d.body.isSleeping && d.body.speed > 0.4); f.still2 = busy2 ? 0 : (f.still2 || 0) + dt; }
      if ((f.exploded ? f.still2 > 1 || f.t > 10 : (f.still > 1 && !f.inflate) || f.t > 10 || gone)) {
        // el gato se va con un "puf" (escala + fade) y la cámara regresa
        // AB2: el pájaro se deshace en plumas; aquí el gato se va en un "puf" de humito y mechones de pelo
        if (!f.fade && !f.exploded && !gone) { const p = b.position; fx.smoke(p.x, p.y, CAT_R * 1.9, 9); fx.burst('fur', p.x, p.y, 14, 520, {up: 220, size: 1.4, life: 1, drag: 2}); SFX.poof(); }
        f.fade = (f.fade || 0) + dt;
        f.sprite.alpha = Math.max(0, 1 - f.fade / 0.3); f.sprite.scale.set(0.5 * (1 + f.fade));
        if (f.fade > 0.3) {
          if (!f.exploded) Composite.remove(engine.world, b); f.sprite.destroy(); flying = null; dizzyC.removeChildren().forEach(o => o.destroy());
          cam.release(); endTurn();
        }
      }
    }
    if (state === 'between') { turnWait -= dt; if (turnWait <= 0) loadNext(); }
    if (state === 'win') {
      // gatos sobrantes saltan uno a uno con giro: +10,000 cada uno
      endT += dt; const i = Math.floor((endT - 0.6) / 0.6);
      // la cámara se acerca a los gatos que celebran (como AB2)
      if (queue.length && !endT0) { endT0 = true; cam.follow({position: {x: (queue[0].x + queue[queue.length - 1].x) / 2 + 140, y: GROUND - 260}}, 2.4); }
      if (endT > 0.6 && i < queue.length && !queue[i].bonus) {
        const q = queue[i]; q.bonus = true; q.sprite.texture = catT[q.name].angry.tex;
        q.hop = {t: 0, dur: 0.75, x0: q.sprite.x, y0: q.sprite.y, x1: q.sprite.x, y1: q.sprite.y, h: 300, spin: true};
        addScore(10000, q.x, GROUND - 400, '#FFE27A', true, 1.5); fx.burst('star', q.x, GROUND - 330, 10, 600, {up: 300, size: 1.1, life: 0.8}); SFX.meow(i);
      }
      if (!resultsShown && endT > 0.6 + queue.length * 0.6 + 1.1) showResults(true);
    }
    if (state === 'lose') { endT += dt; if (!resultsShown && endT > 1.8) showResults(false); }
    // gatos en espera: respiran, dan saltitos de vez en cuando y avanzan con saltos
    const hopAnim = (o, base) => {
      const h = o.hop; h.t += dt; if (h.t < 0) return false;
      const u = Math.min(1, h.t / h.dur);
      o.sprite.x = h.x0 + (h.x1 - h.x0) * u; o.sprite.y = h.y0 + (h.y1 - h.y0) * u - Math.sin(u * Math.PI) * h.h;
      const sq = u < 0.15 ? 1 - u / 0.15 * 0.12 : u > 0.9 ? 0.92 : 1 + Math.sin(u * Math.PI) * 0.08;
      o.sprite.scale.set(0.5 / Math.sqrt(sq), 0.5 * sq); o.sprite.rotation = h.spin ? -u * Math.PI * 2 : Math.sin(u * Math.PI * 2) * 0.15;
      if (h.fall) { o.sprite.y = h.y0 + (h.y1 - h.y0) * u * u; o.sprite.scale.set(0.5 * (u < 1 ? 0.92 : 1.12), 0.5 * (u < 1 ? 1.1 : 0.85)); }
      if (u >= 1) { o.hop = null; o.sprite.rotation = 0; h.onEnd?.(); }
      return true;
    };
    if (onSling && onSling.hop) hopAnim(onSling);
    queue.forEach(q => {
      q.shadow.x = q.sprite.x;
      // con el mazo de cartas visible la fila del piso se esconde (AB2); reaparece al final para el bono de gatos sobrantes
      q.sprite.alpha = q.shadow.alpha = 1 - deckA;
      if (q.hop && hopAnim(q)) return;
      const t = time + q.phase, hop = Math.max(0, Math.sin(t * 2.2)) ** 8 * (Math.sin(t * 0.37) > 0.3 ? 26 : 0);
      const br = 1 + Math.sin(t * 3.1) * 0.025;
      // parpadeo (a veces doble, como en AB2)
      if (q.alert > 0) { q.alert -= dt; if (!q.bonus && q.sprite.texture !== catT[q.name].angry.tex) q.sprite.texture = catT[q.name].angry.tex; }
      else if (!q.bonus) {
        if (q.blinkAt == null) q.blinkAt = time + 1 + Math.random() * 3;
        const bt = time - q.blinkAt, closed = (bt > 0 && bt < 0.12) || (q.dbl && bt > 0.22 && bt < 0.33);
        const T = closed ? catT[q.name].blink : catT[q.name].calm; if (q.sprite.texture !== T.tex) q.sprite.texture = T.tex;
        if (bt > 0.4) { q.blinkAt = time + 2 + Math.random() * 3.5; q.dbl = Math.random() < 0.3; }
      }
      q.sprite.scale.set(0.5 / Math.sqrt(br), 0.5 * br); q.sprite.y = GROUND - catT[q.name].calm.footY - hop;
      if (q.shiver > 0) { q.shiver -= dt; const k = Math.max(0, q.shiver) / 0.45; q.sprite.x = q.x + Math.sin(time * 70) * 5 * k; q.sprite.rotation = Math.sin(time * 55) * 0.05 * k; }
      else { // AB2: los de la fila siguen con la cabeza al gato que va volando (se inclinan hacia él, más si va alto)
        const fb = flying && !flying.fade ? flying.body.position : null, a = fb ? Math.atan2(fb.y - q.sprite.y, Math.abs(fb.x - q.x) + 200) : 0;
        q.look = (q.look || 0) + ((fb ? Math.max(-0.05, Math.min(0.3, 0.08 - a * 0.35)) : 0) - (q.look || 0)) * Math.min(1, dt * 5);
        q.sprite.x = q.x + q.look * 18; q.sprite.rotation = q.look; }
      q.shadow.scale.x = q.shadow.scale.y * 4 * (1 - hop / 80);
    });
    sling.draw();
  }

  // ---------- input: resortera, tap en el aire, pinch-zoom / pan (2 dedos), arrastre y rueda ----------
  const ptrs = new Map(); let pinch = null, aimPtr = null;
  const el = app.canvas; el.style.touchAction = 'none';
  // AB2: el poder se activa tocando en CUALQUIER parte de la pantalla. Mako (Bomb) y Omi (Bubbles) también después de chocar,
  // mientras no se hayan activado solos; Miu (Silver) solo en el aire antes del primer golpe
  const canPower = f => !!f && !f.power && !f.exploded && !f.fade && (!f.hit || f.q.name === 'mako' || f.q.name === 'omi');
  el.addEventListener('pointerdown', e => {
    ptrs.set(e.pointerId, {x: e.clientX, y: e.clientY}); el.setPointerCapture(e.pointerId); SFX.unlockAudio();
    if (menus.blocking) { menus.skipIntro(); return; }
    if (ui.open || ui.cardOpen) return;
    if (performance.now() - deckHit < 60) { ptrs.delete(e.pointerId); return; } // tocó una carta del mazo
    if (cam.mode === 'flyover') { cam.skipFlyover(); return; }
    if (ptrs.size === 1) {
      const w = cam.toWorld(e.clientX, e.clientY);
      if (state === 'ready' && Math.hypot(w.x - sling.pouch.x, w.y - sling.pouch.y) < Math.max(CAT_R * 2, 70 / cam.zoom)) {
        aimPtr = e.pointerId; sling.aiming = true; sling.grab = {dx: sling.pouch.x - w.x, dy: sling.pouch.y - w.y}; if (onSling) SFX.growl(['omi', 'mako', 'miu'].indexOf(onSling.name));
        if (cam.mode === 'user') cam.mode = 'rest';
        return;
      }
      if (state === 'flying' && canPower(flying)) { flying.power = true; activatePower(flying); return; }
      if (state === 'ready') { const R = Math.max(CAT_R * 1.5, 46 / cam.zoom), dq = q => Math.hypot(w.x - q.x, w.y - (GROUND - catT[q.name].calm.footY)), i = queue.reduce((bi, q, j) => dq(q) < R && (bi < 0 || dq(q) < dq(queue[bi])) ? j : bi, -1);
        if (i >= 0) { if (sling.held) { tutDone = true; sling.held = false; sling.pull = {x: 0, y: 0}; sling.pv = {x: 0, y: 0}; } if (swapCat(i)) { tutDone = true; return; } } }
    }
    if (ptrs.size === 2) {
      if (aimPtr != null) return; // mientras apunta no hay pinch
      const [a, b] = [...ptrs.values()]; pinch = {d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2};
    }
  });
  el.addEventListener('pointermove', e => {
    const p = ptrs.get(e.pointerId); if (!p || menus.blocking || ui.open || ui.cardOpen) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    if (e.pointerId === aimPtr) { const w = cam.toWorld(e.clientX, e.clientY); sling.aimTo({x: w.x + sling.grab.dx, y: w.y + sling.grab.dy}); SFX.stretch(sling.power); return; }
    if (ptrs.size >= 2 && pinch) {
      const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      cam.panBy(mx - pinch.mx, my - pinch.my); cam.zoomAt(d / pinch.d, mx, my);
      pinch = {d, mx, my};
    } else if (ptrs.size === 1 && state !== 'flying') cam.panBy(dx, dy);
  });
  const up = e => {
    ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null;
    if (e.pointerId === aimPtr) { aimPtr = null; const pw = sling.power, v = sling.release(); if (v && onSling) { SFX.release(pw); const nm = onSling.name; shoot(v); setTimeout(() => SFX.meow(['omi', 'mako', 'miu'].indexOf(nm)), 90); } } // grito de guerra al salir (AB2)
  };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  el.addEventListener('wheel', e => { e.preventDefault(); cam.zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY); }, {passive: false});
  // doble toque = volver a la vista completa
  el.addEventListener('dblclick', () => { if (cam.mode === 'user') cam.mode = 'rest'; });

  // ---------- loop ----------
  const resize = () => {
    cam.resize(app.screen.width, app.screen.height);
    vignette.width = app.screen.width; vignette.height = app.screen.height; flashSp.width = app.screen.width; flashSp.height = app.screen.height;
    const fs = Math.max(app.screen.width, app.screen.height) / 2048 * 0.75;
    bg.fl.scale.set(fs); bg.fr.scale.set(-fs, fs);
  };
  resize(); window.addEventListener('resize', resize);

  // ---------- construir / reiniciar un nivel (sin recargar la página) ----------
  let fortX = 0;
  function buildLevel(id, fly) {
    levelId = id; level = levels[id]; useBg(['kitchen', 'garden', 'lair'][(level.world || 1) - 1] || 'lair'); SFX.musicTheme(level.world || 1);
    Composite.clear(engine.world, false); Composite.add(engine.world, ground);
    dyn.forEach(d => { if (d.bar && !d.bar.destroyed) d.bar.destroy(); });
    dyn.length = 0; queue.length = 0; clearDeck();
    for (const c of [actors, lvlBehind, trail, slingCat, dizzyC]) c.removeChildren().forEach(o => o.destroy());
    fx.clear(); ui.hide(); ui.setLevelName(level.name); for (const b of bubbles) b.c.destroy({children: true}); bubbles.length = 0;
    booms.length = rockets.length = 0; warnedTnt = false; score = shownScore = 0; resetHudStars(); resultsShown = false; started = 0; slow = 0; lastFocus = 0; laughAll = 0; endT = 0;
    state = 'intro'; onSling = null; flying = null; aimPtr = null; sling.aiming = sling.held = false; sling.pull = {x: 0, y: 0}; sling.pouch = {...sling.rest}; sling.pv = {x: 0, y: 0};
    level.blocks.forEach((b, i) => {
      if (b.t === 'rock') b.h = b.w;
      const top = b.y ?? b.h, cy = GROUND - top + b.h / 2;
      // plataforma fija flotante (AB2): no se rompe ni se mueve; no cuenta para el Destructómetro
      // (b.a = ángulo en radianes → rampa; b.y es la altura del CENTRO de la cara superior)
      if (b.static) { const body = Bodies.rectangle(b.x, cy, b.w, b.h, {isStatic: true, friction: 0.9, angle: b.a || 0, label: 'shelf'}); Composite.add(engine.world, body);
        const sk = SKIN[bgTheme].shelf === 'stone' && b.w >= 240 && b.h >= 120 ? (bgTheme === 'garden' ? 'wall' : 'wallx') : SKIN[bgTheme].shelf;   // terrazas anchas = muro de cara plana
        const sp = new Sprite(blockTex(sk, b.w, b.h, i + 2, 0)); sp.anchor.set(0.5); sp.scale.set(1 / 1.5); sp.position.set(b.x, cy); sp.rotation = b.a || 0; actors.addChild(sp); return; }
      // roca redonda (AB2): física de lata, rueda; b.w = diámetro
      const round = b.t === 'rock', mat = round ? 'can' : b.t;
      const body = round ? Bodies.circle(b.x, cy, b.w / 2, {...MAT.can, friction: 0.6, frictionStatic: 1.2, frictionAir: 0.0012, restitution: 0.05, label: 'can', sleepThreshold: 40})
        : Bodies.rectangle(b.x, cy, b.w, b.h, {...MAT[b.t], restitution: 0, chamfer: {radius: Math.min(b.w, b.h) * 0.08}, label: b.t, sleepThreshold: 40});
      // las rocas no duermen: si se les quita el tope deben rodar solas (dormidas se quedaban flotando)
      if (round) body.sleepThreshold = Infinity; else Sleeping.set(body, true);
      const skin = SKIN[bgTheme][b.t] || b.t, texs = [0, 1, 2, 3].map(dmg => blockTex(skin, b.w, b.h, i + 2, dmg));
      const sp = new Sprite(texs[0]); sp.anchor.set(0.5); sp.scale.set(1 / 1.5);
      Composite.add(engine.world, body); actors.addChild(sp);
      // vida escalada por tamaño (bloques grandes aguantan más)
      const life = LIFE[mat] * Math.sqrt(b.w * b.h / (110 * 110));
      dyn.push({body, sprite: sp, shadow: contactShadow(b.x, b.w * 1.3), w: b.w, h: b.h, mat, skin, life, max: life, texs, dmg: 0});
      // jefe final: la aspiradora patrulla de lado a lado (nunca se duerme) y lleva barra de vida
      if (b.patrol) { body.sleepThreshold = Infinity; Sleeping.set(body, false); Body.setInertia(body, body.inertia * 6);
        const bar = new Graphics(); front.addChild(bar);
        Object.assign(dyn[dyn.length - 1], {patrol: b.patrol, speed: b.speed || 160, dir: 1, vx: 0, stun: 0, bar, dust: 0});
        if (fly) { dyn[dyn.length - 1].enter = {t: 0, y: cy, ry: 0}; bar.alpha = 0; Body.setPosition(body, {x: b.x, y: cy - ENTER_DROP}); } }
    });
    level.mice.forEach(m => {
      const body = Bodies.circle(m.x, GROUND - m.y, m.r * 0.92, {density: 0.0012, friction: 0.8, restitution: 0.05, label: 'mouse'});
      Sleeping.set(body, true);
      // la Rata Jefa va montada en la aspiradora: despierta, sin rodar (se desliza con la fricción)
      if (m.ride) { body.sleepThreshold = Infinity; Sleeping.set(body, false); Body.setInertia(body, Infinity); body.friction = 1;
        const rb = dyn.find(o => o.enter); if (rb) { rb.enter.ry = body.position.y - rb.enter.y; Body.setPosition(body, {x: m.x, y: body.position.y - ENTER_DROP}); } }
      // ojos normal/susto sin pupilas: las pupilas van aparte y siguen al gato (como los cerdos de AB2)
      // ratoncitos con gorro del mundo: Jardín = gorrito de bellota; Guarida = casco de minero con lamparita que alumbra hacia donde miran
      const hat = m.k !== 'small' ? null : bgTheme === 'lair' ? 'miner' : bgTheme === 'garden' ? 'acorn' : null;
      const mt = mouseFaces(m.k, m.r, hat);
      const sp = new Sprite(mt.normal); sp.anchor.set(0.5); sp.scale.set(1 / 1.5);
      const R = m.r * 1.5, pup = {normal: new Graphics(), scared: new Graphics()};
      for (const sx of [-0.33, 0.33]) { pup.normal.circle(sx * R, 0, R * 0.1).fill(0x1B1D2A).circle(sx * R - R * 0.03, -R * 0.05, R * 0.035).fill(0xFFFFFF); pup.scared.circle(sx * R, 0, R * 0.065).fill(0x1B1D2A); }
      sp.addChild(pup.normal, pup.scared);
      let beam = null;
      if (hat === 'miner') { beam = new Container(); beam.position.set(0, -m.r * 0.65 * 1.5); const c = new Sprite(beamTex), g = new Sprite(lampGlowTex);
        c.anchor.set(0.02, 0.5); c.scale.set(m.r * 1.5 / 40); c.blendMode = g.blendMode = 'add'; g.anchor.set(0.5); g.scale.set(m.r * 1.5 / 60); c.rotation = Math.PI; beam.addChild(c, g); beam.cone = c; sp.addChild(beam); }
      Composite.add(engine.world, body); actors.addChild(sp);
      dyn.push({body, sprite: sp, shadow: contactShadow(m.x, m.r * 2.4), w: m.r * 2, h: m.r * 2, mat: 'mouse', kind: m.k, r: m.r, hat, bz: 0, enter: m.ride && dyn.some(o => o.enter) || null, life: LIFE[m.k], max: LIFE[m.k], mt, ph: Math.random() * 6, blinkAt: 1 + Math.random() * 3, tauntAt: 4 + Math.random() * 5, laugh: 0, ride: !!m.ride, pup, beam, look: {x: -1, y: 0}, glanceAt: 2 + Math.random() * 4, glance: null});
    });
    level.cats.forEach((n, i) => {
      const t = catT[n].calm, sp = new Sprite(t.tex); sp.anchor.set(t.ax, t.ay); sp.scale.set(0.5);
      const sx = slotX(i, level.cats.length); sp.position.set(sx, GROUND - t.footY);
      actors.addChild(sp); const sh = contactShadow(sx, 170);
      queue.push({name: n, sprite: sp, shadow: sh, x: sx, phase: i * 1.7, hop: null, id: ++qid});
    });
    resetMeter();
    fortX = level.blocks.reduce((s, b) => s + b.x, 0) / level.blocks.length;
    cam.snapRest();
    ui.hideBanner();
    if (fly) { cam.flyover(fortX, SLING.x, () => { ui.hideBanner(); if (state === 'intro') { state = 'between'; turnWait = 0.2; } }, dyn.some(d => d.enter) ? 1.3 : 0);
      const w = level.world || 1; ui.banner(level.name, `MUNDO ${w} · ${WORLDS[w - 1].name}`); }
    else { state = 'between'; turnWait = 0.35; }
    for (const t of staleTex.splice(0)) if (t && !t.destroyed) t.destroy(true);
  }
  const ui = new UI(app, {
    onRetry: () => buildLevel(levelId, false),
    onNext: () => buildLevel(LEVELS[(LEVELS.indexOf(levelId) + 1) % LEVELS.length], true),
    onMenu: () => { ui.hide(); menus.showSelect((level.world || 1) - 1); },
    onPause: () => pause(),
    mouseTex: mouseTex('boss', 66, 'laugh'), cats: bigCats,
  });
  let hatDirty = false; const QS0 = new URLSearchParams(location.search);
  const menus = new Menus(app, {
    eyeImg, cats: bigCats, worlds: WORLDS, bossTex: mouseTex('boss', 66, 'laugh'),
    onPlay: id => buildLevel(id, true),
    onPage: p => { if ((level.world || 1) !== p + 1) buildLevel(WORLDS[p].levels[0], false); },
    getHat: n => hats[n] || 'none', onHat: (n, h) => { setHat(n, h); hatDirty = true; }, allHats: QS0.has('allhats'),
    onHatsClose: () => { if (hatDirty) { hatDirty = false; buildLevel(levelId, false); } },
    onResume: () => {}, onRetry: () => buildLevel(levelId, false), onQuit: () => menus.showSelect((level.world || 1) - 1),
  });
  const pause = () => { if (!menus.blocking && !ui.open && state !== 'win' && state !== 'lose') menus.showPause(level.name); };
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); else if (app.renderer.gl?.isContextLost?.()) reloadLevel(); });
  // iPad: si el sistema le quita la memoria de video al juego, al volver se recarga el nivel (antes: pantalla negra)
  const reloadLevel = () => { const q = new URLSearchParams(location.search); q.set('level', levelId); location.replace('?' + q); };
  app.canvas.addEventListener('webglcontextrestored', () => setTimeout(reloadLevel, 50));
  // al girar la tablet a vertical aparece el aviso (CSS) y el juego se pausa
  addEventListener('resize', () => { if (matchMedia('(orientation: portrait) and (pointer: coarse)').matches) pause(); });
  // con ?level=… se entra directo al nivel (pruebas); si no, pantalla de título con el nivel 1-1 congelado detrás
  const QS = new URLSearchParams(location.search);
  if (QS.has('level') || QS.has('nofly')) buildLevel(levelId, !QS.has('nofly'));
  else { buildLevel(levelId, false); menus.showTitle(QS.has('skipintro')); }

  app.ticker.add(tk => {
    const rdt = Math.min(tk.deltaMS, 50) / 1000; if (slow > 0) slow -= rdt;
    if (lastFocus > 0) { lastFocus -= rdt; if (lastFocus <= 0 && flying && cam.mode === 'follow') cam.follow(flying.body); }
    // con un menú abierto (título, niveles, pausa) el mundo se congela pero se sigue dibujando
    const dt = menus.blocking || ui.cardOpen ? 0 : rdt * (slow > 0.3 ? 0.3 : slow > 0 ? 1 - 0.7 * slow / 0.3 : 1); time += dt;
    hud.visible = !menus.blocking; ui.hud.visible = !menus.blocking && !ui.open;
    ui.update(rdt); menus.update(rdt);
    if (screenFlash > 0) screenFlash = Math.max(0, screenFlash - rdt); flashSp.alpha = screenFlash / 0.12 * 0.4;
    acc += dt * 1000;
    while (acc >= STEP_MS) { Engine.update(engine, STEP_MS); acc -= STEP_MS; }
    started += dt; fx.update(dt); curBg?.update?.(dt); if (laughAll > 0) laughAll -= dt;
    if (started > 1 && dt > 0) crush(dt);
    if (dt > 0) for (const d of dyn) if (d.patrol) driveRobot(d, dt); updateBubbles(dt); if (dt > 0) updateBooms(dt);
    { // zumbido del motor: volumen por distancia a la cámara, paneo según el lado de la pantalla
      const r = !menus.blocking && !ui.open && dyn.find(d => d.patrol);
      if (r) { const rp = r.body.position, sxp = (rp.x - cam.x) * cam.zoom / (app.screen.width / 2), k = Math.max(0, 1 - Math.max(0, Math.abs(sxp) - 1) * 0.8);
        SFX.motor((0.45 + 0.55 * cam.zoom / 0.9) * k * (r.stun > 0 ? 0.5 : 1), sxp * 0.8, r.stun > 0 ? 0.6 : 0.8 + 0.4 * Math.min(1, Math.abs(r.vx) / r.speed)); }
      else SFX.motor(0);
    }
    for (const d of [...dyn]) { // copia: destroyDyn saca elementos durante el recorrido
      const p = d.body.position; d.sprite.position.set(p.x, p.y); d.sprite.rotation = d.body.angle;
      if (d.hurt > 0) { d.hurt -= dt; d.sprite.x += Math.sin(d.hurt * 90) * 6 * d.hurt / 0.35; }
      // fuera de la vista del nivel (salió volando o rodando por un lado / se hundió): se elimina y cuenta
      if (dt > 0 && started > 1 && !d.enter && (p.x < -100 || p.x > LEVEL_W + 100 || p.y > GROUND + 150 || p.y < BOUNDS.y0 - 300)) { destroyDyn(d); continue; }
      if (d.mat === 'mouse' && dt > 0 && started > 1 && !d.ride && !d.body.isSleeping) {
        // un ratón que rueda o va cayendo se va lastimando poco a poco (los golpes se acumulan hasta que muere)
        const sp = d.body.speed + Math.abs(d.body.angularVelocity) * d.r * 0.5;
        if (sp > 2.5) damage(d, dt * (sp - 2.5) * 0.6);
        // y no rueda para siempre: frenado de giro
        if (!d.dead) Body.setAngularVelocity(d.body, d.body.angularVelocity * Math.exp(-dt * 1.5));
      }
      if (d.dead) continue;
      if (d.soot) updateSoot(d, dt);
      if (d.mat === 'mouse') animMouse(d, dt);
      // crujidos: una pieza que se tambalea (gira lento sin desplazarse mucho) rechina, como las torres de AB2
      else if (dt > 0 && started > 1 && !d.patrol && !d.body.isSleeping && time > (d.creakAt || 0)) {
        const av = Math.abs(d.body.angularVelocity);
        if (av > 0.004 && av < 0.035 && d.body.speed < 3) { SFX.creak(d.skin, Math.min(1, av / 0.02) * Math.min(1, d.w * d.h / 20000)); d.creakAt = time + 0.8 + Math.random() * 0.8; }
      }
      const hgt = Math.max(0, GROUND - p.y - d.w * 0.5); d.shadow.x = p.x; d.shadow.alpha = Math.max(0, 1 - hgt / 600);
    }
    updateTurn(dt); updateTutorial(rdt); updateTapHint(rdt);
    cam.update(dt);
    if (shownScore < score) { shownScore = Math.min(score, shownScore + Math.max(50, (score - shownScore) * dt * 6)); }
    scoreTxt.text = Math.round(shownScore).toLocaleString('en-US');
    { const hs = Math.min(app.screen.width / 2048, app.screen.height / 1536) * 1.25; hud.scale.set(hs);
      scoreLbl.position.set(app.screen.width / hs - 40, 26); scoreTxt.position.set(app.screen.width / hs - 40, 62);
      hudStars.position.set(app.screen.width / hs - 40, 172); meter.position.set(app.screen.width / hs - 40, 268); }
    updateMeter(rdt); updateHudStars(rdt); updateDeck(rdt);
    // aplicar cámara a capas (parallax solo en x)
    const sw = app.screen.width, sh = app.screen.height, z = cam.zoom * cam.pz, cx = cam.x + cam.sx, cy = cam.y + cam.sy;
    world.scale.set(z); world.position.set(sw / 2 - cx * z, sh / 2 - cy * z);
    applyLayers(curLayers, sw, sh, z, cx, cy);
    // primer plano: un poco de parallax inverso
    const fgx = (cx - X0) * z * 0.12;
    bg.fl.position.set(-fgx - 140 * bg.fl.scale.y, sh + 90 * bg.fl.scale.y); bg.fr.position.set(sw - fgx + 140 * bg.fl.scale.y, sh + 90 * bg.fl.scale.y);
  });

  // cada capa es un Sprite con escala 1/res y posición en mundo: la envolvemos en un contenedor por capa
  function applyLayers(layers, sw, sh, z, cx, cy) {
    layers.forEach((l, i) => {
      const lx = X0 + (cx - X0) * l.f;
      wraps[i].scale.set(z); wraps[i].position.set(sw / 2 - lx * z, sh / 2 - cy * z);
    });
  }

  const toScreen = (x, y) => ({x: app.screen.width / 2 + (x - cam.x) * cam.zoom, y: app.screen.height / 2 + (y - cam.y) * cam.zoom});
  window.GAME = {app, cam, catT, get queue() { return queue; }, swapCat, get onSling() { return onSling; }, menus, pause, engine, sling, launch, ui, buildLevel, get levelId() { return levelId; }, killMice: () => dyn.filter(d => d.mat === 'mouse').forEach(d => destroyDyn(d)), toScreen, tap: () => { if (canPower(flying)) { flying.power = true; activatePower(flying); } }, get score() { return score; }, addPts: v => { score += v; }, meter: meterState, wreck, get dyn() { return dyn; }, debugBreak: i => destroyDyn(dyn[i]), hitRobot: (d, a) => damage(d, a), boom: (x, y, dmg = 0) => { fx.explosion(x, y, 200); blast(x, y, 280, 0, dmg); startle(x, 1); cam.shake(30); }, get state() { return state; }, get flying() { return flying; }, get bubbles() { return bubbles.length; }, rockets, endTurn, get turnKills() { return turnKills; }, get cards() { return [...cards.values()].filter(c => !c.gone).map(c => { const g = c.getGlobalPosition(); return {id: c.qid, x: g.x, y: g.y, sel: !!onSling && onSling.id === c.qid}; }); }, hats, setHat: (n, h) => { setHat(n, h); buildLevel(levelId, false); }, ready: true};
}
main().catch(e => { console.error(e); document.body.insertAdjacentHTML('beforeend', `<pre style="color:#fff">${e.stack || e}</pre>`); });
