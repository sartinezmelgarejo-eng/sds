// Resortera estilo AB: bandas elásticas (trasera detrás del gato, delantera encima), bolsa de cuero,
// arrastre con tope, velocidad lineal al estirar, y rebote amortiguado de la bolsa al soltar.
import {Graphics} from '../vendor/pixi.min.mjs';
import {GROUND, SLING, CAT_R} from './config.js';

export const MAX_PULL = 250;      // u — tope del estirón
export const V_MAX = 1700;        // u/s con estirón completo (lineal): alcance máx ≈ 3700 u a 45°
const MIN_PULL = 28;              // menos que esto = cancelar

export class Slingshot {
  constructor(backLayer, frontLayer) {
    const h = SLING.h;
    this.tipBack = {x: SLING.x + h * 0.2, y: GROUND - h + 6};
    this.tipFront = {x: SLING.x - h * 0.2, y: GROUND - h + 6};
    this.tips0 = [{...this.tipBack}, {...this.tipFront}]; this.sway = 0; this.av = 0; // la horquilla se cimbra al soltar (pivote en la base)
    this.rest = {x: SLING.x, y: GROUND - h * 0.9};   // centro del gato en la bolsa
    this.pouch = {...this.rest}; this.pv = {x: 0, y: 0};  // posición/velocidad de la bolsa (resorte)
    this.aiming = false; this.pull = {x: 0, y: 0};
    this.gBack = new Graphics(); this.gFront = new Graphics();
    // bolsa de cuero (se dibuja una vez en el origen; se mueve/rota cada frame)
    const pw = CAT_R * 0.42, ph = CAT_R * 1.15; this.pouchG = new Graphics();
    this.pouchG.ellipse(0, 0, pw, ph).fill({color: 0x4A2610}).stroke({width: 5, color: 0x1E0E04});
    this.pouchG.ellipse(-pw * 0.2, -ph * 0.25, pw * 0.4, ph * 0.5).fill({color: 0x8A5028, alpha: 0.7});
    backLayer.addChild(this.gBack, this.pouchG); frontLayer.addChild(this.gFront);
  }
  // p = punto del dedo en mundo -> estirón con tope (círculo) y sin meterse bajo la barra
  aimTo(p) {
    let dx = p.x - this.rest.x, dy = p.y - this.rest.y; const d = Math.hypot(dx, dy);
    if (d > MAX_PULL) { dx *= MAX_PULL / d; dy *= MAX_PULL / d; }
    const floorY = GROUND - CAT_R * 0.9; if (this.rest.y + dy > floorY) dy = floorY - this.rest.y;
    this.pull = {x: dx, y: dy}; this.pouch = {x: this.rest.x + dx, y: this.rest.y + dy}; this.pv = {x: 0, y: 0};
  }
  get power() { return Math.hypot(this.pull.x, this.pull.y) / MAX_PULL; }
  // velocidad de salida (u/s) o null si el estirón es muy corto
  release() {
    this.aiming = false; const d = Math.hypot(this.pull.x, this.pull.y);
    if (d < MIN_PULL) { this.pull = {x: 0, y: 0}; return null; }
    const k = V_MAX / MAX_PULL; const v = {x: -this.pull.x * k, y: -this.pull.y * k};
    this.pv = {x: v.x * 0.3, y: v.y * 0.3}; // la bolsa sale disparada y luego oscila (u/s)
    this.av += 1.1 * d / MAX_PULL; // latigazo hacia adelante de la horquilla
    this.pull = {x: 0, y: 0};
    return v;
  }
  update(dt) {
    { const n = 4, h = dt / n; for (let i = 0; i < n; i++) { this.av += (-320 * this.sway - 7 * this.av) * h; this.sway += this.av * h; }
      const c = Math.cos(this.sway), sn = Math.sin(this.sway);
      [this.tipBack, this.tipFront].forEach((t, i) => { const dx = this.tips0[i].x - SLING.x, dy = this.tips0[i].y - GROUND; t.x = SLING.x + dx * c - dy * sn; t.y = GROUND + dx * sn + dy * c; }); }
    if (!this.aiming && !this.held) { // resorte (held = la manita del tutorial la sostiene) amortiguado hacia el reposo (la bolsa "tiembla" tras disparar)
      const k = 420, c = 13, n = 4, h = dt / n;
      for (let i = 0; i < n; i++) {
        this.pv.x += (-k * (this.pouch.x - this.rest.x) - c * this.pv.x) * h; this.pv.y += (-k * (this.pouch.y - this.rest.y) - c * this.pv.y) * h;
        this.pouch.x += this.pv.x * h; this.pouch.y += this.pv.y * h;
      }
    }
  }
  draw() {
    const p = this.pouch, stretch = Math.min(1, Math.hypot(p.x - this.rest.x, p.y - this.rest.y) / MAX_PULL);
    const w = 15 - stretch * 6; // la liga se adelgaza al estirarse
    // dirección del estirón para orientar la bolsa
    const ang = Math.atan2(p.y - (this.tipBack.y + this.tipFront.y) / 2, p.x - (this.tipBack.x + this.tipFront.x) / 2);
    const back = {x: p.x + Math.cos(ang) * CAT_R * 0.75, y: p.y + Math.sin(ang) * CAT_R * 0.75}; // la bolsa abraza al gato por detrás
    const band = (g, tip, lw) => {
      g.moveTo(tip.x, tip.y).lineTo(back.x, back.y).stroke({width: lw + 5, color: 0x2A1607, cap: 'round'});
      g.moveTo(tip.x, tip.y).lineTo(back.x, back.y).stroke({width: lw, color: 0x7A3E1C, cap: 'round'});
      g.moveTo(tip.x, tip.y - lw * 0.2).lineTo(back.x, back.y - lw * 0.2).stroke({width: lw * 0.3, color: 0xB0683A, alpha: 0.8, cap: 'round'});
    };
    const gb = this.gBack, gf = this.gFront; gb.clear(); gf.clear();
    band(gb, this.tipBack, w);
    this.pouchG.position.set(back.x, back.y); this.pouchG.rotation = ang;
    this.pouchG.scale.set(1 - stretch * 0.15, 1 + stretch * 0.1);
    band(gf, this.tipFront, w + 1);
  }
}
