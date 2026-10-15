// Cámara estilo Angry Birds: vista completa en reposo, sobrevuelo inicial, sigue al gato en vuelo,
// pinch-zoom + pan con dos dedos (y rueda/arrastre con mouse). Todo suavizado (exponencial).
import {BOUNDS, LEVEL_W, GROUND, X0} from './config.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export class Camera {
  constructor() {
    this.x = X0; this.y = GROUND - 1000; this.zoom = 0.5;   // estado actual (centro en mundo, escala)
    this.tx = this.x; this.ty = this.y; this.tz = this.zoom; // objetivo
    this.sw = 1; this.sh = 1;
    this.mode = 'rest';      // rest | flyover | follow | user
    this.followTarget = null;
    this.userTimer = 0;      // tras interacción del usuario, no regresar solo durante un rato
    this.shakeT = 0; this.shakeA = 0; this.sx = 0; this.sy = 0;
  }
  resize(sw, sh) { this.sw = sw; this.sh = sh; }
  // zoom que muestra el nivel completo (ancho), con el piso cerca del borde inferior
  get fitZoom() { return Math.min(this.sw / (LEVEL_W + 200), this.sh / (BOUNDS.y1 - BOUNDS.y0)); }
  get minZoom() { return Math.max(this.sw / (BOUNDS.x1 - BOUNDS.x0), this.sh / (BOUNDS.y1 - BOUNDS.y0)); }
  get maxZoom() { return this.fitZoom * 3.2; }
  restView() {
    const z = Math.max(this.fitZoom, this.minZoom);
    // piso a ~84% de la altura de pantalla
    return {x: LEVEL_W / 2, y: GROUND - this.sh / z * 0.34, z};
  }
  clampView(x, y, z) {
    z = clamp(z, this.minZoom, this.maxZoom);
    const hw = this.sw / z / 2, hh = this.sh / z / 2;
    x = clamp(x, BOUNDS.x0 + hw, BOUNDS.x1 - hw); y = clamp(y, BOUNDS.y0 + hh, BOUNDS.y1 - hh);
    return [x, y, z];
  }
  snapRest() { const r = this.restView(); [this.x, this.y, this.zoom] = this.clampView(r.x, r.y, r.z); this.tx = this.x; this.ty = this.y; this.tz = this.zoom; this.mode = 'rest'; }

  // Sobrevuelo inicial: empieza cerca de la fortaleza, recorre hasta la resortera y abre a la vista completa.
  // hold = segundos extra mirando la fortaleza (el jefe hace su entrada)
  flyover(fortX, slingX, done, hold = 0) {
    const r = this.restView(), zc = this.fitZoom * 2.0;
    this.mode = 'flyover';
    this.keys = [
      {t: 0, x: fortX, y: GROUND - this.sh / zc * 0.36, z: zc},
      {t: 1.4 + hold, x: fortX, y: GROUND - this.sh / zc * 0.36, z: zc},       // mirar a los ratones
      {t: 3.6 + hold, x: slingX + 600, y: GROUND - this.sh / zc * 0.36, z: zc}, // recorrer hacia la resortera
      {t: 5.0 + hold, x: r.x, y: r.y, z: r.z},                                   // abrir al nivel completo
    ];
    this.flyT = 0; this.flyDone = done;
    [this.x, this.y, this.zoom] = this.clampView(this.keys[0].x, this.keys[0].y, this.keys[0].z);
  }
  skipFlyover() { if (this.mode === 'flyover') { this.mode = 'rest'; const d = this.flyDone; this.flyDone = null; d && d(); } }

  follow(target, zk = 1.55) { this.followTarget = target; this.followZ = zk; this.mode = 'follow'; }
  release() { this.followTarget = null; this.mode = 'rest'; }
  shake(amp, dur = 0.35) { this.shakeA = Math.max(this.shakeA, amp); this.shakeT = Math.max(this.shakeT, dur); }

  // ---- interacción del usuario (coords de pantalla) ----
  panBy(dxs, dys) { this.mode = 'user'; this.userTimer = 0; this.tx -= dxs / this.tz; this.ty -= dys / this.tz; [this.tx, this.ty, this.tz] = this.clampView(this.tx, this.ty, this.tz); this.x = this.tx; this.y = this.ty; }
  zoomAt(factor, sx, sy) {
    this.mode = 'user'; this.userTimer = 0;
    const wx = this.x + (sx - this.sw / 2) / this.zoom, wy = this.y + (sy - this.sh / 2) / this.zoom;
    const z = clamp(this.zoom * factor, this.minZoom, this.maxZoom);
    this.zoom = this.tz = z; this.x = this.tx = wx - (sx - this.sw / 2) / z; this.y = this.ty = wy - (sy - this.sh / 2) / z;
    [this.x, this.y, this.zoom] = this.clampView(this.x, this.y, this.zoom); this.tx = this.x; this.ty = this.y;
  }
  toWorld(sx, sy) { return {x: this.x + (sx - this.sw / 2) / this.zoom, y: this.y + (sy - this.sh / 2) / this.zoom}; }

  update(dt) {
    if (this.mode === 'flyover') {
      this.flyT += dt; const k = this.keys; let i = 0;
      while (i < k.length - 2 && this.flyT > k[i + 1].t) i++;
      const a = k[i], b = k[i + 1], u = ease(clamp((this.flyT - a.t) / (b.t - a.t), 0, 1));
      // interpolar zoom en escala log para que se sienta natural
      const z = Math.exp(Math.log(a.z) + (Math.log(b.z) - Math.log(a.z)) * u);
      [this.x, this.y, this.zoom] = this.clampView(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u, z);
      this.tx = this.x; this.ty = this.y; this.tz = this.zoom;
      if (this.flyT >= k[k.length - 1].t) this.skipFlyover();
    } else {
      if (this.mode === 'follow' && this.followTarget) {
        const p = this.followTarget.position, v = this.followTarget.velocity || {x: 0, y: 0};
        const zf = this.fitZoom * (this.followZ || 1.55);
        // mirar un poco hacia adelante del gato
        this.tx = p.x + v.x * 8; this.ty = Math.min(p.y + v.y * 4, GROUND - this.sh / zf * 0.3); this.tz = zf;
      } else if (this.mode === 'rest') {
        const r = this.restView(); this.tx = r.x; this.ty = r.y; this.tz = r.z;
      } else if (this.mode === 'user') {
        this.userTimer += dt;
      }
      [this.tx, this.ty, this.tz] = this.clampView(this.tx, this.ty, this.tz);
      const kz = 1 - Math.exp(-dt * (this.mode === 'follow' ? 2.2 : 3)), kp = 1 - Math.exp(-dt * (this.mode === 'follow' ? 4.5 : 3));
      this.zoom = Math.exp(Math.log(this.zoom) + (Math.log(this.tz) - Math.log(this.zoom)) * kz);
      this.x += (this.tx - this.x) * kp; this.y += (this.ty - this.y) * kp;
      [this.x, this.y, this.zoom] = this.clampView(this.x, this.y, this.zoom);
    }
    // temblor de cámara (decae)
    if (this.shakeT > 0) {
      this.shakeT -= dt; const a = this.shakeA * Math.max(0, this.shakeT) / 0.35;
      this.sx = (Math.random() * 2 - 1) * a; this.sy = (Math.random() * 2 - 1) * a;
      if (this.shakeT <= 0) { this.shakeA = 0; this.sx = this.sy = 0; }
    }
  }
}
