// Góndolas: cada unidad tiene 4 estantes con 2 espacios cada uno.
import * as THREE from 'three';
import { fmt } from './config.js';
import { createProductMesh } from './productMeshes.js';
import { createPriceTag } from './textures.js';

const UNIT_W = 2.0;
const UNIT_D = 0.5;
const UNIT_H = 1.85;
const BOARD_Y = [0.12, 0.56, 1.0, 1.44];
const SLOT_W = 0.98;
const SLOT_D = 0.44;
const MAX_PER_SLOT = 24;

const frameMat = new THREE.MeshStandardMaterial({ color: '#d7dde2', roughness: 0.45, metalness: 0.3 });
const boardMat = new THREE.MeshStandardMaterial({ color: '#eef1f3', roughness: 0.5, metalness: 0.2 });
const backMat = new THREE.MeshStandardMaterial({ color: '#2f7d5b', roughness: 0.8 });
const hitMat = new THREE.MeshBasicMaterial({ visible: false });

export function slotLayout(product) {
  const [w, , d] = product.size;
  const cols = Math.max(1, Math.floor(SLOT_W / (w + 0.012)));
  const rows = Math.max(1, Math.floor(SLOT_D / (d + 0.012)));
  return { cols, rows, capacity: Math.min(MAX_PER_SLOT, cols * rows) };
}

export class Slot {
  constructor(unit, level, column, index) {
    this.unit = unit;
    this.level = level;
    this.column = column;
    this.index = index;
    this.product = null;
    this.items = [];
    const x = -UNIT_W / 2 + SLOT_W / 2 + 0.02 + column * (SLOT_W + 0.0);
    this.localX = x;
    this.baseY = BOARD_Y[level] + 0.02;

    this.group = new THREE.Group();
    this.group.position.set(x, this.baseY, 0);
    unit.group.add(this.group);

    const nextY = level < BOARD_Y.length - 1 ? BOARD_Y[level + 1] : UNIT_H - 0.05;
    const hitH = nextY - this.baseY + 0.02;
    this.hit = new THREE.Mesh(new THREE.BoxGeometry(SLOT_W, hitH, UNIT_D), hitMat);
    this.hit.position.set(x, this.baseY - 0.04 + hitH / 2, 0.02);
    this.hit.userData.interact = { kind: 'slot', slot: this };
    unit.group.add(this.hit);

    this.tag = createPriceTag();
    const tagMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.066), new THREE.MeshBasicMaterial({ map: this.tag.texture }));
    tagMesh.position.set(x - SLOT_W / 2 + 0.16, BOARD_Y[level] - 0.015, UNIT_D / 2 + 0.006);
    tagMesh.userData.interact = { kind: 'slot', slot: this };
    unit.group.add(tagMesh);
    this.tagMesh = tagMesh;
  }

  get count() { return this.items.length; }

  capacityFor(product) { return slotLayout(product).capacity; }

  isFull() { return this.product ? this.count >= this.capacityFor(this.product) : false; }

  canAccept(product) {
    if (!this.product) return true;
    return this.product === product && !this.isFull();
  }

  add(product) {
    if (!this.canAccept(product)) return false;
    this.product = product;
    const mesh = createProductMesh(product);
    const { cols, rows } = slotLayout(product);
    const i = this.items.length;
    const col = i % cols;
    const row = Math.floor(i / cols) % rows;
    const pitchX = SLOT_W / cols;
    const pitchZ = SLOT_D / rows;
    mesh.position.set(-SLOT_W / 2 + pitchX * (col + 0.5), 0, SLOT_D / 2 - pitchZ * (row + 0.5));
    mesh.rotation.y = (Math.random() - 0.5) * 0.06;
    this.group.add(mesh);
    this.items.push(mesh);
    return true;
  }

  remove() {
    const mesh = this.items.pop();
    if (!mesh) return null;
    this.group.remove(mesh);
    const product = this.product;
    return product;
  }

  // Deja el espacio libre para otro producto cuando queda vacío.
  clearIfEmpty() {
    if (this.items.length === 0) this.product = null;
  }

  refreshTag(prices) {
    if (this.product) this.tag.draw(this.product.short, fmt(prices[this.product.id]));
    else this.tag.draw(null, null);
  }

  // Punto del pasillo donde se para un cliente para agarrar productos.
  accessPoint() {
    const p = new THREE.Vector3(this.localX, 0, UNIT_D / 2 + 0.6);
    return this.unit.group.localToWorld(p).setY(0);
  }

  worldCenter() {
    return this.unit.group.localToWorld(new THREE.Vector3(this.localX, this.baseY + 0.15, 0));
  }
}

export class ShelfUnit {
  constructor(scene, x, z, rotY, id) {
    this.id = id;
    this.group = new THREE.Group();
    this.group.position.set(x, 0, z);
    this.group.rotation.y = rotY;
    scene.add(this.group);

    const add = (w, h, d, px, py, pz, m) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
      mesh.position.set(px, py, pz);
      this.group.add(mesh);
    };
    add(0.04, UNIT_H, UNIT_D, -UNIT_W / 2 - 0.02, UNIT_H / 2, 0, frameMat);
    add(0.04, UNIT_H, UNIT_D, UNIT_W / 2 + 0.02, UNIT_H / 2, 0, frameMat);
    add(UNIT_W, UNIT_H, 0.03, 0, UNIT_H / 2, -UNIT_D / 2 + 0.015, backMat);
    for (const y of BOARD_Y) add(UNIT_W, 0.03, UNIT_D, 0, y, 0, boardMat);
    add(UNIT_W, 0.04, UNIT_D, 0, UNIT_H, 0, boardMat);
    add(UNIT_W, 0.1, 0.03, 0, 0.05, UNIT_D / 2 - 0.015, frameMat);

    this.slots = [];
    for (let level = 0; level < BOARD_Y.length; level++) {
      for (let c = 0; c < 2; c++) this.slots.push(new Slot(this, level, c, this.slots.length));
    }

    // Colisión (en el plano XZ, considerando la rotación en múltiplos de 90°)
    const rotated = Math.abs(Math.sin(rotY)) > 0.5;
    const hw = (rotated ? UNIT_D : UNIT_W) / 2 + 0.04;
    const hd = (rotated ? UNIT_W : UNIT_D) / 2;
    this.collider = { minX: x - hw, maxX: x + hw, minZ: z - hd, maxZ: z + hd, tag: 'shelf' };
    this.group.updateMatrixWorld(true);
  }
}
