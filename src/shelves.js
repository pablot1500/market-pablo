// Góndolas: cada unidad tiene 4 estantes con 2 espacios cada uno.
import * as THREE from 'three';
import { fmt } from './config.js';
import { getProductAsset } from './productMeshes.js';
import { createPriceTag, woodGrain } from './textures.js';
import { Furniture } from './furniture.js';

const UNIT_W = 2.0;
const UNIT_D = 0.5;
const UNIT_H = 1.85;
const BOARD_Y = [0.12, 0.56, 1.0, 1.44];
const SLOT_W = 0.98;
const SLOT_D = 0.44;
const MAX_PER_SLOT = 24;
const tmp = new THREE.Object3D();

// Madera clara para la estructura y estantes; fondo gris oscuro también con veta.
const frameMat = new THREE.MeshStandardMaterial({ color: '#e4e1db', map: woodGrain(240, 205, [0.5, 1]), roughness: 0.6 });
const boardMat = new THREE.MeshStandardMaterial({ color: '#f1eee8', map: woodGrain(240, 205, [1, 0.25]), roughness: 0.55 });
const backMat = new THREE.MeshStandardMaterial({ color: '#5a5d61', map: woodGrain(235, 185, [2, 1]), roughness: 0.75 });
const edgeMat = new THREE.MeshStandardMaterial({ color: '#cfcac1', roughness: 0.5 });
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

  // Todos los productos de un espacio se dibujan juntos (InstancedMesh): muchísimo más liviano.
  setProduct(product) {
    this.disposeInstances();
    this.product = product;
    if (!product) return;
    const { geometry, material } = getProductAsset(product);
    this.inst = new THREE.InstancedMesh(geometry, material, MAX_PER_SLOT);
    this.inst.count = 0;
    this.inst.frustumCulled = false;
    this.group.add(this.inst);
  }

  disposeInstances() {
    if (!this.inst) return;
    this.group.remove(this.inst);
    this.inst.dispose();
    this.inst = null;
  }

  add(product) {
    if (!this.canAccept(product)) return false;
    if (this.product !== product || !this.inst) this.setProduct(product);
    const { cols, rows } = slotLayout(product);
    const i = this.items.length;
    const col = i % cols;
    const row = Math.floor(i / cols) % rows;
    const pitchX = SLOT_W / cols;
    const pitchZ = SLOT_D / rows;
    tmp.position.set(-SLOT_W / 2 + pitchX * (col + 0.5), 0, SLOT_D / 2 - pitchZ * (row + 0.5));
    tmp.rotation.set(0, (Math.random() - 0.5) * 0.08, 0);
    tmp.updateMatrix();
    this.inst.setMatrixAt(i, tmp.matrix);
    this.inst.count = i + 1;
    this.inst.instanceMatrix.needsUpdate = true;
    this.items.push(i);
    return true;
  }

  remove() {
    if (!this.items.length) return null;
    this.items.pop();
    this.inst.count = this.items.length;
    return this.product;
  }

  // Deja el espacio libre para otro producto cuando queda vacío.
  clearIfEmpty() {
    if (this.items.length === 0) this.setProduct(null);
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

export class ShelfUnit extends Furniture {
  constructor(scene, id) {
    super(scene, { type: 'shelf', name: 'estante', w: UNIT_W + 0.08, d: UNIT_D });
    this.id = id;

    const add = (w, h, d, px, py, pz, m) => this.add(new THREE.BoxGeometry(w, h, d), m, px, py, pz);
    add(0.04, UNIT_H, UNIT_D, -UNIT_W / 2 - 0.02, UNIT_H / 2, 0, frameMat);
    add(0.04, UNIT_H, UNIT_D, UNIT_W / 2 + 0.02, UNIT_H / 2, 0, frameMat);
    add(UNIT_W, UNIT_H, 0.03, 0, UNIT_H / 2, -UNIT_D / 2 + 0.015, backMat);
    for (const y of BOARD_Y) {
      add(UNIT_W, 0.03, UNIT_D, 0, y, 0, boardMat);
      add(UNIT_W, 0.035, 0.012, 0, y, UNIT_D / 2 + 0.002, edgeMat);
    }
    add(UNIT_W + 0.08, 0.05, UNIT_D + 0.02, 0, UNIT_H, 0, frameMat);
    add(UNIT_W, 0.1, 0.03, 0, 0.05, UNIT_D / 2 - 0.015, frameMat);

    this.slots = [];
    for (let level = 0; level < BOARD_Y.length; level++) {
      for (let c = 0; c < 2; c++) this.slots.push(new Slot(this, level, c, this.slots.length));
    }
  }
}
