// Jugador en primera persona: movimiento, mirada con el mouse y colisiones.
import * as THREE from 'three';
import { PLAYER } from './config.js';

export class Player {
  constructor(camera, dom) {
    this.camera = camera;
    this.dom = dom;
    this.position = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0;
    this.keys = new Set();
    this.locked = false;
    this.bob = 0;
    this.held = null; // Box que tiene en las manos

    this.holdAnchor = new THREE.Group();
    this.holdAnchor.position.set(0.18, -0.5, -0.95);
    camera.add(this.holdAnchor);

    document.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this.yaw -= e.movementX * PLAYER.mouseSensitivity;
      this.pitch -= e.movementY * PLAYER.mouseSensitivity;
      this.pitch = THREE.MathUtils.clamp(this.pitch, -1.45, 1.45);
    });
    document.addEventListener('keydown', (e) => { this.keys.add(e.code); });
    document.addEventListener('keyup', (e) => { this.keys.delete(e.code); });
    window.addEventListener('blur', () => this.keys.clear());
  }

  setPosition(v, yaw = 0) {
    this.position.set(v.x, 0, v.z);
    this.yaw = yaw;
    this.pitch = 0;
  }

  update(dt, colliders) {
    const k = this.keys;
    let fx = 0, fz = 0;
    if (this.locked) {
      if (k.has('KeyW') || k.has('ArrowUp')) fz -= 1;
      if (k.has('KeyS') || k.has('ArrowDown')) fz += 1;
      if (k.has('KeyA') || k.has('ArrowLeft')) fx -= 1;
      if (k.has('KeyD') || k.has('ArrowRight')) fx += 1;
    }
    const moving = fx !== 0 || fz !== 0;
    if (moving) {
      const len = Math.hypot(fx, fz);
      fx /= len; fz /= len;
      const speed = k.has('ShiftLeft') || k.has('ShiftRight') ? PLAYER.runSpeed : PLAYER.walkSpeed;
      const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
      const dx = (fx * cos + fz * sin) * speed * dt;
      const dz = (-fx * sin + fz * cos) * speed * dt;
      this.position.x += dx;
      this.position.z += dz;
      this.bob += dt * speed * 2.2;
    }
    this.resolveCollisions(colliders);

    const bobY = moving ? Math.sin(this.bob) * 0.035 : 0;
    this.camera.position.set(this.position.x, PLAYER.eyeHeight + bobY, this.position.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }

  resolveCollisions(colliders) {
    const r = PLAYER.radius;
    for (let iter = 0; iter < 3; iter++) {
      for (const c of colliders) {
        const px = this.position.x, pz = this.position.z;
        const cx = Math.max(c.minX, Math.min(px, c.maxX));
        const cz = Math.max(c.minZ, Math.min(pz, c.maxZ));
        let dx = px - cx, dz = pz - cz;
        const d2 = dx * dx + dz * dz;
        if (d2 >= r * r) continue;
        if (d2 > 1e-8) {
          const d = Math.sqrt(d2);
          this.position.x = cx + (dx / d) * r;
          this.position.z = cz + (dz / d) * r;
        } else {
          // el centro quedó adentro: empujar por el lado más cercano
          const pushes = [
            [c.minX - r - px, 0], [c.maxX + r - px, 0],
            [0, c.minZ - r - pz], [0, c.maxZ + r - pz],
          ];
          pushes.sort((a, b) => Math.abs(a[0] + a[1]) - Math.abs(b[0] + b[1]));
          this.position.x += pushes[0][0];
          this.position.z += pushes[0][1];
        }
      }
    }
  }

  forward() {
    const v = new THREE.Vector3(0, 0, -1);
    v.applyEuler(new THREE.Euler(0, this.yaw, 0));
    return v;
  }

  hold(box) {
    this.held = box;
    if (box.mesh.parent) box.mesh.parent.remove(box.mesh);
    box.mesh.position.set(0, 0, 0);
    box.mesh.rotation.set(0.25, -0.15, 0);
    box.setOpen(true);
    this.holdAnchor.add(box.mesh);
  }

  release() {
    const box = this.held;
    if (!box) return null;
    this.holdAnchor.remove(box.mesh);
    box.setOpen(false);
    this.held = null;
    return box;
  }
}
