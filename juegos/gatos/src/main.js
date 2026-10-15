// Gatos Furiosos — esqueleto del juego: Pixi v8 (render) + Matter 0.20 (física, global `Matter`).
import {Application, Container, Sprite, Texture, Graphics} from '../vendor/pixi.min.mjs';
import ART from './art.js';
import {LEVEL_W, GROUND, BOUNDS, X0, GRAVITY, STEP_MS, V_UNIT, CAT_R, SLING, CATS} from './config.js';
import {buildBackground} from './background.js';
import {Camera} from './camera.js';

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
  }

  // ---------- escena ----------
  const cam = new Camera();
  const bg = buildBackground();
  const bgRoot = new Container();
  const world = new Container();                 // capa de juego (parallax 1)
  const behind = new Container(), actors = new Container(), front = new Container();
  world.addChild(behind, actors, front);
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
  behind.addChild(slBack); front.addChild(slFront);

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

  // gatos en espera (sobre la barra, a la izquierda de la resortera)
  const queue = level.cats.map((n, i) => {
    const t = catT[n].calm, sp = new Sprite(t.tex); sp.anchor.set(t.ax, t.ay); sp.scale.set(0.5);
    const x = SLING.x - 170 - i * 150; sp.position.set(x, GROUND - t.footY);
    actors.addChild(sp); const sh = contactShadow(x, 170);
    return {name: n, sprite: sp, shadow: sh, baseX: x, phase: i * 1.7};
  });

  // ---------- gato en vuelo (prueba de cámara; la resortera real llega en la tarea 3) ----------
  let flying = null;
  function launch(vx, vy, name = 'omi') {
    if (flying) { Composite.remove(engine.world, flying.body); flying.sprite.destroy(); }
    const body = Bodies.circle(SLING.x, GROUND - slH * 0.92, CAT_R, {density: 0.004, friction: 0.6, frictionAir: 0, restitution: 0.15, label: 'cat'});
    Body.setVelocity(body, {x: vx / 1000 * V_UNIT, y: vy / 1000 * V_UNIT});
    const t = catT[name].angry, sp = new Sprite(t.tex); sp.anchor.set(t.ax, t.ay); sp.scale.set(0.5);
    actors.addChild(sp); Composite.add(engine.world, body);
    flying = {body, sprite: sp, t: 0, still: 0};
    cam.follow(body);
  }

  // ---------- input: pinch-zoom / pan (2 dedos), arrastre y rueda ----------
  const ptrs = new Map(); let pinch = null;
  const el = app.canvas; el.style.touchAction = 'none';
  el.addEventListener('pointerdown', e => {
    ptrs.set(e.pointerId, {x: e.clientX, y: e.clientY}); el.setPointerCapture(e.pointerId);
    if (cam.mode === 'flyover') cam.skipFlyover();
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = {d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2}; }
  });
  el.addEventListener('pointermove', e => {
    const p = ptrs.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    if (ptrs.size >= 2 && pinch) {
      const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      cam.panBy(mx - pinch.mx, my - pinch.my); cam.zoomAt(d / pinch.d, mx, my);
      pinch = {d, mx, my};
    } else if (ptrs.size === 1 && !flying) cam.panBy(dx, dy);
  });
  const up = e => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  el.addEventListener('wheel', e => { e.preventDefault(); cam.zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY); }, {passive: false});
  // doble toque = volver a la vista completa
  el.addEventListener('dblclick', () => cam.snapRest && (cam.mode = 'rest'));

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
  if (!new URLSearchParams(location.search).has('nofly')) cam.flyover(fortX, SLING.x, () => {});

  let acc = 0, time = 0;
  app.ticker.add(tk => {
    const dt = Math.min(tk.deltaMS, 50) / 1000; time += dt;
    acc += dt * 1000;
    while (acc >= STEP_MS) { Engine.update(engine, STEP_MS); acc -= STEP_MS; }
    // gato en vuelo: fin de turno al asentarse o tras 10 s
    if (flying) {
      const b = flying.body; flying.t += dt;
      flying.sprite.position.set(b.position.x, b.position.y); flying.sprite.rotation = b.angle;
      flying.still = b.speed < 0.25 ? flying.still + dt : 0;
      if (flying.still > 1 || flying.t > 10 || b.position.x > BOUNDS.x1 + 200 || b.position.x < BOUNDS.x0 - 200) { cam.release(); flying.done = true; }
    }
    for (const d of dyn) {
      const p = d.body.position; d.sprite.position.set(p.x, p.y); d.sprite.rotation = d.body.angle;
      const hgt = Math.max(0, GROUND - p.y - d.w * 0.5); d.shadow.x = p.x; d.shadow.alpha = Math.max(0, 1 - hgt / 600);
    }
    // gatos en espera: respiran y dan saltitos de vez en cuando
    queue.forEach(q => {
      const t = time + q.phase, hop = Math.max(0, Math.sin(t * 2.2)) ** 8 * (Math.sin(t * 0.37) > 0.3 ? 26 : 0);
      const br = 1 + Math.sin(t * 3.1) * 0.025;
      q.sprite.scale.set(0.5 / Math.sqrt(br), 0.5 * br); q.sprite.y = GROUND - catT[q.name].calm.footY - hop;
      q.shadow.scale.x = q.shadow.scale.y * 4 * (1 - hop / 80);
    });
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

  window.GAME = {app, cam, engine, launch, get flying() { return flying; }, ready: true};
}
main().catch(e => { console.error(e); document.body.insertAdjacentHTML('beforeend', `<pre style="color:#fff">${e.stack || e}</pre>`); });
