// Mover muebles: F para agarrar, R/rueda para rotar, click o F para soltar, Q para cancelar.
import * as THREE from 'three';
import { STORE } from './config.js';
import { sfx } from './audio.js';

// Zona libre frente a la puerta para que siempre se pueda entrar
const DOOR_ZONE = { minX: STORE.doorMinX - 0.4, maxX: STORE.doorMaxX + 0.4, minZ: STORE.maxZ - 1.5, maxZ: STORE.maxZ + 1 };
const MARGIN = 0.1; // espesor interior de las paredes

export class FurnitureMover {
  constructor(game) {
    this.game = game;
    this.item = null;
    this.valid = false;
    this.marker = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ color: '#4caf50', transparent: true, opacity: 0.35, depthWrite: false }),
    );
    this.marker.rotation.x = -Math.PI / 2;
    this.marker.visible = false;
    game.scene.add(this.marker);
  }

  get active() { return this.item !== null; }

  start(f) {
    const g = this.game;
    if (g.player.held) { g.ui.toast('Soltá la caja (Q) antes de mover un mueble', 'info'); return; }
    if (f.type === 'counter' && (g.checkout.busy || g.queue.length)) {
      g.ui.toast('Esperá a que no haya clientes en la caja para moverla', 'bad');
      sfx.error();
      return;
    }
    this.item = f;
    this.orig = { x: f.position.x, z: f.position.z, rot: f.rot };
    this.rot = f.rot;
    this.removeCollider();
    this.marker.visible = true;
    sfx.pick();
  }

  removeCollider() {
    const cs = this.game.colliders;
    const i = cs.indexOf(this.item.collider);
    if (i >= 0) cs.splice(i, 1);
  }

  rotate(dir = 1) {
    if (!this.item) return;
    this.rot += dir * Math.PI / 2;
    sfx.place();
  }

  update() {
    const f = this.item;
    if (!f) return;
    const pl = this.game.player;
    const fwd = pl.forward();
    const dist = 1.0 + Math.max(f.w, f.d) / 2;
    const x = Math.round((pl.position.x + fwd.x * dist) * 4) / 4;
    const z = Math.round((pl.position.z + fwd.z * dist) * 4) / 4;
    f.place(x, z, this.rot);
    const fp = f.footprint();
    this.valid = this.fits(fp);
    this.marker.position.set(x, 0.035, z);
    this.marker.scale.set(fp.maxX - fp.minX + 0.12, fp.maxZ - fp.minZ + 0.12, 1);
    this.marker.material.color.set(this.valid ? '#4caf50' : '#e53935');
  }

  fits(fp) {
    if (fp.minX < STORE.minX + MARGIN || fp.maxX > STORE.maxX - MARGIN || fp.minZ < STORE.minZ + MARGIN || fp.maxZ > STORE.maxZ - MARGIN) return false;
    const overlap = (c) => fp.minX < c.maxX - 0.01 && fp.maxX > c.minX + 0.01 && fp.minZ < c.maxZ - 0.01 && fp.maxZ > c.minZ + 0.01;
    if (overlap(DOOR_ZONE)) return false;
    if (this.game.colliders.some(overlap)) return false;
    const p = this.game.player.position;
    const cx = Math.max(fp.minX, Math.min(p.x, fp.maxX)), cz = Math.max(fp.minZ, Math.min(p.z, fp.maxZ));
    if (Math.hypot(p.x - cx, p.z - cz) < 0.35) return false;
    return true;
  }

  confirm() {
    const g = this.game;
    const f = this.item;
    if (!f) return;
    if (!this.valid) { g.ui.toast('No entra ahí', 'bad', 1400); sfx.error(); return; }
    g.colliders.push(f.collider);
    g.nav.rebuild(g.colliders);
    const problem = g.checkLayout();
    if (problem) {
      // se queda en la mano para probar en otro lugar
      this.removeCollider();
      g.nav.rebuild(g.colliders);
      g.ui.toast(problem, 'bad', 2600);
      sfx.error();
      return;
    }
    this.finish();
    sfx.thud();
  }

  cancel() {
    const f = this.item;
    if (!f) return;
    f.place(this.orig.x, this.orig.z, this.orig.rot);
    this.game.colliders.push(f.collider);
    this.game.nav.rebuild(this.game.colliders);
    this.finish();
  }

  finish() {
    this.item = null;
    this.marker.visible = false;
    this.game.onLayoutChanged();
  }

  hint() {
    if (!this.item) return '';
    return `Moviendo ${this.item.name}${this.valid ? '' : ' · no entra ahí'}\nClick o F: soltar · R / rueda: rotar · Q: cancelar`;
  }
}
