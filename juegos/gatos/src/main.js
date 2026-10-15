// Gatos Furiosos — esqueleto del juego: Pixi v8 (render) + Matter 0.20 (física, global `Matter`).
import {Application, Container, Sprite, Texture, Graphics} from '../vendor/pixi.min.mjs';
import ART from './art.js';
import {LEVEL_W, GROUND, BOUNDS, X0, GRAVITY, STEP_MS, V_UNIT, CAT_R, SLING, CATS} from './config.js';
import {buildBackground} from './background.js';
import {Camera} from './camera.js';
import {Slingshot} from './sling.js';

const {Engine, Bodies, Body, Composite, Sleeping} = Matter;
const loadImg = src => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });

// ---------- texturas procedurales ----------
function canvasTex(w, h, draw, res = 1) {
  const c = document.createElement('canvas'); c.width = Math.ceil(w * res); c.height = Math.ceil(h * res);
  const k = c.getContext('2d'); k.scale(res, res); draw(k); return Texture.from(c);
}
const PAD = 14; // margen para contorno/sombra en texturas de bloques
function blockTex(t, w, h, seed) {
  return canvasTex(w + PAD * 2, h + PAD * 2, k => {
    if (t === 'box') ART.cardboard(k, PAD, PAD, w, h, {seed, label: w > 150 && h > 150, tape: h > 100});
    else if (t === 'jar') ART.jar(k, PAD, PAD, w, h, {seed, lid: seed % 2 ? '#3D8BD8' : '#C8452F'});
    else ART.can(k, PAD, PAD, w, h, {seed});
  }, 1.5);
}
function mouseTex(kind, r) {
  const S = r * 3.2;
  return canvasTex(S, S, k => ART.mouse(k, S / 2, S / 2, r, kind, {look: -1}), 1.5);
}
function catTex(img, fur, eyes, expr) {
  const size = CAT_R * 2.3 * 2; // se hornea al doble para que aguante el zoom
  const sp = ART.buildCatSprite(img, fur, size, expr, eyes);
  return {tex: Texture.from(sp.canvas), ax: sp.ox / sp.canvas.width, ay: sp.cy / sp.canvas.height, footY: (sp.oy - sp.cy) / 2};
}

