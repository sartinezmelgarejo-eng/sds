// Gatos Furiosos — esqueleto del juego: Pixi v8 (render) + Matter 0.20 (física, global `Matter`).
import {Application, Container, Sprite, Texture, Graphics} from '../vendor/pixi.min.mjs';
import ART from './art.js';
import {LEVEL_W, GROUND, BOUNDS, X0, GRAVITY, STEP_MS, V_UNIT, CAT_R, SLING, CATS, LEVELS} from './config.js';
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
function blockTex(t, w, h, seed, damage = 0) {
  return cached(`b|${t}|${w}|${h}|${seed}|${damage}`, () => canvasTex(w + PAD * 2, h + PAD * 2, k => {
    if (t === 'box') ART.cardboard(k, PAD, PAD, w, h, {seed, damage, label: w > 150 && h > 150, tape: h > 100});
    else if (t === 'jar') ART.jar(k, PAD, PAD, w, h, {seed, damage, lid: seed % 2 ? '#3D8BD8' : '#C8452F'});
    else ART.can(k, PAD, PAD, w, h, {seed, damage});
  }, 1.5));
}
function mouseTex(kind, r, expr = 'normal') {
  const S = r * 3.2;
  return cached(`m|${kind}|${r}|${expr}`, () => canvasTex(S, S, k => ART.mouse(k, S / 2, S / 2, r, kind, {look: -1, expr}), 1.5));
}
function catTex(img, fur, eyes, expr, size = CAT_R * 2.3 * 2) { // se hornea al doble para que aguante el zoom
  const sp = ART.buildCatSprite(img, fur, size, expr, eyes);
  return {tex: Texture.from(sp.canvas), ax: sp.ox / sp.canvas.width, ay: sp.cy / sp.canvas.height, footY: (sp.oy - sp.cy) / 2};
}

