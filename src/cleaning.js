// Suciedad en el piso: aparece con el paso de los clientes y se limpia manteniendo el click.
import * as THREE from 'three';
import { STORE } from './config.js';
import { dirtTexture } from './textures.js';
import { sfx } from './audio.js';

const CLEAN_TIME = 1.3;
const MAX_DIRT = 20;

export class Cleaning {
  constructor(game) {
    this.game = game;
    this.spots = [];
    this.materials = Array.from({ length: 5 }, () => new THREE.MeshStandardMaterial({
      map: dirtTexture(), transparent: true, depthWrite: false, roughness: 0.3, polygonOffset: true, polygonOffsetFactor: -2,
    }));
    this.geometry = new THREE.PlaneGeometry(1, 1);
    this.soundTimer = 0;
  }

  count() { return this.spots.length; }

  cleanliness() { return Math.max(0, 1 - this.spots.length * 0.08); }

  spawn(x, z) {
    if (this.spots.length >= MAX_DIRT) return;
    if (x < STORE.minX + 0.4 || x > STORE.maxX - 0.4 || z < STORE.minZ + 0.4 || z > STORE.maxZ - 0.4) return;
    const mesh = new THREE.Mesh(this.geometry, this.materials[Math.floor(Math.random() * this.materials.length)].clone());
    const size = 0.5 + Math.random() * 0.45;
    mesh.scale.set(size, size, 1);
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = Math.random() * Math.PI * 2;
    mesh.position.set(x + (Math.random() - 0.5) * 0.3, 0.02, z + (Math.random() - 0.5) * 0.3);
    const spot = { mesh, progress: 0 };
    mesh.userData.interact = { kind: 'dirt', spot };
    this.game.scene.add(mesh);
    this.game.addInteractable(mesh);
    this.spots.push(spot);
  }

  // Devuelve el progreso (0..1) si se está limpiando algo, o null.
  update(dt, target, mouseDown) {
    if (!target || target.kind !== 'dirt' || !mouseDown || this.game.player.held) return null;
    const spot = target.spot;
    spot.progress += dt / CLEAN_TIME;
    spot.mesh.material.opacity = Math.max(0.1, 1 - spot.progress);
    this.soundTimer -= dt;
    if (this.soundTimer <= 0) { sfx.clean(); this.soundTimer = 0.12; }
    if (spot.progress >= 1) {
      this.remove(spot);
      this.game.ui.toast('¡Limpio!', 'good', 1200);
      return null;
    }
    return spot.progress;
  }

  remove(spot) {
    this.game.scene.remove(spot.mesh);
    this.game.removeInteractable(spot.mesh);
    spot.mesh.material.dispose();
    this.spots.splice(this.spots.indexOf(spot), 1);
  }

  clear() {
    for (const s of [...this.spots]) this.remove(s);
  }

  toJSON() { return this.spots.map((s) => ({ x: s.mesh.position.x, z: s.mesh.position.z })); }
}