async function main() {
  const app = new Application();
  await app.init({resizeTo: window, background: '#2b1d14', antialias: true, resolution: Math.min(devicePixelRatio || 1, 2), autoDensity: true});
  document.getElementById('stage').appendChild(app.canvas);
  await Promise.all([document.fonts.load('40px "Luckiest Guy"'), document.fonts.load('40px "Lilita One"')]).catch(() => {});

  const eyes = await (await fetch('assets/cats/eyes.json')).json();
  const level = await (await fetch('levels/1-1.json')).json();
  const imgs = {};
  await Promise.all(Object.entries(CATS).map(async ([n, c]) => { imgs[n] = await loadImg(c.img); }));
  const catT = {};
  for (const [n, c] of Object.entries(CATS)) {
    const e = eyes[n]; const ey = [e.eyeL, e.eyeR];
    catT[n] = {calm: catTex(imgs[n], c.fur, ey, 'calm'), angry: catTex(imgs[n], c.fur, ey, 'angry')};
    if (c.flyImg) { const fe = eyes[n + '-up']; catT[n].fly = catTex(await loadImg(c.flyImg), c.fur, [fe.eyeL, fe.eyeR], 'angry'); }
  }

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

  // sombras de contacto (se reutiliza una textura)
  const shadowTex = canvasTex(256, 64, k => { k.fillStyle = ART.rad(k, 128, 32, 0, 128, [[0, 'rgba(40,28,60,0.42)'], [1, 'rgba(40,28,60,0)']]); k.save(); k.translate(128, 32); k.scale(1, 0.25); k.beginPath(); k.arc(0, 0, 128, 0, Math.PI * 2); k.fill(); k.restore(); });
  const contactShadow = (x, w) => { const s = new Sprite(shadowTex); s.anchor.set(0.5); s.width = w; s.height = w * 0.25; s.position.set(x, GROUND); behind.addChild(s); return s; };

  // resortera (parte trasera detrás del gato, delantera encima)
  const slH = SLING.h, slTexW = slH * 0.9;
  const slBack = new Sprite(canvasTex(slTexW, slH + 20, k => ART.slingshotBack(k, slTexW / 2, slH + 10, slH), 2));
  const slFront = new Sprite(canvasTex(slTexW, slH + 20, k => ART.slingshotFront(k, slTexW / 2, slH + 10, slH), 2));
  [slBack, slFront].forEach(s => { s.scale.set(0.5); s.position.set(SLING.x - slTexW / 2, GROUND - slH - 10); });
  contactShadow(SLING.x, 200);
  slingBack.addChild(slBack); slingFront.addChild(slFront);

  // ---------- física ----------
  const engine = Engine.create({enableSleeping: true, positionIterations: 10, velocityIterations: 8});
  engine.gravity.y = 1; engine.gravity.scale = GRAVITY;
  const ground = Bodies.rectangle(LEVEL_W / 2, GROUND + 200, BOUNDS.x1 - BOUNDS.x0 + 4000, 400, {isStatic: true, friction: 1, label: 'ground'});
  Composite.add(engine.world, ground);
  const dyn = []; // {body, sprite, shadow}
  const MAT = {box: {density: 0.0012, friction: 0.9}, jar: {density: 0.0016, friction: 0.35}, can: {density: 0.004, friction: 0.8}};
  level.blocks.forEach((b, i) => {
    const top = b.y ?? b.h, cy = GROUND - top + b.h / 2;
    const body = Bodies.rectangle(b.x, cy, b.w, b.h, {...MAT[b.t], restitution: 0, chamfer: {radius: Math.min(b.w, b.h) * 0.08}, label: b.t, sleepThreshold: 40});
    Sleeping.set(body, true);
    const sp = new Sprite(blockTex(b.t, b.w, b.h, i + 2)); sp.anchor.set(0.5); sp.scale.set(1 / 1.5);
    Composite.add(engine.world, body); actors.addChild(sp);
    dyn.push({body, sprite: sp, shadow: contactShadow(b.x, b.w * 1.3), w: b.w});
  });
  level.mice.forEach(m => {
    const body = Bodies.circle(m.x, GROUND - m.y, m.r * 0.92, {density: 0.0012, friction: 0.8, restitution: 0.05, label: 'mouse'});
    Sleeping.set(body, true);
    const sp = new Sprite(mouseTex(m.k, m.r)); sp.anchor.set(0.5); sp.scale.set(1 / 1.5);
    Composite.add(engine.world, body); actors.addChild(sp);
    dyn.push({body, sprite: sp, shadow: contactShadow(m.x, m.r * 2.4), w: m.r * 2});
  });

  let acc = 0, time = 0;
  // ---------- resortera + turnos ----------
  const sling = new Slingshot(slingBack, slingFront);
  slingFront.setChildIndex(sling.gFront, 0); // la liga delantera va bajo el brazo delantero de madera
  const trail = new Container(); behind.addChild(trail);
  const dotTex = canvasTex(40, 40, k => { k.fillStyle = 'rgba(60,40,70,0.25)'; k.beginPath(); k.arc(22, 23, 15, 0, Math.PI * 2); k.fill(); k.fillStyle = '#FFFFFF'; k.beginPath(); k.arc(19, 19, 15, 0, Math.PI * 2); k.fill(); }, 2);
  const flyTex = n => CATS[n].flyImg ? catT[n].fly : catT[n].angry;

  // gatos en espera (sobre la barra, a la izquierda de la resortera)
  const slotX = i => SLING.x - 330 - i * 145;
  const queue = level.cats.map((n, i) => {
    const t = catT[n].calm, sp = new Sprite(t.tex); sp.anchor.set(t.ax, t.ay); sp.scale.set(0.5);
    sp.position.set(slotX(i), GROUND - t.footY);
    actors.addChild(sp); const sh = contactShadow(slotX(i), 170);
    return {name: n, sprite: sp, shadow: sh, x: slotX(i), phase: i * 1.7, hop: null};
  });

  let state = 'intro', onSling = null, flying = null, turnWait = 0;
  // el siguiente gato salta a la resortera; los demás avanzan un lugar con saltitos
  function loadNext() {
    if (!queue.length) { state = 'out'; return; }
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
  // compat. con la prueba anterior: GAME.launch(vx, vy) dispara el gato que esté en la resortera
  function launch(vx, vy) { if (state === 'ready') shoot({x: vx, y: vy}); }

  Matter.Events.on(engine, 'collisionStart', ev => {
    if (!flying || flying.hit) return;
    for (const pr of ev.pairs) if (pr.bodyA === flying.body || pr.bodyB === flying.body) {
      flying.hit = true; cam.shake(Math.min(18, flying.body.speed * 0.6)); break;
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
      f.sprite.position.set(b.position.x, b.position.y);
      if (!f.hit) {
        // en el aire: inclinación hacia la velocidad y estirón según rapidez (squash & stretch)
        const va = Math.atan2(b.velocity.y, b.velocity.x), sp = Math.min(1, b.speed / 28);
        f.sprite.rotation = Math.max(-0.6, Math.min(0.6, va * 0.35)) + f.t * 0.6;
        f.sprite.scale.set(0.5 * (1 + sp * 0.08), 0.5 * (1 - sp * 0.06));
        // rastro de puntitos (uno grande cada 5)
        if (Math.hypot(b.position.x - f.lastDot.x, b.position.y - f.lastDot.y) > 46) {
          const d = new Sprite(dotTex); d.anchor.set(0.5); const big = ++f.dots % 5 === 0;
          d.scale.set(big ? 0.32 : 0.2); d.position.set(b.position.x, b.position.y); trail.addChild(d); f.lastDot = {x: b.position.x, y: b.position.y};
        }
      } else {
        f.sprite.rotation = b.angle + 0; f.sprite.scale.x += (0.5 - f.sprite.scale.x) * 0.2; f.sprite.scale.y += (0.5 - f.sprite.scale.y) * 0.2;
      }
      // fin de turno: todo quieto ~1 s (o 10 s máx, o fuera del nivel)
      const busy = dyn.some(d => !d.body.isSleeping && d.body.speed > 0.4);
      f.still = (b.speed < 0.35 && !busy) ? f.still + dt : 0;
      const gone = b.position.x > BOUNDS.x1 + 300 || b.position.x < BOUNDS.x0 - 300;
      if (f.still > 1 || f.t > 10 || gone) {
        // el gato se va con un "puf" (escala + fade) y la cámara regresa
        f.fade = (f.fade || 0) + dt;
        f.sprite.alpha = Math.max(0, 1 - f.fade / 0.3); f.sprite.scale.set(0.5 * (1 + f.fade));
        if (f.fade > 0.3) {
          Composite.remove(engine.world, b); f.sprite.destroy(); flying = null;
          cam.release(); state = 'between'; turnWait = 0.9;
        }
      }
    }
    if (state === 'between') { turnWait -= dt; if (turnWait <= 0) loadNext(); }
    // gatos en espera: respiran, dan saltitos de vez en cuando y avanzan con saltos
    const hopAnim = (o, base) => {
      const h = o.hop; h.t += dt; if (h.t < 0) return false;
      const u = Math.min(1, h.t / h.dur);
      o.sprite.x = h.x0 + (h.x1 - h.x0) * u; o.sprite.y = h.y0 + (h.y1 - h.y0) * u - Math.sin(u * Math.PI) * h.h;
      const sq = u < 0.15 ? 1 - u / 0.15 * 0.12 : u > 0.9 ? 0.92 : 1 + Math.sin(u * Math.PI) * 0.08;
      o.sprite.scale.set(0.5 / Math.sqrt(sq), 0.5 * sq); o.sprite.rotation = Math.sin(u * Math.PI * 2) * 0.15;
      if (u >= 1) { o.hop = null; o.sprite.rotation = 0; }
      return true;
    };
    if (onSling && onSling.hop) hopAnim(onSling);
    queue.forEach(q => {
      q.shadow.x = q.sprite.x;
      if (q.hop && hopAnim(q)) return;
      const t = time + q.phase, hop = Math.max(0, Math.sin(t * 2.2)) ** 8 * (Math.sin(t * 0.37) > 0.3 ? 26 : 0);
      const br = 1 + Math.sin(t * 3.1) * 0.025;
      q.sprite.scale.set(0.5 / Math.sqrt(br), 0.5 * br); q.sprite.y = GROUND - catT[q.name].calm.footY - hop;
      q.shadow.scale.x = q.shadow.scale.y * 4 * (1 - hop / 80);
    });
    sling.draw();
  }

  // ---------- input: resortera, tap en el aire, pinch-zoom / pan (2 dedos), arrastre y rueda ----------
  const ptrs = new Map(); let pinch = null, aimPtr = null;
  const el = app.canvas; el.style.touchAction = 'none';
  el.addEventListener('pointerdown', e => {
    ptrs.set(e.pointerId, {x: e.clientX, y: e.clientY}); el.setPointerCapture(e.pointerId);
    if (cam.mode === 'flyover') { cam.skipFlyover(); return; }
    if (ptrs.size === 1) {
      const w = cam.toWorld(e.clientX, e.clientY);
      if (state === 'ready' && Math.hypot(w.x - sling.pouch.x, w.y - sling.pouch.y) < Math.max(CAT_R * 2, 70 / cam.zoom)) {
        aimPtr = e.pointerId; sling.aiming = true; sling.grab = {dx: sling.pouch.x - w.x, dy: sling.pouch.y - w.y};
        if (cam.mode === 'user') cam.mode = 'rest';
        return;
      }
      if (state === 'flying' && flying && !flying.hit && !flying.power) { flying.power = true; /* tarea 6: activar poder */ return; }
    }
    if (ptrs.size === 2) {
      if (aimPtr != null) return; // mientras apunta no hay pinch
      const [a, b] = [...ptrs.values()]; pinch = {d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2};
    }
  });
  el.addEventListener('pointermove', e => {
    const p = ptrs.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    if (e.pointerId === aimPtr) { const w = cam.toWorld(e.clientX, e.clientY); sling.aimTo({x: w.x + sling.grab.dx, y: w.y + sling.grab.dy}); return; }
    if (ptrs.size >= 2 && pinch) {
      const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      cam.panBy(mx - pinch.mx, my - pinch.my); cam.zoomAt(d / pinch.d, mx, my);
      pinch = {d, mx, my};
    } else if (ptrs.size === 1 && state !== 'flying') cam.panBy(dx, dy);
  });
  const up = e => {
    ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null;
    if (e.pointerId === aimPtr) { aimPtr = null; const v = sling.release(); if (v && onSling) shoot(v); }
  };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  el.addEventListener('wheel', e => { e.preventDefault(); cam.zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY); }, {passive: false});
  // doble toque = volver a la vista completa
  el.addEventListener('dblclick', () => { if (cam.mode === 'user') cam.mode = 'rest'; });

  // ---------- loop ----------
  const resize = () => {
    cam.resize(app.screen.width, app.screen.height);
    vignette.width = app.screen.width; vignette.height = app.screen.height;
    const fs = Math.max(app.screen.width, app.screen.height) / 2048 * 0.75;
    bg.fl.scale.set(fs); bg.fr.scale.set(-fs, fs);
  };
  resize(); window.addEventListener('resize', resize);
  cam.snapRest();
  const fortX = level.blocks.reduce((s, b) => s + b.x, 0) / level.blocks.length;
  if (!new URLSearchParams(location.search).has('nofly')) cam.flyover(fortX, SLING.x, () => { if (state === 'intro') { state = 'between'; turnWait = 0.2; } });
  else { state = 'between'; turnWait = 0.2; }

  app.ticker.add(tk => {
    const dt = Math.min(tk.deltaMS, 50) / 1000; time += dt;
    acc += dt * 1000;
    while (acc >= STEP_MS) { Engine.update(engine, STEP_MS); acc -= STEP_MS; }
    for (const d of dyn) {
      const p = d.body.position; d.sprite.position.set(p.x, p.y); d.sprite.rotation = d.body.angle;
      const hgt = Math.max(0, GROUND - p.y - d.w * 0.5); d.shadow.x = p.x; d.shadow.alpha = Math.max(0, 1 - hgt / 600);
    }
    updateTurn(dt);
    cam.update(dt);
    // aplicar cámara a capas (parallax solo en x)
    const sw = app.screen.width, sh = app.screen.height, z = cam.zoom, cx = cam.x + cam.sx, cy = cam.y + cam.sy;
    world.scale.set(z); world.position.set(sw / 2 - cx * z, sh / 2 - cy * z);
    applyLayers(bg.layers, sw, sh, z, cx, cy);
    // primer plano: un poco de parallax inverso
    const fx = (cx - X0) * z * 0.12;
    bg.fl.position.set(-fx - 140 * bg.fl.scale.y, sh + 90 * bg.fl.scale.y); bg.fr.position.set(sw - fx + 140 * bg.fl.scale.y, sh + 90 * bg.fl.scale.y);
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
  window.GAME = {app, cam, engine, sling, launch, toScreen, get state() { return state; }, get flying() { return flying; }, ready: true};
}
main().catch(e => { console.error(e); document.body.insertAdjacentHTML('beforeend', `<pre style="color:#fff">${e.stack || e}</pre>`); });