async function main() {
  const app = new Application();
  await app.init({resizeTo: window, background: '#2b1d14', antialias: true, resolution: Math.min(devicePixelRatio || 1, 2), autoDensity: true});
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
  for (const [n, c] of Object.entries(CATS)) {
    const e = eyes[n]; const ey = [e.eyeL, e.eyeR];
    catT[n] = {calm: catTex(imgs[n], c.fur, ey, 'calm'), angry: catTex(imgs[n], c.fur, ey, 'angry'), blink: catTex(imgs[n], c.fur, ey, 'blink')};
    if (c.flyImg) { const fe = eyes[n + '-up']; const fi = await loadImg(c.flyImg); catT[n].fly = catTex(fi, c.fur, [fe.eyeL, fe.eyeR], 'angry');
      // Omi inflado: textura 4× más grande para que no se pixele al crecer
      if (n === 'omi') catT[n].puff = catTex(fi, c.fur, [fe.eyeL, fe.eyeR], 'angry', CAT_R * 2.3 * 2 * 3.2); }
  }

  const eyeImg = await loadImg('assets/omi-eye.jpg');
  const bigCats = ['mako', 'omi', 'miu'].map(n => { const e = eyes[n]; const t = catTex(imgs[n], CATS[n].fur, [e.eyeL, e.eyeR], 'calm', 440); t.blink = catTex(imgs[n], CATS[n].fur, [e.eyeL, e.eyeR], 'blink', 440).tex; return t; });

  // ---------- escena ----------
  const cam = new Camera();
  const bg = buildBackground();
  const bgRoot = new Container();
  const world = new Container();                 // capa de juego (parallax 1)
  const behind = new Container(), actors = new Container(), front = new Container();
  // capa de la resortera: madera trasera, liga trasera, bolsa, gato, liga delantera, madera delantera (encima de los gatos en espera)
  const slingRoot = new Container(), slingBack = new Container(), slingCat = new Container(), slingFront = new Container();
  slingRoot.addChild(slingBack, slingCat, slingFront);
  world.addChild(behind, actors, slingRoot, front);
  app.stage.addChild(bgRoot, world, bg.fg);
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
  const LIFE = {box: 13, jar: 7, can: 30, small: 4.5, thimble: 9, boss: 13};
  const FRAGILE = {box: 1, jar: 1.6, can: 0.55, mouse: 1};
  const PTS = {box: 500, jar: 500, can: 1000, mouse: 5000};
  const MAT = {box: {density: 0.0012, friction: 0.9}, jar: {density: 0.0016, friction: 0.35}, can: {density: 0.004, friction: 0.8}};
  let acc = 0, time = 0;
  // ---------- resortera + turnos ----------
  const sling = new Slingshot(slingBack, slingFront);
  slingFront.setChildIndex(sling.gFront, 0); // la liga delantera va bajo el brazo delantero de madera
  const trail = new Container(); behind.addChild(trail);
  const fx = new FX(front);
  fx.under = new Container(); world.addChildAt(fx.under, world.getChildIndex(actors)); // estelas detrás de los gatos
  let score = 0, shownScore = 0;
  const hud = new Container(); app.stage.addChild(hud);
  const scoreLbl = new Text({text: 'PUNTOS', style: {fontFamily: 'Luckiest Guy', fontSize: 34, fill: '#FFE27A', stroke: {color: '#1F2240', width: 7, join: 'round'}}});
  const scoreTxt = new Text({text: '0', style: {fontFamily: 'Luckiest Guy', fontSize: 66, fill: '#FFFFFF', stroke: {color: '#1F2240', width: 11, join: 'round'}, dropShadow: {color: '#1F2240', distance: 5, angle: Math.PI / 2, blur: 0, alpha: 0.9}}});
  scoreLbl.anchor.set(1, 0); scoreTxt.anchor.set(1, 0); hud.addChild(scoreLbl, scoreTxt);
  const addScore = (v, x, y, color, big, k) => { score += v; fx.points(x, y, v, color, big, k); SFX.points(); };
  const PTS_COL = {box: '#FFD08A', jar: '#BDEBFF', can: '#E6E9F0', mouse: '#A8F06A'};
  let started = 0, slow = 0; // segundos desde que arrancó el nivel (el primer segundo no hay daño)

  function damage(d, amount, k) {
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
      fx.smoke(p.x, p.y, d.w * 0.6, 12); SFX.poof();
      if (!dyn.some(o => o.mat === 'mouse')) slow = 1.1; // cámara lenta breve en el último ratón
      // los gatos en espera festejan con un brinco (escalonado), como los pájaros de AB2
      queue.forEach((q, i) => { if (!q.hop) q.hop = {t: -0.15 - i * 0.1, dur: 0.5, x0: q.sprite.x, y0: q.sprite.y, x1: q.sprite.x, y1: q.sprite.y, h: 110}; });
      addScore(PTS.mouse, p.x, p.y - d.h * 0.6, PTS_COL.mouse, true);
    } else {
      const n = Math.round(Math.min(26, 6 + d.w * d.h / 1500));
      fx.burst(d.mat, p.x, p.y, n, 420, {w: d.w * 0.8, h: d.h * 0.8, size: d.mat === 'jar' ? 0.9 : 1.1});
      fx.smoke(p.x, p.y, Math.max(d.w, d.h) * 0.35, d.mat === 'jar' ? 3 : 6);
      SFX.breakSfx(d.mat);
      addScore(PTS[d.mat], p.x, p.y - d.h * 0.3, PTS_COL[d.mat]);
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

  // ---------- PODERES (tap en el aire una sola vez, antes del primer contacto) ----------
  // Onda radial: empuje ~ (1 - d/R), daño ~ (1 - d/R) × fragilidad × bonus por material
  function blast(x, y, R, push, dmg, bonus = {}) {
    for (const d of [...dyn]) {
      const p = d.body.position, dx = p.x - x, dy = p.y - y, dist = Math.hypot(dx, dy);
      if (dist > R + Math.max(d.w, d.h) / 2) continue;
      const k = Math.max(0.15, 1 - dist / R), m = Math.min(1.6, Math.sqrt(40 / d.body.mass));
      Sleeping.set(d.body, false);
      const ux = dist > 1 ? dx / dist : 0, uy = dist > 1 ? dy / dist : -1;
      Body.setVelocity(d.body, {x: d.body.velocity.x + ux * push * k * m, y: d.body.velocity.y + (uy - 0.35) * push * k * m});
      Body.setAngularVelocity(d.body, d.body.angularVelocity + (Math.random() - 0.5) * 0.3 * k);
      damage(d, dmg * k * FRAGILE[d.mat] * (bonus[d.mat] ?? 1), push);
    }
  }
  const furTex = canvasTex(64, 64, k => { k.strokeStyle = '#F4EEE4'; k.lineWidth = 7; k.lineCap = 'round'; k.beginPath(); k.moveTo(8, 50); k.quadraticCurveTo(30, 6, 56, 20); k.stroke(); k.strokeStyle = 'rgba(120,100,80,0.8)'; k.lineWidth = 3; k.stroke(); });
  fx.T.fur = [furTex];
  const flash = (x, y, r, color) => { fx.burst('smoke', x, y, 1, 0, {up: 0, g: 0, life: 0.25, size: r / 40, grow: 0.8}); const s = fx.parts[fx.parts.length - 1].s; s.tint = color; };

  function activatePower(f) {
    const b = f.body, p = b.position, name = f.q.name;
    if (name === 'mako') { // 💥 Bola de pelos: explota
      fx.explosion(p.x, p.y, 200); fx.ring(p.x, p.y, 320, 0xFFF1C8);
      screenFlash = 0.12;
      fx.burst('fur', p.x, p.y, 26, 900, {up: 120, size: 1.4, life: 1.4, drag: 1.5});
      blast(p.x, p.y, 280, 26, 34, {can: 1.6});
      cam.shake(34, 0.5); SFX.boom();
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
      const target = I.t < 0.15 ? 1 + 3 * (I.t / 0.15) : I.t < 2.15 ? 4 : Math.max(1, 4 - 3 * (I.t - 2.15) / 0.35);
      if (Math.abs(target - I.k) > 0.01) { Body.scale(b, target / I.k, target / I.k); I.k = target; }
      if (!I.pushed && I.t >= 0.15) { I.pushed = true; blast(b.position.x, b.position.y, CAT_R * 4.6, 17, 10, {box: 1.2}); cam.shake(12); fx.ring(b.position.x, b.position.y, CAT_R * 4.8, 0xFFFFFF, 0.3); fx.burst('fur', b.position.x, b.position.y, 14, 500, {up: 60, life: 1}); }
      if (!I.deflated && I.t > 2.15) { I.deflated = true; SFX.deflate(); }
      if (I.t > 2.6) f.inflate = null;
      // con más de 1.6× usa la textura grande (misma proporción de ancla)
      const P = catT[f.q.name].puff, big = P && I.k > 1.6, T = big ? P : flyTex(f.q.name);
      if (f.sprite.texture !== T.tex) f.sprite.texture = T.tex;
      const r = big ? catT[f.q.name].fly.tex.width / P.tex.width : 1;
      f.sprite.scale.set(0.5 * r * I.k * (1 + Math.sin(I.t * 30) * 0.02 * (I.k > 3.9 ? 1 : 0)));
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
  // Ratones vivos: respiran, parpadean, se burlan (carcajada con saltitos) y se asustan si un gato pasa cerca
  let laughAll = 0;
  function animMouse(d, dt) {
    const t = time + d.ph, B = 1 / 1.5;
    let expr = 'normal', hop = 0;
    const fc = flying && !flying.fade ? flying.body : null;
    const near = fc && Math.hypot(fc.position.x - d.body.position.x, fc.position.y - d.body.position.y) < 650 && fc.speed > 3;
    if (d.hurt > 0 || near) expr = 'scared';
    else if (d.laugh > 0 || laughAll > 0) {
      d.laugh -= dt; expr = 'laugh';
      if (d.body.isSleeping) hop = Math.abs(Math.sin(t * 13)) * 9; // brinquitos de risa
    } else {
      if (time > d.tauntAt && (state === 'ready' || state === 'loading')) { d.laugh = 1.1; d.tauntAt = time + 5 + Math.random() * 6; }
      if (time > d.blinkAt) { expr = 'blink'; if (time > d.blinkAt + 0.13) d.blinkAt = time + 1.5 + Math.random() * 3.5; }
    }
    const tx = d.mt[expr]; if (d.sprite.texture !== tx) d.sprite.texture = tx;
    const br = Math.sin(t * 2.6) * 0.03, sq = expr === 'scared' ? 0.06 : 0;
    d.sprite.scale.set(B * (1 - br * 0.6 - sq * 0.5), B * (1 + br + sq));
    d.sprite.y -= hop + br * d.h * 0.25;
  }
  const dotTex = canvasTex(40, 40, k => { k.fillStyle = 'rgba(60,40,70,0.25)'; k.beginPath(); k.arc(22, 23, 15, 0, Math.PI * 2); k.fill(); k.fillStyle = '#FFFFFF'; k.beginPath(); k.arc(19, 19, 15, 0, Math.PI * 2); k.fill(); }, 2);
  const flyTex = n => CATS[n].flyImg ? catT[n].fly : catT[n].angry;

  // gatos en espera (sobre la barra, a la izquierda de la resortera)
  const slotX = i => SLING.x - 330 - i * 145;
  const queue = [];
  let state = 'intro', onSling = null, flying = null, turnWait = 0, endT = 0;
  // el siguiente gato salta a la resortera; los demás avanzan un lugar con saltitos
  function loadNext() {
    const q = queue.shift(); q.shadow.destroy();
    const t = catT[q.name].angry; q.sprite.texture = t.tex; q.sprite.anchor.set(t.ax, t.ay);
    q.hop = {t: 0, dur: 0.6, x0: q.sprite.x, y0: q.sprite.y, x1: sling.rest.x, y1: sling.rest.y, h: 230};
    actors.removeChild(q.sprite); slingCat.addChild(q.sprite); // entre la liga trasera y la delantera
    onSling = q; state = 'loading';
    queue.forEach((o, i) => { o.hop = {t: -0.25 - i * 0.12, dur: 0.45, x0: o.x, y0: o.sprite.y, x1: slotX(i), y1: o.sprite.y, h: 70}; o.x = slotX(i); });
  }
  function shoot(v) {
    const q = onSling; onSling = null;
    const p = sling.pouch;
    const body = Bodies.circle(p.x, p.y, CAT_R, {density: 0.004, friction: 0.6, frictionAir: 0, restitution: 0.15, label: 'cat'});
    Body.setVelocity(body, {x: v.x / 1000 * V_UNIT, y: v.y / 1000 * V_UNIT});
    Composite.add(engine.world, body);
    const t = flyTex(q.name); q.sprite.texture = t.tex; q.sprite.anchor.set(t.ax, t.ay);
    slingCat.removeChild(q.sprite); actors.addChild(q.sprite);
    trail.removeChildren().forEach(c => c.destroy()); // el rastro anterior se borra al disparar el nuevo
    flying = {q, body, sprite: q.sprite, t: 0, still: 0, hit: false, lastDot: {x: p.x, y: p.y}, dots: 0, power: false};
    state = 'flying'; cam.follow(body);
  }
  // fin de turno: ¿ganó? ¿se acabaron los gatos? si no, el siguiente
  function endTurn() {
    endT = 0;
    if (!dyn.some(d => d.mat === 'mouse')) { state = 'win'; endT0 = false; SFX.duck(4); SFX.win(); return; }
    laughAll = 1.3;
    if (!queue.length) { state = 'lose'; laughAll = 1e9; SFX.duck(4); SFX.giggle(); setTimeout(SFX.lose, 700); return; }
    state = 'between'; turnWait = 0.9;
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
    ui.show({win, stars, score, best: Math.max(win ? score : 0, prev?.score || 0), record, name: level.name, hasNext: true});
  }
  // compat. con la prueba anterior: GAME.launch(vx, vy) dispara el gato que esté en la resortera
  function launch(vx, vy) { if (state === 'ready') shoot({x: vx, y: vy}); }

  Matter.Events.on(engine, 'collisionStart', ev => {
    for (const pr of ev.pairs) {
      const A = pr.bodyA, B = pr.bodyB, n = pr.collision.normal;
      const closing = Math.abs((A.velocity.x - B.velocity.x) * n.x + (A.velocity.y - B.velocity.y) * n.y);
      if (closing < 1.0) continue;
      for (const [me, other] of [[A, B], [B, A]]) {
        const d = byBody(me); if (!d) continue;
        SFX.hit(d.mat, closing / 18);
        if (started < 1) continue;
        const mf = other.isStatic ? 1.15 : Math.min(1.35, Math.sqrt(2 * other.mass / (other.mass + me.mass)));
        damage(d, Math.max(0, closing - 1.2) * mf * FRAGILE[d.mat], closing);
      }
    }
  });
  Matter.Events.on(engine, 'collisionStart', ev => {
    if (!flying || flying.hit) return;
    for (const pr of ev.pairs) if (pr.bodyA === flying.body || pr.bodyB === flying.body) {
      flying.hit = true; flying.hitT = flying.t; cam.shake(Math.min(18, flying.body.speed * 0.6));
      if (flying.dive) { // Miu: onda de choque + temblor de estructuras
        const p = flying.body.position; flying.dive = false;
        blast(p.x, p.y + CAT_R, 340, 15, 30, {can: 1.8}); dyn.forEach(o => { Sleeping.set(o.body, false); Body.setAngularVelocity(o.body, (Math.random() - 0.5) * 0.05); });
        fx.smoke(p.x, p.y + CAT_R, 140, 14); fx.ring(p.x, p.y + CAT_R, 360, 0xCFEFFF, 0.45); cam.shake(30, 0.5); SFX.slam();
      }
      break;
    }
  });

  function updateTurn(dt) {
    sling.update(dt);
    if (state === 'loading' && onSling && !onSling.hop) state = 'ready';
    if (onSling && !onSling.hop) {
      const p = sling.pouch, pw = sling.power;
      // en la resortera: sigue a la bolsa; al estirar se aplasta en la dirección del jalón y se inclina hacia el tiro
      const tilt = sling.aiming && pw > 0.05 ? Math.max(-0.45, Math.min(0.45, Math.atan2(-sling.pull.y, -sling.pull.x) * 0.5)) : Math.sin(time * 1.7) * 0.04;
      onSling.sprite.position.set(p.x, p.y); onSling.sprite.rotation = tilt;
      const br = sling.aiming ? 0 : Math.sin(time * 3.4) * 0.03;
      onSling.sprite.scale.set(0.5 * (1 - pw * 0.1 - br * 0.5), 0.5 * (1 + pw * 0.07 + br));
    }
    if (flying) {
      const f = flying, b = f.body; f.t += dt;
      updatePower(f, dt);
      if (f.hit && !f.power && (f.q.name === 'mako' || f.q.name === 'omi') && f.t - f.hitT > 1) { f.power = true; activatePower(f); }
      f.sprite.position.set(b.position.x, b.position.y);
      if (!f.hit && !f.loop) {
        // en el aire: inclinación hacia la velocidad y estirón según rapidez (squash & stretch)
        const va = Math.atan2(b.velocity.y, b.velocity.x), sp = Math.min(1, b.speed / 28);
        f.sprite.rotation = Math.max(-0.6, Math.min(0.6, va * 0.35)); // sin girar: la cara real se lee mejor
        if (!f.inflate) f.sprite.scale.set(0.5 * (1 + sp * 0.08), 0.5 * (1 - sp * 0.06));
        // rastro de puntitos (uno grande cada 5)
        if (Math.hypot(b.position.x - f.lastDot.x, b.position.y - f.lastDot.y) > 46) {
          const d = new Sprite(dotTex); d.anchor.set(0.5); const big = ++f.dots % 5 === 0;
          d.scale.set(big ? 0.32 : 0.2); d.position.set(b.position.x, b.position.y); trail.addChild(d); f.lastDot = {x: b.position.x, y: b.position.y};
        }
      } else {
        f.sprite.rotation = b.angle; if (!f.inflate) { f.sprite.scale.x += (0.5 - f.sprite.scale.x) * 0.2; f.sprite.scale.y += (0.5 - f.sprite.scale.y) * 0.2; }
      }
      // fin de turno: todo quieto ~1 s (o 10 s máx, o fuera del nivel)
      const busy = dyn.some(d => !d.body.isSleeping && d.body.speed > 0.4);
      f.still = (b.speed < 0.35 && !busy) ? f.still + dt : 0;
      const gone = b.position.x > BOUNDS.x1 + 300 || b.position.x < BOUNDS.x0 - 300;
      if (f.exploded) { const busy2 = dyn.some(d => !d.body.isSleeping && d.body.speed > 0.4); f.still2 = busy2 ? 0 : (f.still2 || 0) + dt; }
      if ((f.exploded ? f.still2 > 1 || f.t > 10 : (f.still > 1 && !f.inflate) || f.t > 10 || gone)) {
        // el gato se va con un "puf" (escala + fade) y la cámara regresa
        f.fade = (f.fade || 0) + dt;
        f.sprite.alpha = Math.max(0, 1 - f.fade / 0.3); f.sprite.scale.set(0.5 * (1 + f.fade));
        if (f.fade > 0.3) {
          if (!f.exploded) Composite.remove(engine.world, b); f.sprite.destroy(); flying = null;
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
      if (u >= 1) { o.hop = null; o.sprite.rotation = 0; }
      return true;
    };
    if (onSling && onSling.hop) hopAnim(onSling);
    queue.forEach(q => {
      q.shadow.x = q.sprite.x;
      if (q.hop && hopAnim(q)) return;
      const t = time + q.phase, hop = Math.max(0, Math.sin(t * 2.2)) ** 8 * (Math.sin(t * 0.37) > 0.3 ? 26 : 0);
      const br = 1 + Math.sin(t * 3.1) * 0.025;
      // parpadeo (a veces doble, como en AB2)
      if (!q.bonus) {
        if (q.blinkAt == null) q.blinkAt = time + 1 + Math.random() * 3;
        const bt = time - q.blinkAt, closed = (bt > 0 && bt < 0.12) || (q.dbl && bt > 0.22 && bt < 0.33);
        const T = closed ? catT[q.name].blink : catT[q.name].calm; if (q.sprite.texture !== T.tex) q.sprite.texture = T.tex;
        if (bt > 0.4) { q.blinkAt = time + 2 + Math.random() * 3.5; q.dbl = Math.random() < 0.3; }
      }
      q.sprite.scale.set(0.5 / Math.sqrt(br), 0.5 * br); q.sprite.y = GROUND - catT[q.name].calm.footY - hop;
      q.shadow.scale.x = q.shadow.scale.y * 4 * (1 - hop / 80);
    });
    sling.draw();
  }

  // ---------- input: resortera, tap en el aire, pinch-zoom / pan (2 dedos), arrastre y rueda ----------
  const ptrs = new Map(); let pinch = null, aimPtr = null;
  const el = app.canvas; el.style.touchAction = 'none';
  el.addEventListener('pointerdown', e => {
    ptrs.set(e.pointerId, {x: e.clientX, y: e.clientY}); el.setPointerCapture(e.pointerId); SFX.unlockAudio();
    if (menus.blocking) { menus.skipIntro(); return; }
    if (ui.open) return;
    if (cam.mode === 'flyover') { cam.skipFlyover(); return; }
    if (ptrs.size === 1) {
      const w = cam.toWorld(e.clientX, e.clientY);
      if (state === 'ready' && Math.hypot(w.x - sling.pouch.x, w.y - sling.pouch.y) < Math.max(CAT_R * 2, 70 / cam.zoom)) {
        aimPtr = e.pointerId; sling.aiming = true; sling.grab = {dx: sling.pouch.x - w.x, dy: sling.pouch.y - w.y};
        if (cam.mode === 'user') cam.mode = 'rest';
        return;
      }
      if (state === 'flying' && flying && !flying.hit && !flying.power) { flying.power = true; activatePower(flying); return; }
    }
    if (ptrs.size === 2) {
      if (aimPtr != null) return; // mientras apunta no hay pinch
      const [a, b] = [...ptrs.values()]; pinch = {d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2};
    }
  });
  el.addEventListener('pointermove', e => {
    const p = ptrs.get(e.pointerId); if (!p || menus.blocking || ui.open) return;
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
    if (e.pointerId === aimPtr) { aimPtr = null; const pw = sling.power, v = sling.release(); if (v && onSling) { SFX.release(pw); shoot(v); } }
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
    levelId = id; level = levels[id];
    Composite.clear(engine.world, false); Composite.add(engine.world, ground);
    dyn.length = 0; queue.length = 0;
    for (const c of [actors, lvlBehind, trail, slingCat]) c.removeChildren().forEach(o => o.destroy());
    fx.clear(); ui.hide(); ui.setLevelName(level.name);
    score = shownScore = 0; resultsShown = false; started = 0; slow = 0; laughAll = 0; endT = 0;
    state = 'intro'; onSling = null; flying = null; aimPtr = null; sling.aiming = false; sling.pull = {x: 0, y: 0}; sling.pouch = {...sling.rest}; sling.pv = {x: 0, y: 0};
    level.blocks.forEach((b, i) => {
      const top = b.y ?? b.h, cy = GROUND - top + b.h / 2;
      const body = Bodies.rectangle(b.x, cy, b.w, b.h, {...MAT[b.t], restitution: 0, chamfer: {radius: Math.min(b.w, b.h) * 0.08}, label: b.t, sleepThreshold: 40});
      Sleeping.set(body, true);
      const texs = [0, 1, 2, 3].map(dmg => blockTex(b.t, b.w, b.h, i + 2, dmg));
      const sp = new Sprite(texs[0]); sp.anchor.set(0.5); sp.scale.set(1 / 1.5);
      Composite.add(engine.world, body); actors.addChild(sp);
      // vida escalada por tamaño (bloques grandes aguantan más)
      const life = LIFE[b.t] * Math.sqrt(b.w * b.h / (110 * 110));
      dyn.push({body, sprite: sp, shadow: contactShadow(b.x, b.w * 1.3), w: b.w, h: b.h, mat: b.t, life, max: life, texs, dmg: 0});
    });
    level.mice.forEach(m => {
      const body = Bodies.circle(m.x, GROUND - m.y, m.r * 0.92, {density: 0.0012, friction: 0.8, restitution: 0.05, label: 'mouse'});
      Sleeping.set(body, true);
      const mt = Object.fromEntries(['normal', 'blink', 'scared', 'laugh'].map(e => [e, mouseTex(m.k, m.r, e)]));
      const sp = new Sprite(mt.normal); sp.anchor.set(0.5); sp.scale.set(1 / 1.5);
      Composite.add(engine.world, body); actors.addChild(sp);
      dyn.push({body, sprite: sp, shadow: contactShadow(m.x, m.r * 2.4), w: m.r * 2, h: m.r * 2, mat: 'mouse', kind: m.k, life: LIFE[m.k], max: LIFE[m.k], mt, ph: Math.random() * 6, blinkAt: 1 + Math.random() * 3, tauntAt: 4 + Math.random() * 5, laugh: 0});
    });
    level.cats.forEach((n, i) => {
      const t = catT[n].calm, sp = new Sprite(t.tex); sp.anchor.set(t.ax, t.ay); sp.scale.set(0.5);
      sp.position.set(slotX(i), GROUND - t.footY);
      actors.addChild(sp); const sh = contactShadow(slotX(i), 170);
      queue.push({name: n, sprite: sp, shadow: sh, x: slotX(i), phase: i * 1.7, hop: null});
    });
    fortX = level.blocks.reduce((s, b) => s + b.x, 0) / level.blocks.length;
    cam.snapRest();
    if (fly) cam.flyover(fortX, SLING.x, () => { if (state === 'intro') { state = 'between'; turnWait = 0.2; } });
    else { state = 'between'; turnWait = 0.35; }
  }
  const ui = new UI(app, {
    onRetry: () => buildLevel(levelId, false),
    onNext: () => buildLevel(LEVELS[(LEVELS.indexOf(levelId) + 1) % LEVELS.length], true),
    onMenu: () => { ui.hide(); menus.showSelect(); },
    onPause: () => pause(),
    mouseTex: mouseTex('boss', 66, 'laugh'),
  });
  const menus = new Menus(app, {
    eyeImg, cats: bigCats, levels: LEVELS,
    onPlay: id => buildLevel(id, true),
    onResume: () => {}, onRetry: () => buildLevel(levelId, false), onQuit: () => menus.showSelect(),
  });
  const pause = () => { if (!menus.blocking && !ui.open && state !== 'win' && state !== 'lose') menus.showPause(level.name); };
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  // al girar la tablet a vertical aparece el aviso (CSS) y el juego se pausa
  addEventListener('resize', () => { if (matchMedia('(orientation: portrait) and (pointer: coarse)').matches) pause(); });
  // con ?level=… se entra directo al nivel (pruebas); si no, pantalla de título con el nivel 1-1 congelado detrás
  const QS = new URLSearchParams(location.search);
  if (QS.has('level') || QS.has('nofly')) buildLevel(levelId, !QS.has('nofly'));
  else { buildLevel(levelId, false); menus.showTitle(QS.has('skipintro')); }

  app.ticker.add(tk => {
    const rdt = Math.min(tk.deltaMS, 50) / 1000; if (slow > 0) slow -= rdt;
    // con un menú abierto (título, niveles, pausa) el mundo se congela pero se sigue dibujando
    const dt = menus.blocking ? 0 : rdt * (slow > 0.3 ? 0.3 : slow > 0 ? 1 - 0.7 * slow / 0.3 : 1); time += dt;
    hud.visible = !menus.blocking; ui.hud.visible = !menus.blocking && !ui.open;
    ui.update(rdt); menus.update(rdt);
    if (screenFlash > 0) screenFlash = Math.max(0, screenFlash - rdt); flashSp.alpha = screenFlash / 0.12 * 0.4;
    acc += dt * 1000;
    while (acc >= STEP_MS) { Engine.update(engine, STEP_MS); acc -= STEP_MS; }
    started += dt; fx.update(dt); if (laughAll > 0) laughAll -= dt;
    if (started > 1 && dt > 0) crush(dt);
    for (const d of dyn) {
      const p = d.body.position; d.sprite.position.set(p.x, p.y); d.sprite.rotation = d.body.angle;
      if (d.hurt > 0) { d.hurt -= dt; d.sprite.x += Math.sin(d.hurt * 90) * 6 * d.hurt / 0.35; }
      if (d.mat === 'mouse') animMouse(d, dt);
      const hgt = Math.max(0, GROUND - p.y - d.w * 0.5); d.shadow.x = p.x; d.shadow.alpha = Math.max(0, 1 - hgt / 600);
    }
    updateTurn(dt);
    cam.update(dt);
    if (shownScore < score) { shownScore = Math.min(score, shownScore + Math.max(50, (score - shownScore) * dt * 6)); }
    scoreTxt.text = Math.round(shownScore).toLocaleString('en-US');
    { const hs = Math.min(app.screen.width / 2048, app.screen.height / 1536) * 1.25; hud.scale.set(hs);
      scoreLbl.position.set(app.screen.width / hs - 40, 26); scoreTxt.position.set(app.screen.width / hs - 40, 62); }
    // aplicar cámara a capas (parallax solo en x)
    const sw = app.screen.width, sh = app.screen.height, z = cam.zoom, cx = cam.x + cam.sx, cy = cam.y + cam.sy;
    world.scale.set(z); world.position.set(sw / 2 - cx * z, sh / 2 - cy * z);
    applyLayers(bg.layers, sw, sh, z, cx, cy);
    // primer plano: un poco de parallax inverso
    const fgx = (cx - X0) * z * 0.12;
    bg.fl.position.set(-fgx - 140 * bg.fl.scale.y, sh + 90 * bg.fl.scale.y); bg.fr.position.set(sw - fgx + 140 * bg.fl.scale.y, sh + 90 * bg.fl.scale.y);
  });

  // cada capa es un Sprite con escala 1/res y posición en mundo: la envolvemos en un contenedor por capa
  const wraps = bg.layers.map(l => { const c = new Container(); bgRoot.addChild(c); c.addChild(l.node); return c; });
  function applyLayers(layers, sw, sh, z, cx, cy) {
    layers.forEach((l, i) => {
      const lx = X0 + (cx - X0) * l.f;
      wraps[i].scale.set(z); wraps[i].position.set(sw / 2 - lx * z, sh / 2 - cy * z);
    });
  }

  const toScreen = (x, y) => ({x: app.screen.width / 2 + (x - cam.x) * cam.zoom, y: app.screen.height / 2 + (y - cam.y) * cam.zoom});
  window.GAME = {app, cam, catT, menus, pause, engine, sling, launch, ui, buildLevel, get levelId() { return levelId; }, killMice: () => dyn.filter(d => d.mat === 'mouse').forEach(d => destroyDyn(d)), toScreen, tap: () => { if (flying && !flying.hit && !flying.power) { flying.power = true; activatePower(flying); } }, get score() { return score; }, get dyn() { return dyn; }, debugBreak: i => destroyDyn(dyn[i]), get state() { return state; }, get flying() { return flying; }, ready: true};
}
main().catch(e => { console.error(e); document.body.insertAdjacentHTML('beforeend', `<pre style="color:#fff">${e.stack || e}</pre>`); });
