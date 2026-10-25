// Cajas de mercadería: se entregan en la vereda, se levantan y se usan para reponer.
import * as THREE from 'three';
import { boxLabel, cardboard } from './textures.js';

export const BOX_SIZE = [0.56, 0.34, 0.4];
const cardboardMat = new THREE.MeshStandardMaterial({ map: cardboard(), roughness: 0.9 });
const labelMats = new Map();
const blankLabel = new THREE.MeshStandardMaterial({ color: '#c49a6c', roughness: 0.9 });

function labelMat(product) {
  if (!product) return blankLabel;
  if (!labelMats.has(product.id)) labelMats.set(product.id, new THREE.MeshStandardMaterial({ map: boxLabel(product), roughness: 0.85 }));
  return labelMats.get(product.id);
}

export class Box {
  constructor(product, count) {
    this.product = product;
    this.count = count;
    this.spot = null;
    const [w, h, d] = BOX_SIZE;
    this.mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [cardboardMat, cardboardMat, cardboardMat, cardboardMat, labelMat(product), labelMat(product)]);
    this.mesh.userData.interact = { kind: 'box', box: this };
    // tapas abiertas cuando se sostiene
    this.flaps = new THREE.Group();
    for (const s of [-1, 1]) {
      const flap = new THREE.Mesh(new THREE.BoxGeometry(w, 0.01, d / 2), cardboardMat);
      flap.position.set(0, h / 2, s * d / 4);
      flap.userData.side = s;
      this.flaps.add(flap);
    }
    this.mesh.add(this.flaps);
    this.setOpen(false);
  }

  get capacity() { return this.product ? this.product.boxQty : 12; }

  setOpen(open) {
    for (const f of this.flaps.children) {
      const s = f.userData.side;
      const d = BOX_SIZE[2];
      if (open) {
        f.position.set(0, BOX_SIZE[1] / 2 + 0.09 * 0.5, s * (d / 2 + 0.03));
        f.rotation.x = s * -1.9;
      } else {
        f.position.set(0, BOX_SIZE[1] / 2, s * d / 4);
        f.rotation.x = 0;
      }
    }
  }

  setProduct(product) {
    this.product = product;
    const m = labelMat(product);
    this.mesh.material[4] = m;
    this.mesh.material[5] = m;
  }

  describe() {
    if (!this.product) return 'Caja vacía';
    return `Caja de ${this.product.short} (${this.count}/${this.capacity})`;
  }

  toJSON() {
    const p = this.mesh.position;
    return { product: this.product ? this.product.id : null, count: this.count, x: p.x, y: p.y, z: p.z, ry: this.mesh.rotation.y };
  }
}
